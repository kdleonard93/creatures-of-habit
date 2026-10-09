# Abuse exposure audit: contact form and waitlist

Scope: the unauthenticated public write surfaces of Creatures of Habit, the contact form
(`src/routes/contact/+page.server.ts`, `src/routes/contact/+page.svelte`) and the waitlist
(`src/routes/api/waitlist/+server.ts`, `src/routes/waitlist/+page.server.ts`,
`src/routes/waitlist/thank-you/+page.server.ts`, `src/lib/components/WaitlistLanding.svelte`),
plus the data they persist (`contacts` and `user_waitlist` in
`src/lib/server/db/schema.ts`), the shared limiter (`src/lib/server/rateLimit.ts`), and the
header policy (`src/lib/server/securityHeaders.ts`). Branch `task/audit-updates`, review date
2026-10-09. This report reuses P-1 and P-2 from `docs/audit-backlog.md` and adds P-3 onward.
It is a design, not a change: no source file was modified.

The owner has approved this direction for both surfaces: a honeypot field, rate limiting,
length caps, server-side email validation, a spam or status column for moderation, and
continued email forwarding with a sanitized subject and a plain-text body, plus an admin
review surface. For the waitlist, stop storing the untrusted `x-forwarded-for` value and
derive the client IP with the trusted-proxy logic.

## Findings

### P-1 Contact form has no anti-automation and no server-side validation

- Severity: high
- Status: open
- Evidence: `src/routes/contact/+page.server.ts:18-77` (the whole action), specifically
  `:20-30` reads `name`, `email`, and `message` with no schema, `:32-37` checks only
  emptiness, and there is no honeypot, no time-to-submit field, no rate limit, no length cap,
  no format check, and no link filtering. `src/routes/contact/+page.svelte:34-89` renders only
  `name`, `email`, and `message`, so there is no hidden field to trap bots. The route has no
  load function, so there is no server-issued form token.
- Impact: The endpoint is a free, unauthenticated, unthrottled write and email trigger. A
  single script can insert unlimited `contacts` rows, forward unlimited emails through the
  verified Resend sending domain, exhaust the Resend quota, and fill the owner's inbox. There
  is no signal (honeypot, timing, rate limit) to distinguish a bot from a user.
- Proposed fix: Add a `rateLimit(event, RateLimitPresets.CONTACT)` call before any work,
  parse the body with a Zod schema (see Proposed implementation), add a hidden honeypot
  field, add a signed time-to-submit field checked server side, and reject on validation
  failure. Keep the honeypot response silent so bots are not told they were filtered.
- Decision needed: Confirm the contact rate-limit budget (proposed 3 per hour per IP) and
  whether suspicious submissions should be hard-rejected or stored with `status = 'spam'`
  for review. See `docs/open-questions.md` 10.

### P-2 Waitlist stores the raw `x-forwarded-for` value as the IP address

- Severity: medium
- Status: open
- Evidence: `src/routes/api/waitlist/+server.ts:42`
  (`const ipAddress = event.request.headers.get('x-forwarded-for') || 'unknown'`), stored at
  `:46-51` into `user_waitlist.ip_address` (`src/lib/server/db/schema.ts:315`). The trusted
  logic already exists but is private: `getClientIP` in `src/lib/server/rateLimit.ts:94-106`
  reads `x-forwarded-for` only when `TRUST_PROXY === 'true'`, validates the first hop with
  `isIP`, falls back to `x-real-ip`, and otherwise uses `event.getClientAddress()`.
- Impact: The stored IP is attacker-controlled. Analytics and any future abuse
  investigation that rely on it can be poisoned with arbitrary values, and a real attacker
  can hide their origin. It is also a privacy problem because the value is neither validated
  nor minimized.
- Proposed fix: Extract `getClientIP` from `rateLimit.ts` into an exported shared helper
  (`src/lib/server/clientIp.ts`) and call it from the waitlist endpoint. Optionally store a
  salted hash of the IP instead of the address (see Proposed implementation) so abuse can be
  correlated without retaining an identifier.
