# Server and API Layer Audit

Branch `task/audit-updates`, audit date 2026-10-09. Scope: the JSON endpoints under
`src/routes/api/**/+server.ts`, the `+page.server.ts` loads and form actions under
`src/routes/**`, the server services under `src/lib/server/services/**`, and the shared
rate limiter `src/lib/server/rateLimit.ts`. The audit focuses on correctness, input
validation, authorization and IDOR, error handling and information leakage, race
conditions and transactions, response-contract mismatches with the consuming Svelte code,
rate-limit coverage, and endpoints that turn malformed input into a server error. It is
read-only and does not modify source. PostHog evidence from the project lifetime is folded
in where it maps to a concrete code path. Findings already covered by sibling reports
(C-6, C-12, A-2, O-1, P-*) are cross-referenced rather than restated.

## Findings

### S-1: Habit write endpoints trust unvalidated client input and skip category ownership

**Severity:** high
**Status:** open

**Evidence:** `src/routes/api/habits/+server.ts:63` casts `await event.request.json()`
straight to `HabitData` with no schema. `difficulty` is written unvalidated at
`habits/+server.ts:94` into a column whose `enum` is type-level only (there is no DB CHECK
in `src/lib/server/db/schema.ts:89-91`), so any string persists. `title` (`:90`),
`startDate` (`:95`), `endDate` (`:96`), and `customFrequency.days` (`:75-84`, stored via
`JSON.stringify`) are all taken on trust. The same pattern is in the update path:
`src/routes/api/habits/[id]/+server.ts:65`, `:91-98`, with the archive short-circuit at
`:48` accepting any truthy/non-boolean `isArchived` and `.set({ isArchived: body.isArchived })`
at `:52`. `categoryId` is stored without any ownership lookup in both files
(`habits/+server.ts:92`, `habits/[id]/+server.ts:93`); the FK to `habit_category(id)` is
satisfied regardless of which user owns the category. The page loaders join the category on
`categoryId` alone (`src/routes/habits/+page.server.ts:67-68`,
`src/routes/dashboard/+page.server.ts:66-68`), so another user's category name is rendered
on the attacker's habit card.

**Impact:** A client can persist an out-of-range `difficulty` (then
`calculateHabitXp` yields `NaN` in `src/routes/api/habits/[id]/complete/+server.ts:54-57`),
an `undefined`/non-date `startDate` (NOT NULL violation promoted to a 500), an arbitrary
`customFrequency.days` array, or `isArchived` of any type. A user can attach another user's
category to their own habit, producing a small cross-user data reference and leaking that
category's name and id. This is exactly the class the domain skill calls out as a wrong
"Current" behavior.

**Proposed fix:** Add a Zod schema shared by create and update (title length cap, difficulty
from the enum, ISO date strings, `customFrequency.days` integers in 0..6, `categoryId`
optional uuid). On create and update, verify `categoryId` belongs to `session.user.id`
(`and(eq(habitCategory.id, categoryId), eq(habitCategory.userId, session.user.id))`) and
reject otherwise. Constrain the archive branch to a literal boolean. Gate behind endpoint
tests that post an invalid difficulty, an out-of-range day, and a foreign `categoryId` and
assert 400 and no row written, plus a loader test that an unowned category cannot appear.

**Decision needed:** none for validation and ownership. The weekly-weekday model is open in
`docs/open-questions.md` 4 but is out of scope here.

### S-2: Quest and boost-stat endpoints collapse every thrown Error into HTTP 400 and leak the raw message

**Severity:** high
**Status:** open

**Evidence:** `src/routes/api/quests/[questId]/activate/+server.ts:29-31` and
`src/routes/api/quests/[questId]/answer/+server.ts:40-42` return
`{ error: error.message }` with status 400 for any `Error`; only non-`Error` values reach the
500 branch. `src/routes/api/character/boost-stat/+server.ts:38-40` does the same. The
reachable `error.message` values include intended client errors and internal faults:

- From `activateQuest` (`src/lib/server/services/questService.ts:151-153`):
  `Quest not found or already activated`.
- From `answerQuestion` (`questService.ts:191-247,266-269`): `Quest not found or access
  denied`, `Quest is not active`, `Question not found or does not belong to this quest`,
  `Expected question N, but received question M` (leaks internal counters), `Question has
  already been answered`, `User stats not found`, and `Question has already been answered
  (concurrent request detected)`.
