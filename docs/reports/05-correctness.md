# Correctness Audit: Gameplay Systems

Scope. This report audits gameplay correctness against the confirmed rules in
`docs/domain-rules.md` (the intended-behavior source of truth) on branch
`task/audit-updates`. It covers streaks, timezone handling, XP and levels, stats, quests,
and the daily progress tracker. Each finding compares intended versus current behavior and
records severity, status, evidence with file and line references, impact, a proposed fix
(the exact intended algorithm where one is known, gated behind a test), and the decision
required. Confirmed intended behavior lives in `docs/domain-rules.md`; the code is treated
as wrong wherever it contradicts a Confirmed rule. Open design items are linked to
`docs/open-questions.md`. Existing audit identifiers C-1 through C-7 are reused where the
finding matches; new identifiers start at C-8. Backend logic and stored dates are UTC and
display is user-local, so every scheduling comparison below is stated in terms of the
user's local calendar day unless noted.

## C-1: Habit completion always increments the streak and never resets it

**Severity:** critical
**Status:** open
**Evidence:** `src/routes/api/habits/[id]/complete/+server.ts:48-57` (XP uses the stored
streak), `:70-81` (increments `currentStreak` and sets `lastCompletedAt` to now, with no
reset path). `src/lib/server/db/schema.ts:118-131` (streak row has no reset logic). Habit
creation pre-creates the row at `src/routes/api/habits/+server.ts:100-106`, so the update
always targets a real row.
**Impact:** `currentStreak` is a completion counter, not a streak. A daily, weekly, or
custom habit that is missed for any number of days keeps its streak, and `longestStreak`
grows without bound. Because XP uses the streak as a multiplier (C-11), every completion
after ten carries the maximum 1.5x, and a user who breaks their schedule is rewarded
identically to a consistent one. This is the root cause of the inflated XP noted in the
backlog.
**Proposed fix:** Implement reset-on-miss inside the completion route (and lazily on
read), keyed to the habit's schedule and the user's local day. Use the exact algorithm in
"Confirmed algorithm specifications" (Streak algorithm). Concretely, replace the
unconditional increment at `:70-81` with:

```
onCompletion(habit, user, now):
  localToday = userLocalDate(now, user.timezone)
  schedule = scheduledOccurrences(habit)            # from frequency (see C-8, C-10)
  prevOccurrence = previousScheduledOccurrence(schedule, localToday)
  last = userLocalDate(streak.lastCompletedAt, user.timezone)  # null if none
  if last == localToday: return existing streak              # duplicate completion
  if last != null and last == prevOccurrence:
      newStreak = streak.currentStreak + 1
  else if last == null:
      newStreak = 1
  else:
      newStreak = 1                                        # missed one or more occurrences
  persist(newStreak, max(longestStreak, newStreak), now)
```

The reset to 0 for a currently missed occurrence must also be applied on read (dashboard
and habits load) so the UI shows 0 before the next completion. Gate behind tests for
daily back-to-back, one missed day, weekly same-weekday, weekly missed week, and custom
with two assigned weekdays.
**Decision needed:** `docs/open-questions.md` 1 (per-habit versus global scope),
2 (weekly non-assigned-day completion), 3 (weekly weekday source).

## C-2: Quest stat checks are deterministic, not probability-based

