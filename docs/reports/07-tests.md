# Tests Audit: Representative vs False Confidence

Scope: read-only audit of the Vitest suite on branch `task/audit-updates` at commit `353f6c6`. Every file under `src/tests/`, `src/demo.spec.ts`, `vite.config.ts`, `src/tests/setup.ts`, `tsconfig.json`, `tsconfig.test.json`, and `.github/workflows/ci.yml` was read, together with the production modules each test claims to exercise. Counts are `it`/`test` blocks per file (229 total across 29 files, 4 inside a `describe.skipIf`). This report extends `docs/testing-strategy.md`: it does not repeat the target architecture, it maps exactly which tests are representative, which are false confidence, and what converting them requires. Severity uses critical/high/medium/low; status is open unless noted.

## Per-file verdicts

| File | Tests | What it really exercises | Verdict | Why |
| --- | --- | --- | --- | --- |
| `api/categories.api.test.ts` | 2 | A hand-assigned `global.fetch` mock; asserts the mock JSON. | false confidence | GET on a POST-only route; asserts a `color` field the real response never returns. Passes with the handler deleted. |
| `api/habits.api.test.ts` | 10 | `global.fetch` mocks for GET/POST/PUT/DELETE/complete. | false confidence | Never imports a handler; asserts literal response bodies. Passes with all habit routes deleted. |
| `api/habits.test.ts` | 4 | Object literals and `schema.habit.*` property truthiness. | false confidence | No DB, no handler; asserts data it defines locally. |
| `api/notifications.test.ts` | 9 | Real `POST` from `routes/api/notifications/+server.ts`; validation, legacy `type` mapping, error paths; `sendNotification` mocked at the boundary. | partial | Only API test that runs a real handler. Auth and the service are stubbed, and no DB effect is asserted. |
| `api/permanent-delete.api.test.ts` | 2 | `global.fetch` mock. | false confidence | Invokes nothing; asserts the mock. |
| `api/quests.api.test.ts` | 7 | Literal request/response shapes. | false confidence | No handler import; "reject invalid choice" compares literal arrays. |
| `api/register.api.test.ts` | 2 | `global.fetch` mock. | false confidence | Asserts status 201 while the real route returns 200; body shape differs (`user` versus `userId`). |
| `api/validate.api.test.ts` | 2 | `global.fetch` mock; posts to `/api/validate`. | false confidence | Route is GET-only and returns `{ available }`, not `{ session }`. |
| `auth.test.ts` | 3 | `generateSessionToken` from `mocks/mockAuth.ts`, a hand-written clone. | false confidence | Real `lib/server/auth.ts` is never loaded; the clone can drift silently. |
| `components/DailyProgressSummary.test.ts` | 6 | A locally re-declared percentage helper; `mount` replaced with `vi.fn()`. | false confidence | Component never renders; duplicate of the real `dailyHabitProgress` logic. |
| `components/HabitReminder.test.ts` | 4 | `localStorage` and notification-manager mocks. | false confidence | Never imports or renders the component. |
| `components/QuestCard.test.ts` | 6 | Locally re-declared `calculateQuestDifficulty`/`calculateTotalRewards`. | false confidence | `mount` mocked; no component import. |
| `db/schema.test.ts` | 7 | Real `schema` export; asserts columns are defined. | partial | Catches a deleted column, but not types, defaults, constraints, migrations, or queries. |
| `habitStatus.test.ts` | 19 | Real `lib/utils/habitStatus.ts` with fixed dates. | partial | Genuinely runs production logic, but pins no timezone and encodes the known-wrong cooldown model (C-1/C-3). |
| `integration/habit-completion-flow.test.ts` | 2 | A copy of `completeHabit` plus `global.fetch` and `$app/navigation`/`svelte-sonner` mocks. | false confidence | Re-declares the implementation; the real `lib/client/habit-actions.ts` is never imported. |
| `notifications/notification.test.ts` | 5 | Real `NotificationManager`, real store, fake timers, mock backend/plugin. | representative | Exercises real scheduling, store mutations, plugin fan-out. |
| `server/rateLimit.test.ts` | 12 | Real `rateLimit` + `MemoryCache`; `@sveltejs/kit` `error` mocked. | representative | Real windowing, key generation, `TRUST_PROXY` handling, headers. |
| `server/streaks/streakCalculation.test.ts` | 4 | Literals only. | false confidence | Imports no module; `_mockFrequency` values are unused. |
| `server/url.test.ts` | 11 | Real `getCanonicalBaseUrl`/`buildPasswordResetUrl`. | representative | Real env handling and URL encoding. |
| `services/emailVerificationService.test.ts` | 26 | Real validation, real HTML templates, `resend` stubbed at the network edge. | representative | Asserts real escaping and zod rules; only transport is mocked. Does not cover the result-inspection gap (A-4). |
| `services/notificationService.test.ts` | 5 | Real preference/routing logic; `db` and `resend` mocked. | partial | Real control flow, but DB is a fake and email send result is not asserted. |
| `services/questService.integration.test.ts` | 8 (4 run, 4 skipped) | Literal reward/stat math; a `skipIf(INTEGRATION_DB !== '1')` DB block. | false confidence | The 4 always-run tests import functions but assert local arithmetic; the DB block always skips and is not self-seeding. |
| `services/questService.test.ts` | 13 | Function existence, literal arrays, and try/catch blocks whose only assertion is inside `catch`. | false confidence | DB fully mocked; a throwing and a non-throwing function both pass. Does not test `answerQuestion` probability logic (C-2). |
| `stat-allocation.test.ts` | 4 | Real `lib/client/xp/stats.ts`. | partial | Real client code, but no server parity assertion, so the client/server divergence (C-4) is uncovered. |
| `utils/calculations.test.ts` | 19 | Real `lib/shared/xp/calculations.ts`. | representative | Real curve, thresholds, bonus caps. |
| `utils/dailyHabitProgress.test.ts` | 8 | Real `calculateDailyProgress`. | representative | Real rounding, undefined input, bounds. |
| `utils/html.test.ts` | 11 | Real `escapeHtml`. | representative | Real XSS escaping. |
| `utils/questHelpers.test.ts` | 9 | Literals only. | false confidence | Never imports `calculateSuccessChance`; re-derives the formula with different bounds (10..90 versus base-50/-5-per-point). |
| `src/demo.spec.ts` | 1 | `1 + 2 === 3`. | false confidence | Generated scaffold noise; add signal or delete. |

