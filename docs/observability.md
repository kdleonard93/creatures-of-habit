# Observability Reference

Branch: `task/audit-updates`. This document describes the current PostHog wiring,
event taxonomy, error capture behavior, and logging, then proposes a target policy. It is
a reference, not a change request.

## 1. Initialization

### Client (posthog-js)
- `src/hooks.client.ts:6` initializes `posthog-js` on the browser when a key is present.
- The key comes from `getPostHogKey()` (`src/lib/plugins/PostHog.ts:21`), which reads
  `PUBLIC_POSTHOG_KEY` from `$env/static/public` (`src/lib/plugins/PostHog.ts:2`,
  `src/env.d.ts:2`) and logs an error but still returns when it is missing.
- Config (`src/lib/plugins/PostHog.ts:7`):
  - `api_host: 'https://us.i.posthog.com'`
  - `capture_pageview: true`
  - `capture_pageleave: true`
  - `disable_session_recording: true`
  - `enable_heatmaps: false`
  - `autocapture: false`
  - `debug: false`

### Server (posthog-node)
- `src/hooks.server.ts:10` builds one module level `posthog-node` client at load using
  `getPostHogKey()` and `posthogServerConfig` (`host: 'https://us.i.posthog.com'`,
  `src/lib/plugins/PostHog.ts:17`), and uses it in `handleError`
  (`src/hooks.server.ts:103`).
- `src/routes/+page.server.ts:16` builds a separate new `posthog-node` client on every
  home page load, captures, then shuts it down
  (`src/routes/+page.server.ts:30`). This is a per request client.

### CSP allowlist
- Production `scriptSrc` allows `https://us-assets.i.posthog.com` and
  `https://assets.posthog.com`, plus the request nonce
  (`src/lib/server/securityHeaders.ts:35`, `src/lib/server/securityHeaders.ts:122`).
- Production `connectSrc` allows `https://us.i.posthog.com`, `https://api.posthog.com`,
  `https://us-assets.i.posthog.com`, `https://assets.posthog.com`
  (`src/lib/server/securityHeaders.ts:39`).
- Development adds `'unsafe-inline'`, `'unsafe-eval'`, `ws:`, and `wss:`
  (`src/lib/server/securityHeaders.ts:70`).

## 2. Event taxonomy

| Event | Where captured | Properties |
| --- | --- | --- |
| `$pageview` | `src/routes/+layout.svelte:16` in `afterNavigate`, plus config `capture_pageview` at `src/lib/plugins/PostHog.ts:9` | PostHog defaults (duplicated, see section 4) |
| `$pageleave` | Config only, `capture_pageleave: true` at `src/lib/plugins/PostHog.ts:10` | PostHog defaults |
| `home_page_view` | `src/routes/+page.server.ts:19` (server, per request client) | `authenticated`; distinctId is user id or `anon_<uuid>` (`src/routes/+page.server.ts:9`) |
| `client_error` | `src/hooks.client.ts:54` | `error_type`, `error_name`, `error_message`, `status_code`, `stack_trace`, `severity`, `timestamp` |
| `user_impact` | `src/hooks.client.ts:69` | `impact_level`, `affected_feature`, `error_type`, `status_code`, `timestamp` |
| `unhandled_promise_rejection` | `src/hooks.client.ts:142` (window listener) | `reason`, `stack`, `timestamp`, `severity: high` |
| `uncaught_error` | `src/hooks.client.ts:154` (window listener) | `message`, `filename`, `lineno`, `colno`, `stack`, `timestamp`, `severity: critical` |
| `page_performance` | `src/hooks.client.ts:172` (window load) | `load_time`, `dom_complete`, `first_paint`, `timestamp` |
| `contact_form_submitted` | `src/routes/contact/+page.svelte:41` | `email_domain`, `timestamp`, `name`, `message`, `$set.email`, `$set.name`, `$set.last_contacted` (PII) |
| `waitlist_submission` | `src/lib/components/WaitlistLanding.svelte:59`, `:73`, `:86`, `:100` | `email_hash` (unsalted SHA-256), `success`, `alreadySignedUp`, `redirectTo`, `error` |
| `user_behavior` | `src/lib/utils/errorTracking.ts:59` | `action`, `feature`, `user_id`, spread `properties`, `timestamp` (currently unused, see below) |
| `business_error` | `src/lib/utils/errorTracking.ts:78` | `error_message`, `severity`, `feature`, `category`, `user_id`, `additional_context`, `timestamp` (unused) |
| `performance_metric` | `src/lib/utils/errorTracking.ts:99` | `feature`, `action`, `duration`, `success`, `error_message`, `user_id`, `additional_context`, `timestamp` (unused) |
| `error_event` | `src/lib/utils/logger.ts:51` | `message`, spread `data`, `timestamp` |
| `info_event` | `src/lib/utils/logger.ts:39` | only when `data.trackInPosthog === true`; `message` plus data |
| `warning_event` | `src/lib/utils/logger.ts:61` | only when `data.trackInPosthog === true` |
| exception capture (not a named event) | Client `captureException` at `src/hooks.client.ts:26`; server `captureException` at `src/hooks.server.ts:104` | Client passes `severity`, `status_code`, `url`, `user_agent`, `timestamp`, `context` |

Note: `errorTracking.ts` exports `trackUserBehavior`, `trackBusinessError`, and
`trackPerformance`, but no module imports them (grep of `src` shows only the definitions),
so those three events are defined but never emitted today.