- Decision needed: Whether to store the derived IP as-is or a daily-salted hash. See
  `docs/open-questions.md` 10.

### P-3 Contact email forwarding is an abusable relay with user-controlled headers

- Severity: high
- Status: open
- Evidence: `src/routes/contact/+page.server.ts:42-52`. The subject interpolates the raw
  `name` (`:45`), the `replyTo` is the raw `email` (`:51`), and the `text` body embeds raw
  `name`, `email`, and `message` (`:46-50`). Nothing strips CR, LF, or control characters
  from the values that become email headers, and the message has no length or link cap. The
  sender is the app's verified domain (`SENDER_EMAIL`, `:10`, `:43`).
- Impact: An abuser can set the displayed subject to arbitrary content by putting text in
  `name`, and can set an arbitrary `replyTo`, so the owner may reply to a spoofed address.
  The unbounded body is forwarded as-is, so link spam and phishing text pass through the
  verified domain and its reputation. Whether Resend strips CR/LF or other header-bound
  metacharacters is not guaranteed by this code, so this is a header-injection candidate as
  well as a relay-abuse one. The recipient is fixed (`contact@digitaldopamine.dev`), so it is
  not an open relay to third parties, but it is an unbounded spam and phishing channel into
  the owner's inbox.
- Proposed fix: Use a fixed, non-interpolated subject (for example
  `New contact form submission`) and put `name`, `email`, and `message` in the plain-text
  body only. Reject or strip `[\r\n\u0000-\u001f\u007f]` from every value, cap lengths,
  normalize the email, and only set `replyTo` when a strictly validated address passes
  (better: drop `replyTo` and include the address in the body so the owner consciously
  chooses to reply). Keep the body plain text. See Proposed implementation.
- Decision needed: Whether to keep `replyTo` at all (convenience versus reply-to phishing)
  and whether to hard-reject control characters or strip them silently.

### P-4 No length caps on contact or waitlist fields

- Severity: medium
- Status: open
- Evidence: `contacts.name`, `contacts.email`, and `contacts.message` are unbounded `text`
  (`src/lib/server/db/schema.ts:273-279`); the contact action never checks length
  (`src/routes/contact/+page.server.ts:20-30`). The waitlist schema is
  `z.object({ email: z.string().email(), referralSource: z.string().optional() })`
  (`src/routes/api/waitlist/+server.ts:9-12`): `email` has no maximum, `referralSource` has no
  maximum, and `userAgent` (`:43`) and the `referer` fallback (`:44`) are stored unbounded
  (`schema.ts:312-318`).
- Impact: SvelteKit's default request body limit (around 512 KB, controlled by
  `BODY_SIZE_LIMIT`) bounds any single request, but there is no per-field bound and no bound
  on cumulative storage. An attacker can bloat the database and the forwarded email with
  near-limit payloads, and can store large attacker strings in `referral_source` and
  `user_agent`. It also feeds the relay in P-3.
- Proposed fix: Cap every field in Zod: name 100, email 254, message 4000, `referralSource`
  200, and truncate `userAgent` to 300 and the referer to 500 before storing. Count links in
  the message (see Proposed implementation) and flag or reject when the count exceeds a
  threshold.
- Decision needed: The exact caps and whether over-limit input is rejected or truncated.
  Link-spam handling: reject or flag for review.

### P-5 No moderation state and no admin review surface

- Severity: medium
- Status: open
- Evidence: The `contacts` table has only `id`, `name`, `email`, `message`, and `created_at`
  (`src/lib/server/db/schema.ts:273-279`). `user_waitlist` has no state column either
  (`schema.ts:312-324`). There is no route under `src/routes/admin/**`, no `isAdmin` or role
  column on `user` (`schema.ts:5-14`), and no way to mark or remove spam. The only reader of
  `user_waitlist` is a count in `src/routes/waitlist/thank-you/+page.server.ts:8`.
- Impact: Even with P-1 and P-2 fixed, submissions cannot be triaged. Spam lives forever in
  the database and is re-read by any future feature, and there is no audit trail of what was
  reviewed or marked. The owner cannot tell a legitimate message from a bot, and cannot
  remove either.