Support files (not `.test.ts`, so not collected, but they shape the false confidence):

| File | Role | Problem |
| --- | --- | --- |
| `tests/mocks/mockAuth.ts` | Auth clone | Stand-in for `auth.ts`; drifts by design. |
| `tests/mocks/api.ts` | Fake API router | Not imported by any test; dead. |
| `tests/mocks/data.ts` | Fixtures | Used only by false-confidence tests. |
| `tests/mocks/notifications.ts` | Notification mock | Used by the never-rendering component tests. |
| `tests/svelte.d.ts` | Ambient typings | Declares fake `$lib/server/db`, `$lib/server/xp/calculations`, `$lib/utils/dailyHabitProgress`, `$lib/server/services/questService` modules typed `any`, shadowing the real modules for every test. |
| `tests/db/test-db.ts` | Legacy in-memory DB | Dead and stale (T-8). |
| `tests/templates/*.template.ts` | Copy-paste templates | Contain the fetch-mock anti-pattern; would propagate it if used. |
| `tests/test-resend.js` | Manual script | Not a test; contains a real email address in source. |

## Findings

### T-1. API "integration" tests mock `global.fetch` and assert on the mock
Severity: critical. Status: open.
Evidence: `src/tests/api/categories.api.test.ts`, `habits.api.test.ts`, `permanent-delete.api.test.ts`, `register.api.test.ts`, `validate.api.test.ts` all set `global.fetch = vi.fn().mockResolvedValue(...)` and then assert the returned literal. `categories.api.test.ts:19` calls `GET /api/categories/defaults`, which only exports `POST` (`src/routes/api/categories/defaults/+server.ts:6`). `validate.api.test.ts:27` posts to `/api/validate`, which only exports `GET` (`src/routes/api/validate/+server.ts:78`). `register.api.test.ts:24` expects 201 and a `user` body; the route returns 200 with `{ success, userId, redirectUrl, emailVerificationSent }` (`register/+server.ts:144`).
Impact: Six files (27 tests) pass with every route handler deleted. Real status codes, validation, ownership, rate limiting, and DB effects are unverified. CI is green while the API is unguarded.
Proposed fix: Replace all five with direct handler-invocation tests using `createRequestEvent` (see Conversion plan) and a real migrated DB. Delete each fake-fetch file as its replacement lands.

