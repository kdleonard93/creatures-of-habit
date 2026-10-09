# Observability and Error-Capture Audit

Scope: the PostHog client and server wiring, the error-capture paths, the log-to-PostHog bridge, and the event taxonomy of Creatures of Habit on branch `task/audit-updates`. This report reads `docs/observability.md`, `docs/audit-backlog.md`, `docs/domain-rules.md`, and the code at `src/lib/plugins/PostHog.ts`, `src/hooks.client.ts`, `src/hooks.server.ts`, `src/lib/utils/logger.ts`, `src/lib/utils/errorTracking.ts`, `src/routes/+layout.svelte`, `src/routes/+page.server.ts`, `src/routes/verify-email-pending/+page.svelte`, `src/routes/contact/+page.svelte`, `src/lib/components/WaitlistLanding.svelte`, `src/lib/server/securityHeaders.ts`, and `src/lib/server/rateLimit.ts`. It is read-only: it proposes a target policy and does not change code. Findings reuse O-1 through O-8 from the backlog where they match, and add O-9 through O-12. Project volumes are from PostHog project 122220 over the project lifetime (400 days): `$exception` 774 (27 users), `unhandled_promise_rejection` 729 (4 users), `page_performance` 74, `uncaught_error` 26, `user_impact` 18, `client_error` 18, `waitlist_submission` 20, `contact_form_submitted` 2, and the largest single signature is `TypeError: Failed to fetch` on `/verify-email-pending` at 677 occurrences for 1 user.

### O-1: Server `handleError` captures every non-404, including expected 4xx, with no `distinctId` or context

Severity: high. Status: open (backlog O-1).

Evidence: `src/hooks.server.ts:97-106`. The handler destructures only `{ error, status }` from the argument, even though the declared type at `src/hooks.server.ts:97-102` includes `event?: RequestEvent`. It calls `posthogClient.captureException(error)` for any `status !== 404` at `src/hooks.server.ts:103-104`. Expected control-flow 4xx that flow through here include `fail(400)` on login (`src/routes/login/+page.server.ts:26` per `docs/observability.md:86`), invalid reset tokens (`src/routes/reset-password/[token]/+page.server.ts:18`), contact validation `fail(400, ...)` (`src/routes/contact/+page.server.ts:33`), and rate limiting, which throws `error(429, ...)` at `src/lib/server/rateLimit.ts:62`. The `POST method not allowed` bot signature in the backlog (23 occurrences, 23 users) is a SvelteKit 405 that also reaches this handler. Because no `distinctId` is passed, each server capture lands as an unattributed exception and cannot be tied to a person or session.

Impact: the server error stream is dominated by expected traffic, so a real 5xx regression is hard to see, and every capture is unattributed and without route, method, or request id. The 405 bot noise and 429 rate-limit throws inflate `$exception` while carrying no actionable signal.

Proposed fix: capture `captureException` only for `status >= 500`. Attach `distinctId` when a session exists, and the `event` context (`request_id`, method, route id, path, user agent). For expected 4xx emit nothing, or one low-severity sampled counter event (`http_error`) at a fixed 0.1 rate. Keep an explicit per-route allowlist of expected statuses so an unexpected 4xx on a route that normally succeeds still surfaces. Statuses and error classes to drop from `captureException`: `400` (validation, malformed JSON, invalid credentials, invalid reset token), `401` (missing or expired session), `403`, `404` (already dropped), `405` (method not allowed, bot probing), `409` (already-signed-up conflict), `422` (zod failures), and `429` (rate limit). SvelteKit `redirect` throws use 3xx and never reach `handleError`. Test gate: a unit test `src/tests/server/handleError.test.ts` that calls `handleError` with status 429, 405, 400, and 500 plus a fake `event`, asserting no capture for the 4xx cases and exactly one `captureException` with `distinctId`, `request_id`, and `route` for the 500 case, using an injected PostHog stub.

Decision needed: none to suppress 4xx, but the per-route expected-status allowlist needs an owner. See `docs/open-questions.md` 12 and 13 for the environment split that determines where staging 5xx land.

### O-2: One client failure is captured by up to five mechanisms, and the SDK adds a sixth

Severity: high. Status: open (backlog O-2).