- From `spendStatBoostPoints` (`questService.ts:396-421`): `Points must be positive`,
  `Invalid stat type`, `User stats not found`, `Insufficient stat boost points`.
- Any driver or query fault thrown by the same calls. PostHog records one
  `ConnectTimeoutError` to `turso.io` (backlog evidence row 12); if it happens inside these
  calls the connection string is delivered to the client as a 400 `error`. A malformed JSON
  body also throws inside the handler (`answer/+server.ts:23`, `boost-stat/+server.ts:21`)
  and is returned as a 400 with the parser message.

**Impact:** Client errors and server faults are indistinguishable, so a caller cannot retry
correctly and monitoring cannot classify faults. Internal messages leak schema and
connection details. The status is also wrong on the wire: a DB outage answers with 400, not
5xx.

**Proposed fix:** Introduce typed application errors (for example a small
`AppError { statusCode, publicMessage }`) in the service layer; the handlers map those to
their status and a generic message, log the real error with `logger`, and return 500 for
anything else. Validate the request body before calling the service so parse failures are a
400 with a fixed message. Gate behind handler tests that stub the service to throw a
domain error (expect its status and public message) and a driver error (expect 500 and no
message content), plus a malformed-body test.

**Decision needed:** none.

### S-3: Missing transactions and non-atomic spend allow duplicate quests and double-spent boost points

**Severity:** high
**Status:** open

**Evidence:** The quest race (duplicate daily quests, non-transactional answer/progress and
completion) is documented in detail as C-12 and is not restated here; it maps to backlog
S-3. The additional, uncovered instance is the boost-point spend. In
`src/lib/server/services/questService.ts:395-461`, `spendStatBoostPoints` reads the current
stats (`:406-411`), checks `currentStats.statBoostPoints < points` (`:419-421`), then applies
`statBoostPoints - points` and the chosen stat increment as separate SQL expressions
(`:424-450`) with no conditional guard and no transaction. There is no
`where ... and gte(creatureStats.statBoostPoints, points)`. Two concurrent
`POST /api/character/boost-stat` requests both observe the same balance, both pass the
check, and both decrement, so `statBoostPoints` can go below zero and the stat can be
incremented twice.

**Impact:** A user can spend points they do not have by firing concurrent requests, driving
the balance negative and inflating a stat, which feeds the deterministic stat checks in
C-2. Quest duplicates and counter drift remain as described in C-12. The `quest_answers`
unique index (`schema.ts:214`) protects only a single answer, not the progress update or the
completion branch.

**Proposed fix:** Make the spend conditional and atomic: `update ... set
statBoostPoints = statBoostPoints - points, <stat> = <stat> + points where id = ? and
statBoostPoints >= points` and inspect rows-affected, returning a conflict if zero. Wrap the
quest answer, progress update, and completion in one transaction per C-12 and add the
`(user_id, quest_date)` unique key. Gate behind tests that fire two concurrent spends and
two concurrent final answers against a real in-memory libsql database and assert the
balance never goes negative, one reward, and exactly one quest.

**Decision needed:** `docs/open-questions.md` 8 (which timezone defines the quest day),
as in C-12.

### S-4: `/api/categories/defaults` is not idempotent and has no rate limit

**Severity:** low
**Status:** open

**Evidence:** `src/routes/api/categories/defaults/+server.ts:6-43` inserts the same six
default categories on every POST with no existence check and no `rateLimit` call. The
`habits/new` loader only calls it when the user has zero categories
(`src/routes/habits/new/+page.server.ts:26-31`), but the endpoint itself is reachable by any
authenticated caller and a double click or retry creates duplicates.

**Impact:** Duplicate category lists degrade the habit form and the category join. No
integrity constraint prevents it.

**Proposed fix:** Insert only names not already present for the user (insert-select or a
pre-check inside a transaction), or add a unique `(user_id, name)` constraint and use
`onConflictDoNothing`. Add `await rateLimit(event, RateLimitPresets.API)`. Gate behind a test
that calls the handler twice as the same user and asserts a single set.

**Decision needed:** whether default categories should be per-user rows at all, or a shared
seed (product choice). If shared, the endpoint should not write per user.

### S-5: `forgot-username` compares the raw email and leaks a 500 when email is unconfigured

**Severity:** medium
**Status:** open

