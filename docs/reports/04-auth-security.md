# Auth, Session, Email, and Security Audit

Scope: read-only review of branch `task/audit-updates` on 2026-10-09, covering
authentication, session lifecycle, email verification and transactional email,
rate limiting, CSRF posture, security headers, logging, and secrets handling.
Files reviewed: `src/lib/server/auth.ts`, `src/lib/utils/password.ts`,
`src/lib/utils/html.ts`, `src/lib/utils/url.ts`, `src/hooks.server.ts`,
`src/lib/server/securityHeaders.ts`, `src/lib/server/rateLimit.ts`,
`src/lib/server/cache/MemoryCache.ts`,
`src/lib/server/services/emailVerificationService.ts`,
`src/lib/server/services/email/ResendEmailProvider.ts`,
`src/lib/server/services/notificationService.ts`, `src/lib/utils/logger.ts`, the
auth route handlers and actions (login, logout, signup, forgot-password,
forgot-username, reset-password, verify-email, verify-email-pending, settings,
settings/password, api/register, api/resend-verification, api/notifications,
api/validate, api/waitlist, api/check-verification-status), `svelte.config.js`,
and `.env` handling. Findings reuse A-1 through A-5 from
`docs/audit-backlog.md` where they match, and add A-6 and beyond. No source was
modified.

Note on the reference docs: `docs/auth-and-email.md` (lines 83-85, 173-175) and
`docs/architecture.md` (lines 277-278) state that nothing enforces
`emailVerified` and that registration does not require verification. That is now
partly outdated: `src/routes/dashboard/+page.server.ts:19` does gate the
dashboard. The enforcement is still incomplete, which is A-6.

### A-6: Email verification is not actually enforced

Severity: high
Status: open (contradicts the confirmed owner requirement that verification is required)

Evidence:
- `src/routes/api/register/+server.ts:130-133` creates a session and sets the
  cookie before the verification email is sent; `:136-142` sends the email
  best-effort; `:144-149` returns `redirectUrl: '/verify-email-pending'`.
- `src/routes/signup/+page.svelte:20-21` ignores `redirectUrl` and navigates to
  `/dashboard`.
- The only `emailVerified` gate is `src/routes/dashboard/+page.server.ts:18-21`.
- `src/routes/habits/+page.server.ts:10-15` and
  `src/routes/settings/password/+page.server.ts:9-14` check session only.
  `src/routes/settings/+page.server.ts:9-22`, `src/routes/character/details/+page.server.ts:7-12`,
  and `src/routes/verify-email-pending/+page.server.ts:4-16` behave the same way.
- API handlers check auth but not verification: `src/routes/api/habits/+server.ts`,
  `src/routes/api/habits/[id]/+server.ts`, `src/routes/api/habits/[id]/complete/+server.ts`,
  `src/routes/api/notifications/+server.ts:8-11`, `src/routes/api/character/boost-stat/+server.ts`,
  `src/routes/api/categories/defaults/+server.ts`.
- A repository-wide search for `emailVerified` finds only
  `dashboard/+page.server.ts`, `api/check-verification-status/+server.ts`,
  `api/resend-verification/+server.ts`, and `verify-email-pending/+page.server.ts`.

Impact: an account is fully usable before its email is verified. After
registration an unverified user can skip `/verify-email-pending` and go straight
to `/habits`, change password, use every JSON API, and complete habits or quests.
Email verification is effectively optional, which violates the confirmed product
requirement. Registration also hands out a long-lived session before ownership of
the address is proven.

Proposed fix: add a single enforcement point. A `requireVerifiedUser(event)`
helper (or a hooks level check for protected prefixes) that redirects page loads
to `/verify-email-pending` and returns 403 for JSON APIs. Apply it to every
protected load and endpoint, not just the dashboard. Make the signup page honor
`redirectUrl`. Keep an explicit allowlist for `/verify-email-pending`,
`/api/resend-verification`, `/api/check-verification-status`, logout, and contact.
Cover it with a route-level test that an unverified session is rejected by
`/api/habits`.

