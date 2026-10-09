# Architecture

Branch: `task/audit-updates`. This document describes how Creatures of Habit is put
together: the stack, the request lifecycle, the client and server boundary, a module map
by feature, end-to-end data flows, and the external services it depends on. It is a
reference. Where behavior is wrong, the bug is noted and the fix is tracked in
`docs/audit-backlog.md`.

## 1. System overview and tech stack

Creatures of Habit is a gamified habit tracker. A user builds a creature, creates habits,
completes them for experience, keeps streaks, answers a daily quest, and spends stat
boost points.

- Runtime and framework: SvelteKit 2.21 on Svelte 5.33, built with Vite 5 and
  `@sveltejs/adapter-node` (`svelte.config.js:1`, `package.json:40`). Production runs a
  Node server, not a static export.
- Rendering and UI: Svelte 5 runes only (`$props`, `$state`, `$derived`, `$effect`,
  `{@render children?.()}`), Tailwind CSS, shadcn-svelte and bits-ui components, Lucide
  icons, and svelte-sonner toasts (`src/routes/+layout.svelte:1`).
- Data layer: Drizzle ORM over `@libsql/client`, dialect `sqlite`/`turso`
  (`drizzle.config.ts:15`, `src/lib/server/db/index.ts`). Schema lives in
  `src/lib/server/db/schema.ts`.
- Database host: Turso (hosted LibSQL) in production, a local SQLite file in development.
- Auth: hand-rolled session auth in the Lucia style (`src/lib/server/auth.ts`), using
  `@oslojs/crypto`, `@oslojs/encoding`, and bcrypt (`src/lib/utils/password.ts`).
- Email: Resend (`resend`) via a provider wrapper (`src/lib/server/services/email/ResendEmailProvider.ts`).
- Analytics and error tracking: PostHog, `posthog-js` on the client and `posthog-node` on
  the server (`src/lib/plugins/PostHog.ts`, `src/hooks.client.ts`, `src/hooks.server.ts`).
- Hosting: Railway (production origin `https://creatures-of-habit-production.up.railway.app`,
  `src/lib/utils/url.ts:22`).
- Desktop: a Tauri 2 scaffold exists under `src-tauri/` but is deferred and is not part of
  production.
- Tests: Vitest with jsdom (see `docs/testing-strategy.md`).

## 2. Request lifecycle

Every request passes through the server hook in `src/hooks.server.ts`.

1. Nonce and headers. `handle` generates a fresh per-request nonce with
   `randomBytes(16).toString('base64')` and stores it on `event.locals.nonce`
   (`src/hooks.server.ts:25`). It then calls `setSecurityHeaders(event)`, which builds the
   CSP (including `'nonce-<value>'` in `script-src`), HSTS, `X-Frame-Options`,
   `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`
   (`src/lib/server/securityHeaders.ts:109`). The CSP allowlists PostHog hosts and Google
   Fonts; development adds `unsafe-inline`, `unsafe-eval`, and `ws:`.
2. Session resolution. `handle` reads the `auth-session` cookie. If absent it sets
   `locals.user` and `locals.session` to null. If present it calls
   `validateSessionToken`, which hashes the token, joins the user, deletes expired rows,
   and slides the expiry when 15 days or fewer remain (`src/lib/server/auth.ts:29`). A
   valid session is re-cooked and an invalid one is deleted (`src/hooks.server.ts:73`).
3. Auth closure. Independently of the inline path, `handle` attaches `event.locals.auth`,
   an async function that repeats the same cookie read, validation, cookie refresh or
   delete, and returns `{ user, session }` or null (`src/hooks.server.ts:32`). Load
   functions and endpoints call `await locals.auth()`. The logic is duplicated between
   the inline path and the closure.
4. Response and nonce rewriting. `resolve` is called with `transformPageChunk`, which
   rewrites every inline `<script>` tag that lacks both a `src` and a `nonce` attribute to
   include `nonce="<value>"` (the same regex appears twice, at `src/hooks.server.ts:60`
   and `src/hooks.server.ts:83`). External scripts and scripts that already carry a nonce
   are left alone.
5. Route handling. The matched route runs: a `load` for page data, form `actions` for
   submissions, or a `+server.ts` handler for JSON APIs. Route code imports `$lib/server`
   modules (db, auth, services) and typically checks `await locals.auth()` first.