- Proposed fix: Add a `status` enum and moderation fields to both tables, an `isAdmin` flag
  on `user`, and a guarded `/admin` surface (see Proposed implementation). Bootstrap the
  first admin explicitly and keep the route out of navigation, out of any sitemap, and behind
  `X-Robots-Tag: noindex`.
- Decision needed: How much admin UI is wanted (list, mark spam, delete, export) and whether
  the admin account ships in this work or later. See `docs/open-questions.md` 10 and 11.

### P-6 Waitlist has rate limiting and email validation but no honeypot or time check

- Severity: medium
- Status: open
- Evidence: `src/routes/api/waitlist/+server.ts:16-20` applies an ad-hoc 5-per-hour limit and
  `:9-12` validates the email with Zod, but there is no honeypot, no time-to-submit check, and
  no length cap. `src/lib/components/WaitlistLanding.svelte:211-253` renders only the email
  input plus a client-controlled hidden `redirectTo` (`:252`, stripped server side by Zod).
- Impact: Because the limiter is in-memory and keyed by IP plus path (`rateLimit.ts:41-43`,
  `MemoryCache.ts`), a distributed or IP-rotating script bypasses it entirely. The endpoint
  remains a cheap way to inflate the public waitlist count shown on the thank-you page
  (`waitlist/thank-you/+page.server.ts:8`), and to store spoofed analytics fields. There is
  also no guard against a single script inserting many distinct addresses.
- Proposed fix: Add a `website` honeypot and a signed timestamp to the waitlist form, apply
  the shared `RateLimitPresets.WAITLIST`, cap lengths (P-4), and store the derived IP (P-2).
  Consider a per-email one-time guarantee via the existing unique index
  (`user_waitlist_email_unique`), which already dedupes addresses.
- Decision needed: Confirm the waitlist limit and whether an email-confirmation step is
  wanted before counting a signup. See `docs/open-questions.md` 10.

### P-7 Contact toast path is dead and the failure message is wrong

- Severity: low
- Status: open
- Evidence: `src/routes/contact/+page.svelte:14` destructures `form` from `$props`, and
  `:17-23` uses an `$effect` to toast on `form?.success` or `form?.error`. The custom
  `use:enhance` callback at `:35-63` returns a handler that never calls `update()`. In
  SvelteKit, returning a handler replaces the default `fallback_callback` that calls
  `applyAction` to set the `form` prop (`node_modules/@sveltejs/kit/src/runtime/app/forms.js:161-169`
  and `:211-224`), so `form` never changes and the `$effect` never fires. The action returns
  `{ success, message }` on success and `fail(400, { error, data })` on failure
  (`contact/+page.server.ts:33-36`, `:66-69`), while the prop type declares `error?: boolean`
  and the effect reads `form.message` in both branches, so even if it ran the failure text
  would be the generic fallback. The callback separately toasts `result.data.message` and
  `result.data.error` (`+page.svelte:53`, `:61`), so toasts do appear, but from duplicated
  logic and with no form data restored on failure.
- Impact: The declared toast path is dead code, failure submissions do not surface the
  server's specific message through it, and the form is not reset on success because
  `update()` is not called (the manual `document.querySelector('form')` reset at `:56-57`
  risks resetting the wrong form if the header contains one). This is a correctness and
  maintenance defect, not a security one.
- Proposed fix: Either call `await update()` in the callback and drop the duplicate toasts,
  or remove the `$effect` and keep a single toast path. Align the failure branch on the
  action's actual key (`result.data.error`) and give the toast a proper duration.
- Decision needed: Whether to standardize on the callback or the `$effect` pattern across the
  app (login and forgot-password use the callback pattern).

## Proposed implementation

### 1. Schema change (additive, nullable or defaulted)

`src/lib/server/db/schema.ts`:

```ts
// user: add an admin flag
isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
```