Decision needed: confirm the pre-verification allowlist and whether there is any
grace window. Otherwise treat verification as strictly required.

### A-1: Session lifecycle and invalidation are inconsistent; no rotation on privilege change

Severity: medium
Status: open (extends A-1)

Evidence:
- Login issues a fresh session (`src/routes/login/+page.server.ts:46-48`), which
  is correct.
- Email verification marks the user verified and deletes the token but does not
  rotate or reissue the session (`src/routes/verify-email/[token]/+page.server.ts:32-34`),
  so the pre-verification session simply becomes a verified session.
- `src/routes/settings/+page.server.ts:56-65` updates the hash and deletes every
  session for the user, but returns success without reissuing a cookie. The
  caller's cookie now references a deleted row and the user is silently logged out
  on the next request.
- `src/routes/settings/password/+page.server.ts:74-77` updates the hash and does
  not touch sessions at all, so other stolen or shared sessions stay valid. This
  contradicts `settings` and `reset-password`.
- `src/routes/reset-password/[token]/+page.server.ts:61-66` updates the hash and
  deletes all sessions inside a transaction (the strongest path).
- Cookie flags and sliding renewal live in `src/lib/server/auth.ts:29-68`,
  `:82-90`; `src/hooks.server.ts:32-53` and `:55-95` duplicate the same
  resolution logic in two places.

Impact: security depends on which password form a user picks. Changing a password
through `/settings/password` leaves an attacker's existing session alive, while
the same action through `/settings` revokes everything and logs the user out.
Because verification does not rotate the session, the pre-verification cookie
remains the post-verification cookie.

Proposed fix: one password-change code path. Delete all sessions, issue a fresh
session, set the cookie, and return success. Rotate the session on email
verification (delete, create, set cookie). Consider a `sessionVersion` or
`passwordChangedAt` check in `validateSessionToken` so revocation is enforced even
for sessions not enumerated. Deduplicate the hook logic into one function.

Decision needed: should every password change sign out all other devices (and
should the current device stay signed in), and should verification rotate the
token.

### A-2: Rate limiting is per-instance and several sensitive endpoints have no limit

Severity: medium
Status: open (extends A-2)

Evidence:
- Default store is in-process: `src/lib/server/rateLimit.ts:14` and
  `src/lib/server/cache/MemoryCache.ts:9`. The key is `ip:path`
  (`src/lib/server/rateLimit.ts:41-43`). Presets at `:108-124`.
- Missing limits: `src/routes/settings/password/+page.server.ts` action,
  `src/routes/reset-password/[token]/+page.server.ts` action,
  `src/routes/contact/+page.server.ts` action, and
  `src/routes/verify-email/[token]/+page.server.ts` load.
- `src/routes/api/validate/+server.ts:9-50` implements a second, separate
  in-memory limiter instead of using `rateLimit`.
- Client IP resolution depends on `TRUST_PROXY` (`src/lib/server/rateLimit.ts:94-106`);
  if it is false behind a TLS-terminating proxy, `event.getClientAddress()`
  resolves to the proxy, which would collapse all users into one bucket.

Impact: on a horizontally scaled deploy the effective limit is multiplied by the
number of instances, and limits reset on every deploy. `/settings/password` and
`/reset-password` accept unthrottled submissions, and `/contact` is unthrottled.
If `ADDRESS_HEADER` is not configured in production, rate limiting can also lock
out every user at once or never trigger.

Proposed fix: back `rateLimit` with a shared store (Redis or a Turso-backed
counter) keyed by client IP plus route, and keep the in-memory cache only as a
fallback. Add limits to settings/password, reset-password, and contact. Replace
the ad-hoc limiter in `/api/validate`. Confirm `ADDRESS_HEADER` and `XFF_DEPTH`
(adapter-node) are set so `getClientAddress()` returns the real client.

Decision needed: which shared store, and whether limits should key on user id for
authenticated routes.

### A-3: User controlled content reaches email HTML and headers

Severity: medium
Status: open (extends A-3; overlaps P-1 and S-5)