Evidence: `src/hooks.client.ts`. `handleError` at `src/hooks.client.ts:17-48` emits `posthog.captureException` (`:26`), then `trackErrorByType` emits `client_error` (`:54`), then `trackUserImpact` emits `user_impact` (`:69`). Registered in the same module are a `window` `unhandledrejection` listener emitting `unhandled_promise_rejection` (`:139-148`) and a `window` `error` listener emitting `uncaught_error` (`:151-163`). Separately, `posthog-js` exception autocapture is enabled: `capture_exceptions` is unset in `posthogConfig` (`src/lib/plugins/PostHog.ts:7-15`), so the SDK falls back to the project remote setting and wraps `window.onerror` and `window.onunhandledrejection`. Source: `node_modules/posthog-js/lib/src/extensions/exception-autocapture/index.js` (`_requiredConfig` and `_startCapturing`). When remote-enabled, that autocapture emits `$exception` for the same throw.

Quantified amplification:

- A throw during a SvelteKit lifecycle (load, navigation, render) that reaches `handleError` produces: SDK autocapture `$exception` (1) + manual `captureException` `$exception` (2) + `client_error` (3) + `user_impact` (4), and, if the global `error` listener also observes it, `uncaught_error` (5). That is a 4x to 5x amplification.
- A bare unhandled promise rejection (not observed by SvelteKit `handleError`) produces: SDK autocapture `$exception` (1) + app `unhandled_promise_rejection` (2). That is the dominant shape for the poll loop and matches the volume (677 signature occurrences against 729 `unhandled_promise_rejection`).
- Across the five app error mechanisms the project has 1565 events (`$exception` 774 + `unhandled_promise_rejection` 729 + `uncaught_error` 26 + `user_impact` 18 + `client_error` 18) for roughly a dozen distinct defects in the backlog. Error volume overstates distinct failures by about 2x on average and by 4x to 5x for lifecycle errors.
- The SDK rate limiter (`refillRate` 1, `bucketSize` 10, `refillInterval` 10000 ms in the same source file) throttles repeated identical `$exception` types, but the app-level `capture` calls are not throttled, so `unhandled_promise_rejection` tracks every occurrence while `$exception` is capped. That asymmetry is why the two counts differ.

Impact: triage is distorted. Error counts and "users affected" are inflated, alerting thresholds are meaningless, and the same failure appears under different event names, so deduplication has to happen by hand.

Proposed fix: make `$exception` the single client error event, carrying `severity`, `handled`, `route`, and `user_impact` as properties. Delete the `client_error` and `user_impact` captures. Remove the app-level `unhandledrejection` and `error` listeners (the SDK autocapture plus a `reportError` call covers unhandled throws), or keep them purely for local `console` and set a dedupe flag so the SDK is the only sender. Add one error-tracking suppression rule for the expected transient classes listed in O-8. Test gate: `src/tests/client/hooks.client.test.ts` renders a throwing component and asserts exactly one `$exception` is sent for a handled error and zero `client_error` or `user_impact`, using a stubbed `posthog`.

Decision needed: confirm that removing the hand-rolled listeners is acceptable, since the team then depends on the PostHog project's exception-autocapture setting being on. See `docs/open-questions.md` 13.

### O-3: `$pageview` is captured twice

Severity: medium. Status: open (backlog O-3).

Evidence: `capture_pageview: true` at `src/lib/plugins/PostHog.ts:9`, plus a manual `posthog.capture('$pageview')` inside `afterNavigate` at `src/routes/+layout.svelte:14-18`. The config fires on init and the manual call fires on the initial navigation and every client-side navigation.

Impact: pageview-based funnel and traffic numbers are roughly doubled on landing pages and inconsistent between server and client navigation, so any conversion rate that uses `$pageview` as a denominator is wrong.

Proposed fix: keep exactly one source. Preferred: remove the manual capture in `src/routes/+layout.svelte` and set `capture_pageview: 'history_change'` so SvelteKit client navigation is still covered natively. Test gate: `src/tests/client/layout.pageview.test.ts` renders the layout, dispatches two navigations, and asserts exactly two `$pageview` captures, none duplicated.

Decision needed: none.

