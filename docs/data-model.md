# Data Model Reference

Source of truth: `src/lib/server/db/schema.ts`. Migrations: `migrations/*.sql` with snapshots in `migrations/meta/`. Runtime driver: Drizzle ORM over `@libsql/client` (`src/lib/server/db/index.ts`), targeting LibSQL/Turso or a local SQLite file (`file:local.db` in dev).

## Overview

- Engine: SQLite file format (`dialect: "turso"` in `drizzle.config.ts`; snapshots say `"dialect": "sqlite"`). Turso/LibSQL is wire-compatible with SQLite plus remote sync.
- ORM: Drizzle, schema-first. Table objects are exported from `src/lib/server/db/schema.ts`, then attached in `drizzle(client, { schema })`.
- 21 tables. All primary keys are `text` UUIDs generated in the application via `$defaultFn(() => crypto.randomUUID())`, except `session`, `password_reset_token`, `email_verification_token`, and `user_key`, whose ids are supplied by the auth layer (SHA-256 hashes or library tokens).
- Drizzle `text({ enum: [...] })` is a TypeScript-only constraint. It generates **no** SQL `CHECK` constraint, so all enum domains below are enforced only by application code, not by the database.
- Timestamps: most `created_at`/`updated_at` columns are `text` with DB default `CURRENT_TIMESTAMP` (UTC, `YYYY-MM-DD HH:MM:SS`). Token expiry columns are `integer` in `timestamp` mode. See "Data lifecycle" for format inconsistencies.

Primary consumer code: `src/routes/api/**/+server.ts`, `src/routes/**/+page.server.ts`, `src/lib/server/services/questService.ts`, `src/lib/server/services/notificationService.ts`, `src/lib/utils/dailyHabitTracker.ts`, `src/lib/server/auth.ts`, `src/lib/server/tasks/*`.

## Tables

### user

Purpose: account identity and credentials.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | app UUID (`crypto.randomUUID`, no DB default) |
| age | integer | yes | none |
| email | text | no | none |
| username | text | no | none |
| password_hash | text | no | none |
| created_at | text | no | `CURRENT_TIMESTAMP` |
| email_verified | integer (boolean mode) | no | `false` (0) |
| email_verified_at | text | yes | none |

- PK: `id`. FKs: none.
- Unique: `user_email_unique(email)`, `user_username_unique(username)`.
- Indexes: none beyond the two unique indexes.

### creature

Purpose: the player's character.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | app UUID |
| user_id | text | no | none |
| name | text | no | none |
| class | text | no | none |
| race | text | no | none |
| background | text | yes | none |
| custom_background | text | yes | none |
| experience | integer | no | `0` |
| level | integer | yes | `1` |
| created_at | text | no | `CURRENT_TIMESTAMP` |

- PK: `id`. FK: `user_id -> user.id` ON DELETE `cascade`.
- Unique: none (note: user_id is not unique). Indexes: none.

### creature_stats

Purpose: ability scores and unspent stat boost points.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | app UUID |
| creature_id | text | no | none |
| strength, dexterity, constitution, intelligence, wisdom, charisma | integer | no | `10` each |
| stat_boost_points | integer | no | `0` |
| created_at, updated_at | text | no | `CURRENT_TIMESTAMP` |

- PK: `id`. FK: `creature_id -> creature.id` ON DELETE `cascade` (one-to-one).
- Unique: `creature_stats_creature_id_unique(creature_id)`. Indexes: that unique.

### creature_equipment

Purpose: equipped items per slot.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | app UUID |
| creature_id | text | no | none |
| slot | text | no | none |
| item_id | text | no | none |
| equipped | integer | no | `1` |

- PK: `id`. FK: `creature_id -> creature.id` ON DELETE `cascade`.
- Unique: none (no constraint on `(creature_id, slot)`). Indexes: none.
- Note: no code inserts starting equipment on registration (see "Integrity gaps").

### habit_frequency

Purpose: frequency descriptor referenced by habits. Rows are created per habit write, not shared.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | app UUID |
| name | text | no | none |
| days | text | yes | none (JSON-encoded array of weekday numbers) |
| every_x | integer | yes | none (never populated by current code) |
| created_at | text | no | `CURRENT_TIMESTAMP` |

- PK: `id`. FKs: none. Unique: none. Indexes: none.

### habit_category