**Evidence:** `src/routes/forgot-username/+page.server.ts:29` computes
`sanitizedEmail = email.trim().toLowerCase()` but the lookup at `:41-45` uses the raw
`email` (`eq(table.user.email, email)`) while registration stores lowercased emails
(`src/routes/api/register/+server.ts:56`). An email with any uppercase letter silently
matches nothing and the action returns success without sending. When Resend is not
configured the action returns `fail(500, { message: 'Email service not configured...' })`
at `:72-75`, which reveals server configuration state.

**Impact:** Username recovery fails silently for capitalized input, and the 500 branch
reveals deployment configuration. This is the S-5 backlog item, confirmed in code.

**Proposed fix:** Query with `sanitizedEmail`. When the provider is absent, log and return
the same generic success used for a missing account. Gate behind an action test that
submits a mixed-case email stored lowercase and asserts a lookup match, plus one asserting
the no-provider path returns the generic success shape.

**Decision needed:** none.

### S-6: Malformed or non-JSON request bodies produce 500s or leaked 400s

**Severity:** medium
**Status:** open

**Evidence:** `src/routes/api/resend-verification/+server.ts:15` reads
`await event.request.json()` outside any try/catch, so a malformed body throws to
`handleError` and becomes a 500. `src/routes/api/notifications/+server.ts:13` reads the body
with no try/catch at all, so a parse failure or a throw from `sendNotification` is an
uncaught 500. In `src/routes/api/habits/+server.ts:63` and
`src/routes/api/habits/[id]/+server.ts:45` and `src/routes/api/register/+server.ts:54` the
parse is inside a catch that funnels to the generic 500, so malformed JSON is reported as a
server fault. `src/routes/api/quests/[questId]/answer/+server.ts:23` and
`src/routes/api/character/boost-stat/+server.ts:21` parse inside a catch that returns the raw
parser message as a 400 (see S-2). Only `waitlist/+server.ts:65-70` maps `SyntaxError`
explicitly to a 400.

**Impact:** Automated clients and scanners sending a bad content type get 500s that pollute
error tracking, and where a 400 is returned it leaks parser internals. The behavior is
inconsistent across endpoints, so clients cannot rely on a single error contract.

**Proposed fix:** Parse the body in a small helper that catches and returns a 400 with a
fixed message, and use it in every JSON handler. Gate behind a table-driven test that posts
an invalid body to each endpoint and asserts 400 with no internal text for all of them.

**Decision needed:** none.

### S-7: `PUT /api/habits/[id]` returns 200 with an empty body for a missing or foreign habit

**Severity:** medium
**Status:** open

