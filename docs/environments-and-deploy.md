# Environments and Deploy

Branch: `task/audit-updates`. This document catalogs the environments, every environment
variable the code reads, the database connection logic, the build and run commands, the
current CI/CD workflows and their concrete problems, a recommended staging setup, and a
database safety procedure. It is a reference, not a change request. No secret values
appear here; only variable names.

## 1. Environments

| Environment | Status | Origin / port | Notes |
| --- | --- | --- | --- |
| Local | Active | `http://localhost:5175` | `pnpm dev` runs `vite dev --port 5175` with `strictPort` (`package.json:7`, `vite.config.ts:6`). |
| Staging | Does not exist yet | none | No `staging` branch, no second host, no staging Turso database, no separate PostHog key. See section 6. |
| Production | Active | `https://creatures-of-habit-production.up.railway.app` | Railway hosting an adapter-node server. This URL is also the production fallback in `src/lib/utils/url.ts:22`. |

The production URL is hardcoded as a fallback in `src/lib/utils/url.ts` and asserted in
`src/tests/server/url.test.ts:31`. `CANONICAL_BASE_URL` is the intended override for email
links and assets.

## 2. Environment variable catalog

Sources: `.env.example`, `.env.test`, `drizzle.config.ts`, and a repository-wide search
for `process.env`, `PUBLIC_`, and `import.meta.env`. There are no `import.meta.env` reads;
`Vite` client config goes through `$env/static/public` instead.

Documented means present in `.env.example`.

| Variable | Documented | Where read | Purpose |
| --- | --- | --- | --- |
| `TURSO_DATABASE_URL` | Yes | `src/lib/server/db/index.ts:7`, `drizzle.config.ts:3`, `scripts/seed-quests.ts:13`, migration scripts | Primary database URL. A `libsql://` remote in production, a `file:` path locally. |
| `TURSO_AUTH_TOKEN` | Yes | `src/lib/server/db/index.ts:10`, `drizzle.config.ts:4`, `scripts/seed-quests.ts:14` | Auth token for the Turso remote database. Required for non-dev `libsql://` URLs. |
| `LOCAL_DATABASE_URL` | Yes | `src/lib/server/db/index.ts:8`, migration scripts | Local file fallback used in dev and during build, default `file:local.db`. |
| `PUBLIC_POSTHOG_KEY` | Yes | `src/lib/plugins/PostHog.ts:2` via `$env/static/public` (typed in `src/env.d.ts`) | The only client-exposed variable. PostHog API key for browser and server capture. |
| `RESEND_API_KEY` | Yes | `emailVerificationService.ts:14`, `notificationService.ts:12`, `forgot-password/+page.server.ts:12`, `forgot-username/+page.server.ts:9`, `contact/+page.server.ts:9`, tests | Resend API token for transactional email. When unset, email paths log and return success. |
| `CANONICAL_BASE_URL` | Yes | `src/lib/utils/url.ts:11` | Trusted base URL for verification, reset, and reminder links plus the email logo. Prevents Host header injection. |
| `DATABASE_URL` | No (mentioned in `README.md:62` and `.env.test:5`) | `src/lib/server/db/index.ts:7`, migration scripts, `scripts/test-rate-limiting.ts` | Secondary remote URL. Treated as a Turso remote (see section 3), so a `libsql://` value here still takes `TURSO_AUTH_TOKEN`. |
| `SENDER_EMAIL` | No (present in `.env.test:10`) | `emailVerificationService.ts:8`, `notificationService.ts:10`, `forgot-password/+page.server.ts:13`, `forgot-username/+page.server.ts:10`, `contact/+page.server.ts:10` | From address for outbound email. Defaults differ by file: `onboarding@resend.dev` in most, `no-reply@digitaldopamine.dev` in the contact form. |
| `TRUST_PROXY` | No (present in `.env.test:12`) | `src/lib/server/rateLimit.ts:95` | When `"true"`, the rate limiter reads `x-forwarded-for` or `x-real-ip`; otherwise it uses `event.getClientAddress()`. Must be `true` behind the Railway proxy. |
| `ENABLE_SCHEDULER` | No | `src/lib/server/tasks/scheduler.ts:109` | When `"true"`, starts the in-process task scheduler even outside production. Production also starts it via `NODE_ENV`. |
| `NODE_ENV` | No | `logger.ts:71`, `logger.ts:80`, `src/lib/utils/url.ts:21`, `scheduler.ts:109` | Standard Node environment. Controls debug logging, the production URL fallback, and scheduler autostart. |
| `VITE_DEV_PORT` | No | `src/lib/utils/url.ts:20` | Fallback dev port for the canonical URL. It is read from `process.env` on the server, so the `VITE_` prefix does not actually expose it to the client. The real dev port is also hardcoded in `package.json` and `vite.config.ts`. |
| `INTEGRATION_DB` | No | `src/tests/services/questService.integration.test.ts:10` | Test-only gate. The DB integration suite is skipped unless this is `"1"`, and CI never sets it. |
| `REAL_BASE_URL` | No | Not referenced anywhere | Historical name. No code reads it. |
| `VITE_API_URL` | No | Not referenced anywhere | Historical name. No code reads it. |