### O-4: `logger.error` always emits `error_event`, and on the dashboard path it double-captures with `handleError`

Severity: medium. Status: open (backlog O-4).

Evidence: `src/lib/utils/logger.ts:47-56` sends `error_event` on every `logger.error` with no level or environment gate. On the dashboard, `src/routes/dashboard/+page.server.ts:162-167` logs the error and then throws `error(500, ...)`, so the same failure produces one `error_event` plus one server `$exception` from `handleError`. The unrelated expected line `logger.error('User not found: ...')` at `src/routes/dashboard/+page.server.ts:32` becomes an `error_event` for a routine missing-user case. `src/routes/api/habits/[id]/complete/+server.ts:120-125` logs and returns `json({...}, { status: 500 })`, which does not throw, so that path emits only `error_event` and never reaches `handleError`. That inconsistency makes server error counts route-dependent.

Impact: server failures are counted twice on some routes and once on others, expected conditions are logged as errors, and there is no way to filter `error_event` by severity or environment. `error_event` also has no `route`, `status_code`, or `request_id`, unlike the exception path.

Proposed fix: make `logger.error` emit a `server_error` event only when the caller marks it as operational (for example a `track: true` flag), attach `level`, `route`, `status_code`, and `request_id`, tag `environment` and `release`, and sample at 1.0 in dev and 0.25 in production. Do not log expected conditions such as missing user as errors: downgrade them to `logger.info`. Route genuine 5xx through `handleError` alone so there is one server capture. Replace the `new Function` console indirection at `src/lib/utils/logger.ts:27, :35, :48, :59, :72, :81` with direct `console` calls (see O-12). Test gate: `src/tests/server/logger.test.ts` asserts `logger.error` with no `track` flag sends no PostHog event, with `track: true` sends one `server_error` carrying `route` and `status_code`, and that a dashboard 500 load produces exactly one server event.

Decision needed: confirm the production sample rate. See `docs/open-questions.md` 13.

### O-5: The home page builds a PostHog node client per request and mints a fresh anonymous person each time

Severity: medium. Status: open (backlog O-5, backlog R-3).

Evidence: `src/routes/+page.server.ts:16` constructs `new PostHog(...)` on every home load, captures `home_page_view` at `src/routes/+page.server.ts:19-25`, and shuts it down at `src/routes/+page.server.ts:30`. The `distinctId` is `anon_${crypto.randomUUID()}` at `src/routes/+page.server.ts:9`, generated fresh for every anonymous request. A module-level client already exists at `src/hooks.server.ts:11`. The backlog records `home_page_view` at 1575 occurrences and 1565 users, which is the fingerprint of a new person per request.

Impact: every anonymous home view is a new PostHog person, inflating person counts and making `home_page_view` non-comparable to `$pageview`. Per-request client creation adds connection and flush overhead on the highest-traffic server route.

Proposed fix: import and reuse the module-level `posthogClient` from `src/hooks.server.ts`, or move the capture to a shared server analytics module. Derive a stable anonymous id from a first-party cookie or use the PostHog session id, not a random UUID per request, so returning visitors are one person. Test gate: `src/tests/server/home.test.ts` loads the route twice and asserts the same client instance is used and a stable distinct id is reused, and that no `shutdown()` is called per request.

Decision needed: whether to keep `home_page_view` at all. It is redundant with `$pageview` (see the target taxonomy) and is the main source of phantom persons; dropping it removes both the duplicate metric and the per-request client.

### O-6: The contact form sends raw name, email, and message to PostHog

Severity: high. Status: open (backlog O-6).

Evidence: `src/routes/contact/+page.svelte:41-51` captures `contact_form_submitted` with `name`, the full `message`, and `$set.email`, `$set.name`, `last_contacted`. The email domain is also computed at `src/routes/contact/+page.svelte:42`. This is unsolicited free-text and direct identifiers in the analytics store.

Impact: an unbounded category of user PII (medical, personal, or password-adjacent content) lands in PostHog with no consent, no retention policy, and no masking. It is a compliance and trust exposure, and it makes the analytics project a second copy of the contact inbox.