### T-2. Zero coverage for `+page.server.ts` load functions and form actions
Severity: high. Status: open.
Evidence: No test imports any `+page.server.ts` (grep across `src/tests` returns none; the only route import is `routes/api/notifications/+server`). All 19 `+page.server.ts` files plus `+layout.server.ts` are unexercised: login, logout, dashboard, habits, habits/new, habits/[id]/edit, habits/deleted, character/details, contact, forgot-password, forgot-username, reset-password/[token], settings, settings/password, verify-email/[token], verify-email-pending, waitlist, waitlist/thank-you.
Impact: Session gating, redirects, unverified-email gates, category defaulting, password reset, verification side effects, and contact/waitlist form handling have never run in a test. This is the largest correctness blind spot and matches the audit backlog flows 1, 3, and 6.
Proposed fix: After the DB and event helpers exist, import `load`/`actions` and call them with constructed events. Start with login, dashboard, habits, settings.

### T-3. `auth.test.ts` tests a hand-written clone
Severity: high. Status: open.
Evidence: `src/tests/auth.test.ts:2` imports `generateSessionToken` from `../tests/mocks/mockAuth`, not `$lib/server/auth`. Two of its three tests assert properties of an object literal it builds locally (`auth.test.ts:22-74`).
Impact: The token generation, session hashing, expiry, renewal, cookie flags, and the password/email token helpers in the real module have no test. The clone can diverge from production with no failure.
Proposed fix: Delete `auth.test.ts` and `mocks/mockAuth.ts`. Test real `auth.ts` against the test DB using the `dbInstance` injection parameter (`auth.ts:18,29,72,105`), covering create/validate/expire/renew/invalidate and cookie secure/path flags.

### T-4. Component tests mock `mount` and never render
Severity: high. Status: open.
Evidence: `DailyProgressSummary.test.ts:4-11` and `QuestCard.test.ts:4-10` replace `mount` with `vi.fn()` and assert locally re-declared helpers; `HabitReminder.test.ts` never imports the component and only asserts its own mocks (for example `HabitReminder.test.ts:66-81`).
Impact: Real component markup, reactivity, event handlers, and the known render crash in `QuestQuestion.svelte` (C-6) are untested. `DailyProgressSummary` duplicates logic already covered by `dailyHabitProgress.test.ts`.
Proposed fix: Render with `@testing-library/svelte` and assert the DOM. Mock only `$lib/notifications/NotificationManager`, `svelte-sonner`, and fetch.

### T-5. The only real DB integration suite is always skipped
Severity: medium. Status: open.
Evidence: `src/tests/services/questService.integration.test.ts:10` gates on `describe.skipIf(process.env.INTEGRATION_DB !== '1')`. `ci.yml` never sets `INTEGRATION_DB` (test step `ci.yml:39-40`). `vite.config.ts:22` points the DB at `file:./local-test.db`, which has no migrations applied.
Impact: No test ever executes a Drizzle query against a migrated schema, so schema/query drift ships undetected.
Proposed fix: See T-14; set `INTEGRATION_DB=1` only after the suite is self-contained, or delete the guard and always run against the new helper.

### T-6. Tests are excluded from typechecking and mocks are typed `any`
Severity: medium. Status: open.
Evidence: `tsconfig.json:17` excludes `src/tests/**/*` and `**/*.test.ts`. `tsconfig.test.json` exists but no script or CI step uses it (`package.json:10` runs `svelte-check --tsconfig ./tsconfig.json`). `src/tests/svelte.d.ts` types DB, schema, and quest helpers as `any`.
Impact: Broken imports, wrong mock shapes, and API/signature drift pass CI. Several tests already assert shapes the production code does not return (T-1), which typechecking would have caught.
Proposed fix: Add a `check:tests` script running `svelte-check --tsconfig ./tsconfig.test.json`, remove the fake module declarations from `svelte.d.ts` (keep only `*.svelte`), and run it in CI. See T-13.

### T-7. No coverage tooling despite the README advertising it
Severity: medium. Status: open.
Evidence: `README.md:115-116` documents `pnpm test:coverage`; `package.json` has no such script and no `@vitest/coverage-v8` dependency. `vite.config.ts` sets no `coverage` block.
Impact: Coverage cannot be measured or ratcheted; regressions in test quality are invisible.
Proposed fix: Add `@vitest/coverage-v8`, a `test:coverage` script, a `coverage` block with `provider: 'v8'`, `include: ['src/**']`, `exclude` tests, and thresholds with a ratchet. See CI and tooling fixes.

