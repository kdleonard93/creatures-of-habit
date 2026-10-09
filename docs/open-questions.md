# Open Questions

Decisions still needed from the product owner. Each blocks or shapes part of the work.

## Domain

1. **Weekly scheduled weekday**: the schema stores no weekday for weekly habits. Should we add one, or derive it from `startDate`?
2. **XP curve validation**: confirm `floor(25 * (level-1)^1.8)` is the intended shape (monotonic, sane pacing) and confirm there is no level cap. The owner asked to validate before treating it as canonical.
3. **Stats design**: unresolved. Needs a proposal covering allocation rules, min and max, starting values, race and class modifiers, the health formula, stat boost point caps, and which module (server or client) is the source of truth. Then approval before code changes.
4. **Stat check model**: confirmed to be probability-based from the relevant stat. Open details: the exact probability curve, how thresholds scale with difficulty, and how it will carry over to boss battles.
5. **Daily progress denominator**: should the progress bar count all non-archived habits, or only habits scheduled for today? Inactive habits currently lower the percentage.
6. **Timezone**: should we store a per-user timezone and compute scheduling in it (storage stays UTC)? Which zone decides a user's weekday today?
7. **Equipment**: `creature_equipment` exists but appears unused. Is it planned, or can it be considered inert?

## Contact and waitlist

8. **Moderation surface**: the owner approved honeypot, rate limit, length caps, validation, a spam or status column, and email forwarding. Open: how much admin UI (a review page, marking spam, export), and whether waitlist is still actively collecting and how entries are used.
9. **Admin accounts**: the owner wants an admin account on prod. Open: scope, roles, and whether it is part of this audit or a later feature.

## Operations

10. **Staging shape**: confirm a second Railway service plus a separate Turso database plus a distinct PostHog project or environment tag. Confirm the staging domain and whether the broken `deploy-staging.yml` should be repurposed or removed.
11. **PostHog environments**: confirm how to tag staging versus production (separate project or an `environment` property plus a release tag) so error triage can separate them.

## Resolved (for the record)

- Streak resets to 0 when a scheduled occurrence is missed; daily is every day, weekly is the same weekday each week, custom is each assigned day.
- Streak scope is **per habit**. A missed scheduled occurrence resets only that habit's streak (matches the `habit_streak` table).
- Weekly habits count only the **assigned weekday**. Completing on another day does not continue the streak.
- XP curve and habit XP confirmed (pending validation in question 2).
- One quest per day, one attempt, rewards confirmed.
- Backend logic and stored dates are UTC; display is user-local.
- Email verification is required to use the app.
- Quests, notifications, and waitlist are live; desktop work is deferred and not in production.
- Audit findings live in `docs/audit-backlog.md`.
- Fix sequence: quick wins first (O-8, A-6, O-1/O-2, C-6/C-7), then the test harness and core gameplay.
- `docs/` is tracked in git (the temporary `/docs` ignore was removed).
