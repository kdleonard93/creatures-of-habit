# Habit Lifecycle Migration Guide

This guide explains how to safely run the migration that un-archives habits with completion history.

## Overview

The migration corrects the `isArchived` flag which was previously used for both completion tracking and deletion. After this migration:

- **Habits with completions** → Restored to active (they were incorrectly archived)
- **Habits without completions** → Remain archived (truly deleted by user)
- **All user data** → Preserved, no deletions

## Step 1: Preview the Migration (DRY RUN)

First, run the dry-run to see exactly what will happen:

```bash
pnpm db:migrate:unarchive:dryrun
```

This will show:
- ✅ How many habits will be restored
- 🗑️ How many habits will remain deleted
- 📋 Specific habit names and IDs
- 📈 Completion counts for each habit

**Example output:**
```
🔍 DRY RUN: Analyzing migration impact...

📊 Analyzing habit completion data...
   Found 12 habits with completion history

🔍 Finding archived habits with completion history...
   Found 8 archived habits to restore

📋 MIGRATION IMPACT SUMMARY
═══════════════════════════════════════════════════════════

✅ Habits to be RESTORED: 8
   Habits:
   • Morning Jog (ID: abc123)
   • Read 30 mins (ID: def456)
   ...

🗑️  Habits to REMAIN DELETED: 2
   Habits:
   • Old Habit (ID: xyz789)
   ...

✨ NEXT STEPS

✅ Migration is safe to run!
   Run: pnpm db:migrate:unarchive
```

## Step 2: Run the Actual Migration

Once you've reviewed the dry-run output and confirmed it looks correct:

```bash
pnpm db:migrate:unarchive
```

This will:
1. Un-archive all habits with completion history
2. Verify the update was successful
3. Show a summary of restored habits

**Example output:**
```
🔄 Starting migration: Un-archive habits with completions...

📊 Analyzing habit completion data...
   Found 12 habits with completion history

🔍 Finding archived habits with completion history...
   Found 8 archived habits to restore

📋 Habits to be restored:
   • Morning Jog (ID: abc123)
   • Read 30 mins (ID: def456)
   ...

🔧 Restoring habits...
✅ Successfully restored 8 habits

🔍 Verifying restoration...
✅ Verification passed: All habits successfully restored

🎉 Migration complete!
   • Habits with completion history are now active
   • Truly deleted habits (no completions) remain archived
   • All user data is preserved
```

## Safety Guarantees

✅ **No data deletion** - Only the `isArchived` flag is modified
✅ **Reversible** - You can manually re-archive habits if needed
✅ **User data preserved** - All completions, XP, levels, streaks remain intact
✅ **Dry-run first** - Always preview before running the actual migration

## Troubleshooting

### Migration failed with database error

Check that:
1. Your database connection is working: `pnpm db:check`
2. You have the latest schema: `pnpm db:push`
3. No other processes are accessing the database

### Want to undo the migration?

You can manually re-archive specific habits using the database studio:

```bash
pnpm db:studio
```

Then find habits and set `isArchived` back to `true` if needed.

## When to Run This Migration

- ✅ After deploying the habit lifecycle redesign
- ✅ For existing users who have completed habits
- ✅ Before enabling the new frequency-based activation UI
- ⏸️ Can be run anytime - it's safe and non-destructive

## Related Changes

This migration is part of the habit lifecycle redesign:
- Habits now stay active based on frequency (daily, weekly, custom)
- Completion no longer archives habits
- Only user deletion archives habits
- New visual indicators show when habits are inactive
- Real-time countdown timers show when habits will be available again
- All habit types reset at midnight (not at exact completion time)
- Custom habits show countdown to next active day
- Weekly habits reset at midnight of day 7 (not exact completion time)
- Daily habits show countdown to next midnight
- Restored habits can be completed immediately if active on that day
