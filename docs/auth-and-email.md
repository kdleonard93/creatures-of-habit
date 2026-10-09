# Auth and Email Reference

Branch: `task/audit-updates`. This document describes the current authentication,
session, password, and email behavior. It is a reference, not a change request.

## 1. Session lifecycle

### Token generation and format
- `generateSessionToken()` creates 20 random bytes via `crypto.getRandomValues` and
  encodes them base32 lowercase, giving a 32 character token (`src/lib/server/auth.ts:12`).
- The raw token goes to the client. Only a hash is stored server side.

### Storage (hash)
- `createSession()` computes `sessionId = hexLowercase(sha256(token))` and stores that as
  the primary key (`src/lib/server/auth.ts:19`). The raw token is never persisted.
- The `session` table holds `id`, `userId` (cascade delete), and `expiresAt`
  (`src/lib/server/db/schema.ts:218`).

### Cookie name and flags
- Cookie name is `auth-session` (`src/lib/server/auth.ts:10`).
- `setSessionTokenCookie` sets `httpOnly: true`, `sameSite: "lax"`,
  `secure: isSecureRequest(event)`, an absolute `expires`, and `path: "/"`
  (`src/lib/server/auth.ts:82`).
- `isSecureRequest` trusts `x-forwarded-proto` (first value) and otherwise uses the
  request URL protocol (`src/lib/server/auth.ts:76`).
- `deleteSessionTokenCookie` mirrors the flags with `maxAge: 0`
  (`src/lib/server/auth.ts:92`).

### Expiry and sliding renewal
- New sessions live 30 days (`DAY_IN_MS * 30`, `src/lib/server/auth.ts:23`).
- `validateSessionToken` deletes the row and returns null when expired
  (`src/lib/server/auth.ts:52`). When 15 days or less remain it renews to 30 days and
  updates the row (`src/lib/server/auth.ts:58`).
- `hooks.server.ts` validates the cookie on every request, re-sets the cookie on a valid
  session, and deletes it when invalid (`src/hooks.server.ts:73`). The same logic is
  duplicated inside `event.locals.auth` (`src/hooks.server.ts:32`).

### Invalidation on logout, reset, and password change
- Logout deletes the session row by id and clears the cookie
  (`src/routes/logout/+page.server.ts:8`).
- Password reset updates the hash and deletes all sessions for the user inside one
  transaction (`src/routes/reset-password/[token]/+page.server.ts:61`).
- `settings/+page.server.ts` `updatePassword` also deletes all sessions for the user
  (`src/routes/settings/+page.server.ts:63`) but does not reissue a cookie.
- `settings/password/+page.server.ts` updates the hash only and does not touch sessions
  (`src/routes/settings/password/+page.server.ts:74`). See the gaps in section 6.

## 2. Token types

### Password reset
- 32 random bytes hex encoded (64 chars), stored as `hexLowercase(sha256(token))`
  (`src/lib/server/auth.ts:105`).
- Prior tokens for the user are deleted at creation (`src/lib/server/auth.ts:107`).
- Expiry is 1 hour (`HOUR_IN_MS`, `src/lib/server/auth.ts:114`).
- Validation joins the user, deletes the row and returns null when expired, and returns
  `{ user, tokenId }` otherwise (`src/lib/server/auth.ts:147`).
- Single use: the reset action deletes the token after a successful update
  (`src/routes/reset-password/[token]/+page.server.ts:67`,
  `src/lib/server/auth.ts:224`).
- Expired tokens are also swept by `cleanupExpiredTokens`
  (`src/lib/server/auth.ts:228`).

### Email verification
- 32 random bytes hex encoded, same hashing scheme
  (`src/lib/server/auth.ts:125`). Prior tokens for the user are deleted first
  (`src/lib/server/auth.ts:127`).
- Expiry is 1 day (`src/lib/server/auth.ts:134`).
- The token row stores an `email` column (`src/lib/server/auth.ts:141`,
  `src/lib/server/db/schema.ts:240`).
- Validation checks expiry, deletes on expiry, and returns `{ user, tokenId }`
  (`src/lib/server/auth.ts:179`). Verification marks `emailVerified` plus
  `emailVerifiedAt`, then deletes the token
  (`src/routes/verify-email/[token]/+page.server.ts:33`).
- `cleanupExpiredVerificationTokens` sweeps expired rows
  (`src/lib/server/auth.ts:234`).