### T-8. `src/tests/db/test-db.ts` is dead and stale
Severity: low. Status: open.
Evidence: No test imports `db/test-db.ts`. It hand-creates 12 tables; `schema.ts` defines 21. Missing: `creature_equipment`, `password_reset_token`, `email_verification_token`, `user_key`, `user_preferences`, `contacts`, `daily_habit_tracker`, `user_waitlist`, and `email_verified`/`email_verified_at` on `user`. Wrong shapes include `creature_stats` defaults of 0 (real 10) with no `stat_boost_points`, `quest_questions.success_chance` (not in schema), and `quest_instances` missing `stat_checks_passed`.
Impact: A future author who imports it gets a schema that cannot run production queries, producing misleading failures. It actively hides the migration-drift risk (D-1).
Proposed fix: Delete it when the real helper from the Conversion plan lands.

### T-9. `habit-completion-flow.test.ts` copies the implementation
Severity: high. Status: open.
Evidence: `src/tests/integration/habit-completion-flow.test.ts:22-58` re-declares `completeHabit` "since we can't import it", then asserts on `global.fetch` and the mocks. The real function is `src/lib/client/habit-actions.ts:26`.
Impact: The test validates its own copy, not the client action. It would still pass if `habit-actions.ts` changed or broke, and the real response-type mismatch with the route (the route returns no `streakUpdate`, but `HabitCompletionResponse` requires it) is invisible.
Proposed fix: Delete it. Rewrite against the real `completeHabit` with fetch stubbed and a typed response, or cover the route directly and drop the client wrapper test.

### T-10. Literal-only assertions
Severity: high. Status: open.
Evidence: `server/streaks/streakCalculation.test.ts` imports nothing and asserts local literals (for example lines 15-22). `utils/questHelpers.test.ts:24-85` re-derives reward and success math instead of calling `calculateSuccessChance` (`questHelpers.ts:186`). `api/quests.api.test.ts` asserts `expect({...}).toBeDefined()`. `api/habits.test.ts` asserts property existence of local objects. `services/questService.test.ts:118-208` and `services/questService.integration.test.ts:46-95` duplicate the reward/stat arithmetic.
Impact: Four to five files (about 40 tests) can never fail on a production regression. The real `answerQuestion` deterministic-vs-probability bug (C-2) is precisely what these tests approximate and miss.
Proposed fix: Delete the literal suites; assert real functions against the DB or the shared calculators. For quests, test `answerQuestion`/`completeQuest` end to end with a seeded DB and an injected RNG.

### T-11. Assertions that only fire inside `catch`
Severity: medium. Status: open.
Evidence: `services/questService.test.ts:61-115` wraps each call in `try { ... } catch (error) { expect(error).toBeDefined(); }`. A function that resolves normally skips the assertion entirely.
Impact: The suite is structurally incapable of failing when the guarded call succeeds, so it provides negative assurance for the exact functions it names.
Proposed fix: Replace with `await expect(fn(...)).rejects.toThrow(...)` for error cases and explicit success-path assertions for valid inputs (see `questService.integration.test.ts:27-42` for the correct shape).

### T-12. CI workflow defects
Severity: medium. Status: open.
Evidence:
- `ci.yml:67-73` creates a case-sensitivity symlink `XpBar.svelte` for `XPBar.svelte`. All imports use `XPBar.svelte` and the file exists (`src/routes/dashboard/+page.svelte:16`, `src/routes/character/details/+page.svelte:11`), so the step is dead work.
- `.github/workflows/codeql.yml` watches `branches: ["master"]` on push and pull_request, but the repository default branch is `main`.
- `codeql.yml` pull_request trigger is `master` only, so PR scanning never runs.
- `deploy-staging.yml` runs Node 18, uploads `./build` to GitHub Pages (an adapter-node build is not a Pages artifact), and triggers on a `staging` branch.
Impact: The symlink step is misleading maintenance surface. CodeQL has never scanned `main` or any PR. The staging workflow is broken or misleading.
Proposed fix: Remove the symlink step; change CodeQL branches to `main` (or `[main, 'task/**']` as desired); fix or delete `deploy-staging.yml`.

### T-13. Ambient test typings shadow real modules
Severity: medium. Status: open.
Evidence: `src/tests/svelte.d.ts:79-132` declares fake `$lib/server/db`, `$lib/server/db/schema`, `$lib/server/xp/calculations`, `$lib/utils/dailyHabitProgress`, and `$lib/server/services/questService` modules. `setup.ts:3` imports this file globally. Combined with `tsconfig.test.json` inclusion, these `any` shapes would hide real type errors the moment tests are typechecked (T-6).
Impact: When tests are added to typechecking, the fakes will mask genuine mismatches. They also let `vi.mock('../../lib/server/db', ...)` typecheck against a fake `MockDB`.
Proposed fix: Replace with a single `declare module '*.svelte'` block. Type the DB mock as the real `LibSQLDatabase<typeof schema>` from the test helper.