Purpose: user-owned habit categories.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | app UUID |
| user_id | text | no | none |
| name | text | no | none |
| description | text | yes | none |
| is_default | integer (boolean mode) | no | `false` (0) |
| created_at | text | no | `CURRENT_TIMESTAMP` |

- PK: `id`. FK: `user_id -> user.id` ON DELETE `cascade`.
- Unique: none (no constraint on `(user_id, name)`). Indexes: none.

### habit

Purpose: the habit definition. Soft-deleted via `is_archived`.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | app UUID |
| user_id | text | no | none |
| category_id | text | yes | none |
| title | text | no | none |
| description | text | yes | none |
| frequency_id | text | yes | none |
| difficulty | text | no | `'medium'` |
| base_experience | integer | no | `10` |
| is_active | integer (boolean mode) | no | `true` (1) |
| is_archived | integer (boolean mode) | no | `false` (0) |
| start_date | text | no | none |
| end_date | text | yes | none |
| created_at, updated_at | text | no | `CURRENT_TIMESTAMP` |

- PK: `id`.
- FKs: `user_id -> user.id` ON DELETE `cascade`; `category_id -> habit_category.id` ON DELETE `no action`; `frequency_id -> habit_frequency.id` ON DELETE `no action`.
- Unique: none. Indexes: none (no index on `user_id`, `is_archived`).

### habit_completion

Purpose: completion events and XP awarded.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | app UUID |
| habit_id | text | no | none |
| user_id | text | no | none |
| completed_at | text | no | none |
| value | integer | no | `1` (the complete route writes `100`) |
| experience_earned | integer | no | none |
| note | text | yes | none |
| created_at | text | no | `CURRENT_TIMESTAMP` |

- PK: `id`. FKs: `habit_id -> habit.id` cascade; `user_id -> user.id` cascade.
- Unique: none (no `(habit_id, completed_at)` constraint). Indexes: none.

### habit_streak

Purpose: current and longest streak per habit.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | app UUID |
| habit_id | text | no | none |
| user_id | text | no | none |
| current_streak | integer | no | `0` |
| longest_streak | integer | no | `0` |
| last_completed_at | text | yes | none |
| created_at, updated_at | text | no | `CURRENT_TIMESTAMP` |

- PK: `id`. FKs: `habit_id -> habit.id` cascade; `user_id -> user.id` cascade.
- Unique: none (no constraint on `habit_id`, so duplicate streak rows are possible). Indexes: none.

### quest_templates

Purpose: reusable quest blueprints.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | app UUID |
| title | text | no | none |
| description | text | no | none |
| setting | text | no | none (free text, e.g. "forest", "dungeon") |
| difficulty | text | no | none |
| created_at | text | no | `CURRENT_TIMESTAMP` |

- PK: `id`. FKs: none. Unique: none (no unique on `title`). Indexes: none.

### quest_instances

Purpose: a generated quest run for a user.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | app UUID |
| user_id | text | no | none |
| template_id | text | yes | none |
| title | text | no | none |
| description | text | no | none |
| narrative | text | no | none |
| status | text | no | `'available'` |
| current_question | integer | no | `0` |
| correct_answers | integer | no | `0` |
| stat_checks_passed | integer | no | `0` |
| total_questions | integer | no | `5` |
| exp_reward_base | integer | no | `50` |
| exp_reward_bonus | integer | no | `100` |
| activated_at | text | yes | none |
| completed_at | text | yes | none |
| created_at | text | no | `CURRENT_TIMESTAMP` |

- PK: `id`. FKs: `user_id -> user.id` cascade; `template_id -> quest_templates.id` cascade.
- Indexes: `idx_quest_instances_user_status(user_id, status)`, `idx_quest_instances_user_created(user_id, created_at)`.
- Note: no unique constraint prevents multiple active quests per user per day; the daily-quest logic relies on a date comparison only.

### quest_questions

Purpose: questions belonging to a quest instance, including the correct answer.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | app UUID |
| quest_instance_id | text | no | none |
| question_number | integer | no | none |
| question_text | text | no | none |
| choice_a, choice_b | text | no | none |
| correct_choice | text | no | none |
| required_stat | text | no | none |
| difficulty_threshold | integer | no | none |
| created_at | text | no | `CURRENT_TIMESTAMP` |