Proposed fix: capture no free text and no direct identifiers. Send `contact_form_submitted` with `email_domain`, a coarse `message_length_bucket` (for example `0-200`, `200-1000`, `1000+`), and `has_attachment` if it becomes relevant. Do not call `$set` with `email` or `name`. Add a `before_send` hook in `posthogConfig` that strips any key named `email`, `name`, `message`, `message_body`, or `token` as a defense in depth. Test gate: `src/tests/client/contact.test.ts` submits the form and asserts the captured payload has no `email`, `name`, or `message` field and that any stripped key is removed by `before_send`.

Decision needed: confirm that PostHog receives only the domain and length bucket. Aligns with the confirmed contact direction in `docs/domain-rules.md:148`.

### O-7: No release tag, no environment tag, and no source map upload

Severity: medium. Status: open (backlog O-7).

Evidence: `posthogConfig` (`src/lib/plugins/PostHog.ts:7-15`) and `posthogServerConfig` (`src/lib/plugins/PostHog.ts:17-19`) set only `api_host` and `host`. No `release` or `environment` is registered on the client or passed to the server client. `posthog.init` is called at `src/hooks.client.ts:9-12` with no post-init `posthog.register`. On the server, `captureException` at `src/hooks.server.ts:104` passes no properties. The stack traces captured by `handleError` (`src/hooks.client.ts:59`, `src/hooks.server.ts:104`) are minified. `@posthog/cli` is already a dependency (`package.json:71`) but is never invoked; `grep` of `.github/workflows` and `scripts` finds no sourcemap upload step. The CI build job ends at `src`-relative artifact upload (`.github/workflows/ci.yml:76-82`). `docs/environments-and-deploy.md:170-174` already calls this out.

Impact: every event from staging and production mixes into one project, and error stack frames are unreadable, so triage of the top signatures in the backlog depends on manual symbolication.

Proposed fix: inject a `release` value (the commit SHA) and an `environment` value (`production`, `staging`, `development`) into the client and server configs, and register them as super properties so every surviving event carries them. Add a CI step that runs `posthog-cli` to upload source maps for the built output with the same `release` and a project id, gated on the production job, and generate source maps in the adapter-node build. Test gate: `src/tests/client/posthog.envelope.test.ts` asserts every captured event in a stubbed client includes `environment` and `release`, and a workflow assertion (or a small script test) confirms the source-map upload step runs with the build's release value.

Decision needed: separate PostHog project versus a single project with `environment` and `release` tags. See `docs/open-questions.md` 12 and 13.

### O-8: The verify-email-pending poll loop is the dominant noise source

Severity: high. Status: open (backlog O-8, verified in code and telemetry).

Evidence: `src/routes/verify-email-pending/+page.svelte:46-58`. `onMount` starts `setInterval(async () => { const response = await fetch('/api/check-verification-status'); const result = await response.json(); if (result.verified) { window.location.href = '/dashboard'; } }, 5000)`. The async callback has no `try/catch`, no backoff, and no attempt cap. It runs every 5 seconds until the tab closes, and it does not check `document.visibilityState`. Any transient network failure throws `TypeError: Failed to fetch`, which the runtime reports as an unhandled rejection and which both the SDK autocapture and the app `unhandledrejection` listener capture (O-2). The same failure is also possible when `response.json()` parses a non-JSON error page (compare the `Unrecognized token '<'` signature in the backlog). This produces 677 occurrences of one signature for a single user, the single largest noise signature in the project.

Impact: one user on a flaky connection can dominate the entire error stream for 56-plus minutes of a single session (677 failures at one attempt every 5 seconds is roughly 56 minutes of continuous failed polling), drowning real defects. The loop also keeps a request in flight indefinitely and never stops after a successful load races a reload.

Proposed fix: rewrite the poll as a bounded, guarded loop:

- Wrap the `fetch` and `response.json()` in a `try/catch`. On failure, do not let the rejection escape.
- Use exponential backoff with jitter: start at 5 seconds, double to a cap of 60 seconds, reset on success.
- Stop after success (the redirect path already ends polling) and after a hard cap (for example 15 minutes or 20 attempts), then show a manual refresh state.
- Pause while `document.visibilityState === 'hidden'` and resume on `visibilitychange`, so background tabs do not poll.
- Do not capture expected transient failures: `AbortError`, `TypeError: Failed to fetch`, `TypeError: Load failed`, and non-JSON parse errors are expected; capture nothing, or a single sampled `verify_poll_failed` counter at a very low rate with the attempt number.
- Clear the timer on unmount and before any redirect.

