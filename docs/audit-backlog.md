# Audit Backlog: Creatures of Habit

Prioritized findings from the app and test audit on branch `task/audit-updates`.

Status values: `open`, `in-progress`, `fixed`, `wontfix`, `needs-decision`.

This file is populated by the audit tracks. The entries below are pre-audit findings from initial reconnaissance and will be refined with evidence, including real PostHog error data, as the audit proceeds.

## How to read an entry

Each finding records:

- **ID**: stable identifier.
- **Track**: one of server/API, DB, observability, auth/security, correctness, abuse, tests.
- **Severity**: critical, high, medium, low.
- **Status**: see above.
- **Evidence**: file paths and line numbers, or PostHog issue identifiers.
- **Impact**: what breaks or leaks in production.
- **Proposed fix**: the change, gated behind a representative test.
- **Decision needed**: link to `open-questions.md` when applicable.

## Phase 3 consolidated results

Seven parallel audit tracks completed on 2026-10-09. Full detail is in `docs/reports/`. Note: `docs/` is currently listed in `.gitignore` (`/docs`, added in commit `b93c10f`), so the reports on disk are not tracked. See the decision at the end of this file.

| Track | Report | Findings | Critical | High | Medium | Low |
| --- | --- | --- | --- | --- | --- | --- |
| Server and API | `docs/reports/01-server-api.md` | 11 | 0 | 4 | 4 | 3 |
| Database | `docs/reports/02-db.md` | 10 | 0 | 3 | 5 | 2 |
| Observability | `docs/reports/03-observability.md` | 12 | 0 | 4 | 6 | 2 |
| Auth and security | `docs/reports/04-auth-security.md` | 11 | 0 | 1 | 3 | 7 |
| Correctness | `docs/reports/05-correctness.md` | 14 | 1 | 6 | 5 | 2 |
| Abuse | `docs/reports/06-abuse.md` | 7 | 0 | 2 | 4 | 1 |
| Tests | `docs/reports/07-tests.md` | 16 | 0 | n/a | n/a | n/a |

### Highest priority, cross-cutting

1. **C-1, C-8, C-9, C-10, C-12 (correctness, critical and high).** Streaks never reset and are implemented as a cooldown; the streak module is dead code with a test-only hack; the schema has no weekday for weekly habits; daily quests can duplicate and are not idempotent. This is the core gameplay loop and the confirmed rules require a rewrite.
2. **A-6 (auth, high).** Email verification is not enforced. Only `/dashboard` checks `emailVerified`, so an unverified session can use `/habits`, `/settings/password`, and every JSON API, and registration issues the session before verification. Contradicts the confirmed requirement.
3. **O-8 (observability, high).** The verify-email-pending poll loop is 677 of the top signature: every 5 seconds, no catch, no backoff, captured by several mechanisms.
4. **O-1, O-2 (observability, high).** Server `handleError` captures every non-404 including expected 4xx with no context; one client failure is captured by up to five mechanisms plus the SDK.
5. **C-2, C-6, C-7 (correctness, high).** Quest stat checks are deterministic instead of probability-based; the quest API strips `requiredStat` while the UI reads it (live crash); `nextActiveDate` is a Date in some producers and a string in consumers.
6. **S-1, S-8, S-2 (server, high).** Habit writes trust unvalidated bodies and skip `categoryId` ownership; completion is non-atomic and can double-award XP and streak; quest and boost endpoints turn every Error into 400 with the raw message.
7. **D-1, D-4, D-2 (database, high).** Schema, snapshot, and journal drift on quest indexes, and the `0022` journal tag points at a missing file so replay is broken; migration 0020 `quest_answers` foreign keys lack `ON DELETE CASCADE` (reproduced locally as a delete failure); uniqueness for completions, daily quests, streaks, and equipment is enforced only in application code.
8. **P-1, P-3, P-2 (abuse, high).** The contact form is an abusable relay with zero anti-automation and user-controlled headers; the waitlist stores the raw `x-forwarded-for` value.
9. **T-1 through T-16 (tests).** 17 of 29 files give false confidence and 37 of 38 route modules have zero real execution. Needs the real harness rebuild.

### Track highlights