- PK: `id`. FK: `quest_instance_id -> quest_instances.id` cascade.
- Unique: **none in `schema.ts`**. Indexes: `idx_quest_questions_instance(quest_instance_id, question_number)` (non-unique).
- Migration reality: `0021` and `0022` create unique indexes on `(quest_instance_id, question_number)` under two different names (see drift section). The snapshot and `schema.ts` do not declare this uniqueness.

### quest_answers

Purpose: one recorded answer per question per quest.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | app UUID |
| quest_instance_id | text | no | none |
| question_id | text | no | none |
| user_choice | text | no | none |
| was_correct | integer (boolean mode) | no | none |
| passed_stat_check | integer (boolean mode) | no | `false` (0) |
| answered_at | text | no | `CURRENT_TIMESTAMP` |

- PK: `id`.
- FKs (per schema): `quest_instance_id -> quest_instances.id` cascade; `question_id -> quest_questions.id` cascade.
- Unique: `unique_question_answer(quest_instance_id, question_id)`. Indexes: `idx_quest_answers_instance(quest_instance_id)`.
- Migration reality: the two FKs were added via `ALTER TABLE ... ADD COLUMN ... REFERENCES` without `ON DELETE CASCADE`, and three distinct unique indexes exist on the same column pair (see drift section).

### session

Purpose: active login sessions. `id` stores the SHA-256 hash of the cookie token.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | none |
| user_id | text | no | none |
| expires_at | integer (timestamp mode) | no | none |

- PK: `id`. FK: `user_id -> user.id` cascade.
- Unique: none beyond PK. Indexes: none (no index on `user_id` or `expires_at`).

### password_reset_token

Purpose: one-shot password reset tokens.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | none |
| user_id | text | no | none |
| expires_at | integer (timestamp mode) | no | none |

- PK: `id`. FK: `user_id -> user.id` cascade. Unique: none. Indexes: none.

### email_verification_token

Purpose: email verification tokens.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | none |
| user_id | text | no | none |
| expires_at | integer (timestamp mode) | no | none |
| email | text | no | none |

- PK: `id`. FK: `user_id -> user.id` cascade. Unique: none. Indexes: none.

### user_key (exported as `key`)

Purpose: legacy credential table. The running auth code reads/writes `user.password_hash`, not this table.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | none |
| user_id | text | no | none |
| hashed_password | text | yes | none |

- PK: `id`. FK: `user_id -> user.id` cascade. Unique: none. Indexes: none.

### user_preferences

Purpose: notification and privacy settings, one row per user.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | app UUID |
| user_id | text | no | none |
| email_notifications | integer | no | `1` |
| push_notifications | integer | no | `1` |
| in_app_notifications | integer | no | `1` |
| reminder_notifications | integer | no | `1` |
| profile_visibility | integer | no | `0` |
| activity_sharing | integer | no | `0` |
| stats_sharing | integer | no | `0` |
| created_at, updated_at | text | no | `CURRENT_TIMESTAMP` |

- PK: `id`. FK: `user_id -> user.id` cascade.
- Unique: `user_preferences_user_id_unique(user_id)`. Indexes: that unique.
- Note: these columns are plain integers, not Drizzle boolean mode, unlike other 0/1 columns.

### contacts

Purpose: contact form submissions.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | app UUID |
| name | text | no | none |
| email | text | no | none |
| message | text | no | none |
| created_at | text | no | `CURRENT_TIMESTAMP` |

- PK: `id`. FKs: none. Unique: none. Indexes: none.

### daily_habit_tracker

Purpose: per-day completion state per habit, used by the dashboard progress bar.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | app UUID |
| user_id | text | no | none |
| habit_id | text | no | none |
| date | text | no | none (YYYY-MM-DD) |
| completed | integer (boolean mode) | no | `false` (0) |
| created_at, updated_at | text | no | `CURRENT_TIMESTAMP` |

- PK: `id`. FKs: `user_id -> user.id` cascade; `habit_id -> habit.id` cascade.
- Indexes: `idx_daily_tracker_user_date(user_id, date)`, `idx_daily_tracker_habit(habit_id)`, `idx_daily_tracker_date(date)`, `idx_daily_tracker_user_habit_date(user_id, habit_id, date)` (non-unique, redundant with the unique below), and unique `unique_user_habit_date(user_id, habit_id, date)`.

### user_waitlist