### Mismatch and gaps
- Email binding is stored but not enforced. `createEmailVerificationToken` writes
  `token.email` (`src/lib/server/auth.ts:141`), yet `validateEmailVerificationToken`
  returns `user.email` and never compares it to `verificationToken.email`
  (`src/lib/server/auth.ts:183`, `src/lib/server/auth.ts:199`). A token is bound to the
  user, not verified against the address it was issued for.
- `verify-email-pending` redirects unverified users, but nothing enforces
  `emailVerified` elsewhere, so registration does not truly require verification
  (`src/routes/verify-email-pending/+page.server.ts:14`). See section 5.
- There is no single-use marker on verification tokens beyond deletion on success; a
  still-valid token can be replayed before use, but the second call fails because the
  row is gone.

## 3. Password hashing

- Algorithm is bcrypt with `saltRounds = 10` (`src/lib/utils/password.ts:4`).
  Verification uses `bcrypt.compare` and returns false on error
  (`src/lib/utils/password.ts:8`).
- Max accepted password length is 72 at registration
  (`src/routes/api/register/+server.ts:20`), matching bcrypt's effective byte limit.
- `@node-rs/argon2` is a declared dependency (`package.json:68`, `package.json:74`) but
  is not imported anywhere in `src`. It is an unused dependency.

## 4. Email flows

### Registration verification
- `POST /api/register` validates input, inserts user, creature, stats, and preferences,
  creates a session, sets the cookie, then creates a verification token and sends the
  verification email (`src/routes/api/register/+server.ts:84`,
  `src/routes/api/register/+server.ts:130`,
  `src/routes/api/register/+server.ts:136`).
- Email failure is swallowed and registration still succeeds
  (`src/routes/api/register/+server.ts:139`).
- The API returns `redirectUrl: "/verify-email-pending"`
  (`src/routes/api/register/+server.ts:147`), but the signup page ignores it and navigates
  to `/dashboard` on success (`src/routes/signup/+page.svelte:21`). Verification is not
  enforced before app use.
- `POST /api/resend-verification` re-issues and resends, returning a generic message to
  avoid enumeration (`src/routes/api/resend-verification/+server.ts:36`).

### Welcome email
- Sent non-blocking after successful verification
  (`src/routes/verify-email/[token]/+page.server.ts:43`).
- Template escapes the username (`src/lib/server/services/emailVerificationService.ts:122`).

### Forgot username
- `forgot-username/+page.server.ts` looks up by email, returns success regardless to
  avoid enumeration, and emails the username
  (`src/routes/forgot-username/+page.server.ts:47`).
- The username is interpolated into HTML without escaping
  (`src/routes/forgot-username/+page.server.ts:62`). See section 6.
- The lookup uses the raw submitted `email` (not the trimmed, lowercased
  `sanitizedEmail`), so casing or whitespace differences can miss the user
  (`src/routes/forgot-username/+page.server.ts:44`).

### Forgot password
- `forgot-password/+page.server.ts` uses its own `Resend` instance rather than the shared
  provider (`src/routes/forgot-password/+page.server.ts:15`). It creates a reset token,
  builds the URL from the canonical base, escapes username and link, and sends inline HTML
  (`src/routes/forgot-password/+page.server.ts:41`).
- It always returns `{ success: true }`, including when Resend is missing or throws
  (`src/routes/forgot-password/+page.server.ts:66`).

### Habit reminder and notification preferences
- `NotificationService.sendNotification` loads the user and preferences and checks the
  channel plus, for reminders, `reminderNotifications`
  (`src/lib/server/services/notificationService.ts:51`,
  `src/lib/server/services/notificationService.ts:82`). Missing preferences default to
  enabled (`src/lib/server/services/notificationService.ts:87`).
- For an email reminder with a habit title it calls `sendHabitReminderEmail`
  (`src/lib/server/services/notificationService.ts:62`), whose template escapes username,
  habit title, and link (`src/lib/server/services/emailVerificationService.ts:191`).
- Any other email channel call routes to `sendEmail`, which passes the caller supplied
  string as `html` with no escaping
  (`src/lib/server/services/notificationService.ts:114`).
- `POST /api/notifications` requires an authenticated session and forwards
  caller supplied `subject`, `message`, and `habitTitle`
  (`src/routes/api/notifications/+server.ts:8`,
  `src/routes/api/notifications/+server.ts:51`). Push is not implemented and returns not
  sent (`src/lib/server/services/notificationService.ts:73`).

