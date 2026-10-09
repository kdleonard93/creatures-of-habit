---
name: creatures-of-habit
description: Use when working anywhere in the Creatures of Habit repository. Explains the gamified habit tracker domain (habits, frequencies, completion, streaks, XP, creature stats, quests, stat checks, waitlist, contact), where code lives, repo conventions (Zod, ownership checks, rate limiting), the confirmed domain rules, the open design questions, the docs knowledge base, and testing expectations. Backend logic is UTC, display is the user's local time.
---

# Creatures of Habit

## What the app is

A gamified habit tracker. Users create habits, complete them on a schedule, and earn XP that levels up a personal creature. A daily quest mini-game awards XP and stat boost points. Built with SvelteKit 2 (Svelte 5 runes), Tailwind plus shadcn-svelte, Drizzle ORM over libSQL/Turso, Lucia-style session auth, Resend email, and PostHog analytics. There is also a Tauri desktop wrapper under `src-tauri`.

## Domain vocabulary

- Habit: a tracked task with title, description, category, difficulty (`easy`/`medium`/`hard`), `startDate`, optional `endDate`, `isActive`, `isArchived`.
- Frequency: `daily`, `weekly`, or `custom`, stored in `habit_frequency`. `custom` keeps a JSON array of weekday numbers (0 = Sunday) in `days`.
- Completion: a row in `habit_completion` with a UTC date string `YYYY-MM-DD`, `experienceEarned`, and `value` (routes set 100).
- Streak: consecutive scheduled completions, tracked in `habit_streak` with `currentStreak`, `longestStreak`, `lastCompletedAt`.
- XP and level: creature progression. Cumulative XP thresholds map to a level.
- Creature: a user's avatar with class and race, `experience`, and `level`. Six stats live in `creature_stats`: strength, dexterity, constitution, intelligence, wisdom, charisma (default 10 each), plus `statBoostPoints`.
- Quest: a daily RPG-style mini-game with 5 A/B questions. A quest instance has a narrative, status (`available`/`active`/`completed`), progress counters, and reward fields.
- Stat check: whether a quest answer succeeds, based on the relevant creature stat. Intended to be probability-based.
- Waitlist: pre-launch email capture in `user_waitlist`.
- Contact: contact form submissions in `contacts`.

## Confirmed domain rules

These are stated by the product owner. When the code disagrees, the code is wrong. The authoritative reference is `docs/domain-rules.md`.

Streaks:

- A streak is consecutive successful completion of a habit on its schedule.
- Daily means complete every day.
- Weekly means complete on the same weekday each week.
- Custom means complete on every assigned weekday.
- Missing a scheduled occurrence resets that habit's streak to 0.

XP and levels:

- Cumulative curve: `getXpRequiredForLevel(level) = floor(25 * (level - 1) ^ 1.8)`, with `getXpRequiredForLevel(1) = 0`. `getLevelFromXp(xp)` returns the highest level whose threshold is less than or equal to `xp`.
- Habit XP: `calculateHabitXp(difficulty, streak, bonusMultiplier = 1.0)` uses base easy 10, medium 20, hard 40, times a streak multiplier `min(1 + streak * 0.05, 1.5)`, times an optional bonus, floored.
- Implemented in `src/lib/shared/xp/calculations.ts` and re-exported by both `src/lib/server/xp` and `src/lib/client/xp`. Keep server and client identical.

Quests:

- One quest per user per day, one attempt, no retry.
- 5 questions, choice A or B, correct choice chosen 50/50 at generation.
- Reward: base 50 XP, plus a 100 XP bonus when 3 or more answers are correct.
- Plus 1 stat boost point when 3 or more are correct, and 1 more when 5 stat checks pass.
- A stat check is a probability of success derived from the user's relevant stat, not a deterministic pass or fail. The same model is intended for reuse in future boss battles.

Current code that violates confirmed rules (treat as bugs, do not copy):

- `src/routes/api/habits/[id]/complete/+server.ts` always increments the streak and never resets it.
- `src/lib/server/streaks/calculations.ts` is dead code and contains a test-only hack forced when `daysSinceLastCompletion === 5`.
- `src/lib/utils/habitStatus.ts` implements a cooldown, not a streak (weekly hides the habit for 7 days).
- `src/lib/server/services/questService.ts` `answerQuestion` compares `stat >= difficultyThreshold` deterministically and never rolls; `calculateSuccessChance` exists in `src/lib/utils/questHelpers.ts` but is unused.

## Where things live

- Routes and endpoints: `src/routes/**`. Pages use `+page.svelte` plus `+page.server.ts`; JSON APIs use `src/routes/api/**/+server.ts`.
- Components: `src/lib/components/**` (character, dashboard, habits, quests, notifications, ui).
- Server-only code: `src/lib/server/**` (`db`, `auth.ts`, `rateLimit.ts`, `securityHeaders.ts`, `services`, `tasks`, `xp`, `streaks`).
- Database schema: `src/lib/server/db/schema.ts`. Client: `src/lib/server/db/index.ts`.
- Shared domain math: `src/lib/shared/xp/calculations.ts` (XP) and `src/lib/data` (classes, races, equipment).
- Utilities: `src/lib/utils/**` (`habitStatus.ts`, `dailyHabitTracker.ts`, `dailyHabitProgress.ts`, `questHelpers.ts`, `date.ts`, `logger.ts`, `password.ts`, `errorTracking.ts`).
- Types: `src/lib/types.ts`.
- Hooks: `src/hooks.server.ts` (auth, CSP nonce, security headers, server error capture), `src/hooks.client.ts` (PostHog client, error handlers).
- Tests: `src/tests/**`.
- Migrations: `migrations/` with snapshots in `migrations/meta/`.