Purpose: marketing waitlist signups.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| id | text | no | app UUID |
| email | text | no | none |
| ip_address | text | yes | none |
| user_agent | text | yes | none |
| referral_source | text | yes | none |
| subscribed_at | text | no | `CURRENT_TIMESTAMP` |

- PK: `id`.
- Unique: `user_waitlist_email_unique(email)`. Indexes: `idx_user_waitlist_subscribed_at(subscribed_at)`, `idx_user_waitlist_referral_source(referral_source)`.

## Enumerated value domains

All are TypeScript-level enums only, with no database `CHECK` constraint (snapshots contain empty `checkConstraints` for every table).

- creature.class (`src/lib/types.ts:1-10`): `warrior`, `brawler`, `wizard`, `cleric`, `assassin`, `archer`, `alchemist`, `engineer`.
- creature.race (`src/lib/types.ts:12-17`): `human`, `orc`, `elf`, `dwarf`.
- habit_frequency.name (`schema.ts:60`): `daily`, `weekly`, `custom`.
- habit.difficulty (`schema.ts:89-91`): `easy`, `medium`, `hard`.
- quest_templates.difficulty (`schema.ts:139-141`): `easy`, `medium`, `hard`.
- quest_instances.status (`schema.ts:155-157`): `available`, `active`, `completed`.
- quest_questions.correct_choice (`schema.ts:183-185`): `A`, `B`.
- quest_answers.user_choice (`schema.ts:205-207`): `A`, `B`.
- quest_questions.required_stat (`schema.ts:186-188`): `strength`, `dexterity`, `constitution`, `intelligence`, `wisdom`, `charisma`.
- creature_equipment.slot (`src/lib/types.ts:102-110`, not enforced in schema): `weapon`, `offhand`, `armor`, `helmet`, `gloves`, `boots`, `accessory1`, `accessory2`.
- notification channel (`src/lib/types.ts:177`): `email`, `push`, `in-app`; category: `reminder`, `achievement`, `system`, `quest`.

## Schema vs migrations drift

Concrete mismatches between `schema.ts`, `migrations/*.sql`, and the `migrations/meta/*_snapshot.json` files that drive `drizzle-kit generate`.

1. Journal tag does not match the SQL file for migration 0022. `migrations/meta/_journal.json` lists entry idx 22 as `0022_foamy_lord_hawal`, but the file on disk is `migrations/0022_quest_answer_uniqueness.sql`. Drizzle resolves migration SQL by journal `tag`, so a fresh `migrate` cannot find `0022_foamy_lord_hawal.sql`. Migration replay on an empty database is broken for this step.

2. quest_answers uniqueness is triplicated under three names. `0021_noisy_gravity.sql` creates `unique_quest_question_answer(quest_instance_id, question_id)`. `0022_quest_answer_uniqueness.sql` creates `unique_quest_answer_per_question(quest_instance_id, question_id)` with `IF NOT EXISTS`. `0025_oval_dark_phoenix.sql` creates `unique_question_answer(quest_instance_id, question_id)`. All three can coexist in a live database because the names differ. `schema.ts:214` declares only `unique_question_answer`.

3. quest_questions uniqueness exists in migrations but not in schema/snapshots. `0021` creates `unique_quest_question_number(quest_instance_id, question_number)` and `0022` adds `unique_quest_question_number_per_instance` on the same columns. `schema.ts:191-195` declares only a non-unique index. `migrations/meta/0021_snapshot.json` contains both `unique_quest_question_answer` and `unique_quest_question_number`; `migrations/meta/0022_snapshot.json` contains neither, and `0028_snapshot.json` has no quest_questions unique constraint. So the declared Drizzle state diverges from the live database, and `drizzle-kit push` would see live-only indexes that `schema.ts` does not describe (a drop candidate), while `generate` (snapshot-driven) emits nothing.

4. quest_answers foreign keys lack cascade in the migration. `0020_curious_charles_xavier.sql` adds the columns as `ALTER TABLE quest_answers ADD quest_instance_id text NOT NULL REFERENCES quest_instances(id)` and `ADD question_id text NOT NULL REFERENCES quest_questions(id)`, with no `ON DELETE` clause. `schema.ts:199-204` and `0028_snapshot.json` declare `onDelete: "cascade"`. The live table therefore does not cascade on delete the way the schema claims.