6. Error handling. If resolution throws, `handleError` in `src/hooks.server.ts:97` reports
   the error with `posthogClient.captureException(error)` for any status other than 404.
   It does not attach a distinct id, route, or release context. The client mirror is
   `handleError` in `src/hooks.client.ts:17`, which captures the error plus a
   `client_error` event and a `user_impact` event, and installs `unhandledrejection` and
   `error` listeners plus a page-performance capture.

## 3. Client and server boundaries

- Server-only tree: everything under `src/lib/server/` is imported only from
  `+page.server.ts`, `+server.ts`, `hooks.server.ts`, or other server modules. SvelteKit
  strips `$lib/server` imports from the client bundle, but only when the import is reached
  through a server route file, so server logic is kept physically inside that tree.
- Client bundle: `src/lib/notifications/` (the `NotificationManager`, the store, and the
  fetch-based `ApiNotificationBackend`), `src/lib/client/`, and `src/lib/plugins/PostHog.ts`
  run in the browser. `hooks.client.ts` initializes PostHog once, guarded by
  `typeof window !== 'undefined'`.
- Public versus private config: only `PUBLIC_POSTHOG_KEY` is public, read through
  `$env/static/public` in `src/lib/plugins/PostHog.ts:2` (declared in `src/env.d.ts`).
  Every other secret is read from `process.env` on the server.
- Runes: components take a `data` prop with `$props` and derive UI state. Example:
  `src/routes/+layout.svelte:11` (`const props = $props<{ data: LayoutData }>()`) and
  `const {children} = props;` then `{@render children?.()}`.
- A cross-boundary import worth noting: `src/lib/client/habit-actions.ts:7` imports the
  type `StreakUpdateResult` from `$lib/server/streaks/calculations`. It is a type-only
  import, so it is erased at build and does not pull server code into the client. It does,
  however, make the dead streak module look load-bearing.

### Shared versus duplicated XP and stats

There are three XP locations, and they are not equivalent:

- `src/lib/shared/xp/calculations.ts` holds the single source of truth for XP math:
  `BASE_XP = 25`, `GROWTH_EXPONENT = 1.8`, `getXpRequiredForLevel`, `getXpForLevelUp`,
  `getLevelFromXp`, `getLevelProgress`, and `calculateHabitXp`.
- `src/lib/server/xp/calculations.ts` and `src/lib/client/xp/calculations.ts` each only
  re-export the shared module, so XP math is genuinely shared.
- Stats are duplicated, not shared. `src/lib/server/xp/stats.ts` and
  `src/lib/client/xp/stats.ts` are two full copies that have drifted:
  - `getTotalStatPoints`: the server sums `max(0, value - STAT_MIN)`; the client sums
    `calculateStatCost(value)`, which always returns 1, so the client total is always 6.
  - `allocateStatPoints`: the server refuses to increment when remaining points are zero
    or fewer and uses `max(0, value - STAT_MIN)`; the client has no remaining-points guard
    and can drive the total negative.
  - The server copy has `getEffectiveStats` (used by `stat-boost-points`); the client copy
    does not.
  - `calculateHealth` differs slightly (`baseHealth / 2 + 1` versus `floor(baseHealth / 2) + 1`).

  The server copy is the one the running app uses (`$lib/server/xp`). The client copy is a
  divergent fallback with no clear owner. See `docs/audit-backlog.md` C-4 and
  `docs/open-questions.md` question 5.

## 4. Module map by feature

### Auth
- `src/lib/server/auth.ts`: session token generation and hashing, cookie set and delete,
  password reset tokens, email verification tokens, and expiration sweeps.
- `src/hooks.server.ts`: per-request session resolution and `locals.auth`.
- Routes: `src/routes/login/`, `logout/`, `signup/` (client only), `reset-password/[token]/`,
  `forgot-password/`, `settings/`, `settings/password/`, plus API
  `src/routes/api/register/`, `api/validate/`.
- `src/lib/utils/password.ts`: bcrypt hash and verify.

### Habits
- Schema: `habit`, `habit_frequency`, `habit_category`, `habit_completion`, `habit_streak`
  (`src/lib/server/db/schema.ts`).