### Resend provider behavior
- `ResendEmailProvider.sendEmail` awaits `this.resend.emails.send(...)` and returns
  `{ success: true }` whenever the promise resolves
  (`src/lib/server/services/email/ResendEmailProvider.ts:21`). It never inspects the
  resolved `{ data, error }` shape that the Resend SDK returns, so API level failures that
  resolve instead of throwing are reported as success.
- The same pattern appears in `forgot-username` (which does wrap in try/catch but only
  catches throws), `forgot-password`, and the contact form, which use the SDK directly
  (`src/routes/forgot-username/+page.server.ts:55`,
  `src/routes/contact/+page.server.ts:42`).

## 5. Verification requirement

Registration issues a session and the signup page sends the user to the dashboard, so
email verification is effectively optional. Only `verify-email-pending` checks
`emailVerified` (`src/routes/verify-email-pending/+page.server.ts:14`). No route load,
action, or API endpoint gates behavior on `emailVerified`. This is a gap against a
"must verify before use" model.

## 6. Security gaps

- No session rotation on privilege change. Login issues a fresh session
  (`src/routes/login/+page.server.ts:46`), but email verification and password change do
  not rotate the session token. `settings/+page.server.ts` deletes every session without
  issuing a replacement (`src/routes/settings/+page.server.ts:63`).
- Inconsistent session invalidation. `settings/+page.server.ts` deletes all sessions on
  password change (`src/routes/settings/+page.server.ts:63`), while
  `settings/password/+page.server.ts` leaves all sessions valid
  (`src/routes/settings/password/+page.server.ts:74`).
- HTML injection in the generic notification email path. `/api/notifications` forwards
  a user controlled `message` as raw HTML to `sendEmail` with no escaping, so a logged in
  user can inject markup into the outbound email
  (`src/routes/api/notifications/+server.ts:51`,
  `src/lib/server/services/notificationService.ts:119`).
- Unescaped username in the forgot username email, unlike the password reset email which
  escapes (`src/routes/forgot-username/+page.server.ts:62`,
  `src/routes/forgot-password/+page.server.ts:46`).
- CSRF posture. SvelteKit form actions get the built in origin check. The JSON endpoints
  `/api/register`, `/api/waitlist`, `/api/notifications`, and `/api/resend-verification`
  accept `application/json` and are not covered by that form action check
  (`src/routes/api/register/+server.ts:50`,
  `src/routes/api/waitlist/+server.ts:14`). The session cookie is `sameSite: lax`, which
  reduces cross site credential sending, but there is no explicit CSRF token for these
  JSON routes. `svelte.config.js` does not configure `csrf.checkOrigin`.
- Enumeration handling is inconsistent: forgot password and resend verification return a
  generic success, while forgot username returns a 500 when email is not configured and
  otherwise reveals nothing (`src/routes/forgot-username/+page.server.ts:74`).

## 7. Test coverage

Tests that exist:
- `src/tests/auth.test.ts` tests only token shape and mock session structure, using
  `mockAuth` (`src/tests/auth.test.ts:17`).
- `src/tests/api/register.api.test.ts` covers registration success and error
  (`src/tests/api/register.api.test.ts:21`).
- `src/tests/services/emailVerificationService.test.ts` covers validation and template
  output.
- `src/tests/services/notificationService.test.ts` and `src/tests/api/notifications.test.ts`
  cover notification routing.

Flows with no route level tests:
- Login and logout (`src/routes/login/+page.server.ts`, `src/routes/logout/+page.server.ts`).
- Forgot password and forgot username
  (`src/routes/forgot-password/+page.server.ts`, `src/routes/forgot-username/+page.server.ts`).
- Reset password (`src/routes/reset-password/[token]/+page.server.ts`).
- Email verification and the pending page
  (`src/routes/verify-email/[token]/+page.server.ts`,
  `src/routes/verify-email-pending/+page.server.ts`).
- Settings and settings password, including the session invalidation difference
  (`src/routes/settings/+page.server.ts`,
  `src/routes/settings/password/+page.server.ts`).
- Resend verification (`src/routes/api/resend-verification/+server.ts`).
- Sliding session renewal and cookie flags are asserted only through mock structures, not
  against real cookie behavior.
