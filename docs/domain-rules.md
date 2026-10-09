# Domain Rules: Creatures of Habit

This is the intended-behavior reference for the app. Each rule is tagged:

- **Confirmed**: stated by the product owner.
- **Current**: what the code does today (may contradict Confirmed, which means a bug).
- **Open**: not yet decided; see `open-questions.md`.

Never document a "Current" behavior as if it were intended. When they differ, the Confirmed rule wins and the code is wrong.

## Habits and frequencies

A habit belongs to a user, optionally to a category, and has a title, a difficulty (`easy`, `medium`, `hard`), `baseExperience` (default 10), a `startDate`, an optional `endDate`, `isActive`, and `isArchived`.

Frequency is `daily`, `weekly`, or `custom`, stored in `habit_frequency`:

- `name`: enum value.
- `days`: JSON string of weekday numbers (0 = Sunday) for custom habits.
- `everyX`: present in the schema, not used by current logic.

**Current**: daily habits are created with `frequencyId = null`, and the code treats a missing frequency as daily. Weekly habits have no stored weekday at all. The "assigned weekday" for a weekly habit is not modeled anywhere.

**Open**: the weekly frequency needs an assigned weekday to be meaningful. Either add a weekday column or derive it from `startDate`. See `open-questions.md`.

## Completion

Completing a habit inserts a `habit_completion` row with:

- `completedAt`: a UTC date string `YYYY-MM-DD` (via `formatDateOnly`, which uses `toISOString`).
- `experienceEarned`: computed at completion time.
- `value`: set to 100 by the completion route.

Completion also updates `habit_streak`, updates the creature's XP and level, and marks the daily tracker.

**Current**: "one completion per habit per day" is enforced by a read-then-insert check in the route, not by a database unique constraint. Concurrent requests could double-complete.

## Streaks

**Confirmed rule**: a streak is the consecutive successful completion of a habit on its schedule.

- **Daily**: complete it every day.
- **Weekly**: complete it on the same weekday each week.
- **Custom**: complete it on every assigned weekday.
- Missing a scheduled occurrence resets that habit's streak to 0.

**Confirmed on scope and weekly timing**:
- Scope is per habit. A missed scheduled occurrence resets only that habit's streak (matches the `habit_streak` table).
- Weekly habits count only the assigned weekday. Completing on a different day does not continue the streak.

**Open**:
- The schema stores no weekday for weekly habits, so the assigned weekday must be added or derived from `startDate`. See `open-questions.md` 1.

**Current implementation (wrong)**:
- `src/routes/api/habits/[id]/complete/+server.ts` always increments `currentStreak` by 1 and never resets it. `lastCompletedAt` is set to now.
- `src/lib/utils/habitStatus.ts` implements a cooldown, not a streak: daily is always active; weekly is active only when at least 7 days have passed since the last completion (this hides the habit for a week); custom is active only on selected weekdays.
- `src/lib/server/streaks/calculations.ts` is dead code (not imported by any route) and contains a test-only hack: it forces `streakMaintained = true` when `daysSinceLastCompletion === 5`.

Consequence: streaks never break, the UI availability model is a cooldown, and the XP streak multiplier is inflated.

## XP and levels

**Confirmed curve** (cumulative, not per level):

```
getXpRequiredForLevel(level) = floor(25 * (level - 1) ** 1.8)
getXpRequiredForLevel(1) = 0
```

`getLevelFromXp(xp)` returns the highest level whose cumulative threshold is less than or equal to `xp`.

Reference thresholds (verify before treating as canonical):

| Level | Cumulative XP |
| --- | --- |
| 1 | 0 |
| 2 | 25 |
| 3 | 87 |
| 4 | 180 |
| 5 | 303 |
| 6 | 453 |
| 7 | 625 |
| 8 | 830 |
| 9 | 1055 |
| 10 | 1304 |

**Confirmed habit XP**:

```
calculateHabitXp(difficulty, streak, bonusMultiplier = 1.0):
  base = { easy: 10, medium: 20, hard: 40 }[difficulty]
  streakMultiplier = min(1 + streak * 0.05, 1.5)
  return floor(base * streakMultiplier * bonusMultiplier)
```

So the streak bonus is 5 percent per streak step, capped at 1.5x.

**Open**:
- The owner asked to mathematically validate the curve before documenting it as final (monotonic, sane pacing, no level cap today).
- Confirm there is no level cap.
- Note the interaction with the streak bug above: until streaks reset correctly, the multiplier is wrong.