```ts
export const contacts = sqliteTable('contacts', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    email: text('email').notNull(),
    message: text('message').notNull(),
    status: text('status', { enum: ['new', 'reviewed', 'spam', 'archived'] })
        .notNull().default('new'),
    flagged: integer('flagged', { mode: 'boolean' }).notNull().default(false),
    spamReason: text('spam_reason'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    submissionMs: integer('submission_ms'),
    reviewedAt: text('reviewed_at'),
    reviewedBy: text('reviewed_by'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        statusCreatedIdx: index('idx_contacts_status_created').on(table.status, table.createdAt),
    };
});
```

```ts
export const userWaitlist = sqliteTable('user_waitlist', {
    // existing columns unchanged
    status: text('status', { enum: ['active', 'reviewed', 'spam', 'archived'] })
        .notNull().default('active'),
    flagged: integer('flagged', { mode: 'boolean' }).notNull().default(false),
    submissionMs: integer('submission_ms'),
    // existing subscribedAt and indexes unchanged
});
```

Drizzle `text(..., { enum: [...] })` is a type-level enum only and generates plain `text`
(no `CHECK`), consistent with the rest of the schema (see `docs/data-model.md:376`), so no
enum migration hazard.

### 2. Migration plan and snapshot

Latest applied migration is `0028_blue_inertia.sql` (`migrations/meta/_journal.json:201-207`).
The next migration is `0029`. Note the known journal drift: the journal lists idx 22 as
`0022_foamy_lord_hawal` while the file on disk is `0022_quest_answer_uniqueness.sql`
(`docs/data-model.md:394`), so run `pnpm db:check` first and confirm a clean replay before
trusting `generate` output.

Steps:

1. Snapshot Turso before anything (per `docs/environments-and-deploy.md:197-221`):
   ```bash
   turso db dump <db-name> > backup-2026-10-09.sql
   turso db create <db-name>-backup --from-db <db-name>
   ```
   Record the snapshot time; the dump is the reliable restore source.
2. Edit `schema.ts`, then `pnpm db:generate`. The generated file should be equivalent to:
   ```sql
   ALTER TABLE `contacts` ADD `status` text DEFAULT 'new' NOT NULL;
   ALTER TABLE `contacts` ADD `flagged` integer DEFAULT false NOT NULL;
   ALTER TABLE `contacts` ADD `spam_reason` text;
   ALTER TABLE `contacts` ADD `ip_address` text;
   ALTER TABLE `contacts` ADD `user_agent` text;
   ALTER TABLE `contacts` ADD `submission_ms` integer;
   ALTER TABLE `contacts` ADD `reviewed_at` text;
   ALTER TABLE `contacts` ADD `reviewed_by` text;
   CREATE INDEX `idx_contacts_status_created` ON `contacts` (`status`,`created_at`);
   ALTER TABLE `user_waitlist` ADD `status` text DEFAULT 'active' NOT NULL;
   ALTER TABLE `user_waitlist` ADD `flagged` integer DEFAULT false NOT NULL;
   ALTER TABLE `user_waitlist` ADD `submission_ms` integer;
   ALTER TABLE `user` ADD `is_admin` integer DEFAULT false NOT NULL;
   ```
   Every added column is nullable or has a default, so existing rows remain valid and a
   rollback of the application code alone is sufficient.
3. Test the migration on the clone or a throwaway file, then apply with `pnpm db:migrate`.
4. Reversible path. Because the change is additive, roll back the deployed release first; the
   database stays forward. If the columns must be removed, write a new forward migration (do
   not edit 0029) with the reverse statements:
   ```sql
   DROP INDEX IF EXISTS `idx_contacts_status_created`;
   ALTER TABLE `contacts` DROP COLUMN `status`;
   -- ... one DROP COLUMN per added column ...
   ALTER TABLE `user` DROP COLUMN `is_admin`;
   ```
   `ALTER TABLE ... DROP COLUMN` needs SQLite 3.35 or newer, which current Turso satisfies,
   but prefer leaving the unused columns in place over a risky reverse migration.
5. Update any hand-written `CREATE TABLE` blocks in `src/tests/db/test-db.ts` if they cover
   these tables (see the `drizzle-libsql` skill).