Evidence:
- Generic notification path passes caller HTML straight through:
  `src/lib/server/services/notificationService.ts:114-131` sends
  `htmlContent` unescaped, and `src/routes/api/notifications/+server.ts:13-58`
  forwards the authenticated caller's `subject`, `message`, and `habitTitle`.
- `src/lib/server/services/emailVerificationService.ts:22-31` defines
  `sanitizeEmailSubject`, but only the habit reminder uses it
  (`:372-377`). The generic path does not sanitize the subject.
- `src/routes/forgot-username/+page.server.ts:59-67` interpolates `user.username`
  into HTML unescaped, unlike `forgot-password` which escapes via
  `src/lib/utils/html.ts:6` (`forgot-password/+page.server.ts:46-47`). Usernames
  are currently constrained to `[a-zA-Z0-9_-]` (`api/register/+server.ts:19`), so
  this is latent, not currently exploitable.
- `src/routes/contact/+page.server.ts:45` builds the subject from the
  unvalidated `name`, and `:51` sets `replyTo` to the raw submitted `email`.

Impact: an authenticated user can inject arbitrary markup into a notification
email, though it is always addressed to that same user
(`sendNotification` resolves the recipient from the session user), so the blast
radius is self-directed. The forgot-username interpolation is a latent XSS if the
username policy ever loosens. The contact subject and `replyTo` are header values
built from unvalidated input; whether Resend strips CRLF determines if header
injection is possible.

Proposed fix: treat email bodies as untrusted. Escape or send plain text for all
user supplied content, run `sanitizeEmailSubject` on every subject, never
interpolate raw values into headers, validate the contact email before using it
as `replyTo`, and cap lengths. Prefer a shared templating helper over inline HTML
strings.

Decision needed: whether in-app notifications may carry rich HTML at all, or must
be plain text.

### A-4: Resend error results are treated as success

Severity: low
Status: open (A-4)

Evidence:
- `src/lib/server/services/email/ResendEmailProvider.ts:21-28` awaits
  `resend.emails.send(...)` and returns `{ success: true }` whenever the promise
  resolves, ignoring the SDK's `{ data, error }` result.
- The same pattern is duplicated where routes call the SDK directly:
  `src/routes/forgot-password/+page.server.ts:48-63`,
  `src/routes/forgot-username/+page.server.ts:55-67`,
  `src/routes/contact/+page.server.ts:42-52`.
- Registration swallows any failure and still returns
  `emailVerificationSent: true` (`src/routes/api/register/+server.ts:136-149`).
- `forgot-password` and `forgot-username` always report success even when the
  send failed (`forgot-password/+page.server.ts:64-73`,
  `forgot-username/+page.server.ts:68-77`).

Impact: delivery failures are silent. Users believe a reset or verification email
was sent when Resend rejected it. Only thrown errors are caught; API level errors
that resolve are lost.

Proposed fix: inspect `{ data, error }` from the SDK, return
`{ success: false, error }` on `error`, and log with a redacted recipient. Have
registration distinguish "account created, email failed" in its response.

### A-5: Missing cross-origin isolation headers and HSTS may not be emitted behind the proxy

Severity: low
Status: open (A-5)

Evidence:
- `src/lib/server/securityHeaders.ts:32-67` sets CSP, HSTS, `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`, but no
  `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`, or
  `Cross-Origin-Resource-Policy`.
- HSTS is conditional on `event.url.protocol === 'https:'`
  (`src/lib/server/securityHeaders.ts:142`). Behind a TLS-terminating proxy,
  `event.url.protocol` is `http` unless adapter-node `PROTOCOL_HEADER` is set, so
  HSTS is skipped. The session cookie uses a different signal,
  `x-forwarded-proto`, in `src/lib/server/auth.ts:76-79`, so the two disagree.

Impact: no cross-origin isolation, so Spectre-class cross-origin reads are not
mitigated. In production the app may never send HSTS, leaving a downgrade window
on the browser to proxy hop. The cookie `secure` flag and the HSTS decision use
inconsistent HTTPS detection.