- **Server/API:** unvalidated habit writes (S-1), raw-error 400s (S-2), non-atomic completion and boost spend (S-3, S-8), non-idempotent defaults (S-4), `forgot-username` case bug (S-5), malformed JSON 500s (S-6), silent 200 on foreign habit PUT (S-7), contract mismatches (S-9), limiter gaps (S-10), bot 405 noise (S-11).
- **Database:** migration and journal drift (D-1), app-only uniqueness (D-2), no snapshot procedure (D-3), missing cascade (D-4), FK pragma reliance (D-5), redundant indexes (D-6), mixed timestamps (D-7), boolean typing (D-8), missing hot-path indexes and a `date()` predicate that defeats one (D-9), unsafe transactions (D-10).
- **Observability:** capture fan-out (O-1, O-2), double `$pageview` (O-3), `logger.error` double capture (O-4), per-request PostHog client (O-5), contact PII (O-6), no release or environment tags and no source maps (O-7), poll loop (O-8), waitlist false failures and weak hash (O-9), no `identify` (O-10), dead error module (O-11), `new Function` under CSP (O-12).
- **Auth/security:** verification not enforced (A-6), session invalidation inconsistency (A-1), per-instance limits and gaps (A-2), email HTML and header injection (A-3), Resend errors treated as success (A-4), missing cross-origin headers and proxy HSTS (A-5), login timing enumeration (A-7), bcrypt cost and 72-byte truncation (A-8), `new Function` logger (A-9), CSRF adequate but SameSite-only (A-10), secrets not committed (A-11).
- **Correctness:** confirmed streak and stat-check algorithm specifications are included at the end of `docs/reports/05-correctness.md` and should be copied into `docs/domain-rules.md` once approved.
- **Abuse:** full proposed implementation (schema, migration and snapshot, shared anti-abuse helper, action and endpoint changes, rate-limit presets, guarded `/admin` surface, options and tradeoffs).
- **Tests:** per-file verdicts, a coverage-gap matrix, and a conversion plan (real in-memory libsql helper, `createRequestEvent`, load/action invocation, real component rendering, timezone pinning, CI and coverage fixes).

### Decisions needed

1. `docs/` ignore: keep the knowledge base and reports in the repo (recommended, matches the earlier decision) or out of git.
2. Streak scope and weekly non-assigned-day behavior (`open-questions.md` 1 and 2) before C-1 is implemented.
3. Stats design approval (`open-questions.md` 5) before C-4.
4. Contact/waitlist admin scope and waitlist usage (`open-questions.md` 10 and 11) before P-5.
5. Fix order approval and whether to start with the streaks rewrite (C-1) plus the test harness (T-track), or the quick high-value wins (O-8, A-6, C-6) first.

## Progress (updated 2026-10-09)

**Fixed and verified**

- Quick wins (commit `165bf44`): O-8 verification poll loop, A-6 email verification enforcement, O-1 server 5xx-only capture, O-2 single client capture, C-6 quest `requiredStat` crash, C-7 countdown date type.
- Test harness and conversions (commits `4be46c0`, `548acb2`): the false-confidence API, page-server, and component suites were replaced with real integration tests (43 files, 296 tests). The stale `test-db.ts` was rewritten. T-1, T-2, T-4, T-8, T-9, T-10, T-11 are addressed.
- CI: CodeQL now watches `main` and the feature branches; the stale case-sensitivity symlink step was removed from `ci.yml`.

**Elevated**

- D-1: the migration chain cannot be replayed from scratch. `0000` creates `user` without `email`, `0001` selects `email` from it, and the `0022` journal tag has no matching file. Tests derive the schema from `schema.ts`. A fresh environment cannot be provisioned with `drizzle-kit migrate`.

**Still open (next)**

- Core gameplay: C-1 streaks, C-2 probability stat checks, C-3 timezone, C-4/C-5 stats and progress, C-8 to C-14.
- Database: D-1 migration repair, D-4 missing cascade, D-2 constraints, D-3 snapshot procedure.
- Server: S-1, S-2, S-3, S-8 and the rest.
- Auth and security: A-1 to A-5 and A-7 to A-11.
- Abuse: P-1 to P-7.
- Remaining tests: T-3 (`auth.test.ts` still uses a mock clone), T-5 (quest integration skipped), T-6 (tests excluded from typecheck), T-7 (no coverage), T-12 to T-16.

## PostHog evidence (Phase 2)

Source: project "Creatures of Habit" (122220), window of 400 days (project lifetime).

Event volumes:

| Event | Occurrences | Users |
| --- | --- | --- |
| `$exception` | 774 | 27 |
| `unhandled_promise_rejection` | 729 | 4 |
| `page_performance` | 74 | 53 |
| `uncaught_error` | 26 | 2 |
| `user_impact` | 18 | 4 |
| `client_error` | 18 | 4 |
| `waitlist_submission` | 20 | 3 |
| `$pageview`-adjacent `home_page_view` | 1575 | 1565 |
| `contact_form_submitted` | 2 | 2 |