## 3. Logger behavior

- `logger.ts` performs console output through `new Function` instead of calling
  `console` directly: lines `src/lib/utils/logger.ts:27`, `:35`, `:48`, `:59`, `:72`, `:81`.
- Production CSP does not include `'unsafe-eval'` (`src/lib/server/securityHeaders.ts:35`);
  only development adds it (`src/lib/server/securityHeaders.ts:70`). If `logger` were ever
  bundled and executed client side, the `new Function` calls would throw under the
  production CSP.
- Current importers are server only: `src/hooks.server.ts:4`,
  `src/routes/dashboard/+page.server.ts:7`, `src/routes/habits/+page.server.ts:7`,
  `src/routes/api/habits/[id]/complete/+server.ts:8`,
  `src/lib/server/tasks/cleanup.ts:2`, `src/lib/server/tasks/scheduler.ts:2`. No
  `.svelte` file imports it, so the eval risk is latent rather than active.

## 4. Error capture policy and noise inventory

- Server `handleError` captures every non 404 error, including expected 4xx, with no
  `distinctId` and no event context (`src/hooks.server.ts:97`). Expected failures like
  `fail(400)` on login (`src/routes/login/+page.server.ts:26`), invalid reset tokens
  (`src/routes/reset-password/[token]/+page.server.ts:18`), or rate limits
  (`src/lib/server/rateLimit.ts:62`) are all captured as exceptions.
- Because no `distinctId` is passed, server captures are unattributed to a person.
- Client `handleError` emits three events per error: `captureException`, `client_error`,
  and `user_impact` (`src/hooks.client.ts:26`, `:54`, `:69`). On top of that, three global
  listeners emit `unhandled_promise_rejection`, `uncaught_error`, and `page_performance`
  (`src/hooks.client.ts:139`, `:151`, `:168`). 404 is skipped
  (`src/hooks.client.ts:21`). An unhandled error can therefore also produce a duplicate
  through the global `error` listener.
- Double `$pageview`: `capture_pageview: true` is set in config
  (`src/lib/plugins/PostHog.ts:9`) and `$pageview` is also captured manually in the layout
  (`src/routes/+layout.svelte:16`), so pageviews are counted twice.
- `logger.error` always calls `sendToPosthog('error_event', ...)` with no gating
  (`src/lib/utils/logger.ts:51`). Expected conditions such as "User not found" are logged
  as errors (`src/routes/dashboard/+page.server.ts:32`), so every such line becomes an
  `error_event`.
- Per request PostHog node client on the home page builds and tears down a client on every
  load (`src/routes/+page.server.ts:16`, `:30`), which adds connection overhead.
- PII: the contact form sends `name`, `email` (also into `$set.email` and `$set.name`), and
  the full `message` to PostHog (`src/routes/contact/+page.svelte:44`). The waitlist sends
  only an unsalted SHA-256 `email_hash` to PostHog
  (`src/lib/components/WaitlistLanding.svelte:28`, `:59`), but the server stores raw
  `ipAddress` and `userAgent` in the database
  (`src/routes/api/waitlist/+server.ts:42`), not in PostHog.

## 5. Recommended policy

Product owner decision: send richer context on real 5xx, and suppress or sample expected
4xx. Concrete target policy, no code changes here:

1. Server `handleError` (`src/hooks.server.ts:97`):
   - Capture only `status >= 500` via `captureException`.
   - Attach context: `request_id`, HTTP method, route id, path, and `distinctId` when a
     session exists. Pass these through the `event` argument that is already typed in the
     signature.
   - For expected 4xx (`400`, `401`, `404`, `429`) emit nothing, or a single sampled
     counter event with a low severity. Never `captureException` for them.
   - Keep an explicit allowlist of expected status/route pairs so genuine 4xx regressions
     still surface.
2. Client `handleError` (`src/hooks.client.ts:17`):
   - Emit one event per error, the `captureException` with context. Drop the separate
     `client_error` and `user_impact` events, or reduce them to a sampled counter.
   - Deduplicate against the global `error` listener so one failure is not counted twice.
3. `$pageview`:
   - Keep exactly one source. Either disable `capture_pageview` in config or remove the
     manual capture in `src/routes/+layout.svelte:16`.
4. `logger.error` (`src/lib/utils/logger.ts:47`):
   - Emit `error_event` only for genuine failures, not expected control flow. Gate it with
     a level or flag and sample in production.
   - Replace the `new Function` console calls with direct `console` methods.
5. Home page tracking (`src/routes/+page.server.ts:16`):
   - Reuse the module level `posthog-node` client from `src/hooks.server.ts:11` instead of
     constructing one per request.
6. Privacy:
   - Stop sending `name`, `email`, and `message` from the contact form
     (`src/routes/contact/+page.svelte:44`). Send a domain and a hashed identifier only.
   - Keep the waitlist `email_hash` approach; avoid adding raw email to any event.

## 6. Uncertainty

- Whether PostHog resolves `captureException` differently for the node versus browser SDKs
  was not verified from code; the observation is based on call sites only.
- `errorTracking.ts` may be imported through dynamic or generated code not covered by the
  grep; the static import search found none.
- The exact runtime effect of `new Function` depends on how the bundler includes
  `logger.ts`; no client import of it was found.