Proposed fix: add `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Resource-Policy: same-origin` (and COEP if the asset surface
allows). Decide HSTS from the same trusted signal as the cookie
(`isSecureRequest`), or configure `PROTOCOL_HEADER` and rely on
`event.url.protocol`. Keep `preload` only after confirming the domain qualifies.

### A-7: Login reveals whether a username exists through timing

Severity: low
Status: open

Evidence:
- `src/routes/login/+page.server.ts:29-44`: when no user matches, the handler
  returns immediately; when a user matches but the password is wrong, it runs
  `bcrypt.compare` (`src/lib/utils/password.ts:8-14`, cost 10).
- Both branches return the same message ("Incorrect username or password"), so
  the leak is timing only, but the no-user path skips work that the wrong-password
  path performs.

Impact: an attacker can enumerate valid usernames by measuring response time
(tens of milliseconds at bcrypt cost 10), even though the message does not reveal
it. `/api/validate` already lets an attacker check usernames directly, but the
timing leak also affects the login endpoint the app relies on.

Proposed fix: always run a dummy bcrypt comparison when the user is not found, or
compare against a fixed dummy hash. Apply the same constant work to forgot-password
and resend-verification lookups.

### A-8: Password hashing and policy gaps

Severity: low
Status: open

Evidence:
- `src/lib/utils/password.ts:4` uses bcrypt with `saltRounds = 10`.
- `@node-rs/argon2` is a declared dependency (`package.json:68`) with no import
  anywhere in `src`; argon2 hashing is not used.
- Registration caps password length at 72 (`src/routes/api/register/+server.ts:20`),
  but `reset-password/+page.server.ts:36-38` and
  `settings/password/+page.server.ts:30-42` enforce only a minimum length and no
  maximum. bcrypt silently truncates beyond 72 bytes.

Impact: cost 10 is below current guidance for bcrypt. Passwords longer than 72
bytes are silently truncated on the reset and settings paths, so a user's
"long password" provides less entropy than it appears and two passwords sharing a
72 byte prefix are equivalent. The unused argon2 dependency adds supply chain and
maintenance surface.

Proposed fix: raise the cost to 12 or migrate to argon2id with transparent
per-user rehash on next login. Centralize a shared password Zod schema (minimum 8,
maximum 72 bytes, or pre-hash with SHA-256 to 32 bytes before bcrypt) and use it on
register, reset, and settings/password. Remove the unused dependency.

Decision needed: whether to stay on bcrypt (cost 12) or move to argon2id.

### A-9: Logger uses `new Function` for console output

Severity: low
Status: open

Evidence:
- `src/lib/utils/logger.ts:27,35,48,59,72,81` reach the console via
  `new Function('msg', 'console.error(msg)')` and equivalents.
- Production CSP has no `unsafe-eval` (`src/lib/server/securityHeaders.ts:34-35`);
  dev adds it (`:70`).
- The logger is currently imported only by server modules: `src/hooks.server.ts:4`,
  `src/lib/server/tasks/scheduler.ts:2`, `src/lib/server/tasks/cleanup.ts:2`,
  `src/routes/habits/+page.server.ts:7`, `src/routes/dashboard/+page.server.ts:7`,
  `src/routes/api/habits/[id]/complete/+server.ts:8`. A search of client code and
  components finds no importer.

Impact: today the code runs on the Node server, where CSP does not apply, so it
does not break production. The risk is latent: the module already references
`browser` and `window.posthog`, so importing it into a client component would make
`new Function` throw under the production CSP (the calls are not wrapped in
try/catch). There is no injection risk: input is passed as an argument, not
concatenated into the function body.

Proposed fix: replace `new Function` with direct `console.error` and friends.
Keep the module server-only or make the client path CSP-safe.

### A-10: CSRF posture is adequate but rests entirely on SameSite=Lax

Severity: low
Status: informational

Evidence:
- `svelte.config.js:10-15` sets no `csrf` option; SvelteKit defaults
  `csrf.checkOrigin` to `true`, so form actions are origin checked.
- JSON endpoints accept `application/json`: `src/routes/api/register/+server.ts:54`,
  `src/routes/api/waitlist/+server.ts:23`, `src/routes/api/resend-verification/+server.ts:15`,
  `src/routes/api/notifications/+server.ts:13`. They rely on the session cookie
  being `sameSite: "lax"` (`src/lib/server/auth.ts:85`) and on no explicit CSRF
  token.
