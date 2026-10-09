# Testing Strategy

Goal: tests must fail when production would break. Today they mostly do not. This document describes the current state, the anti-patterns to eliminate, and the target harness.

## Current state (baseline)

- 29 test files, 221 tests: 217 pass, 4 skipped.
- The 4 skipped tests are the only real DB integration tests (`src/tests/services/questService.integration.test.ts`), gated behind `describe.skipIf(process.env.INTEGRATION_DB !== '1')`. CI never sets that variable, so they always skip.
- `pnpm test` used to hang locally because the script passed `--run` after `--` to Vitest, which left Vitest in watch mode. It only worked in CI because `CI=true` forces run mode. Fixed to `vitest run`.
- Only a handful of files exercise real application code: `server/rateLimit.test.ts`, `server/url.test.ts`, `utils/calculations.test.ts`, `utils/html.test.ts`, `habitStatus.test.ts`, parts of `services/notificationService.test.ts`, `services/emailVerificationService.test.ts`, `api/notifications.test.ts`, `db/schema.test.ts`, `stat-allocation.test.ts`, and `notifications/notification.test.ts`.
- Test isolation was added in Phase 0: `vite.config.ts` and `src/tests/setup.ts` force `TURSO_DATABASE_URL` to a throwaway file (`file:./local-test.db`) and blank the auth token, so `dotenv` cannot load the live Turso credentials from `.env`.

## Anti-patterns to remove

1. **Mocking `global.fetch` and asserting on the mock.** `src/tests/api/*.test.ts` assign `global.fetch = vi.fn().mockResolvedValue(X)` and then assert the result equals `X`. They pass with the route handlers deleted. `categories.api.test.ts` even tests a `GET` that does not exist (the route is `POST` only), and `register.api.test.ts` posts a body the real endpoint rejects.
2. **Copying the implementation into the test.** `integration/habit-completion-flow.test.ts` re-declares `completeHabit` locally instead of importing `src/lib/client/habit-actions.ts`.
3. **Literal-only assertions.** `server/streaks/streakCalculation.test.ts`, `utils/questHelpers.test.ts`, `api/quests.api.test.ts`, `api/habits.test.ts`, and the business-logic blocks of `services/questService.test.ts` build a literal and assert the same literal. They test nothing.
4. **Assertions only inside `catch`.** `services/questService.test.ts` asserts `expect(error).toBeDefined()` in `catch`, so a function that never throws still passes.
5. **Component tests that never mount.** All three component tests replace `mount` with `vi.fn()` and assert on locally re-declared helpers. The components are never rendered.
6. **Testing a mock clone instead of the real module.** `auth.test.ts` imports `src/tests/mocks/mockAuth.ts`, a hand-written copy of `src/lib/server/auth.ts`.
7. **Mocks typed as `any`.** `src/tests/svelte.d.ts` types `db` and `schema` as `any`, and `tsconfig.json` excludes `src/tests/**` from typechecking, so broken test imports are invisible to `pnpm run check`.
8. **Dead test infrastructure.** `src/tests/db/test-db.ts` builds an in-memory DB by hand, but no test imports it, and it is already stale versus `schema.ts` (missing `contacts`, `daily_habit_tracker`, `user_waitlist`, `user_preferences`, token tables, and `creature_equipment`; wrong columns such as `quest_answers.is_correct`, `quest_questions.success_chance`, and `creature_stats` defaults).
9. **No coverage tooling.** The README advertises `pnpm test:coverage`, but there is no coverage provider and no such script.

## Target harness

### Environments

- Run server and DB tests in a Node environment; run component tests in jsdom. Use per-file docblocks (`// @vitest-environment node`) or `environmentMatchGlobs` instead of a global jsdom default.
- Pin the timezone in setup (for example `process.env.TZ = 'America/Chicago'`) so date logic is deterministic, and add a second run with a different zone for the timezone-sensitive suites if practical.

### Real database, no mocks

- Replace `src/tests/db/test-db.ts` with a helper that creates a throwaway libsql database and applies the real migrations with `drizzle-orm/libsql/migrator` against the `migrations` folder, so tests exercise the same schema production runs.
- Expose `createTestDb()` returning `{ db, client, reset, close }`, plus seed helpers for a user, creature, stats, habits, and quest templates.
- Point the application's `db` module at the test database by overriding `TURSO_DATABASE_URL` per suite, or by injecting `db` where the code already accepts it. Prefer the existing injection points (for example `auth.ts` accepts a `dbInstance`) over global module mocking.

### Route handlers

- Import the exported `GET`/`POST`/`PUT`/`DELETE` from `src/routes/api/**/+server.ts` and call them with a real `RequestEvent` built by a shared `createRequestEvent` helper (method, url, params, request body, cookies, `locals.auth`, `getClientAddress`).
- Assert on status codes, response bodies, and database effects. Cover unauthorized, not-found, validation-failure, duplicate, and rate-limited paths.

### Page loads and form actions

- Import `load` and `actions` from every `+page.server.ts` and call them directly with a constructed event. These paths (login, dashboard, habits, settings, contact, verify-email, reset-password, forgot-password, forgot-username, waitlist) currently have zero coverage.

### Services and utilities

- Test the real `questService`, `notificationService`, `emailVerificationService`, `dailyHabitTracker`, `auth`, `password`, and `date` modules against the test database and stubbed external providers (Resend, PostHog) only at the network boundary.
- Delete the duplicated client/server XP divergence by testing both against a shared expectation, then fixing whichever is wrong.

### Components

- Render the real component with `@testing-library/svelte` and assert on the DOM, not on a copied helper. Mock only external boundaries (`fetch`, PostHog, navigation) and the notification manager.

### Isolation and safety

- Tests must never reach Turso production or `local.db`. The Phase 0 guard enforces this; keep it and add a test that asserts the guard.

## External boundary stubs

Only stub the true boundaries:

- Resend (`resend.emails.send`) at the network layer, including the error-result path that currently returns success.
- PostHog (`posthog.capture`, `captureException`) with assertion helpers.
- `fetch` for the notification API backend only, with the real handler under test where possible.

## Coverage and CI

- Add `@vitest/coverage-v8` and a `test:coverage` script. Set `coverage.thresholds` starting modest, then ratchet.
- CI: set `INTEGRATION_DB=1` (or remove the skip guard) so DB tests run; fix `codeql.yml` to watch `main`; fix or remove the broken `deploy-staging.yml`; remove the stale case-sensitivity symlink step in `ci.yml`.
- Include tests in typechecking (`tsconfig.test.json` exists but is unused) so broken mocks fail the build.

## Priority flows (owner-approved order)

1. Signup and login (validation, session creation, cookies).
2. Habit create and complete (XP, streak, daily tracker effects).
3. Streaks and daily progress (including the reset-on-miss rule).
4. Quest lifecycle (generate, activate, answer with probability-based stat checks, complete, idempotency, rewards).
5. Contact and waitlist (validation, rate limit, storage, spam handling).
6. Settings and password reset.
7. XP math and the stats system.

## Migration plan

- Keep the Phase 0 isolation and baseline.
- Add the DB helper and `createRequestEvent`, then convert one suite as a reference (recommend `api/habits` and `api/habits/[id]/complete`).
- Delete the fake-fetch API tests, the copied-implementation integration test, and the literal-only suites as their real replacements land.
- Convert component tests to render real components.
- Wire coverage and CI, then ratchet thresholds as gaps close.