Also note: the README (`README.md:63-64`) tells users to set `DATABASE_URL`,
`DATABASE_AUTH_TOKEN`, and `AUTH_SECRET`. Two of those are stale. The code uses
`TURSO_AUTH_TOKEN`, not `DATABASE_AUTH_TOKEN`, and there is no `AUTH_SECRET` anywhere;
sessions are random tokens stored hashed (`src/lib/server/auth.ts`).

## 3. Database connection logic

All connections are built in one place, `src/lib/server/db/index.ts`:

```
const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const localUrl = process.env.LOCAL_DATABASE_URL;
const dbUrl = tursoUrl ?? (building || dev ? localUrl ?? "file:local.db" : undefined);
const authToken = process.env.TURSO_AUTH_TOKEN;
```

Precedence:

1. `TURSO_DATABASE_URL`.
2. `DATABASE_URL` (only as an alias for the remote URL).
3. In `dev` or `building` only: `LOCAL_DATABASE_URL`, then `file:local.db`.
4. Otherwise `undefined`, and the module throws `Database URL is not set. Set
   TURSO_DATABASE_URL or LOCAL_DATABASE_URL.`

Guards: the module throws when no URL resolves. It also throws when the environment is not
`dev` and the resolved URL starts with `libsql://` but `TURSO_AUTH_TOKEN` is empty
(`src/lib/server/db/index.ts:15`). Because `building` is true during `vite build`, a build
without a remote URL silently falls back to a local file, which is why CI writes a mock
Turso URL before building (`.github/workflows/ci.yml:30`).

Important nuance: the auth token is only ever read from `TURSO_AUTH_TOKEN`. If production
relies on `DATABASE_URL` instead of `TURSO_DATABASE_URL`, the token must still be in
`TURSO_AUTH_TOKEN`, which is inconsistent and easy to misconfigure.

`drizzle.config.ts` is stricter than the app: it loads `.env` and throws at load time when
either `TURSO_DATABASE_URL` or `TURSO_AUTH_TOKEN` is missing, so both must be present for
any `drizzle-kit` command, including `generate` and `studio`.

## 4. Build and run

- Adapter: `@sveltejs/adapter-node` (`svelte.config.js:14`). The build output is a Node
  server, not a static site.
- Build: `pnpm build` runs `vite build`. It emits `.svelte-kit/output/` plus a server
  entry under `build/`.
- Start: `pnpm start` runs `node build`, the adapter-node server entry that Railway runs.
- Preview: `pnpm preview` runs `vite preview` for a local look at the built app.
- Dev: `pnpm dev` runs `vite dev --port 5175` with `strictPort`.
- Desktop: Tauri 2 under `src-tauri/`. `beforeDevCommand` runs `pnpm run dev`, `devUrl` is
  `http://localhost:5175`, and `frontendDist` is `../.svelte-kit/output/client`
  (`src-tauri/tauri.conf.json:6`). Desktop is deferred and is not part of production.