**Severity:** high
**Status:** open
**Evidence:** `src/lib/server/services/questService.ts:252-253`
(`passedStatCheck = userStatValue >= question.difficultyThreshold`),
`src/lib/utils/questHelpers.ts:186-196` (`calculateSuccessChance`, defined but never
imported), `src/lib/server/services/questService.ts:115`
(`difficultyThreshold = Math.max(8, userStatValue - 2 + Math.floor(Math.random() * 5))`).
**Impact:** A stat check cannot fail when the stat meets the threshold and cannot succeed
below it, so stat progression is deterministic and the reward path (the `statChecksPassed` aggregate at
`questService.ts:332-334`) is predictable. The confirmed model is a probability derived
from the relevant stat, and the same model is intended to carry over to boss battles, so
this also blocks that feature.
**Proposed fix:** Roll the stat check per question with a seed derived from
`(questInstanceId, questionId)` and the user's relevant stat. Use the algorithm in
"Confirmed algorithm specifications" (Stat-check algorithm). Replace line 253 with the
roll, keep writing `passedStatCheck` to `quest_answers`, and keep aggregate
`statChecksPassed` on the instance. Gate behind tests that fix the RNG seed and assert the
success rate over many samples matches the intended curve within tolerance.
**Decision needed:** `docs/open-questions.md` 6 (exact probability curve, difficulty
scaling, boss-battle reuse).

## C-3: Scheduling uses server-local weekday and local midnight while storage is UTC

**Severity:** high
**Status:** open
**Evidence:** `src/lib/utils/habitStatus.ts:58-60` (`currentDate.getDay()` for custom
habits), `:87-89`, `:98-99`, `:124-126`, `:151-152` (local `setDate` / `setHours` mixed with
`toISOString` formatting), `:185-189` (local-midnight parse). Storage side:
`src/lib/utils/date.ts:22-24` (`formatDateOnly` uses `toISOString`, UTC) called at
`src/routes/api/habits/[id]/complete/+server.ts:34` and
`src/lib/utils/dailyHabitTracker.ts:65-67`. The dashboard and habits loads also derive
"today" from `new Date().toISOString()` (`src/routes/dashboard/+page.server.ts:43`,
`src/routes/habits/+page.server.ts:17`). No user timezone is stored anywhere
(`src/lib/server/db/schema.ts`, the `user` table has no timezone column).
**Impact:** A user's scheduled weekday and "today" are computed in the Node process
timezone (UTC on Railway) while the code also mixes local-midnight arithmetic, so the
result is neither UTC nor the user's zone. Exact off-by-one scenarios:

1. Custom habit, user west of UTC (for example UTC-8), local evening: UTC has already
   rolled to the next calendar day, so `getDay()` returns tomorrow's weekday. The habit
   shows inactive on its assigned day, or active on a non-assigned day, and
   `getNextActiveDate` returns the wrong next date.
2. Custom habit, user east of UTC (for example UTC+10), local early morning: UTC is still
   the previous day, so the assigned weekday is treated as inactive for the first hours of
   the user's day.
3. Weekly habit: `daysSinceCompletion` at `habitStatus.ts:50-55` compares a UTC-midnight
   `completedAt` string against `now`, so the seven-day cooldown starts and ends at the
   wrong local moment and DST shifts it by an hour (the `Math.floor(ms / 86400000)`
   pattern).
4. Completion storage, user west of UTC: completing at local 23:00 stores `completedAt` as
   the next UTC day (`formatDateOnly`). The "already completed today" check at
   `complete/+server.ts:36-46` compares against the UTC day, so it can fail to match and
   allow a second completion in the same local day, and the tracker marks the wrong date.
5. Daily tracker: `date` is UTC, so the progress bar resets at UTC midnight, not the
   user's midnight, and can show the new day's zeroes during the user's evening.
6. The only "timezone" test (`src/tests/habitStatus.test.ts:248-263`) uses UTC timestamps,
   so it never exercises a non-UTC user and gives false confidence.