- Scheduling and status: `src/lib/utils/habitStatus.ts` (`getHabitStatus`,
  `isHabitActiveToday`, `getNextActiveDate`, `getDaysUntilActive`).
- API: `src/routes/api/habits/+server.ts` (list, create), `api/habits/[id]/+server.ts`
  (update, delete), `api/habits/[id]/complete/+server.ts` (complete),
  `api/habits/[id]/permanent-delete/+server.ts`, `api/categories/defaults/+server.ts`.
- Client actions: `src/lib/client/habit-actions.ts` (`completeHabit`, `createHabit`,
  `updateHabit`, `deleteHabit`).
- Pages: `src/routes/habits/`, `src/routes/dashboard/`.

### Streaks
- Live logic: inlined in `src/routes/api/habits/[id]/complete/+server.ts:70`. It always
  increments and never resets.
- `src/lib/server/streaks/calculations.ts`: `determineStreakStatus` and
  `updateStreakAfterCompletion`. This module is dead code (no route imports it) and
  contains a test-only override that forces a maintained streak when
  `daysSinceLastCompletion === 5`.

### XP and stats
- `src/lib/shared/xp/calculations.ts` (shared XP), re-exported by `src/lib/server/xp/`
  and `src/lib/client/xp/`.
- `src/lib/server/xp/stats.ts` (server stats, effective stats), `src/lib/client/xp/stats.ts`
  (divergent client copy). `src/lib/server/xp/index.ts` re-exports both.

### Quests
- `src/lib/server/services/questService.ts`: `getDailyQuest`, `activateQuest`,
  `answerQuestion`, `completeQuest`, `spendStatBoostPoints`, `resetDailyQuest`.
- `src/lib/utils/questHelpers.ts`: question banks and `generateQuestQuestions`; also
  `calculateSuccessChance`, which is unused.
- API: `src/routes/api/quests/daily/+server.ts`, `api/quests/[questId]/activate/`,
  `api/quests/[questId]/answer/`, `api/quests/[questId]/progress/`, `api/quests/reset/`,
  `api/character/boost-stat/`, `api/character/stat-boost-points/`.
- Page and seeds: `src/routes/quests/`, `scripts/seed-quests.ts`, `scripts/generate-quest-content.ts`.

### Notifications
- Client: `src/lib/notifications/NotificationManager.ts`, `NotificationStore.ts`,
  `ApiNotificationBackend.ts`; plugin `src/lib/plugins/EmailNotificationPlugin.ts`.
- Server: `src/lib/server/services/notificationService.ts` (routes email, push, in-app,
  and reminder by preference), endpoint `src/routes/api/notifications/+server.ts`.

### Email
- Templates and service: `src/lib/server/services/emailVerificationService.ts`
  (verification, welcome, habit reminder templates).
- Provider: `src/lib/server/services/email/ResendEmailProvider.ts`.
- Route-level senders: `src/routes/contact/+page.server.ts`,
  `src/routes/forgot-password/+page.server.ts`, `src/routes/forgot-username/+page.server.ts`,
  `src/routes/api/resend-verification/+server.ts`, `src/routes/verify-email/[token]/`.

### Analytics and logger
- `src/lib/plugins/PostHog.ts`: shared client and server config, `getPostHogKey`.
- `src/hooks.client.ts`, `src/hooks.server.ts`: error capture.
- `src/lib/utils/logger.ts`: console logger that also emits PostHog `error_event` and
  `info_event`; note it uses `new Function('msg', 'console.error(msg)')` to reach console.
- `src/lib/utils/errorTracking.ts`: client error tracking helpers.

### Tasks
- `src/lib/server/tasks/scheduler.ts`: singleton `taskScheduler` with interval tasks, plus
  `initializeScheduler`, which starts only when `NODE_ENV` is production or
  `ENABLE_SCHEDULER` is `true`.
- `src/lib/server/tasks/cleanup.ts`: `runDailyTrackerCleanup`, registered to run every 24
  hours keeping 30 days.
- `src/lib/server/rateLimit.ts` and `src/lib/server/cache/MemoryCache.ts`: in-memory,
  per-instance rate limiting.

## 5. Data flow walkthroughs