5. 0024 drops an index that was never created. `0024_slippery_tomas.sql` runs `DROP INDEX IF EXISTS idx_user_waitlist_email`, but `0023_huge_sugar_man.sql` created `user_waitlist_email_unique` (plus `idx_user_waitlist_subscribed_at` and `idx_user_waitlist_referral_source`). The drop is a no-op and signals a hand-edited migration.

6. Early migrations bake literal UUID defaults into DDL. `0001` through `0010` recreate `user` and `creature` with hardcoded `id ... DEFAULT '<literal-uuid>'` values. `0011_noisy_lady_vermin.sql` rewrites both tables without those defaults. The final state matches `schema.ts` (app-generated ids), but any tooling that compared intermediate migrations to the schema would see repeated churn.

7. Dialect label mismatch. `drizzle.config.ts` sets `dialect: "turso"` while `migrations/meta/_journal.json` and snapshots use `"dialect": "sqlite"`, version 7 / version 6. Harmless at runtime, but worth aligning before regenerating migrations.

8. Redundant indexes in daily_habit_tracker. `schema.ts:294-309` declares both a non-unique `idx_daily_tracker_user_habit_date` and the unique `unique_user_habit_date` on the identical column set `(user_id, habit_id, date)`. The non-unique composite index is fully covered by the unique one. `idx_daily_tracker_user_date(user_id, date)` is also a prefix of the unique index.

9. Missing uniqueness that the code assumes. `habit_streak.habit_id`, `creature.user_id`, `creature_equipment(creature_id, slot)`, and `habit_completion(habit_id, completed_at)` have no unique constraints even though query code treats them as unique (`src/lib/utils/dailyHabitTracker.ts`, `src/routes/api/habits/[id]/complete/+server.ts:36-46`, `src/lib/server/services/questService.ts`). `drizzle-kit generate` will not add these, and duplicate rows are possible.

10. `habit_frequency.name` enum includes `daily`, but no code path creates a `daily` frequency row; `daily` habits store `frequency_id = null` (`src/routes/api/habits/+server.ts:65-84`). The column is effectively `weekly`/`custom` only.

## Data lifecycle

Soft versus hard delete:

- habit soft delete: `DELETE /api/habits/[id]` sets `is_archived = true` (`src/routes/api/habits/[id]/+server.ts:113-139`); `PUT` with a single `isArchived` key toggles archive/restore (`+server.ts:48-62`). Hard delete only via `DELETE /api/habits/[id]/permanent-delete` (`+server.ts:7-26`), which removes the row and relies on FK cascade to clear `habit_completion`, `habit_streak`, and `daily_habit_tracker`.
- quest reset (dev only) hard deletes `quest_answers`, then `quest_questions`, then `quest_instances` (`src/lib/server/services/questService.ts:488-498`).
- Tokens: `createPasswordResetToken` and `createEmailVerificationToken` first delete all existing tokens for the user, then insert one (`src/lib/server/auth.ts`). Expired tokens are deleted lazily during validation; `cleanupExpiredTokens` and `cleanupExpiredVerificationTokens` exist but are never called anywhere in `src/` (only defined at `auth.ts:228` and `auth.ts:234`).
- Sessions: expired sessions are deleted on validation; all sessions for a user are deleted on password change only in `src/routes/settings/+page.server.ts:61-65` (`updatePassword`). `src/routes/settings/password/+page.server.ts` does not invalidate other sessions.
- Daily tracker retention: a scheduled job deletes rows older than 30 days (`src/lib/utils/dailyHabitTracker.ts:cleanupOldTrackerEntries`, wired in `src/lib/server/tasks/scheduler.ts:97-101`). It runs only when `NODE_ENV=production` or `ENABLE_SCHEDULER=true` (`scheduler.ts:107-114`).

Cascade behavior:

- Cascades are declared on nearly every `user_id` FK and on `habit_id`, `creature_id`, `quest_instance_id`, and `template_id` FKs. `habit.category_id` and `habit.frequency_id` use `ON DELETE no action`.
- No runtime `PRAGMA foreign_keys = ON` is issued anywhere in `src/` (grep for `foreign_keys`/`PRAGMA` returns only the migration files). SQLite defaults foreign key enforcement to OFF per connection, so these cascades may not be enforced unless the Turso/LibSQL server enables them. This also affects the `no action` FKs.

Timestamp formats (known inconsistencies):