**Proposed fix:** Store an IANA timezone per user (new `user.timezone` or
`user_preferences.timezone`, default from signup). Add helpers
`userLocalDate(now, tz)` and `userLocalWeekday(now, tz)` that format with
`Intl.DateTimeFormat('en-CA', { timeZone: tz })` and derive the weekday in that zone. Keep
all storage UTC (`completedAt` and `daily_habit_tracker.date` stay `formatDateOnly` of the
UTC instant only if the schedule is also stored relative to the user's zone; the schedule
comparisons must use the user zone). Replace every `getDay()` and local `setDate` in
`habitStatus.ts` with the zoned helpers, and change the completion and tracker date key to
`userLocalDate(now, tz)`. Gate behind tests that pin a fixed clock and iterate several
timezones (UTC, a negative offset, a positive offset, and a DST-transition day).
**Decision needed:** `docs/open-questions.md` 8 (store per-user timezone, and which zone
decides the user's weekday).

## C-4: Client and server stat allocation diverge; no remaining-points guard on the client

**Severity:** medium
**Status:** open (design-proposal item)
**Evidence:** server `src/lib/server/xp/stats.ts:34-65` (subtracts
`Math.max(0, value - STAT_MIN)` and refuses to increment when `remainingPoints <= 0` at
`:50`), `:71-75` (`getTotalStatPoints` sums `max(0, value - STAT_MIN)`), `:109-144`
(`getEffectiveStats` exists), `:149-178` (`calculateHealth` uses `baseHealth / 2 + 1`).
Client `src/lib/client/xp/stats.ts:40-72` (subtracts `value - STAT_MIN` directly and has
no remaining-points guard), `:84-88` (`getTotalStatPoints` sums `calculateStatCost`, which
always returns 1, so the total is always 6), no `getEffectiveStats`, and `:127-155`
(`calculateHealth` uses `Math.floor(baseHealth / 2) + 1`). The client copy is what
`RegistrationWizard.svelte:76` calls, and the server copy is what the running app uses
(`src/routes/api/character/stat-boost-points/+server.ts:83-89`).
**Impact:** The two implementations can disagree on remaining points. The client can
increment a stat into negative remaining points because it lacks the `remainingPoints <= 0`
guard, while the server would have refused, so a character can be built past the intended
27-point budget depending on which path validates. `getTotalStatPoints` on the client is
meaningless (always 6). Initial values are also inconsistent: `createInitialStats` returns
8s, the registration wizard starts at 10s and posts them
(`src/routes/api/register/+server.ts:104-113`), and `stat-boost-points` backfills 10s
(`stat-boost-points/+server.ts:48-64`). `getEffectiveStats` computes level-based increases
into `_statIncreases` and never applies them (`stats.ts:130`). `spendStatBoostPoints` adds
points with no per-stat cap or integer check (`questService.ts:395-461`,
`boost-stat/+server.ts:21-32`), so effective stats can exceed `STAT_MAX = 15`.
**Proposed fix:** Do not patch either copy in isolation. Treat this as the design
proposal required by `open-questions.md` 5. Make the server module the single source of
truth, delete `src/lib/client/xp/stats.ts` (or re-export from the server via a shared,
non-server module), add the missing `remainingPoints <= 0` guard, and define starting
values, min and max, point cap, and whether class and race bonuses can push past
`STAT_MAX`. Until the proposal is approved, gate any interim change behind tests that
compare client and server allocation across a full allocation sequence.
**Decision needed:** `docs/open-questions.md` 5 (stats design). This is the flagged
design-proposal item.

## C-5: Daily progress denominator can include habits that are not on today's schedule

**Severity:** medium
**Status:** open
**Evidence:** `src/lib/utils/dailyHabitTracker.ts:84-92` (`ensureDailyTrackerEntries`
inserts rows only for `isActive = true` and `isArchived = false` habits), `:206-216`
(`getDailyProgressStats` joins tracker rows to habits filtered only on `isArchived =
false`, so any non-archived habit with a row counts), `:218-220` (percentage over that
total). Client fallback `src/lib/utils/dailyHabitProgress.ts:35` filters
`!isArchived || completedToday`.
**Impact:** The write filter (`isActive`) and read filter (`isArchived`) do not match. A
habit that was active when the tracker row was created and then deactivated still counts
as an incomplete item, lowering the percentage; a non-archived inactive habit completed by
any path also counts. Meanwhile the percentage ignores whether a habit is scheduled today
at all, so a Monday-only custom habit counts against a Wednesday denominator. The
denominator is undefined by design (`open-questions.md` 7).
**Proposed fix:** Decide the intended denominator and make write and read agree. If the
intent is "habits scheduled today", compute the scheduled set from the frequency (daily,
weekly weekday, custom days) in the user's timezone and use it for both `ensure` and
`getDailyProgressStats`. If the intent is "all non-archived habits", drop the `isActive`
filter in `ensureDailyTrackerEntries` and keep the read join as is. Gate behind a test that
covers an inactive habit, an archived habit, and a custom habit not scheduled today.
**Decision needed:** `docs/open-questions.md` 7 (daily progress denominator).

## C-6: Quest API strips `requiredStat` while the UI reads it

**Severity:** high
**Status:** open (telemetry-verified)
**Evidence:** `src/lib/server/services/questService.ts:11-21` (`toSafeQuestion` returns
`id`, `questInstanceId`, `questionNumber`, `questionText`, `choiceA`, `choiceB`,
`createdAt`, and omits `requiredStat` and `difficultyThreshold`); it is the response shape
for activate (`:169`) and answer (`:309`). The UI reads both fields:
`src/lib/components/quests/QuestQuestion.svelte:34` (`question.requiredStat`), `:35`
(`question.difficultyThreshold`), `:67-68` and `:73` and `:120` (`requiredStat.charAt`,
`requiredStat` label). Backlog C-6 records 18 captures of
`Cannot read properties of undefined (reading 'charAt')` on `/quests`. The progress
endpoint returns a different contract (`src/routes/api/quests/[questId]/progress/+server.ts:47-55`
includes `requiredStat` and `difficultyThreshold`), so the two question shapes disagree.
**Impact:** Any consumer of the activate or answer question payload receives an object
whose `requiredStat` is `undefined`, and rendering the badge throws at
`requiredStat.charAt(0)`. The current page happens to reload questions through the
progress endpoint, which masks the crash in the happy path, but the contract is broken and
the crash is already observed in production. `difficultyThreshold` is likewise missing, so
the displayed success chance becomes `NaN`.
**Proposed fix:** Make one question contract. Include `requiredStat` in `toSafeQuestion`
(it is not sensitive; only `correctChoice` must stay server-only) and either include a
server-computed `successChance` or include `difficultyThreshold` so the UI can compute it.
Guard the render (`question?.requiredStat ?? 'unknown'`). Gate behind a component test that
renders `QuestQuestion` with an activate-shaped payload and asserts no throw.
**Decision needed:** none beyond the stat-check model in `open-questions.md` 6, which
decides whether the UI should show a rolled or an estimated chance.

## C-7: `nextActiveDate` type contract is inconsistent across producers and consumers

**Severity:** medium
**Status:** open (telemetry-verified)
**Evidence:** `src/lib/utils/habitStatus.ts:74-164` returns `string | null`;
`src/lib/components/habits/HabitCountdown.svelte:5,21` declares `string | null` and calls
`nextActiveDate.split('-')`; `src/lib/components/habits/HabitCard.svelte:19,66` passes it
through; both pages pass `status.nextActiveDate`
(`src/routes/dashboard/+page.server.ts:139`, `src/routes/habits/+page.server.ts:107`).
Backlog C-7 records 13 captures of `nextActiveDate.split is not a function` and
`getTime is not a function` on `/habits` and `/dashboard`.
**Impact:** If any caller passes a `Date` (as the backlog indicates production did), the
countdown throws and the habit card fails to render. The current server code returns a
string, so the bug appears to be latent or historical, but nothing in the type system or a
test prevents a `Date` from reaching the component.
**Proposed fix:** Standardize on a single representation. Prefer a UTC date-only string
`YYYY-MM-DD` end to end (matching the rest of the app), plus a shared parser helper, and
guard the component against non-string input. Gate behind a component test that passes a
string and asserts a rendered countdown, and a type-level check that the page data type is
`string | null`.
**Decision needed:** none.

## C-8: `habitStatus` is a cooldown, not a schedule

**Severity:** high
**Status:** open
**Evidence:** `src/lib/utils/habitStatus.ts:41-43` (daily returns `true` always), `:45-56`
(weekly active only when `daysSinceCompletion >= 7`, and always active when never
completed), `:58-61` (custom active only on selected weekdays). `getNextActiveDate` at
`:81-90` returns tomorrow for daily after any completion, and `:92-109` returns
last-completion plus seven days for weekly. `getDaysUntilActive` at `:174-196` parses the
string into local midnight.
**Impact:** The UI availability model is wrong in three ways. Daily habits are always
shown as active even if already completed (only `completedToday` hides them via
`getHabitStatus` at `:255`); weekly habits are hidden for a rolling seven days after any
completion instead of reappearing on the assigned weekday; and the model never expresses
"missed" because there is no schedule. This is the user-facing half of the C-1 bug and also
drives `HabitCountdown` and the disabled Complete button
(`src/lib/components/habits/HabitCard.svelte:65-67,108`).
**Proposed fix:** Replace the cooldown with a pure schedule predicate
`isScheduledOn(dateLocal, habit)` and a separate "completed today" flag. Daily is
scheduled every day; weekly is scheduled on its assigned weekday (C-10); custom is
scheduled on each assigned weekday. `isActiveToday` becomes
`isScheduledOn(today) and not completedToday`. Missed-occurrence detection is computed
from the previous scheduled occurrence versus `lastCompletedAt`, not from elapsed days.
Gate behind the same schedule tests as C-1.
**Decision needed:** `docs/open-questions.md` 2 (weekly non-assigned day), 3 (weekly
weekday).

## C-9: Dead streak module contains a test-only hack and is covered by a mock test

**Severity:** medium
**Status:** open
**Evidence:** `src/lib/server/streaks/calculations.ts:80-83` forces
`streakMaintained = true` when `daysSinceLastCompletion === 5`;
`:71-91` implements a week-based heuristic that is inconsistent with daily (`:86` uses
`currentStreak` for weekly while `:70` uses `currentStreak + 1` for daily); `:99-147`
`updateStreakAfterCompletion` throws when no streak row exists (`:109-111`). No route
imports the module; the only import is a type-only import in
`src/lib/client/habit-actions.ts:7`. The test
`src/tests/server/streaks/streakCalculation.test.ts:1-77` never imports the module: it
asserts on locally constructed literals, so the hack and the logic are untested.
**Impact:** The module is dead but makes the streak system look implemented, and the
`=== 5` override is a landmine if it is ever wired up. The test provides false confidence
that streak logic is covered.
**Proposed fix:** Delete `src/lib/server/streaks/calculations.ts` after moving the
`StreakUpdateResult` type to a shared type module (or drop it in favor of the route
response type), and replace the mock test with a real test that imports the new streak
function and exercises daily, weekly, and custom reset cases. Gate the change on the new
tests from C-1 passing.
**Decision needed:** none.

## C-10: The schema stores no weekday for weekly habits

**Severity:** high
**Status:** open
**Evidence:** `src/lib/server/db/schema.ts:58-64` (`habit_frequency` has `name`, `days`,
`everyX`; no weekday column). Weekly creation writes `days: null`
(`src/routes/api/habits/+server.ts:66-74`). `habitStatus.ts:45-56` therefore has nothing
to key on and falls back to a seven-day cooldown. `everyX` is never populated.
**Impact:** A weekly habit has no assigned weekday, so "complete it on the same weekday
each week" (Confirmed) cannot be evaluated. Streak logic (C-1), the schedule predicate
(C-8), the daily denominator (C-5), and the countdown (C-7) are all unable to honor the
weekly rule.
**Proposed fix:** Add `weekday` (integer 0-6) to `habit_frequency` and populate it at
creation, or derive it from the weekday of `start_date` (which is already `notNull` at
`schema.ts:95`). Deriving avoids a migration column but couples the schedule to the
start date; adding the column is more explicit and lets the user change it. Provide the
chosen source in `scheduledOccurrences` so weekly uses exactly one weekday. Gate behind a
migration test and a weekly schedule test.
**Decision needed:** `docs/open-questions.md` 3 (add a weekday column or derive it from
`startDate`).

## C-11: XP curve is monotonic and sane, but `getLevelFromXp` is an unbounded loop and the multiplier is inflated by C-1

**Severity:** low
**Status:** open (validation requested)
**Evidence:** `src/lib/shared/xp/calculations.ts:9-12`
(`floor(25 * (level - 1) ** 1.8)`), `:18-27` (`getLevelFromXp` loops incrementing `level`
while the next threshold is at or below `xp`), `:54-68` (`calculateHabitXp`), called with
the pre-increment streak at `src/routes/api/habits/[id]/complete/+server.ts:54-57`.
**Impact, validated curve:** The function is strictly increasing in `level`, so its floor
is non-decreasing and the curve is monotonic. The documented thresholds check out:
level 2 = 25, level 3 = 87, level 4 = 180, level 10 = 1304. Pacing is roughly quadratic
early and grows without bound; there is no level cap, which is unconfirmed but currently
harmless. **Two real risks:** (1) `getLevelFromXp` is O(level), recomputing `Math.pow` each
iteration, and `getLevelFromXp(Infinity)` never terminates; a corrupted or overflowed
`experience` value would spin for millions of iterations (level scales as
`(xp / 25) ** (1 / 1.8)`), and beyond `2^53` the float threshold can stall the comparison.
(2) The streak multiplier is `min(1 + streak * 0.05, 1.5)`, but `streak` never resets
(C-1), so it saturates at 1.5 after ten completions and stays there even after missed
days. The `bonusMultiplier` parameter is never passed by any caller.
**Proposed fix:** Keep the confirmed curve. Replace the loop with a closed-form or binary
search (for example, solve `level = 1 + floor((xp / 25) ** (1 / 1.8))` then correct by one
or two comparisons) and clamp to a sane maximum. Decide and document whether the
multiplier uses the streak before or after the current completion (today it uses before;
first completion gets 1.0x). Gate behind tests that assert monotonicity over a range,
reproduce the reference table, and bound the runtime for a large `xp`.
**Decision needed:** `docs/open-questions.md` 4 (confirm curve and no level cap), and the
pre- versus post-increment multiplier choice.

## C-12: Daily quests can be duplicated, are not idempotent, and have no transaction

**Severity:** high
**Status:** open
**Evidence:** `src/lib/server/services/questService.ts:26-48` (`getDailyQuest` selects by
`date(createdAt) = today` with `.limit(1)`; no unique constraint), `:53-84`
(`generateDailyQuest` inserts a new instance on every miss), `:178-318` (`answerQuestion`
performs select, insert, and update with no transaction; concurrent requests can both
read the same `currentQuestion` and both advance it), `:323-390` (`completeQuest` awards
XP and boost points with no idempotency key). `src/lib/server/db/schema.ts:145-172` has no
unique constraint on `(user_id, day)`; only ordinary indexes. Reset uses the same date
filter (`questService.ts:466-501`).
**Impact:** Two concurrent first-hits, or a request at a UTC-day boundary (C-3), can
create two daily quests. The day's "one quest, one attempt" rule is then unenforceable:
the user can attempt both. Concurrent answers can corrupt `currentQuestion`,
`correctAnswers`, and `statChecksPassed`, and can double-award rewards if two requests
reach the completion branch. A retried answer request is partly guarded by the
`quest_answers` unique index (`schema.ts:214`) but still races the progress update.
**Proposed fix:** Add a `quest_date` column (`YYYY-MM-DD` in the user's timezone) and a
unique index on `(user_id, quest_date)`; `getDailyQuest` inserts-or-returns against that
key. Wrap answer, progress update, and completion in a single transaction, and make the
progress update conditional (`where current_question = expected`) or use a returned
count to detect a lost race. Make `completeQuest` idempotent by only awarding when
`status` transitions from `active` to `completed` and the update reports one affected
row. Gate behind tests that fire concurrent first-hits and concurrent final answers and
assert exactly one quest, one reward, and consistent counters.
**Decision needed:** `docs/open-questions.md` 8 (which timezone defines the quest day).

## C-13: Quest reward display omits the second stat boost point

**Severity:** medium
**Status:** open
**Evidence:** `src/lib/server/services/questService.ts:325-334` awards 50 base plus 100
bonus at three or more correct, plus one boost point at three or more correct and another
at five stat checks passed. The UI shows only one point: completed state at
`src/lib/components/quests/QuestCard.svelte:98-101` and preview at `:113`.
**Impact:** The confirmed reward for a perfect stat-check run is two boost points, but the
player is told one, so the extra point appears to come from nowhere and the preview
understates the reward. It also never indicates the stat-check condition, which is
invisible while C-2 is deterministic.
**Proposed fix:** Have the server return the awarded breakdown (base, correct bonus,
stat-check bonus) on the quest response and render it; update the preview text to mention
the stat-check bonus. Gate behind a component test with a completed quest that passed all
five stat checks.
**Decision needed:** `docs/open-questions.md` 6 (exact stat-check model) for preview copy.

## C-14: Displayed quest success chance uses a formula unrelated to the intended one

**Severity:** low
**Status:** open
**Evidence:** `src/lib/components/quests/QuestQuestion.svelte:35` computes
`Math.min(Math.max((userStatValue / difficultyThreshold) * 100, 10), 90)`, a ratio.
`src/lib/utils/questHelpers.ts:186-196` defines the intended
`calculateSuccessChance = clamp(50 + 5 * (stat - threshold), 10, 90)`, a difference. The
server does neither (C-2, deterministic).
**Impact:** The chance shown to the player does not match the intended model or the
server, so it is misleading regardless of which server behavior is adopted. The ratio
formula also divides by an undefined threshold from the activate payload (C-6).
**Proposed fix:** Once C-2's model is decided, compute the chance on the server and return
it, or use the shared function from `questHelpers.ts` on the client. Remove the ad hoc
ratio. Gate behind the same seeded tests as C-2.
**Decision needed:** `docs/open-questions.md` 6.

## Confirmed algorithm specifications

These are the target designs the fixes above must implement. They are gated on the
open decisions noted; everything not marked open is Confirmed in
`docs/domain-rules.md`.

### Streak algorithm (daily, weekly, custom)

Inputs: `habit` (with schedule), `lastCompletedAt` (UTC instant of the last completion,
nullable), `now`, and the user's timezone.

1. Work in the user's local calendar day, not raw milliseconds. Define
   `localDay(t) = userLocalDate(t, tz)` and `localWeekday(t) = userLocalWeekday(t, tz)`.
2. Define the schedule:
   - daily: every local day.
   - weekly: the habit's assigned weekday (`habit_frequency.weekday`, see C-10).
   - custom: the set of assigned weekdays (`habit_frequency.days`).
3. Define `previousScheduledOccurrence(day)` as the latest scheduled day strictly before
   `day`, searching back at most 7 days for weekly and custom, and exactly one day for
   daily.
4. Detect a missed occurrence lazily: if `lastCompletedAt` exists and
   `localDay(lastCompletedAt)` is earlier than `previousScheduledOccurrence(today)` (or,
   for a habit whose next scheduled day is in the future, no completion occurred on the
   most recent scheduled day), set `currentStreak = 0` on read.
5. On completion, let `today = localDay(now)`, `last = localDay(lastCompletedAt)`:
   - if `last == today`: duplicate, return the existing streak.
   - if `last == previousScheduledOccurrence(today)`: `newStreak = currentStreak + 1`.
   - otherwise (no prior completion, or a scheduled occurrence was missed):
     `newStreak = 1`.
   - persist `currentStreak = newStreak`,
     `longestStreak = max(longestStreak, newStreak)`, `lastCompletedAt = now`.
6. Only a completion on an assigned day counts for weekly and custom. A completion on a
   non-assigned day must not extend the streak (open question 2). If it is allowed at all,
   record the completion but leave the streak unchanged.
7. Store one streak row per habit (add a unique constraint on `habit_streak.habit_id`) and
   upsert it rather than update-by-habit-id.
8. Reset value is 0 for a missed occurrence and 1 for the first completion of a fresh
   streak. The two are different states and must not be conflated.

### Stat-check algorithm (quest, reusable for boss battles)

Confirmed: a stat check is a probability of success derived from the user's relevant
stat, not a deterministic pass or fail; the same model is reused for boss battles. Open:
the exact curve.

1. At generation, choose the required stat and a difficulty threshold. Keep the current
   threshold shape unless the owner changes it:
   `threshold = max(STAT_MIN, relevantStat - 2 + randInt(0..4))`.
2. At answer time, compute `p = successChance(relevantStat, threshold)` and roll
   `passed = rng() < p`.
3. Seed the RNG deterministically from `(questInstanceId, questionId)` so a retry of the
   same answer is idempotent and the result is reproducible for tests and audits, while
   different questions roll independently.
4. Persist `passed_stat_check` on the question answer and aggregate
   `stat_checks_passed` on the instance.
5. Proposed starting curve (open, from the existing unused helper):
   `p = clamp(50 + 5 * (relevantStat - threshold), 10, 90)` percent. The owner must
   confirm the curve, its difficulty scaling, and its reuse for boss battles.
6. Do not leak the threshold or the correct choice to the client unless the UI needs the
   threshold for display; `correctChoice` must stay server-only.

## Uncertainty

- The completion route computes XP with the pre-increment streak, so the first completion
  of a habit gets a 1.0x multiplier. Whether the multiplier should use the post-increment
  streak (so day one is 1.05x) is not stated in the confirmed rules.
- Weekly non-assigned-day completion behavior is unresolved, which changes the streak
  reset boundary and the schedule predicate.
- Whether streaks are per habit or a single global daily streak is unresolved; this report
  assumes per habit because `habit_streak` is per habit.
- The exact probability curve for stat checks, and how it scales with difficulty and
  carries to boss battles, is unresolved; the proposed curve is a starting point only.
- The daily progress denominator (all non-archived versus scheduled today) is unresolved.
- The weekly weekday source (new column versus derived from `startDate`) is unresolved.
- No user timezone is stored today, so the timezone fix requires a schema decision.
- `calculateHealth` differences between client and server are currently unobservable
  because every class `baseHealth` is even, but the divergence should still be removed
  with the stats proposal.

## Cross-references

- `docs/domain-rules.md`: intended rules for streaks (`:37-55`), XP (`:57-97`), stats
  (`:99-107`), quests (`:109-124`), daily progress (`:126-128`), timezone (`:130-136`).
- `docs/open-questions.md`: 1, 2, 3 (streaks and weekly weekday), 4 (XP validation),
  5 (stats design), 6 (stat check), 7 (daily denominator), 8 (timezone).
- `docs/architecture.md`: module map and known skew, especially `:93-116` (XP and stats),
  `:140-162` (streaks and quests), `:219-237` (daily tracker), `:306-322` (dead code).
- `docs/data-model.md`: `habit_frequency` (`:87-99`), `habit_streak` (`:159-174`),
  `quest_instances` (`:191-216`), `daily_habit_tracker` (`:342-356`), and drift notes
  (`:390-412`).
- `docs/audit-backlog.md`: C-1 through C-7 and S-3.
- Backlog overlaps: C-1 with S-3 (transactions and uniqueness), C-3 with the timestamp
  format inconsistency in `docs/data-model.md:429-435`.
