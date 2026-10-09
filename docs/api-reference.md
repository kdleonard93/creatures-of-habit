# API and Route Reference

Scope: every JSON endpoint under `src/routes/api/**/+server.ts` and every `+page.server.ts` under `src/routes`. Auth is either:

- **session** (via `event.locals.auth()`, populated in `src/hooks.server.ts:30-49`), or
- **manual token** (the handler reads the `auth-session` cookie and calls `auth.validateSessionToken` itself), or
- **none**, or **dev-only** (guarded by `import { dev } from '$app/environment'`).

Rate limiting is `src/lib/server/rateLimit.ts`. Presets: `AUTH` = 5 per 15 min, `PASSWORD_RESET` = 3 per hour, `API` = 100 per 15 min, keyed by client IP + pathname.

## JSON API endpoints

| Path | Methods | Auth | Rate limit | Request validation | Success response | Error responses |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/categories/defaults` (`+server.ts:6-42`) | POST | session | none | none | 200 `{ categories: [{id,name,description}] }` | 401 `{error:'Unauthorized'}` |
| `/api/character/boost-stat` (`+server.ts:7-43`) | POST | manual token | `API` (`+server.ts:8`) | manual: `stat` and `points` required; `points` must be a positive number; `stat` validated in service | 200 `{ success, newStatValue, remainingPoints }` | 401; 400 for any thrown `Error` with raw `error.message` (`+server.ts:38-40`); 500 |
| `/api/character/stat-boost-points` (`+server.ts:12-103`) | GET | manual token | none | none | 200 `{ statBoostPoints, strength, dexterity, constitution, intelligence, wisdom, charisma }` (effective stats) | 401; 404 `{error:'User creature not found'}`; 500 |
| `/api/check-verification-status` (`+server.ts:3-13`) | GET | session (optional) | none | none | 200 `{ verified, authenticated }`; returns `{verified:false,authenticated:false}` with HTTP 200 when unauthenticated | none |
| `/api/habits` (`+server.ts:10-50`) | GET | session | `API` | none | 200 `{ habits: [...] }` with parsed `customFrequency` | 401; 500 `{error:'Failed to fetch habits'}` |
| `/api/habits` (`+server.ts:53-112`) | POST | session | `API` | none (raw JSON cast to `HabitData`, no schema) | 200 `{ habit }` | 401; 500 (all errors become 500) |
| `/api/habits/[id]` (`+server.ts:9-34`) | GET | session | none | none | 200 `{ habit }` | 401; 404 `{error:'Habit not found'}`; 500 |
| `/api/habits/[id]` (`+server.ts:37-111`) | PUT | session | none | none (raw JSON; special-cased single `isArchived` key otherwise full update) | 200 `{ habit }` | 401; 500 |
| `/api/habits/[id]` (`+server.ts:114-139`) | DELETE | session | none | none | 200 `{ success: true }` (soft delete via `is_archived`) | 401; 500 |
| `/api/habits/[id]/complete` (`+server.ts:12-126`) | POST | session | `API` | none (request body unused) | 200 `{ success, completion, experienceEarned, newLevel, previousLevel, leveledUp }` | 401; 404; 400 `{error:'Habit already completed today'}`; `DailyTrackerError` passthrough with its `statusCode` (403/404/500) and raw message; 500 |
| `/api/habits/[id]/permanent-delete` (`+server.ts:7-26`) | DELETE | session | none | none | 200 `{ success: true }` | 401; 500 |
| `/api/notifications` (`+server.ts:6-67`) | POST | session | none | manual: channel (or legacy `type`), `subject`, `message` required; channel must be `email`/`push`/`in-app` | 200 `{ success:true, message:'Notification sent' }` | 401; 400 missing fields, invalid channel, or `{success:false,reason}` when not sent |
| `/api/quests/[questId]/activate` (`+server.ts:6-34`) | POST | manual token | none | manual: `questId` param present | 200 `{ quest, firstQuestion }` | 401; 400 for any thrown `Error` with raw `error.message` (including "Quest not found or already activated"); 500 |
| `/api/quests/[questId]/answer` (`+server.ts:6-45`) | POST | manual token | none | manual: `questionId` and `choice`; `choice` must be `A` or `B` | 200 `{ correct, nextQuestion, questComplete, rewards }` | 401; 400 for any thrown `Error` with raw `error.message`; 500 |
| `/api/quests/[questId]/progress` (`+server.ts:8-66`) | GET | manual token | none | manual: `questId` param present | 200 `{ currentQuestion, totalQuestions, correctAnswers, questions: [safe fields] }` (correct answer and required stat/threshold included; `correctChoice` stripped) | 401; 400; 404; 500 |
| `/api/quests/daily` (`+server.ts:6-24`) | GET | manual token | none | none | 200 quest instance (creates one if none for today) | 401; 500 |
| `/api/quests/reset` (`+server.ts:7-34`) | POST | dev-only + manual token | none | none | 200 `{ message }` | 403 when not `dev`; 401; 404 `{error: result.message}`; 500 |
| `/api/register` (`+server.ts:50-187`) | POST | none | `AUTH` (5/15 min, `+server.ts:52`) | zod `registrationSchema` (`+server.ts:17-48`) | 200 `{ success:true, userId, redirectUrl:'/verify-email-pending', emailVerificationSent:true }`; also sets session cookie | 400 zod error (first message), duplicate email/username, or unique-constraint; 500 |
| `/api/resend-verification` (`+server.ts:9-47`) | POST | none | manual 3 per hour (`+server.ts:10-13`) | manual: `email` required | 200 `{success:true, message}` (same message whether or not the account exists) | 400 missing email; malformed JSON thrown at `+server.ts:15` is outside any try/catch and surfaces as a 500 |
| `/api/validate` (`+server.ts:78-156`) | GET | none | custom in-memory limiter, 10 per minute per IP (`+server.ts:9-50`), separate from `rateLimit` | manual: `type` in {email, username, creature_name} and `value`, plus per-type regex | 200 `{ available: boolean }` | 400 missing/invalid type/value; 429 `{available:false,error}`; 500 |
| `/api/waitlist` (`+server.ts:14-99`) | POST | none | manual 5 per hour (`+server.ts:16-20`) | zod `waitlistSchema` (`+server.ts:9-12`) | 200 `{success:true, message, entryId, redirectTo:'/waitlist/thank-you'}` or `{success:true, alreadySignedUp:true, redirectTo}` | 400 invalid JSON or zod issue; unique-constraint treated as already signed up; 500 generic message |

## Page server load functions and form actions

| Route file | Loads or does | Redirects | Errors |
| --- | --- | --- | --- |
| `+layout.server.ts:13-21` | Returns `{user, session}` from `locals.auth()`. | none | none |
| `+page.server.ts:7-35` | Home. Redirects authenticated users; captures a PostHog `home_page_view`. | 302 `/dashboard` if session | none |
| `login/+page.server.ts:10-15` load | Redirects already-authenticated users. | 302 `/dashboard` | none |
| `login/+page.server.ts:17-52` action | Rate-limited login; verifies password; creates session and cookie. Does **not** block unverified emails. | 302 `/dashboard` on success | `fail(400)` missing fields or bad credentials |
| `logout/+page.server.ts:6-15` action | Invalidates session and clears cookie. | 302 `/` | none |
| `dashboard/+page.server.ts:11-168` | Requires session and `emailVerified`; loads user, creature, habits with category/frequency, today's completions, last completion per habit, daily tracker stats. | 302 `/login` if no session; 302 `/verify-email-pending` if unverified; 404 if user row missing | `DailyTrackerError` -> its status code; otherwise 500 `'Failed to load dashboard data'` |
| `habits/+page.server.ts:10-129` | Requires session; loads habits, categories, today's and latest completions, creature level/experience. | 302 `/login` | none thrown (DB errors bubble as 500) |
| `habits/new/+page.server.ts:7-55` | Requires session; loads categories; lazily calls `POST /api/categories/defaults` when the user has none. | 302 `/login` | Catches default-category failure and returns `{categories:[]}` |
| `habits/[id]/edit/+page.server.ts:7-47` | Requires session; loads the habit (ownership-scoped) and categories. | 302 `/login`; 302 `/habits` if habit not found or not owned | none thrown |
| `habits/deleted/+page.server.ts:7-25` | Requires session; loads archived habits. | 302 `/login` | none |
| `character/details/+page.server.ts:7-45` | Requires session; loads creature, stats (defaults if missing), equipment. | 302 `/login` | 404 if no creature; 500 on load failure |
| `contact/+page.server.ts:18-78` action | Reads form fields; emails via Resend if configured; inserts into `contacts`. No auth, no rate limit, no schema. | none | `fail(400)` missing fields; `fail(500)` on send failure |
| `forgot-password/+page.server.ts:20-75` action | Rate-limited; looks up user by username; creates reset token and emails link. Always returns success. | none | `fail(400)` missing username |
| `forgot-username/+page.server.ts:17-79` action | Rate-limited; validates email format; looks up user by email and emails username. | none | `fail(400)` missing/invalid email; `fail(500)` send failure or email not configured |
| `reset-password/[token]/+page.server.ts:9-24` load | Validates reset token; returns `{token}`. | none | 400 missing/invalid/expired token |
| `reset-password/[token]/+page.server.ts:26-75` action | Validates password rules and token; updates password, deletes all sessions, consumes token. | 302 `/login` | `fail(400)` fields/length/mismatch/token; `fail(500)` DB failure |
| `settings/+page.server.ts:9-22` load | Returns preferences if authenticated, else `{preferences:null}` (no redirect). | none | none |
| `settings/+page.server.ts:25-68` `updatePassword` action | Requires session; verifies current password; updates password; deletes all sessions. | none | `fail(401/400/404)` |
| `settings/+page.server.ts:70-99` `updateNotifications` action | Requires session; upserts email/push/reminder prefs. Does not update `inAppNotifications`, `profileVisibility`, `activitySharing`, or `statsSharing`. | none | `fail(401)` |
| `settings/password/+page.server.ts:9-14` load | Requires session via `locals.session`; else redirects. | 302 `/login` | none |
| `settings/password/+page.server.ts:16-92` action | Requires session; verifies current password; updates password. Does **not** invalidate other sessions. No rate limit. | 302 `/login` when no session | `fail(400/404/500)` |
| `verify-email/[token]/+page.server.ts:11-52` load | Validates token, marks email verified, consumes token, sends welcome email. Side effects happen on a GET. | none | 400 invalid/expired; 500 validation/mark failure |
| `verify-email-pending/+page.server.ts:4-24` | Requires session; redirects verified users; returns email/username. | 302 `/login`; 302 `/dashboard` if verified | none |
| `waitlist/+page.server.ts:3-8` | Returns static title/description. | none | none |
| `waitlist/thank-you/+page.server.ts:6-28` | Counts all `user_waitlist` rows; reads `alreadySignedUp` query param. | none | none |

## Validation and authorization gaps

Trust in unvalidated client input:

- `POST /api/habits` casts `event.request.json()` straight to `HabitData` with no schema (`src/routes/api/habits/+server.ts:63`). `difficulty` is written unvalidated (`+server.ts:94`), so an unexpected value reaches the enum-typed column (no DB CHECK).
- `PUT /api/habits/[id]` likewise trusts the body (`src/routes/api/habits/[id]/+server.ts:45,65`). The archive branch (`+server.ts:48`) accepts any truthy/non-boolean `isArchived`, so a client can restore an archived habit or set arbitrary values.
- `POST /api/register` validates `creature.class` and `creature.race` only as `z.string()` (`src/routes/api/register/+server.ts:25-26`), then inserts them into enum columns and later casts them to `CreatureClassType`/`CreatureRaceType` (`src/routes/api/character/stat-boost-points/+server.ts:85-87`). Invalid values are persistable.
- `POST /api/notifications` accepts arbitrary `subject`, `message`, and `habitTitle` from the client (`src/routes/api/notifications/+server.ts:13-14`). For the email channel this is an outbound email relay on behalf of any logged-in user, with no schema and no rate limit.
- `/api/check-verification-status` reports verification state to any caller with a session; it is read-only and low risk.

Missing ownership checks:

- `POST /api/habits` stores `categoryId` from the body without verifying the category belongs to the caller (`src/routes/api/habits/+server.ts:86-98`; same in the PUT full update at `habits/[id]/+server.ts:88-104`). A user can attach another user's category to their habit. The FK to `habit_category(id)` is satisfied regardless of owner.
- Habit GET/PUT/DELETE/complete and permanent-delete are correctly scoped by `userId` (`habits/[id]/+server.ts`, `complete/+server.ts:22-28`).
- Quest progress/answer/activate/reset are correctly scoped by `userId` inside `src/lib/server/services/questService.ts`. The `answer` service checks quest ownership and question membership.
- `character/stat-boost-points` and `boost-stat` scope stats through the caller's creature via `src/lib/server/services/questService.ts:406-411`, so no cross-user path.

Error handling that leaks or over-broadens:

- Quest endpoints convert every thrown `Error` into HTTP 400 with the raw `error.message` (`quests/[questId]/activate/+server.ts:29-31`, `quests/[questId]/answer/+server.ts:40-42`). Client errors and "not found" are indistinguishable from server faults, and internal messages are exposed.
- `boost-stat` does the same (`character/boost-stat/+server.ts:38-40`), mapping any `Error` to 400.
- `complete` returns `DailyTrackerError.message` with its status code (`habits/[id]/complete/+server.ts:113-117`).
- `resend-verification` parses JSON at `+server.ts:15` outside the try/catch, so malformed bodies become an unhandled 500 rather than a 400.

Rate limiting gaps:

- No rate limit on `character/stat-boost-points` (GET), `character/boost-stat` is limited, quest endpoints, `notifications`, `categories/defaults`, `habits/[id]` GET/PUT/DELETE, or `permanent-delete`.
- `categories/defaults` has no idempotency guard (`categories/defaults/+server.ts:27-40`), so repeated POSTs create duplicate default categories. The `habits/new` loader only calls it when the user has zero categories, but the endpoint itself is unprotected.
- `/api/validate` uses a bespoke in-memory limiter (`+server.ts:9-50`) instead of the shared `rateLimit`, so its counters are separate and unbounded across instances.

Other authorization notes:

- `/api/quests/reset` is dev-only (`quests/reset/+server.ts:9-11`), which is the intended guard.
- `logout/+page.server.ts:8` invalidates only the current session id.
- `settings/+page.server.ts:70-99` `updateNotifications` ignores `inAppNotifications` and the privacy fields, so toggling notifications can leave those values at defaults.
- `settings/password/+page.server.ts` does not delete other sessions on password change, unlike `settings/+page.server.ts:61-65`.
- `verify-email/[token]/+page.server.ts` performs state mutation on a GET load, so link prefetchers or scanners can consume verification tokens.

Uncertainty: the exact HTTP behavior of malformed JSON in `resend-verification` depends on the SvelteKit adapter but is not caught in the handler. Foreign key enforcement (including the ownership and cascade issues above) depends on whether the Turso/LibSQL server enables `PRAGMA foreign_keys`, which is not set by the app.