### T-14. The integration suite is not self-contained, so unskipping it is not enough
Severity: medium. Status: open.
Evidence: `questService.integration.test.ts:11-25` treats `FOREIGN KEY constraint failed` or `No quest templates available` as "skip" and returns, so it silently passes without setup even when run. It targets the module-level `db`, which `vite.config.ts:22-25` points at an unmigrated `file:./local-test.db`. There is no seeding of templates, users, or stats.
Impact: Flipping `INTEGRATION_DB=1` in CI today would run four tests that either pass trivially or depend on an unseeded file. It would not add real coverage.
Proposed fix: Rebuild the DB block on `createTestDb()` plus seed helpers, assert concrete rows and effects, and remove the catch-and-return escape hatch.

### T-15. XP and stats have no shared client/server expectation
Severity: medium. Status: open.
Evidence: `stat-allocation.test.ts` tests only `src/lib/client/xp/stats.ts`. The server copy `src/lib/server/xp/stats.ts` differs: `getTotalStatPoints` uses `calculateStatCost`, the client version lacks the `remainingPoints <= 0` guard (`client/xp/stats.ts:57` versus `server/xp/stats.ts:50`), and `calculateHealth` rounds differently (`client:154` versus `server:177`). No test asserts parity. `utils/calculations.test.ts` covers only the shared XP curve, not allocation.
Impact: The divergence (C-4) is invisible, and whichever copy a surface uses governs behavior untested.
Proposed fix: Add a shared parameterized suite asserting byte-identical results for both modules, then remove or reconcile the duplicate.

### T-16. Error tracking and observability paths are untested
Severity: low. Status: open.
Evidence: No test imports `src/lib/utils/errorTracking.ts`, `src/lib/utils/logger.ts`, `src/hooks.client.ts`, `src/hooks.server.ts` (`handleError`), or `src/lib/plugins/PostHog.ts`. The 677-count poll failure (O-8) and the triple-capture defect (O-1, O-2) have no regression test.
Impact: Fixes to error handling cannot be pinned; the dominant production noise source can regress silently.
Proposed fix: Test `handleError` and the verify-email poll with a stubbed PostHog capture, asserting one capture per failure and no capture for expected transient errors.

## Coverage-gap matrix

Legend: `yes (real)` runs production code with a real DB or real module; `partial` runs real logic with a boundary mocked; `no` no test.

### JSON API routes

| Route | Tested? | How |
| --- | --- | --- |
| `POST /api/categories/defaults` | no | Fetch self-mock only; GET on a POST route. |
| `POST /api/character/boost-stat` | no | None. |
| `GET /api/character/stat-boost-points` | no | None. |
| `GET /api/check-verification-status` | no | None. |
| `GET /api/habits` | no | Fetch self-mock only. |
| `POST /api/habits` | no | Fetch self-mock only. |
| `GET /api/habits/[id]` | no | Fetch self-mock only. |
| `PUT /api/habits/[id]` | no | Fetch self-mock only. |
| `DELETE /api/habits/[id]` | no | Fetch self-mock only. |
| `POST /api/habits/[id]/complete` | no | Fetch self-mock and a copied client wrapper. |
| `DELETE /api/habits/[id]/permanent-delete` | no | Fetch self-mock only. |
| `POST /api/notifications` | partial | Real handler; service and auth mocked. |
| `POST /api/quests/[questId]/activate` | no | Literal test only. |
| `POST /api/quests/[questId]/answer` | no | Literal and mocked-DB tests only. |
| `GET /api/quests/[questId]/progress` | no | Literal test only. |
| `GET /api/quests/daily` | no | Literal and skipped-DB tests only. |
| `POST /api/quests/reset` | no | None. |
| `POST /api/register` | no | Fetch self-mock only. |
| `POST /api/resend-verification` | no | None. |
| `GET /api/validate` | no | Fetch self-mock posting to a GET route. |
| `POST /api/waitlist` | no | None. |

### `+page.server.ts` loads and actions