## 5. CI/CD workflows

All workflows live in `.github/workflows/`.

### `ci.yml` (Continuous Integration)
Triggers on push and on pull requests (opened, synchronize, closed) to `main`,
`feature/**`, `bugfix/**`, `hotfix/**`, `fix/**`, `task/**`, `release/**`, plus manual
dispatch. Two jobs:

- `test`: pnpm 8, Node 20, `pnpm install`, write a mock `.env` (mock Turso URL and token
  plus a mock PostHog key), then `pnpm run check`, `pnpm run format:check`, and
  `pnpm run test`.
- `build` (needs `test`): same setup, then a case-sensitivity symlink step, `npx
  svelte-kit sync`, `pnpm run build`, and an upload of `.svelte-kit/` as an artifact.

Problems:

- The case-sensitivity symlink step (`ci.yml:67`) is stale. It creates
  `src/lib/components/character/XpBar.svelte` as a symlink to `XPBar.svelte` when the
  capital-P file exists. The tree only has `XPBar.svelte`, and every import already uses
  the capital-P name (`src/routes/dashboard/+page.svelte:16`), so the symlink is
  defensive code that nothing needs. It should be removed or, if a real case mismatch is
  being guarded, the guard should match the current tree.
- `pnpm test` is now `vitest run` (`package.json:13`), so it does not hang. Historically
  it passed `--run` after `--`, which left Vitest in watch mode and only appeared to work
  because CI sets `CI=true` (see `docs/testing-strategy.md:9`). This is already fixed; keep
  it that way.
- The README advertises `pnpm test:coverage` (`README.md:116`), but no such script exists
  and there is no coverage provider.

### `codeql.yml` (CodeQL Advanced)
Triggers on push and pull requests to `master`, plus a weekly cron. Analyzes
`javascript-typescript` with `build-mode: none`.

Problem: the repository uses `main` as its default branch (visible in `ci.yml` and the
merge history), not `master`. The push and pull_request triggers therefore never fire;
only the weekly schedule runs. Change the branches to `main` (or the full set `ci.yml`
uses) to get results on each change.

### `deploy-staging.yml` (Deploy to Staging)
Triggers on push to `staging` (a branch that does not exist) and manual dispatch. It builds
with Node 18 and pnpm 8, runs `pnpm run build`, sets up GitHub Pages, uploads `./build` as
a Pages artifact, and deploys with `actions/deploy-pages`.

Problems:

- It deploys an adapter-node SSR server to GitHub Pages. Pages serves static files and
  cannot run a Node server, so the site cannot function. The correct target for this build
  is a Node host such as Railway.
- It uses Node 18 while `ci.yml` and `.env.test` tooling assume Node 20.
- It passes no environment variables and does not run `svelte-kit sync`, `check`, or tests.
- The trigger branch does not exist, so it runs only on manual dispatch, which masks the
  broken pipeline.

### `delete_branch.yml` (Delete merged branch)
On a closed pull request, when it was merged, deletes the head ref unless it is `main` or
`master`, using a `write-all` token. This is fine for in-repo branches. It does not skip
fork PRs, where the head ref lives in the fork, so the delete would fail or be a no-op;
guard on `github.event.pull_request.head.repo.full_name == github.repository` if fork
PRs are expected.

## 6. Recommended staging setup

The audit treats staging as a real gap and lists it in `docs/open-questions.md` questions
12 and 13 and `docs/audit-backlog.md` O-7. A concrete setup:

1. Second Railway service. Keep production as is and add a second service (or a second
   Railway environment) from the same repository, tracking a `staging` branch. It runs the
   same adapter-node server.
