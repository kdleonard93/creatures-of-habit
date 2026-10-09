# Creatures of Habit: Engineering Docs

Knowledge base for the app, created during the audit on branch `task/audit-updates`. It exists so future work (human or agent) starts from the intended behavior and the real constraints, not guesses.

## Audience

- The project owner, as the source of truth for intended behavior.
- Any agent working in this repo, via the `creatures-of-habit` project skill.

## Contents

- [architecture.md](./architecture.md): system overview, request lifecycle, module map, data flows.
- [data-model.md](./data-model.md): every table, columns, constraints, indexes, schema versus migration drift.
- [domain-rules.md](./domain-rules.md): intended behavior for habits, streaks, XP, levels, stats, quests, timezone, notifications, contact, and waitlist. Tags rules as Confirmed, Current, or Open.
- [auth-and-email.md](./auth-and-email.md): sessions, tokens, password hashing, email flows, security gaps.
- [api-reference.md](./api-reference.md): every API endpoint and page server load or action, with auth, validation, and responses.
- [environments-and-deploy.md](./environments-and-deploy.md): environment variables, database connection logic, CI/CD, staging plan, database safety.
- [observability.md](./observability.md): PostHog and logging, event taxonomy, error capture and noise inventory, target policy.
- [testing-strategy.md](./testing-strategy.md): current test state, anti-patterns, target harness, priority flows.
- [audit-backlog.md](./audit-backlog.md): prioritized findings.
- [open-questions.md](./open-questions.md): decisions still needed.

## Conventions

- When behavior in code contradicts a Confirmed rule, treat it as a bug and record it in the backlog.
- Keep UTC for backend logic and stored dates; display user-local time.
- Never print secrets. Reference environment variable names only.

## Status

Phase 0 (baseline and isolation) is complete. Phase 1 (docs and skills) is in progress. The audit tracks run next.