### 3. Shared anti-abuse helper

New file `src/lib/server/validation/spam.ts`:

```ts
const LINK_RE = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|ru|xyz|top|info|link|click)\b/gi;
const HEADER_UNSAFE_RE = /[\r\n\u0000-\u001f\u007f]/;

export function countLinks(text: string): number {
    return (text.match(LINK_RE) ?? []).length;
}

export function hasHeaderUnsafeChars(value: string): boolean {
    return HEADER_UNSAFE_RE.test(value);
}

/** Signed form age, checked server side. Simple HMAC, no session required. */
export function elapsedMs(renderedAt: number): number {
    return Date.now() - renderedAt;
}
```

Tradeoff: an unsigned client timestamp is spoofable. Combined with a honeypot and a rate
limit it still raises the bar. A stronger variant signs the timestamp with an HMAC using a
dedicated server secret and rejects more than one hour old or less than 2 seconds old.

### 4. Contact action changes

`src/routes/contact/+page.server.ts`:

```ts
import { z } from 'zod';
import { rateLimit, RateLimitPresets, getClientIP } from '$lib/server/rateLimit';
import { countLinks, hasHeaderUnsafeChars, elapsedMs } from '$lib/server/validation/spam';

const contactSchema = z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email().max(254),
    message: z.string().trim().min(1).max(4000),
    website: z.string().max(0).optional(),       // honeypot: must be empty
    renderedAt: z.coerce.number().int().optional(),
});

export const actions = {
    default: async (event) => {
        await rateLimit(event, RateLimitPresets.CONTACT);

        const raw = Object.fromEntries(await event.request.formData());
        const parsed = contactSchema.safeParse(raw);
        if (!parsed.success) {
            return fail(400, { error: 'Please check the fields and try again.', data: raw });
        }
        const { name, email, message, website, renderedAt } = parsed.data;

        // Honeypot: pretend success, do nothing.
        if (website) return { success: true, message: 'Thank you for your message.' };

        // Time-to-submit: bots submit instantly.
        if (renderedAt && elapsedMs(renderedAt) < 2000) {
            return fail(400, { error: 'Please take a moment and try again.', data: raw });
        }

        const spam = hasHeaderUnsafeChars(name) || hasHeaderUnsafeChars(email)
            || countLinks(message) > 3;

        if (!spam && resend) {
            await resend.emails.send({
                from: `Contact Form <${SENDER_EMAIL}>`,
                to: 'contact@digitaldopamine.dev',
                subject: 'New contact form submission',   // fixed, never interpolated
                text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
                // replyTo intentionally omitted
            });
        }

        await db.insert(contacts).values({
            name, email, message,
            status: spam ? 'spam' : 'new',
            flagged: spam,
            ipAddress: getClientIP(event),
            userAgent: (event.request.headers.get('user-agent') ?? '').slice(0, 300),
            submissionMs: renderedAt ? elapsedMs(renderedAt) : null,
            createdAt: new Date().toISOString(),
        });

        return { success: true, message: 'Thank you for your message. We will get back to you soon!' };
    },
} satisfies Actions;
```

Client: add a `website` hidden input (class hidden, `tabindex="-1"`, `autocomplete="off"`),
a hidden `renderedAt` set from `Date.now()` on mount, and pass through the `update()` fix
from P-7.

### 5. Waitlist endpoint changes

`src/routes/api/waitlist/+server.ts`:

```ts
const waitlistSchema = z.object({
    email: z.string().trim().toLowerCase().email().max(254),
    referralSource: z.string().trim().max(200).optional(),
    website: z.string().max(0).optional(),          // honeypot
    renderedAt: z.coerce.number().int().optional(),
});

await rateLimit(event, RateLimitPresets.WAITLIST);
// ... validate, honeypot check, time check ...
const ipAddress = getClientIP(event);              // trusted-proxy aware, not raw XFF
const userAgent = (event.request.headers.get('user-agent') ?? '').slice(0, 300);
const referralSource = (validated.referralSource
    ?? event.request.headers.get('referer') ?? 'direct').slice(0, 500);
```