2. Its own Turso database. Create a separate Turso database (or a Turso branch of
   production, if the workflow supports it) so staging migrations and data never touch
   production. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` only on the staging service.
3. Distinct PostHog project, or an environment tag. The cleaner option is a separate
   PostHog project with its own `PUBLIC_POSTHOG_KEY`. If a single project is preferred,
   register an `environment` property and a `release` value on the client after init and
   include them on every server capture, so dashboards can filter staging from production.
   Today no environment or release tag is set, so events would mix (O-7).
4. Staging environment variables: `CANONICAL_BASE_URL` set to the staging domain,
   `TRUST_PROXY=true` because Railway terminates the proxy, `RESEND_API_KEY` ideally a
   test-safe key, `SENDER_EMAIL` set explicitly, and either `ENABLE_SCHEDULER=true` or the
   scheduler left off to avoid duplicate cleanup across services.
5. A fixed `deploy-staging.yml`. Remove the Pages steps (`actions/configure-pages`,
   `actions/upload-pages-artifact`, `actions/deploy-pages`) and the `./build` upload. Either
   connect the Railway service to the repository so Railway builds and deploys on push to
   `staging` (recommended, no workflow needed), or keep a workflow that runs the test job
   as a gate and then triggers a Railway deploy with a project token stored as a secret.
   Use Node 20 to match CI, and set the environment variables from repository or
   environment secrets.

If a separate host is not wanted, the alternative is to delete `deploy-staging.yml`
entirely so it cannot give a false sense of a working pipeline.

## 7. Database safety

Production data lives in Turso. `drizzle-kit generate` writes forward migrations only; it
does not produce down migrations, so every risky change needs a snapshot and a defined
rollback path before it is applied. See the `drizzle-libsql` project skill for the full
migration workflow.

### Snapshot before any migration

Local file database:

```
sqlite3 local.db ".backup local-backup.db"
```

Restore by stopping the server and copying the backup back over `local.db`.

Turso hosted database (confirm the exact subcommands first, because the CLI changes
between versions):

```
turso db --help
turso db dump <db-name> > backup-<YYYY-MM-DD>.sql
turso db create <db-name>-backup --from-db <db-name>
```

- `db dump` is the logical backup. Keep it, because it is the reliable restore source.
- `db create ... --from-db` is a point-in-time clone, good for migrating a copy and
  rehearsing before touching production.
- Newer Turso CLI versions also offer database branching and point-in-time restore. Treat
  those as conveniences and treat restore from a dump as the fallback that must be
  rehearsed.

### Define the rollback path

Because there are no down migrations, choose one of these and write it down before
applying:

1. Prefer additive, backward compatible changes: add a nullable column (or one with a
   default), backfill, and only later tighten. Then rolling the application code back to
   the previous release is enough, and the database stays forward.
2. Otherwise write a manual reverse SQL migration, test it on the clone, and keep it ready
   to run with `pnpm db:migrate`.
3. Worst case, restore the snapshot: create a fresh database, load the dump
   (`turso db shell <new-db-name> < backup-<date>.sql`), and repoint `TURSO_DATABASE_URL` at
   it. This loses any data written after the snapshot, so record the snapshot time.

Guardrails to keep in force:

- Never point `TURSO_DATABASE_URL` at production from tests or from `pnpm db:push`.
  `vite.config.ts` and `src/tests/setup.ts` already redirect tests to `file:./local-test.db`.
- Review the generated SQL in `migrations/` and run `pnpm db:check` before applying.
- Test the migration on a clone or a throwaway file first.
- Never edit an already-applied migration file. Add a new one.
- Tag or record the deployed release that precedes the migration, so the application can
  be rolled back without a database change.
- Deployments do not run migrations. After a snapshot, apply migrations manually with
  `pnpm db:migrate` against the target database.

## 8. Related documents

- `docs/architecture.md`: request lifecycle, module map, and data flows.
- `docs/domain-rules.md`: intended behavior.
- `docs/audit-backlog.md`: O-7 (no environment tagging) and D-3 (snapshot before migration).
- `docs/open-questions.md`: questions 12 and 13 (staging shape and PostHog environments).