Test gate: `src/tests/routes/verify-email-pending.test.ts` renders the component with fake timers and a stubbed `fetch` that rejects, asserts no unhandled rejection and zero `$exception`/`unhandled_promise_rejection` captures across several ticks, asserts the delay grows, asserts polling stops after 20 attempts, and asserts no fetch occurs while `document.visibilityState` is `hidden`.

Decision needed: confirm the cap (attempt count or elapsed minutes) and whether a visible "check manually" fallback replaces the silent forever-poll.

### O-9: `waitlist_submission` emits false failure signals and ships a weak email hash

Severity: medium. Status: new.

Evidence: `src/lib/components/WaitlistLanding.svelte` captures `waitlist_submission` in four places: already-signed-up (`:59-65`, `success: true`), success (`:73-79`), server-returned failure (`:86-91`, `success: false`), and the client `catch` (`:100-105`, `success: false`). The catch path covers a client-side network or parse failure, so a transient network error is recorded as a business-level failed submission and skews conversion. On the PII side, `anonymizeEmail` (`:27-30`) computes an unsalted SHA-256 of the email and sends `email_hash`; the domain itself is not needed here, but an unsalted hash of a low-entropy value is reversible with a precomputed table. The server also stores raw `ipAddress` and `userAgent` (`src/routes/api/waitlist/+server.ts:42-50`), though not in PostHog.

Impact: `waitlist_submission` success rate is not trustworthy because transport failures are recorded as business failures. The unsalted hash is pseudonymous, not anonymous, and can be re-identified, which is weaker than the contact form policy should be after O-6.

Proposed fix: distinguish transport from business outcomes. Emit `success: true` with an `outcome` property of `joined`, `already_joined`, or `error`, and reserve `success: false` for a server-confirmed rejection; do not emit the event at all from the client `catch` (log locally instead). Drop `email_hash` in favor of `email_domain`, or, if a stable per-email key is truly needed, use a salted HMAC with a server-side secret. Collapse the four call sites into one helper so the property shape cannot drift. Test gate: `src/tests/client/waitlist.test.ts` drives a rejected `fetch` and asserts no `waitlist_submission` capture, and drives the four real outcomes and asserts one capture each with the correct `outcome`.

Decision needed: whether waitlist analytics need a stable per-email key at all; if not, remove the hash entirely.

### O-10: No `posthog.identify`, so logged-in client events stay anonymous

Severity: medium. Status: new.

Evidence: `posthog.identify` is declared in the `Window` type at `src/lib/utils/logger.ts:90-93` but never called anywhere in `src` (`grep` for `.identify(` returns nothing). Client-initiated events (`$exception`, `client_error`, `user_impact`, `waitlist_submission`, `contact_form_submitted`, `$pageview`) are therefore attributed to the anonymous device id. The only user-attributed event is the server `home_page_view`, and even that uses a random anonymous id for guests (`src/routes/+page.server.ts:9`). The verify-email-pending page is behind an authenticated gate (`src/routes/verify-email-pending/+page.server.ts:7-9`) yet its errors are not linked to the user.

Impact: "27 users" on `$exception` and "4 users" on `unhandled_promise_rejection` are device counts, not user counts, so impact is overstated and a single person can appear as several. Support cannot pull a logged-in user's errors.

Proposed fix: after a successful session is established in the layout, call `posthog.identify(user.id, { email_verified })` and `posthog.reset()` on logout, driven from the layout server data. Keep only stable server-side ids, never email. Test gate: `src/tests/client/identify.test.ts` renders the layout with an authenticated `data.user` and asserts `identify` is called once with the user id, and that logout triggers `reset`.

Decision needed: whether identifying users is acceptable under the privacy direction, or whether PostHog should stay device-anonymous with server-side attribution only.

### O-11: Dead error-tracking module and overlapping event names

Severity: low. Status: new.