## Stats

Six stats: `strength`, `dexterity`, `constitution`, `intelligence`, `wisdom`, `charisma`, each defaulting to 10.

**Current server constants** (`src/lib/server/xp/stats.ts`): `STAT_MIN = 8`, `STAT_MAX = 15`, `INITIAL_STAT_POINTS = 27`, `calculateStatCost` always returns 1, and `allocateStatPoints` clamps to min/max and tracks remaining points. Also present: `applyRacialBonuses`, `getClassStatModifiers`, `getEffectiveStats`, `calculateHealth`, `calculateStatModifier`.

**Current problem**: `src/lib/client/xp/stats.ts` is a divergent copy. It lacks the remaining-points guard when incrementing and computes total points differently, so client and server allocation can disagree. Neither is clearly authoritative.

**Confirmed direction**: this whole system is uncertain and will be resolved by an explicit design proposal before any code changes. See `open-questions.md`.

## Quests

**Confirmed rules**:
- One quest per day per user, and only one attempt per day (idempotent, no retry).
- Each quest has 5 questions, each with choice A or B, correct choice chosen 50/50 at generation.
- Reward: base 50 XP, plus a 100 XP bonus when 3 or more answers are correct.
- Plus 1 stat boost point when 3 or more are correct, and 1 more when 5 stat checks pass.
- A **stat check** is a probability of success derived from the user's relevant stat, not a deterministic pass or fail. The same model will be reused for future boss battles.

**Current implementation**:
- `getDailyQuest` finds an instance whose `date(createdAt)` equals today (UTC); otherwise it generates one. There is no unique constraint on (user, day), so concurrent first-hits can create duplicates.
- `answerQuestion` uses a deterministic comparison against `difficultyThreshold`, and `passedStatCheck = stat >= threshold`. It never rolls.
- `calculateSuccessChance` exists but is unused.
- `difficultyThreshold = max(8, stat - 2 + rand(0..4))`.
- `completeQuest` applies base 50, bonus 100 at 3 or more correct, +1 boost at 3 or more correct, +1 more at 5 stat checks passed.
- There is no transaction around answer, progress update, and completion.

## Daily progress

The daily tracker (`daily_habit_tracker`) records per user, habit, and date whether the habit was completed. `getDailyProgressStats` computes completed over total non-archived habits. `ensureDailyTrackerEntries` only creates rows for `isActive` habits, so inactive habits can lower the percentage. **Open**: define the exact denominator (all non-archived, or only those scheduled today).

## Timezone

**Confirmed policy**: backend logic and stored dates are UTC. Anything user-facing is displayed in the user's local time. No conversion is applied to stored UTC values.

**Current**: `formatDateOnly` and `formatSqliteTimestamp` in `src/lib/utils/date.ts` both use `toISOString` (UTC). But `src/lib/utils/habitStatus.ts` uses server-local `getDay()` and local midnight, which is neither UTC nor the user's zone. For users far from the server's zone this is an off-by-one bug.

**Open**: the app stores no user timezone. The proper fix is to store a user timezone and compute scheduling in it, while keeping storage in UTC. See `open-questions.md`.

## Notifications

Per-user preferences (email, push, in-app, reminder) are integer flags on `user_preferences`. `sendNotification` looks up the user and preferences, checks the channel and category toggles, and routes the message. Email goes through Resend. Push is not implemented. The generic notification path does not escape HTML in the message body. **Open**: harden or leave as is; there is no admin surface.

## Creatures

A creature has a class and race, optional background, `experience`, and `level`. Equipment lives in `creature_equipment`, which has no unique constraint on (creature, slot), so duplicate equipped items per slot are possible. **Open**: the equipment system appears unused; confirm.

## Contact and waitlist

**Confirmed direction for contact**: add a honeypot field, rate limiting, length caps, and server-side email validation, add a spam or status column for moderation, and keep email forwarding with a sanitized subject and plain-text body. Add an admin review surface.

**Confirmed direction for waitlist**: same hardening, cap field lengths, and stop storing the untrusted `x-forwarded-for` value as the IP address (derive the client IP with the same trusted-proxy logic used by the rate limiter).

**Current**: contact has no validation, limits, honeypot, or rate limit, and interpolates `name` into the email subject. Waitlist is rate limited at 5 per hour with zod email validation but stores the raw proxy header.