| Route | Tested? | How |
| --- | --- | --- |
| `+layout.server.ts` | no | None. |
| `+page.server.ts` (home redirect) | no | None. |
| `login` load and action | no | None. |
| `logout` action | no | None. |
| `dashboard` load | no | None. |
| `habits` load | no | None. |
| `habits/new` load | no | None. |
| `habits/[id]/edit` load | no | None. |
| `habits/deleted` load | no | None. |
| `character/details` load | no | None. |
| `contact` action | no | None. |
| `forgot-password` action | no | None. |
| `forgot-username` action | no | None. |
| `reset-password/[token]` load and action | no | None. |
| `settings` load, `updatePassword`, `updateNotifications` | no | None. |
| `settings/password` load and action | no | None. |
| `verify-email/[token]` load | no | None. |
| `verify-email-pending` load | no | None. |
| `waitlist` load | no | None. |
| `waitlist/thank-you` load | no | None. |

### Server services and cross-cutting flows

| Area | Tested? | How |
| --- | --- | --- |
| `auth.ts` session lifecycle (create, validate, expire, renew, invalidate) | no | Clone tested only (T-3). |
| `auth.ts` token lifecycles (password reset, email verification, cleanup) | no | None. |
| `password.ts` hashing/verification | no | None. |
| `date.ts` formatting and timezone boundary | no | None. |
| `dailyHabitTracker.ts` (`ensureDailyTrackerEntries`, `markHabitCompleted`, `getDailyProgressStats`, cleanup) | no | None; `dailyHabitProgress.ts` client fallback is tested instead. |
| `questService.ts` (`getDailyQuest`, activate, answer, complete, spend, reset) | no | Mocked DB and literal math (T-10, T-11). |
| `notificationService.ts` preferences and routing | partial | Real logic, fake DB, send result not asserted. |
| `emailVerificationService.ts` validation and templates | yes (real) | Real module; Resend mocked. Delivery result inspection (A-4) untested. |
| `streaks/calculations.ts` | no | Literal-only test; module is dead code (C-1). |
| `rateLimit.ts` | yes (real) | Real windowing and proxy handling. |
| `cache/MemoryCache.ts` | partial | Exercised indirectly via rate limiting; no direct TTL/prune test. |
| `tasks/scheduler.ts`, `tasks/cleanup.ts` | no | None. |
| `securityHeaders.ts` | no | None. |
| XP curve (`shared/xp/calculations.ts`) | yes (real) | Real functions. |
| Stats allocation (client and server) | partial | Client only; no parity (T-15). |
| Daily progress (server tracker) | no | Client fallback tested; server path not. |
| Client `habit-actions.ts` | no | Copied into a test (T-9). |
| `NotificationManager` and store | yes (real) | Real scheduling/store; backend mocked. |
| Error tracking (`errorTracking.ts`, `logger.ts`, `hooks.client.ts`, `hooks.server.ts`, `plugins/PostHog.ts`) | no | None (T-16). |
| Components (all under `src/lib/components`) | no | Component tests never render (T-4). |

## Conversion plan

Ordered so each step unblocks the next. Every new helper lives under `src/tests/helpers/` and is itself tested.

### 1. Real in-memory libsql helper with real migrations

`src/tests/helpers/test-db.ts`:

```ts
import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as schema from '$lib/server/db/schema';

export type TestDb = {
  db: LibSQLDatabase<typeof schema>;
  client: Client;
  reset: () => Promise<void>;
  close: () => Promise<void>;
};

export async function createTestDb(): Promise<TestDb> {
  const dir = mkdtempSync(join(tmpdir(), 'coh-test-'));
  const client = createClient({ url: `file:${join(dir, 'test.db')}` });
  await client.execute('PRAGMA foreign_keys = ON');
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: 'migrations' });
  return {
    db,
    client,
    reset: async () => {
      for (const table of schemaTablesReverse()) {
        await client.execute(`DELETE FROM ${table}`);
      }
    },
    close: async () => {
      client.close();
      rmSync(dir, { recursive: true, force: true });
    }
  };
}
```

Notes:
- Use a unique temp file, not `file::memory:`, because libsql in-memory is per-connection and cannot be shared with the module-level client.
- `migrations` is the real Drizzle output folder (`drizzle.config.ts` sets `out: './migrations'`), so tests run the same DDL production runs. Resolve the folder relative to the repo root, not cwd, and assert the migration table exists.
- Seed helpers: `seedUser`, `seedCreature` (with stats), `seedHabit`, `seedQuestTemplate`, `seedQuestQuestions`. One transaction per seed call.