The same failure is frequently captured by `$exception` (SDK autocapture), `unhandled_promise_rejection` or `uncaught_error` (global listeners), and `client_error`/`user_impact` (`handleError`), which inflates counts and is itself a defect (see O-1 and O-2).

Top real defects, deduplicated across sources:

| Rank | Signature | Path | Count | Users | Category |
| --- | --- | --- | --- | --- | --- |
| 1 | `TypeError: Failed to fetch` during the 5s verification poll | /verify-email-pending | 677 | 1 | missing error handling, dominant noise source |
| 2 | `Error: POST method not allowed. No form actions exist for this page` | various | 23 | 23 | bot probing, server side |
| 3 | `TypeError: Cannot read properties of undefined (reading 'charAt')` in QuestQuestion/badge | /quests | 18 | 1 | real UI bug |
| 4 | `SyntaxError: JSON Parse error: Unrecognized token '<'` | / | 15 | 1 | fetch returned HTML without a guard |
| 5 | `TypeError: nextActiveDate.split / getTime is not a function` | /habits, /dashboard | 13 | 1-2 | string passed where a Date is expected |
| 6 | `TypeError: Cannot read properties of undefined (reading 'default')` | /quests | 10 | 1 | dynamic import or undefined component |
| 7 | `Error: Importing a module script failed` / dynamically imported module | /login, /features, /waitlist, / | 8 | 1-2 | stale chunks after deploy |
| 8 | `Error: use:enhance can only be used on <form> fields with method="POST"` | /settings | 5 | 1 | real bug |
| 9 | `ReferenceError: Trophy is not defined` | /dashboard, /features | 2 | 1 | missing import |
| 10 | `Error: Cannot subscribe to 'page' store on the server outside of a Svelte component` | SSR | 2 | 1 | shared state on the server |
| 11 | `ReferenceError: dev is not defined` | /quests | 1 | 1 | missing import |
| 12 | `ConnectTimeoutError` to turso.io | server | 1 | 1 | database timeout |

Some entries reference routes that no longer exist (`/signup/verify-email`, `/dev/guides`) or were captured mid-deploy. Each must be re-verified against the current code before fixing.

## Findings

### Correctness

- **C-1** (critical, open). Streak logic is wrong. The completion route always increments and never resets (`src/routes/api/habits/[id]/complete/+server.ts:70-81`), `habitStatus.ts` is a cooldown not a schedule, and the streak module is dead code with a test-only hack. Impact: streaks never break and the XP streak multiplier is inflated. Fix: implement the confirmed reset-on-miss rule. Decision: `open-questions.md` 1, 2, 3.
- **C-2** (high, open). Quest stat checks are deterministic rather than probability-based (`src/lib/server/services/questService.ts` answerQuestion); the intended `calculateSuccessChance` is unused. Decision: `open-questions.md` 6.
- **C-3** (high, open). Timezone mismatch: stored dates are UTC, but scheduling uses server-local `getDay()` and local midnight (`src/lib/utils/habitStatus.ts`). Off-by-one for non-UTC users. Decision: `open-questions.md` 8.
- **C-4** (medium, open). Client and server XP stat allocation diverge (`src/lib/client/xp/stats.ts` vs `src/lib/server/xp/stats.ts`). Decision: `open-questions.md` 5.
- **C-5** (medium, open). Daily progress denominator can be skewed by inactive habits (`getDailyProgressStats` vs `ensureDailyTrackerEntries`). Decision: `open-questions.md` 7.
- **C-6** (high, open, verified in code and telemetry). Quest UI crash: `src/lib/components/quests/QuestQuestion.svelte:68` calls `question.requiredStat.charAt(0)`, but the quest API strips `requiredStat` via `toSafeQuestion`, so the value is `undefined` and the badge render throws. `question` can also be undefined. 18 captures on `/quests` (`Cannot read properties of undefined (reading 'charAt')` and `t.question.requiredStat.charAt`). Fix: return a display label or the required stat with the current question, and guard the render.
- **C-7** (medium, open, telemetry). `HabitCountdown` expects `nextActiveDate` to be a string and calls `.split('-')` (`src/lib/components/habits/HabitCountdown.svelte:21`), while some callers appear to pass a `Date`, producing `nextActiveDate.split is not a function` and `getTime is not a function` on `/habits` and `/dashboard` (13 captures). Standardize the type across `HabitCard`, `HabitCountdown`, and the dashboard.

### Server and API