Evidence: `src/lib/utils/errorTracking.ts` defines `trackUserBehavior` (`:59`), `trackBusinessError` (`:78`), and `trackPerformance` (`:99`) emitting `user_behavior`, `business_error`, and `performance_metric`. No module imports them (`docs/observability.md:64-66`). Their shapes overlap the logger events, and the three never fire, so the documented taxonomy lists events that do not exist in PostHog. The same file also logs a warning on every call through `getPostHog` at `src/lib/utils/errorTracking.ts:49` with no gate.

Impact: the taxonomy is ambiguous (three "error" event names for one concept) and a future import of this module would emit events that no dashboard knows about. It adds maintenance surface with zero signal.

Proposed fix: delete `src/lib/utils/errorTracking.ts` and its unused type exports, or repurpose it into the single shared error helper proposed in O-2. Then reconcile `docs/observability.md` with the shipped taxonomy. Test gate: `grep`-based lint check or an import test that fails if `user_behavior`, `business_error`, or `performance_metric` are captured, plus removal of the file compiles clean under `pnpm run check`.

Decision needed: none beyond confirming the three event names are abandoned.

### O-12: `logger` uses the `Function` constructor under a CSP without `unsafe-eval`

Severity: low. Status: new (latent).

Evidence: `src/lib/utils/logger.ts` routes all console output through `new Function('msg', 'console.error(msg)')(...)` at lines `:27`, `:35`, `:48`, `:59`, `:72`, `:81`. The production CSP `scriptSrc` at `src/lib/server/securityHeaders.ts:35` does not include `'unsafe-eval'`; only development adds it at `src/lib/server/securityHeaders.ts:70`. Current importers are server only (`docs/observability.md:76-80`), so the risk is latent.

Impact: if `logger` is ever bundled client-side, every log call throws a CSP `EvalError`, which the error listeners would capture and which would create a feedback loop with O-2. It is also an unnecessary eval surface that security review flags.

Proposed fix: replace the `new Function` calls with direct `console.info`, `console.error`, `console.warn`, and `console.debug`. Keep the server-only guard. Test gate: `src/tests/server/logger.test.ts` asserts logging writes to the injected console and that the source contains no `new Function` reference (a text assertion), so the eval surface cannot return.

Decision needed: none.

## Target policy

This is the concrete target to implement, gated behind the tests named above.

1. One error event per failure. `$exception` is the only client and server error event. It carries: `error_type`, `error_message`, `handled` (boolean), `severity` (`critical`, `high`, `medium`, `low`), `route` (route id), `user_impact` (boolean, folded from the deleted event), `status_code` (server), `request_id` (server), `route`, and `distinct_id`. Drop `client_error`, `user_impact`, `unhandled_promise_rejection`, and `uncaught_error`.
2. Server capture rule. `handleError` calls `captureException` only for `status >= 500`, with the `event` context and a `distinctId` when a session exists. Drop from `captureException`: `400`, `401`, `403`, `404`, `405`, `409`, `422`, `429`, and all 3xx redirect throws. Keep an explicit per-route expected-status allowlist so an unexpected 4xx on a normally-successful route still surfaces. Expected 4xx optionally emit one low-severity `http_error` counter at a fixed 0.1 sample rate.
3. Client capture rule. Trust the SDK exception autocapture as the single client sender for unhandled errors; keep one guarded `captureException` in `handleError` only if the SDK autocapture is disabled at the project level. Remove the hand-rolled `unhandledrejection` and `error` listeners. Add suppression rules for `AbortError`, `Failed to fetch`, `Load failed`, `Importing a module script failed`, and non-JSON parse errors.
4. Pageviews. Exactly one source. Prefer disabling the manual `$pageview` in the layout and using `capture_pageview: 'history_change'`. Drop `home_page_view` and the per-request node client (O-3, O-5).
5. Logging. `logger.error` emits `server_error` only when the call is marked operational, with `level`, `route`, `status_code`, `request_id`, `error_type`, `environment`, and `release`, sampled 0.25 in production and 1.0 in development. Downgrade expected conditions (missing user, tracker cooldown) to `logger.info`. Replace the `new Function` console calls with direct `console` methods.
6. Verification poll. Guard with `try/catch`, use exponential backoff (5 seconds doubling to a 60-second cap), stop after success or a 20-attempt or 15-minute cap, pause on `document.hidden`, and capture nothing for expected transient failures. Optional single `verify_poll_failed` counter at a very low rate with the attempt number.
7. Attribution. Call `posthog.identify(user.id, { email_verified })` after session establishment and `posthog.reset()` on logout, so user-level error counts are real. Never identify with an email.
8. Privacy. Contact sends no `name`, `email`, or `message`; send `email_domain` and `message_length_bucket` only. Waitlist sends `email_domain` and `outcome`, not an unsalted hash. Add a `before_send` deny list for `email`, `name`, `message`, `token`.
9. Environment and release. Register `environment` and `release` as super properties on both clients and stamp every server capture. Upload source maps in the production build via `@posthog/cli` with the same `release`.