Pointing the app at the test DB: services import the module-level `db` and do not all accept injection, so use a mocking boundary that returns the real database rather than a fake:

```ts
// per suite, hoisted
import { vi } from 'vitest';
let testDb: TestDb;
vi.mock('$lib/server/db', async () => {
  const { createTestDb } = await import('./helpers/test-db');
  testDb = await createTestDb();
  return { db: testDb.db };
});
```

This is a module-boundary mock, but the mocked value is a real migrated Drizzle client, so queries, constraints, and effects are genuine. Where injection already exists (`auth.ts` `dbInstance`), pass `testDb.db` directly and skip the mock.

### 2. `createRequestEvent` helper

`src/tests/helpers/request-event.ts`:

```ts
import type { RequestEvent } from '@sveltejs/kit';

export type EventOptions = {
  method?: string;
  url?: string;
  body?: unknown;
  form?: Record<string, string>;
  params?: Record<string, string>;
  auth?: { user: { id: string }; session: unknown } | null;
  clientAddress?: string;
  headers?: Record<string, string>;
};

export function createRequestEvent(o: EventOptions = {}): RequestEvent & {
  cookies: Map<string, string>;
} {
  const url = new URL(o.url ?? 'http://localhost:5175/');
  const headers = new Headers(o.headers);
  let request: Request;
  if (o.form) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(o.form)) fd.set(k, v);
    request = new Request(url, { method: o.method ?? 'POST', body: fd });
  } else {
    request = new Request(url, {
      method: o.method ?? 'GET',
      headers: { 'content-type': 'application/json', ...(o.headers ?? {}) },
      body: o.body === undefined ? undefined : JSON.stringify(o.body)
    });
  }
  const jar = new Map<string, string>();
  const event = {
    url,
    request,
    params: o.params ?? {},
    route: { id: url.pathname },
    locals: { auth: async () => o.auth ?? null, user: o.auth?.user ?? null, session: o.auth?.session ?? null },
    getClientAddress: () => o.clientAddress ?? '127.0.0.1',
    setHeaders: () => {},
    fetch: globalThis.fetch,
    platform: {},
    cookies: {
      get: (n: string) => jar.get(n),
      set: (n: string, v: string) => jar.set(n, v),
      delete: (n: string) => jar.delete(n),
      serialize: () => ''
    }
  } as unknown as RequestEvent;
  return Object.assign(event, { cookies: jar });
}
```

Assert on `response.status`, `await response.json()`, `set-cookie` via the jar, and the resulting DB rows.

### 3. Invoking `+page.server.ts` load and actions

```ts
import { load as loginLoad, actions } from '../../routes/login/+page.server';
const event = createRequestEvent({ url: 'http://localhost:5175/login' });
const data = await loginLoad(event as never);
```

For actions, `const res = await actions.updatePassword(event)`; a thrown `redirect`/`fail` is a value to assert on (`isRedirect`, `isActionFailure` from `@sveltejs/kit`). Seed an unverified and a verified user to cover the dashboard/verify redirects. Assert the session cookie is set on login and cleared on logout.

### 4. Real component rendering

- Use `import { render, screen } from '@testing-library/svelte'` and `render(Component, { props })`.
- Keep `environment: 'jsdom'` only for component files, or switch to `environmentMatchGlobs`/per-file `// @vitest-environment jsdom` so server and DB suites run in `node`.
- Mock only boundaries: `$lib/notifications/NotificationManager`, `svelte-sonner`, and fetch.
- `vite.config.ts` already inlines `bits-ui` and `lucide-svelte`; keep that.
- Add a regression test for the `QuestQuestion` badge: render with a question lacking `requiredStat` and assert no throw (C-6).

### 5. Timezone pinning

- Set `process.env.TZ = 'America/Chicago'` as the first line of `src/tests/setup.ts` (before any `Date` is used) and remove ad hoc timezone assumptions from tests.
- Add a CI matrix that reruns the date-sensitive suites (`habitStatus`, `dailyHabitTracker`, tracker math) under `UTC`, `America/Chicago`, and `Asia/Kathmandu` (a half-hour offset) to expose the local `getDay()` versus UTC `toISOString` divergence (C-3).
- Prefer `vi.setSystemTime()` for "now" in tracker and completion tests.

### 6. Tests to delete as replacements land

Delete outright once the corresponding replacement is merged (do not keep alongside):