## Conventions

- Validate input with Zod. See `src/routes/api/register/+server.ts` and `src/routes/api/waitlist/+server.ts`. Return a 400 with the first issue message.
- Ownership checks are mandatory. Every user-scoped query filters on `session.user.id` in addition to the row id (for example `and(eq(habit.id, id), eq(habit.userId, session.user.id))`).
- Authenticate with `await event.locals.auth()` (or `locals.auth()` in loads). It returns `{ user, session }` or `null`. Redirect unauthenticated page loads to `/login`.
- Rate limit endpoints first with `await rateLimit(event, preset)`. Presets live in `src/lib/server/rateLimit.ts`: `AUTH` (5 per 15 min), `PASSWORD_RESET` (3 per hour), `API` (100 per 15 min). Ad-hoc configs are allowed (waitlist uses 5 per hour).
- Log with `logger` from `$lib/utils/logger`, never `console.log`, in server code. Redact PII.
- Use `formatDateOnly` and `formatSqliteTimestamp` from `$lib/utils/date.ts` for stored dates.
- Format with Biome (`pnpm format`, `pnpm lint`, `pnpm check`). Husky runs checks pre-commit.
- Keep server imports inside `src/lib/server`; never import them from a client component.

## Timezone policy

Backend logic and stored dates are UTC. User-facing display is the user's local time. No conversion is applied to stored UTC values. In practice `formatDateOnly`/`formatSqliteTimestamp` use `toISOString` (UTC), but `src/lib/utils/habitStatus.ts` uses server-local `getDay()` and local midnight, which is a known off-by-one bug for users far from the server zone. The app stores no user timezone today.

## Known open design questions

- Stats system: `src/lib/client/xp/stats.ts` diverges from `src/lib/server/xp/stats.ts`; neither is clearly authoritative. The whole system needs an explicit design proposal before code changes.
- Streak scope: per habit (matches `habit_streak`) or a single global daily streak. Also open: whether completing a weekly habit on a non-assigned day counts.
- Timezone: no user timezone is stored or used; the scheduling model should compute in the user's zone while storing UTC.
- Contact and waitlist hardening: add a honeypot, rate limiting, length caps, server-side email validation, a moderation/status column, sanitized subject and plain-text body; for waitlist, stop storing the raw `x-forwarded-for` and derive the client IP with the trusted-proxy logic used by `rateLimit`.
- Daily progress denominator: all non-archived habits versus only those scheduled today. `ensureDailyTrackerEntries` only creates rows for `isActive` habits, so inactive habits can lower the percentage.
- Equipment: `creature_equipment` has no unique constraint per (creature, slot) and the system appears unused.
- XP curve: the owner asked to mathematically validate monotonicity, pacing, and whether there is a level cap (there is none today).

## Docs knowledge base

- `docs/domain-rules.md`: the intended-behavior reference, tags each rule Confirmed, Current, or Open. Read this first. It references `open-questions.md`, which is not present in the repo (only `domain-rules.md` exists in `docs/`), so treat that reference as a placeholder.
- `README.md`: setup, tech stack, project structure.
- `XP-Progression.md`: the XP formula, sample progression table, helpers, and testing strategy.
- `TESTING_GUIDE.md`: habit frequency manual and automated testing procedures.
- `TDD-Workflow-Guide.md`: TDD approach used in the repo.
- `MIGRATION_GUIDE.md`: migration notes.
- `ROADMAP.MD`: planned features.

## Testing expectations

- Vitest with jsdom; tests under `src/tests/**`. Run `pnpm test` (single run) or `pnpm test:unit` (watch).
- Tests must exercise real code. Do not mock `fetch` and assert on the mock, do not copy the implementation into the test, and do not render a component with a mocked `mount`. See the `sveltekit-testing` skill.
- Tests are hard-isolated from production: `vite.config.ts` and `src/tests/setup.ts` force `TURSO_DATABASE_URL=file:./local-test.db` and blank `TURSO_AUTH_TOKEN`. Never point tests at the live database.
- Pin the timezone (`TZ=UTC` in setup) and use fake timers for date logic, because backend uses UTC while `habitStatus.ts` uses local time.
- Add or update tests when you change XP math, quest rewards, streak logic, or an endpoint. Mirror XP threshold tests in `src/tests/utils/calculations.test.ts`.
- Note that several current tests are false-confidence (for example `src/tests/api/validate.api.test.ts` and `src/tests/components/DailyProgressSummary.test.ts`). Fix them when you touch the related code.

## Quick commands

- `pnpm dev` (port 5175), `pnpm build`, `pnpm start`
- `pnpm check` (svelte-check), `pnpm lint`, `pnpm format`
- `pnpm test`, `pnpm test:unit`
- `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:push`, `pnpm db:studio`
- `pnpm db:seed:quests`, `pnpm quest:generate`