- No CORS headers are configured, so cross-origin JSON requests would fail
  preflight.

Impact: realistic assessment. A cross-site attacker can cause the browser to send
unauthenticated POSTs to `/api/register` and `/api/waitlist` (spam only, rate
limited) and cannot read responses. For authenticated JSON endpoints,
`SameSite=Lax` means the cookie is not attached to cross-site POSTs, and the
`application/json` content type forces a preflight the app does not answer, so the
browser blocks the request. Net effect: the attacker cannot perform state changes
as the victim today. The posture would weaken if the cookie became `SameSite=None`,
if a state-changing GET were added, or if permissive CORS were enabled.

Proposed fix: keep the default origin check. Optionally add an explicit Origin
header check or a double-submit token on JSON mutations for defense in depth, and
add a test asserting a cross-origin POST to `/api/notifications` is rejected.

### A-11: Secrets handling in the repository

Severity: informational
Status: verified, no repository leak found

Evidence:
- `.env` exists locally and holds live-looking values (a `libsql://` Turso URL, a
  220 character auth token, a `re_` Resend key, a `phc_` PostHog key). It is
  matched by `.gitignore:14` (`git check-ignore .env`), and `git log --all -- .env`
  is empty, so it was never committed.
- `.env.example` and `.env.test` contain blank or dummy values only.
- No secret echo was found. Waitlist logs redact the address
  (`src/routes/api/waitlist/+server.ts:26,53`). `verifyPassword` logs the error
  object, not the password (`src/lib/utils/password.ts:12`).
  `settings/password` logs `locals.session.userId`, an opaque id, not a secret
  (`src/routes/settings/password/+page.server.ts:28`).

Impact: the pre-audit concern that live credentials were committed is not
supported; credentials are local and ignored. Minor local hygiene: `.env` is mode
644 (group and other readable).

Proposed fix: none required for the repository. Consider mode 600 locally, and
confirm that `handleError` capturing full error objects
(`src/hooks.server.ts:104`) cannot include request bodies or credentials in the
PostHog payload (see O-1).

## Uncertainty

- Whether `PROTOCOL_HEADER`, `ADDRESS_HEADER`, and `XFF_DEPTH` are set in the
  Railway environment. They are not in the repo, and they decide whether HSTS is
  emitted (A-5) and whether rate limiting keys on the real client IP (A-2).
- Whether production runs one instance or several. This sets the real severity of
  A-2: a single instance makes the in-memory limiter correct today and broken only
  on scale up.
- How Resend handles CRLF in `subject` and `replyTo` cannot be determined from
  code, so the contact form header injection risk (A-3) is unconfirmed.
- The precise pre-verification policy is unstated beyond "verification must be
  required", which affects the allowlist in A-6.
- No route-level tests exist for login, logout, forgot-password, forgot-username,
  reset-password, verify-email, settings, settings/password, or
  resend-verification, so every finding here is from code reading rather than
  observed behavior.

## Cross-references

- `docs/auth-and-email.md`: sections 1 (session lifecycle), 3 (password hashing),
  5 (verification requirement), 6 (security gaps). Its claim that nothing enforces
  `emailVerified` is outdated; see A-6.
- `docs/architecture.md`: sections 2 (request lifecycle), 5.4 (email verification),
  6 (external services). Its verification claim is likewise outdated.
- `docs/audit-backlog.md`: A-1 (session rotation), A-2 (rate limiting),
  A-3 (email injection), A-4 (Resend errors), A-5 (headers), plus S-5
  (forgot-username lookup and 500), P-1 (contact hardening), O-1 (error capture),
  O-8 (verification poll noise), T-2 and T-3 (missing auth route tests).
- Skill `creatures-of-habit`: conventions for Zod validation, ownership checks,
  rate limiting presets, and logger usage. Note that `settings/password` also
  violates the "never `console.log` in server code" convention with direct
  `console.info` calls.