- `src/tests/api/categories.api.test.ts`, `habits.api.test.ts`, `permanent-delete.api.test.ts`, `register.api.test.ts`, `validate.api.test.ts`.
- `src/tests/api/quests.api.test.ts`, `src/tests/api/habits.test.ts`.
- `src/tests/integration/habit-completion-flow.test.ts`.
- `src/tests/auth.test.ts` and `src/tests/mocks/mockAuth.ts`.
- `src/tests/server/streaks/streakCalculation.test.ts`.
- `src/tests/utils/questHelpers.test.ts` (rewrite to call `calculateSuccessChance`).
- The business-logic and catch-only blocks of `src/tests/services/questService.test.ts`; keep only real replacements.
- `src/tests/components/DailyProgressSummary.test.ts` and `QuestCard.test.ts` (replaced by renders).
- `src/tests/db/test-db.ts`, `src/tests/mocks/api.ts`, `src/tests/templates/*.template.ts`, and `src/demo.spec.ts`.
- `src/tests/mocks/data.ts` once the fake-fetch suites are gone; replace with seed helpers.

## CI and tooling fixes

1. Integration DB. Either set `INTEGRATION_DB=1` in the `ci.yml` test step and rewrite the suite on `createTestDb()` (T-14), or remove the `skipIf` guard entirely and always run the DB suite. Do not flip the env var before the suite is self-contained. Expose a `test:integration` script if a separate job is preferred.
2. Coverage. Add `"@vitest/coverage-v8"` to devDependencies and `"test:coverage": "vitest run --coverage"`. Add to `vite.config.ts`:

   ```ts
   coverage: {
     provider: 'v8',
     reporter: ['text', 'lcov'],
     include: ['src/**'],
     exclude: ['src/tests/**', '**/*.d.ts', 'src/routes/**/+page.svelte'],
     thresholds: { statements: 40, branches: 35, functions: 40, lines: 40 }
   }
   ```

   Start modest and ratchet upward as the conversion lands. Run it in CI and upload `lcov` if desired.
3. Typecheck tests. Add `"check:tests": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.test.json"` to `package.json` and a CI step after `pnpm run check`. Update `tsconfig.test.json` to extend the SvelteKit config and include `src/tests/**`. Remove the ambient fake module declarations from `src/tests/svelte.d.ts` (T-13) so real types flow.
4. Remove the stale symlink step. Delete the "Fix case sensitivity issues" step from `ci.yml:67-73`; all imports target the existing `XPBar.svelte`.
5. CodeQL. Change `codeql.yml` push and pull_request branches from `["master"]` to `["main"]` (add `task/**` to pull_request if PR scanning is wanted).
6. Adjacent: fix or delete `deploy-staging.yml` (Node 18, GitHub Pages on an adapter-node build, `staging` branch trigger). Not required by this audit but currently misleading.

## Uncertainty

- Test counts differ from `docs/testing-strategy.md` (221 tests, 29 files). This audit finds 229 `it`/`test` blocks across 29 files (including `demo.spec.ts`) with 4 skipped. The 8-block discrepancy may come from counting `test.each` expansions or a different revision; verify with `vitest run --reporter=verbose` on a clean checkout.
- The `emailVerificationService.test.ts` and `notificationService.test.ts` suites pass because `vi.mock('resend')` intercepts the provider import. Whether they truly exercise `ResendEmailProvider` depends on Vitest module resolution order; the transport result (`A-4`) is unasserted either way.
- `stat-allocation.test.ts` imports the client module, but the audit could not confirm which module character creation actually consumes at runtime; the parity suite in T-15 should establish that first.
- Route-level counts are per module file. Several API files expose multiple methods (`habits` GET/POST, `habits/[id]` GET/PUT/DELETE); method-level coverage is zero for all of them except notifications POST.
- This audit is static. No test run was executed in this session; verdicts are from reading code and imports.

## Cross-references

- `docs/testing-strategy.md`: baseline, anti-patterns, target harness, priority flows, external boundaries. This report is the file-by-file evidence and the executable conversion detail behind it.
- `docs/audit-backlog.md`: T-1 through T-8 (this report reuses those IDs and adds T-9 through T-16), plus C-1, C-2, C-3, C-4, C-6, D-1, O-1, O-2, O-8, A-2, A-4.
- `docs/domain-rules.md`: streak reset rule and XP curve used to judge whether tests assert intended behavior.
- `docs/api-reference.md`: route inventory and auth/validation/rate-limit gaps that the coverage-gap matrix maps to untested code.
- `docs/reports/05-correctness.md`: correctness findings this suite should pin once converted.