### 5.1 Habit completion and XP or streak update
Entry point: `POST /api/habits/:id/complete` (`src/routes/api/habits/[id]/complete/+server.ts`).

1. Rate limit (`RateLimitPresets.API`), then `await event.locals.auth()`; 401 when there
   is no user.
2. Load the habit scoped to `habit.id` and `session.user.id`; 404 when missing.
3. Read today's `habit_completion` for the habit; 400 when a row already exists. This is a
   read-then-insert check, not a database constraint.
4. Read `habit_streak` for the habit (default `{ currentStreak: 0 }`).
5. Compute XP: `calculateHabitXp(habit.difficulty, streak.currentStreak)`, so the streak
   multiplier is `min(1 + streak * 0.05, 1.5)`.
6. Insert `habit_completion` with `completedAt` (UTC `YYYY-MM-DD`), `experienceEarned`, and
   `value: 100`.
7. Update `habit_streak`: `currentStreak` becomes `old + 1` (never reset) and `longestStreak`
   becomes the max.
8. Load the creature, add XP, recompute `level` with `getLevelFromXp`, and update the row.
9. Call `markHabitCompleted(userId, habitId)` to set today's `daily_habit_tracker` row.
10. Return `success`, the completion row, `experienceEarned`, `previousLevel`, `newLevel`,
    and `leveledUp`.

On the client, `completeHabit` in `src/lib/client/habit-actions.ts` posts the request,
shows XP and level-up toasts, and calls `invalidateAll()` so page loads re-run.

### 5.2 Daily progress tracker
The tracker table is `daily_habit_tracker`, unique on `(user_id, habit_id, date)`
(`src/lib/server/db/schema.ts:282`). Logic is in `src/lib/utils/dailyHabitTracker.ts`.

1. On dashboard load, `ensureDailyTrackerEntries(userId)` runs
   (`src/routes/dashboard/+page.server.ts:145`). It verifies the user, then in a
   transaction selects active habits (`isArchived = false`, `isActive = true`) and today's
   entries, and inserts `completed: false` rows for habits missing one.