Envelope every surviving event should carry: `environment`, `release`, `route`, and `distinct_id` (server and, after identify, client). Add `$session_id` from PostHog defaults on the client.

Target event taxonomy:

| Event | Action | Source after change | Required properties |
| --- | --- | --- | --- |
| `$pageview` | keep, single source | client, native history-change | PostHog defaults, `route` |
| `$pageleave` | keep | client config | PostHog defaults |
| `$exception` | keep, single sender per side | client SDK autocapture (or one guarded manual), server 5xx | `error_type`, `error_message`, `handled`, `severity`, `route`, `user_impact`, `status_code`, `request_id`, envelope |
| `waitlist_submission` | keep, collapse four sites | client helper | `email_domain`, `outcome`, envelope (no `email_hash`) |
| `contact_form_submitted` | keep, strip PII | client | `email_domain`, `message_length_bucket`, envelope |
| `server_error` | rename or gate `error_event` | server logger | `message`, `level`, `route`, `status_code`, `request_id`, `error_type`, envelope |
| `http_error` | new, optional sampled | server, 0.1 rate | `route`, `status_code`, `method`, envelope |
| `verify_poll_failed` | new, optional low rate | client | `attempt`, `error_type`, envelope |
| `home_page_view` | drop | none | redundant with `$pageview`; phantom persons |
| `client_error`, `user_impact` | drop | none | fold into `$exception` |
| `unhandled_promise_rejection`, `uncaught_error` | drop | none | SDK `$exception` covers them |
| `page_performance` | drop | none | use native `capture_performance` if web vitals are needed |
| `info_event`, `warning_event` | drop or sample | client logger | only if a real use appears |
| `user_behavior`, `business_error`, `performance_metric` | drop | none | dead code (O-11) |

## Uncertainty

- Whether the PostHog project has exception autocapture enabled server-side was inferred from the 774 `$exception` events and the SDK source path in `node_modules/posthog-js/lib/src/extensions/exception-autocapture/index.js`; the project setting itself was not read. If it is off, O-2 changes shape and a single guarded `captureException` must stay.
- The exact per-failure fan-out for the poll loop was derived from the code paths, not from raw event payloads. SvelteKit `handleError` does not observe a rejection inside an arbitrary `setInterval` callback, so the poll produces the SDK `$exception` plus `unhandled_promise_rejection` (2), not the full 5. Raw events should confirm before treating 2 as fixed.
- Person versus device counts after identify are estimates; no raw PostHog person export was read.
- The `home_page_view` 1575 occurrences and 1565 users imply one person per view, but the anonymous-id generation at `src/routes/+page.server.ts:9` was read, not measured against a stable-cookie experiment.
- The `capture_pageview` legacy default behavior that causes the initial-load duplicate is taken from the configured `defaults: 'unset'` fallback, not from a runtime trace.

## Cross-references

- `docs/observability.md`: sections 1 to 6, the current wiring and the earlier recommended policy that this report sharpens.
- `docs/audit-backlog.md`: O-1 through O-8, and R-3 for the per-request client.
- `docs/open-questions.md`: 12 (staging shape) and 13 (PostHog environments), which block O-1 and O-7.
- `docs/domain-rules.md`: 148 (confirmed contact direction) and 150 (confirmed waitlist direction), which back O-6 and O-9.
- `docs/environments-and-deploy.md`: 170-174, the staging and PostHog environment plan that O-7 implements.
- `docs/architecture.md`: 65-70, the error-handling description that O-1 and O-2 correct.