- DB defaults use `CURRENT_TIMESTAMP`: UTC, format `YYYY-MM-DD HH:MM:SS`, no timezone marker.
- `formatSqliteTimestamp` (`src/lib/utils/date.ts:14-16`) writes `YYYY-MM-DD HH:MM:SS` from `toISOString()`, so UTC without the `Z`.
- Several code paths write `new Date().toISOString()`: `format YYYY-MM-DDTHH:MM:SS.sssZ` (with `T` and `Z`). Examples: `quest_instances.activated_at`/`completed_at` (`questService.ts:140,343`), `habit.updated_at` (`habits/[id]/+server.ts:53,98,127`), `creature_stats`/quest `updated_at`, `contacts.created_at` (`contacts/+page.server.ts:62`), `user.email_verified_at` (`auth.ts`).
- `formatDateOnly` (`date.ts:22-24`) writes `YYYY-MM-DD` in UTC. Used for `habit_completion.completed_at` (`complete/+server.ts:34`), `daily_habit_tracker.date`, and quest "today" comparisons.
- Consequence: `text` timestamp columns mix space-separated and ISO-T formats. Lexicographic ordering and `MAX(completed_at)` subqueries (`src/routes/dashboard/+page.server.ts:95-100`) can order inconsistently across the two formats. All values are UTC, so local-time users can see date-boundary off-by-one behavior (a `date` computed from `toISOString()` is UTC, not local).

Other lifecycle notes:

- `created_at`/`updated_at` defaults are never updated automatically; code must set `updated_at` explicitly. Several update paths do not (for example `quest_instances` progress updates in `questService.ts:277-284`).
- `user_preferences` is inserted at registration (`src/routes/api/register/+server.ts:116-125`) and upserted in settings (`settings/+page.server.ts:81-96`).

## Integrity gaps

Missing or underspecified constraints:

- No database-level enum enforcement (no CHECK constraints). `creature.class` and `creature.race` are accepted as arbitrary strings at registration (`src/routes/api/register/+server.ts:25-26` uses `z.string()`), then cast to `CreatureClassType`/`CreatureRaceType` downstream (`src/routes/api/character/stat-boost-points/+server.ts:85-87`). Invalid class/race values can be persisted.
- No unique on `creature.user_id`, yet queries assume one creature per user (`select ... where userId = ?` then `rows[0]`). Duplicate creatures are possible.
- No unique on `habit_streak.habit_id`. `complete/+server.ts:73-81` updates by `habit_id`, so a duplicate streak row would update multiple rows.
- No unique on `habit_completion(habit_id, completed_at)`. The completion route checks then inserts (`complete/+server.ts:36-46` then `59-68`), a TOCTOU race allowing two completions on the same day.
- No unique on `creature_equipment(creature_id, slot)`, allowing duplicate equipped items in a slot.
- `quest_questions` uniqueness is present in migrations under inconsistent names but absent from `schema.ts` and snapshots (see drift). `quest_answers` likewise has multiple redundant unique indexes.

Nullable foreign keys that matter:

- `habit.category_id` is nullable and not ownership-checked on write: `POST /api/habits` stores any `categoryId` supplied by the client without verifying it belongs to the user (`habits/+server.ts:86-98`). A user can reference another user's category. `habit.frequency_id` is nullable and often null for `daily`.
- `quest_instances.template_id` is nullable even though a template is always chosen on generation; `ON DELETE cascade` means deleting a template deletes historical instances.
- `habit_completion.user_id` and `habit_streak.user_id` are denormalized copies of `habit.user_id`; nothing enforces that they agree with the habit owner.

Unguarded or spoofable columns:

- `user_waitlist.ip_address` is populated from the raw `x-forwarded-for` header (`waitlist/+server.ts:42`), which is client-spoofable unless a trusted proxy strips it. `user_agent` and `referral_source` come from headers and the referer.
- `contacts` accepts unauthenticated, unrate-limited writes of name/email/message (`contact/+page.server.ts:18-77`).
- `daily_habit_tracker` has `completed` set only by server logic (`markHabitCompleted`), which is good, but the `date` is derived from UTC, not the user's timezone.
- `creature.experience`, `creature.level`, `creature_stats.*`, `stat_boost_points`, `habit_completion.experience_earned`, and `quest_answers.was_correct` are all server-computed and not directly client-writable, which is the correct pattern.
- `habit.base_experience` is never set by the API and always defaults to 10; XP is computed from `difficulty` (`src/lib/server/xp`).