2. `getDailyProgressStats(userId)` calls `ensureDailyTrackerEntries` again, then selects
   today's tracker rows joined to non-archived habits and returns `{ total, completed,
   percentage }`.
3. On completion, `markHabitCompleted` upserts today's row to `completed: true` inside a
   transaction.
4. A cleanup task (`runDailyTrackerCleanup`, registered in the scheduler) deletes entries
   older than 30 days via `cleanupOldTrackerEntries`.

Known skew (C-5): entries are created only for active habits, but the percentage is
computed over all non-archived habits, so inactive habits can lower the percentage.

### 5.3 Quest lifecycle
Service: `src/lib/server/services/questService.ts`.

- Generate. `GET /api/quests/daily` calls `getDailyQuest(userId)`. It looks for today's
  instance by `date(createdAt)` and, if none exists, `generateDailyQuest` picks a random
  `quest_templates` row, inserts a `quest_instances` row with `status: 'available'` and a
  narrative, then `generateQuestQuestions` creates 5 `quest_questions` rows with a
  randomized correct choice and a `difficultyThreshold = max(8, stat - 2 + rand(0..4))`.
  There is no unique constraint on `(user, day)`.
- Activate. `POST /api/quests/:questId/activate` calls `activateQuest`, which moves the
  instance from `available` to `active`, stamps `activatedAt`, and returns the first
  question (sensitive fields stripped by `toSafeQuestion`).
- Answer. `POST /api/quests/:questId/answer` calls `answerQuestion`. It verifies the quest
  belongs to the user and is `active`, that the question belongs to the quest and is the
  next expected number, and that it is unanswered. It computes `wasCorrect = choice ===
  correctChoice` and, currently, `passedStatCheck = stat >= difficultyThreshold` (a
  deterministic check, despite the intended probability model). It inserts a
  `quest_answers` row, advances `currentQuestion`, `correctAnswers`, and `statChecksPassed`
  on the instance, and returns the next question or completes the quest. There is no
  transaction around these steps.
- Complete. `completeQuest` awards 50 base XP plus 100 bonus when 3 or more answers are
  correct, adds 1 stat boost point when 3 or more are correct and another when all 5 stat
  checks pass, marks the instance `completed`, updates the creature's XP and level, and
  increments `creature_stats.statBoostPoints`.
- Spend boost points. `POST /api/character/boost-stat` calls `spendStatBoostPoints`, which
  validates the stat name and point count against `statBoostPoints` and increments the
  chosen stat with an atomic SQL expression.
- Reset (dev only). `POST /api/quests/reset` is gated on `dev` and deletes today's quest,
  questions, and answers.
- Progress read. `GET /api/quests/:questId/progress` returns the instance counters and the
  stripped question list.

### 5.4 Email verification
1. Registration. `POST /api/register` validates with Zod, inserts `user`, `creature`,
   `creature_stats`, and `user_preferences` in a transaction, creates a session and sets
   the cookie, then `createEmailVerificationToken` writes a hashed token row (1 day
   expiry) and `sendVerificationEmail` sends the link built from `CANONICAL_BASE_URL`
   (`src/lib/utils/url.ts:41`). Registration succeeds even if the email fails.
2. Pending. The signup page navigates to `/dashboard` on success, and only
   `src/routes/verify-email-pending/+page.server.ts` checks `emailVerified`. No other route
   gates on it, so verification is effectively optional today (see `docs/auth-and-email.md`).
3. Verify. `GET /verify-email/:token` calls `validateEmailVerificationToken`, marks the
   user verified with `markEmailAsVerified`, deletes the token, and fires the welcome
   email non-blocking.
4. Resend. `POST /api/resend-verification` re-issues a token and resends, returning a
   generic message to avoid enumeration.

## 6. External services

- Turso or LibSQL. The app connects through `@libsql/client` in
  `src/lib/server/db/index.ts`. URL precedence and guards are documented in
  `docs/environments-and-deploy.md`.
- Resend. Transactional email for verification, welcome, reminders, password reset, and
  the contact form, through `ResendEmailProvider` or directly in some routes. The provider
  treats a resolved promise as success and does not inspect the SDK `{ data, error }`
  result (A-4).
- PostHog. Client init in `hooks.client.ts`, a shared `posthog-node` client in
  `hooks.server.ts` for `handleError`, plus per-request capture on the home page
  (`src/routes/+page.server.ts`). No environment or release tag is set, so staging and
  production would mix (O-7).
- Railway. Production hosting at
  `https://creatures-of-habit-production.up.railway.app`, which is also the fallback
  canonical base URL when `CANONICAL_BASE_URL` is unset in production
  (`src/lib/utils/url.ts:22`). The service runs the adapter-node server.
- Tauri desktop. `src-tauri/` configures a bundled desktop app pointing at the dev server
  on port 5175 (`src-tauri/tauri.conf.json:10`). Desktop work is deferred and is not in
  production (`docs/open-questions.md`).

## 7. Dead or duplicated code (explicit)

- `src/lib/utils/dailyHabitProgress.ts`: `calculateDailyProgress` client fallback. No
  importer. The server tracker in `dailyHabitTracker.ts` is used instead.
- `src/lib/server/streaks/calculations.ts`: `determineStreakStatus` and
  `updateStreakAfterCompletion` are not imported by any route. Streak math is inlined in
  the completion route. The module also contains a test-only hack (`=== 5` forces
  `streakMaintained`). Only a type is imported from it by the client.
- `src/lib/client/xp/stats.ts` versus `src/lib/server/xp/stats.ts`: duplicated and
  divergent stats implementations (details in section 3).
- `calculateSuccessChance` in `src/lib/utils/questHelpers.ts`: unused because the stat
  check is deterministic.
- `user_key` table (`src/lib/server/db/schema.ts:243`): no code writes or reads it; auth
  uses `user.passwordHash`.
- `creature_equipment`: read by `stat-boost-points` but never written by any route, so it
  is effectively inert (open question 9).
- `@node-rs/argon2` is a declared dependency with no imports in `src` (unused).

## 8. Related documents

- `docs/domain-rules.md`: intended behavior and current contradictions.
- `docs/auth-and-email.md`: sessions, tokens, and email detail.
- `docs/environments-and-deploy.md`: environment variables, database connection, CI/CD.
- `docs/audit-backlog.md`: prioritized findings (C-1 to C-5, S-*, D-*, O-*, A-*, T-*, R-*).