`getClientIP` must be exported. Refactor `rateLimit.ts:94-106` either by adding `export` to
the existing function or by moving it to `src/lib/server/clientIp.ts` and importing it in
both places. Reusing it guarantees the waitlist and the limiter agree on the client.

### 6. Rate-limit presets

`src/lib/server/rateLimit.ts`, extend `RateLimitPresets`

The current block ends at `:124` with `API`; add:

```ts
CONTACT: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
    message: 'Too many messages sent. Please try again later.'
},
WAITLIST: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
    message: 'Too many waitlist submissions. Please try again later.'
},
ADMIN: {
    maxRequests: 60,
    windowMs: 15 * 60 * 1000,
    message: 'Too many requests. Please slow down.'
},
```

The limiter is in-memory and per instance (`src/lib/server/rateLimit.ts:14`,
`src/lib/server/cache/MemoryCache.ts`), so it is a speed bump, not a wall, against a
distributed attacker. That is the existing `A-2` gap; a shared Redis cache is the real fix.
The waitlist's current ad-hoc config at `+server.ts:16-20` should be replaced by the preset
so both surfaces share one source of truth.

### 7. Admin review surface

Authentication. There are no admin accounts, so add `user.isAdmin` (section 1) and gate on
the existing session. Alternatives and tradeoffs:

- Recommended: `user.isAdmin` boolean, checked from `locals.auth()`. Reuses the session,
  password, and email machinery, is per-user and revocable, and needs no new secret.
- No-migration fallback: an `ADMIN_EMAILS` environment allowlist compared to
  `locals.user.email`. Quick, but harder to audit and revoke.
- Not recommended: HTTP Basic against an env password. Sends credentials on every form
  post, has no logout, and works against the form-origin CSRF protection.

Bootstrapping the first admin: a one-off script `scripts/grant-admin.ts` (run with
`pnpm tsx scripts/grant-admin.ts you@example.com`) that runs

```ts
await db.update(user).set({ isAdmin: true }).where(eq(user.email, email.toLowerCase()));
```

or the equivalent SQL. Never expose a public "become admin" path.

Route guard. `src/routes/admin/+layout.server.ts`:

```ts
import { redirect, error } from '@sveltejs/kit';

export const load = async ({ locals, url }) => {
    const auth = await locals.auth();
    if (!auth) redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
    if (!auth.user.isAdmin) error(404, 'Not found');   // do not confirm the route exists
    return { admin: { id: auth.user.id, username: auth.user.username } };
};
```

List and moderate. `src/routes/admin/contacts/+page.server.ts`:

```ts
export const load = async ({ url }) => {
    const status = url.searchParams.get('status') ?? 'new';
    const rows = await db.select().from(contacts)
        .where(eq(contacts.status, status))
        .orderBy(desc(contacts.createdAt))
        .limit(100);
    return { rows, status };
};

export const actions = {
    setStatus: async ({ request, locals }) => {
        // locals.auth() already enforced by the layout, but re-check for defence in depth
        const data = await request.formData();
        const id = String(data.get('id'));
        const status = String(data.get('status'));
        await db.update(contacts).set({
            status,
            reviewedAt: new Date().toISOString(),
            reviewedBy: locals.admin?.id ?? null,
        }).where(eq(contacts.id, id));
        return { success: true };
    },
};
```

Add an equivalent `src/routes/admin/waitlist/+page.server.ts`, plus minimal `+page.svelte`
files that render rows in a table with a status select. Svelte escapes interpolation by
default; never use `{@html}` on submission content.

Avoiding leaks:

- Guard returns 404 for authenticated non-admins and redirects only truly unauthenticated
  users, so the route's existence is not disclosed to non-admins.
- Set `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store` on admin responses
  (via `event.setHeaders` in the admin layout load).
- No link in `Header.svelte`, no sitemap entry, no public route that mentions it.
- Do not send submission content to PostHog or the logger, and do not include it in error
  captures (`src/hooks.server.ts:97-106` captures every non-404). This also addresses `O-6`.