**Evidence:** `src/routes/api/habits/[id]/+server.ts:88-106` runs `.returning()` and
destructures `[updatedHabit]`. When no row matches (wrong id or another user's habit) the
result is `[]`, `updatedHabit` is `undefined`, and `:106` returns
`json({ habit: undefined })`, which serializes to `{}` with status 200. The archive branch
has the same shape (`:49-61`). `DELETE` (`:123-134`) and `permanent-delete` (`:15-22`)
similarly return `{ success: true }` even when zero rows matched. The client treats
non-ok as an error (`src/routes/habits/[id]/edit/+page.svelte:32-35`), so a silent 200 is
reported to the user as a successful edit that did nothing.

**Impact:** Ownership violations and stale ids are indistinguishable from success; a user
edits a habit that was deleted or belongs to someone else and is told it worked. Combined
with S-1, the archive branch is also the only restore path and accepts arbitrary
`isArchived` values.

**Proposed fix:** After `.returning()`, return 404 when the row is absent, for update,
archive, delete, and permanent-delete. Constrain `isArchived` to a boolean. Gate behind
tests that PUT/DELETE a foreign or missing id and assert 404 and no mutation.

**Decision needed:** whether the archive branch is the intended restore surface, or whether
restore should be its own endpoint with an explicit action. The ownership semantics are not
in question.

### S-8: Habit completion is a non-atomic read-then-insert with no unique constraint, so concurrent requests double-award

**Severity:** high
**Status:** open

**Evidence:** `src/routes/api/habits/[id]/complete/+server.ts:36-46` checks for today's
completion with a SELECT, then inserts at `:59-68`; the check and insert are not in a
transaction and there is no unique constraint on `(habit_id, completed_at)` in
`src/lib/server/db/schema.ts:102-115`. A double click or two in-flight requests both pass
the check. Both then insert a completion, both increment the streak (`:70-81`, which also
never resets, per C-1), and both add XP to the creature (`:89-99`).

**Impact:** A user can farm a habit and its streak and XP by firing the completion request
twice, and the "one completion per habit per day" rule in the domain rules is unenforced at
the database layer. This is the completion analogue of the C-12 quest race and is separate
from the wrong streak math in C-1.

**Proposed fix:** Add a unique index on `(habit_id, completed_at)` and perform the insert
with `onConflictDoNothing`, awarding XP, streak, and tracker only when a row was actually
inserted, all in one transaction. Gate behind a test that issues two concurrent completions
against a real libsql database and asserts one completion row, one XP award, and one streak
step.

**Decision needed:** none. Resetting the streak on a miss is C-1 and `open-questions.md` 1-3.

### S-9: Response contracts disagree with the code that consumes them

**Severity:** low
**Status:** verify

**Evidence:** Three mismatches, none of which currently throws in the happy path:

- Completion shape: `src/lib/client/habit-actions.ts:12-19` declares
  `HabitCompletionResponse.streakUpdate: StreakUpdateResult` as required, but
  `habits/[id]/complete/+server.ts:104-111` returns no `streakUpdate`. The client does not
  read it, so it is a type lie, and the mocked API test asserts it
  (`src/tests/api/habits.api.test.ts:262-265`), which is why the gap never surfaced (T-1).
- Quest question shape: `toSafeQuestion`
  (`src/lib/server/services/questService.ts:11-21`) strips `requiredStat` and
  `difficultyThreshold` for activate (`:169`) and answer (`:309`), while
  `/api/quests/[questId]/progress` returns a different shape that includes both
  (`src/routes/api/quests/[questId]/progress/+server.ts:47-55`). The UI reads `requiredStat`
  and `difficultyThreshold` (`src/lib/components/quests/QuestQuestion.svelte:34-35,67-73`).
  This is C-6 in full; the server-layer point is that two serializers exist for the same
  entity and the page reloads through the one that happens to work.
- Habit action return types: `createHabit` and `updateHabit` are typed
  `Promise<string>` (`habit-actions.ts:94,125`) but return `data.habit`, an object
  (`:111,142`). The `habits/new` and `habits/[id]/edit` pages inline their own fetches and
  ignore the return type, so nothing fails, but the helper is misused or dead.

**Impact:** Low today because the consumers route around the mismatch, but the types and the
mocked test actively hide the divergence, and the next consumer of the activate/answer
payload will reproduce the C-6 crash.

**Proposed fix:** Pick one question serializer and include `requiredStat` (never
`correctChoice`); return `streakUpdate` from the completion handler or remove it from the
interface and the test; correct the habit-action return types. Gate behind a real handler
test that asserts the exact response keys, replacing the fetch-mock test.

**Decision needed:** none beyond the stat-check model in `open-questions.md` 6, referenced
by C-6.

### S-10: API rate-limit coverage has gaps and the limiter is per-instance

**Severity:** medium
**Status:** open

**Evidence:** Only `/api/register` (`RateLimitPresets.AUTH`),
`/api/habits` GET/POST (`RateLimitPresets.API`),
`/api/habits/[id]/complete` (`API`), `/api/character/boost-stat` (`API`), and the ad-hoc
5/hour on `/api/waitlist` and 3/hour on `/api/resend-verification` are limited. No limit
runs on `/api/quests/daily`, `/api/quests/[questId]/activate`,
`/api/quests/[questId]/answer`, `/api/quests/[questId]/progress`, `/api/quests/reset`,
`/api/character/stat-boost-points` GET, `/api/categories/defaults`,
`/api/habits/[id]` GET/PUT/DELETE, `/api/habits/[id]/permanent-delete`,
`/api/notifications`, or `/api/check-verification-status`. The store is a process-local
`MemoryCache` (`src/lib/server/rateLimit.ts:14`, A-2), so even the limited endpoints are
ineffective across horizontally scaled instances. `/api/validate` uses a separate bespoke
limiter keyed on `event.getClientAddress()` (`src/routes/api/validate/+server.ts:9-50,80`)
rather than the shared trusted-proxy logic at `rateLimit.ts:94-106`.

**Impact:** The quest and character stat endpoints are cheap to script, and the notification
email path is an unthrottled outbound relay (see A-3/P-1). Under any multi-instance deploy
the counters do not aggregate, so the limits are advisory. This extends A-2 with the exact
endpoint list; it is not a new class of defect.

**Proposed fix:** Apply a shared preset to every mutating API endpoint, at minimum the quest
answer/activate and `boost-stat` paths, and route `/api/validate` through the shared limiter
with `TRUST_PROXY` handling. Move the store to a shared backend (Redis or the database) or
document that a single instance is required. Gate behind a test that calls a protected
endpoint past its limit and asserts 429 with `Retry-After`, plus a proxy-header test for the
key derivation.

**Decision needed:** whether to adopt a shared rate-limit store now or to constrain the
deployment to one instance. This is the deployment decision already implied by A-2.

### S-11: Expected 405 bot POSTs are captured as server exceptions

**Severity:** low
**Status:** open

**Evidence:** PostHog records 23 server-side captures of
`POST method not allowed. No form actions exist for this page` across page routes.
`src/hooks.server.ts:97-106` captures every non-404 with
`posthogClient.captureException(error)`, so the expected 405 from a POST to a page route
without actions is reported as an error, with no `distinctId`, route, or release context
(O-1). This is server-side error-capture behavior, not a route bug.

**Impact:** Bots inflate the server error feed, the same defect class as O-1, and add noise
that masks real faults such as the single `ConnectTimeoutError` in S-2.

**Proposed fix:** Treat expected 4xx (including 405) as non-errors in `handleError`, or
filter the known SvelteKit 405 message, and attach `distinctId` and route context to genuine
captures. Gate behind a unit test that calls `handleError` with status 405 and asserts no
capture, and one with status 500 that asserts a capture.

**Decision needed:** none. Overlaps O-1; do not fix twice.

## Uncertainty

- The precise HTTP result of a malformed body in `resend-verification` and `notifications`
  depends on the `adapter-node` error mapping, but neither is caught in the handler, so the
  outcome is a server error regardless. The `notifications` handler has no try/catch at all,
  so any throw, including from `sendNotification`, becomes an unhandled 500.
- Foreign-key enforcement for the category ownership issue depends on whether the
  Turso/LibSQL server enables `PRAGMA foreign_keys`; the app never sets it. Ownership checks
  should not rely on the FK either way.
- The C-7 `nextActiveDate` production crashes (`split is not a function`) could not be
  reproduced against the current loaders, which pass a `string | null` from
  `getHabitStatus`; it may be historical or fixed by another branch. Reported in full as
  C-7, not re-litigated here.
- The exact `Error` name and message shape of the single `ConnectTimeoutError` is taken from
  the backlog evidence; if it occurs in a quest or boost call it is returned as a 400 body
  under S-2, but the capture path is not confirmed to that endpoint.
- `/api/quests/[questId]/progress` returns questions without an `ORDER BY`, so the array
  index the UI uses (`questProgress.questions[dailyQuest.currentQuestion]`) relies on
  SQLite insertion order rather than a guaranteed order. It does not currently throw, but it
  can show the wrong question; folded into S-9.

## Cross-references

- `docs/reports/05-correctness.md`: C-1 (streak never resets, the completion-route half of
  S-8's impact), C-6 (requiredStat stripped; the quest half of S-9), C-7 (`nextActiveDate`
  type contract), C-12 (duplicate daily quests, non-transactional answer and completion; the
  quest half of S-3).
- `docs/reports/04-auth-security.md`: A-2 (per-instance rate limiting and unlit endpoints;
  S-10 extends it), A-3 (untrusted content in email; relevant to `notifications` and S-6),
  A-6 (verification not enforced; `resend-verification` and `check-verification-status` are
  in scope but not re-reported).
- `docs/reports/03-observability.md`: O-1 (every non-404 captured; S-11 extends it), O-8
  (the verification poll, adjacent to `check-verification-status`).
- `docs/reports/06-abuse.md`: P-1 (contact relay; the notification email relay in S-6 is a
  sibling), P-2 (raw `x-forwarded-for`; adjacent to the limiter key logic in S-10).
- `docs/reports/07-tests.md`: T-1 (fetch-mock API tests; the reason S-9's completion-shape
  mismatch and the `streakUpdate` assertion pass today).
- `docs/api-reference.md` "Validation and authorization gaps" and
  `docs/audit-backlog.md` S-1 through S-5 are the predecessors of this report.