- **S-1** (high, open). Habit write endpoints trust unvalidated client bodies and do not verify `categoryId` ownership (`src/routes/api/habits/+server.ts`, `src/routes/api/habits/[id]/+server.ts`).
- **S-2** (medium, open). Quest and boost-stat endpoints convert every thrown `Error`, including DB failures, into HTTP 400 with the raw `error.message`, leaking internals and mislabeling errors.
- **S-3** (medium, open). No transaction around quest answer, progress, and completion, and no unique constraint on (user, day) for daily quests, so concurrent requests can duplicate or corrupt state.
- **S-4** (low, open). `/api/categories/defaults` inserts the default set on every call with no dedupe.
- **S-5** (medium, open). `forgot-username` looks up by raw email while registration stores lowercased emails, and a missing email service leaks a 500.

### Database

- **D-1** (high, open). Migration drift: redundant and underspecified unique indexes on `quest_questions` and `quest_answers` that `schema.ts` does not model, a hazard for `drizzle-kit generate/push`.
- **D-2** (medium, open). Missing constraints: no unique (user, habit, date) enforcement at write time beyond the tracker table, no unique (creature, slot) on equipment, nullable `habit.categoryId` and `habit.frequencyId` with no integrity rule.
- **D-3** (medium, open). Before any migration, snapshot the Turso production database and define a rollback path.

### Observability

- **O-1** (high, open). Server `handleError` captures every non-404, including expected 4xx, with no `distinctId` or context (`src/hooks.server.ts:103-105`).
- **O-2** (high, open). Client `handleError` emits three events per error plus global `error` and `unhandledrejection` listeners, which can capture the same failure again (`src/hooks.client.ts`).
- **O-3** (medium, open). `$pageview` is captured twice (config `capture_pageview` plus `+layout.svelte`).
- **O-4** (medium, open). `logger.error` always emits a PostHog `error_event`, including handled failures.
- **O-5** (medium, open). The home page creates and shuts down a PostHog node client per request and uses a fresh anonymous `distinctId` (`src/routes/+page.server.ts`).
- **O-6** (high, open). The contact form sends raw `name`, `email`, and `message` to PostHog (`src/routes/contact/+page.svelte`).
- **O-7** (medium, open). Missing source maps and no release or environment tagging to separate staging from production.
- **O-8** (high, open, verified in code and telemetry). The verification page polls `/api/check-verification-status` every 5 seconds with no `try/catch` or backoff (`src/routes/verify-email-pending/+page.svelte:47-58`). Any network failure becomes an unhandled promise rejection, captured by three separate mechanisms, producing 677 occurrences (the single largest noise source). It also polls forever until the tab is closed. Fix: catch, back off, stop after success or a cap, and do not capture expected transient failures.

### Auth and security

- **A-1** (medium, open). No session rotation on privilege change; `settings/password` does not invalidate other sessions while `settings` does.
- **A-2** (medium, open). Rate limiting is in-memory and per instance, so it is ineffective across horizontally scaled deployments.
- **A-3** (medium, open). The generic notification email path does not escape HTML, and `forgot-username` interpolates the username unescaped (currently low risk given username rules).
- **A-4** (low, open). Resend SDK error results are treated as success because `resend.emails.send` resolution is not inspected.
- **A-5** (low, open). Missing `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`, and `Cross-Origin-Resource-Policy` headers; HSTS is skipped when the app sees `http:` behind a proxy.

### Abuse (contact and waitlist)

- **P-1** (high, open). Contact form has no honeypot, rate limit, length caps, server-side email validation, or link filtering, and forwards email with a user-supplied `replyTo`.
- **P-2** (medium, open). Waitlist stores the raw `x-forwarded-for` value as the IP address, which is spoofable.

### Tests

- **T-1** (critical, open). The API "integration" tests mock `global.fetch` and assert on the mock; they pass with the handlers deleted. One targets a nonexistent `GET`.
- **T-2** (high, open). Zero coverage for any `+page.server.ts` load or form action.
- **T-3** (high, open). `auth.test.ts` tests a mock clone, not the real `auth.ts`.
- **T-4** (high, open). All component tests mock `mount` and never render the component.
- **T-5** (medium, open). The only real DB integration suite is always skipped because CI never sets `INTEGRATION_DB`.
- **T-6** (medium, open). Test code is excluded from typechecking and mocks are typed `any`, so broken tests pass CI.
- **T-7** (medium, open). No coverage tooling or thresholds; the README advertises `pnpm test:coverage`, which does not exist.
- **T-8** (low, open). `src/tests/db/test-db.ts` is dead and already stale versus `schema.ts`.

### Performance and reliability

- **R-1** (medium, open). Scheduler and cleanup run per instance with no jitter or persistence, so multi-instance deployments run cleanup concurrently.
- **R-2** (low, open). `MemoryCache` is unbounded between prunes and not shared across processes.
- **R-3** (low, open). Per-request PostHog client on the home page (see O-5).