- Cap list size and paginate so a spam flood cannot turn the admin page into a memory load.

### 8. Anti-abuse options and tradeoffs

| Control | Effort | Stops | Tradeoffs |
| --- | --- | --- | --- |
| Honeypot field | Low | Naive bots | Useless against targeted scripts; must be CSS-hidden, not `display:none` only, and silently accepted |
| Time-to-submit | Low | Instant form fills | Unsigned timestamp is spoofable; signed HMAC needs a secret; can false-positive fast typists |
| Rate limiting | Low | Burst and single-source flooding | In-memory only (A-2); shared cache needed for real coverage |
| Length caps | Low | Storage and email bloat | Must pick caps that do not reject legitimate long messages |
| Link counting | Low | Link spam | False positives on legitimate messages with several links; prefer flag over reject |
| Server-side email validation | Low | Malformed and injected addresses | Strict rules can reject unusual but valid addresses; keep the rule conventional |
| Cloudflare Turnstile | Medium | Most automated abuse | Third-party dependency, CSP changes for `challenges.cloudflare.com`, new env vars, privacy and accessibility considerations |

Turnstile, if wanted: add `TURNSTILE_SECRET_KEY` and a public site key, allowlist
`https://challenges.cloudflare.com` in `script-src` and `frame-src` in
`src/lib/server/securityHeaders.ts:32-49`, render the widget in both forms, and verify the
token server side against the siteverify endpoint before inserting. It is the strongest
option and the only one that reliably stops a determined bot, but it is also the largest
change.

## Uncertainty

- Header injection: whether Resend strips CR, LF, or other metacharacters from `subject`
  and `replyTo` is not guaranteed by this code. The fix removes the dependency either way.
- Request size bound: the exact SvelteKit `BODY_SIZE_LIMIT` default was not verified here;
  it is the only current bound on a single submission. Per-field caps are still needed for
  storage and email size.
- `TRUST_PROXY`: if it is not `"true"` in production, `getClientIP` returns the proxy address,
  so the limiter collapses all clients onto one key and the derived waitlist IP is the proxy.
  `docs/environments-and-deploy.md:39` says it must be `true` behind Railway; confirm.
- Turso snapshot flags (`db dump`, `create --from-db`) change between CLI versions; confirm
  against the installed CLI before relying on them (`docs/environments-and-deploy.md:207`).
- The contact toast bug: the `$effect` never fires because `update()` is not called, but the
  enhance callback still shows toasts, so the user-visible symptom is a stale failure message
  and a missing form reset rather than a total absence of toasts. If the intent was for the
  `$effect` to be the only toast path, the severity is higher.
- Whether the waitlist is still actively collecting and how entries are used is open
  (`docs/open-questions.md` 10); that determines whether a status column on `user_waitlist`
  is worth the migration now or can be deferred.
- Email validation strictness (plus-addressing, internationalized addresses, disposable
  domains) is a product decision, not stated by the owner.

## Cross-references

- `docs/audit-backlog.md`: P-1, P-2 (this report's base), A-2 (in-memory rate limiting),
  A-4 (Resend result handling), O-6 (contact form PII to PostHog), D-3 (snapshot before
  migration).
- `docs/domain-rules.md:146-152`: confirmed direction for contact and waitlist.
- `docs/api-reference.md:35` (waitlist endpoint) and `:52` (contact action).
- `docs/auth-and-email.md`: section 4 (email flows and the unescaped generic notification
  path), section 6 (CSRF posture of the JSON endpoints), and the Resend provider notes.
- `docs/data-model.md:328-372` (table definitions) and `:459-462` (spoofable columns, the
  exact `x-forwarded-for` gap).
- `docs/open-questions.md` 10 (moderation surface) and 11 (admin accounts).
- `docs/environments-and-deploy.md` section 7 (snapshot and rollback).
- `docs/observability.md` O-6 (contact PII) and the event table at `:54-55`.
- `docs/testing-strategy.md:80` (contact and waitlist test target).
- Project skills `creatures-of-habit`, `drizzle-libsql`.
