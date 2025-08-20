# Database Branch Workflow Guide

This document explains the automated database workflow for branch-specific development with Drizzle ORM + Turso + SQLite.

## 🎯 Overview

Each git branch automatically gets its own isolated SQLite database, allowing developers to:
- Test schema changes without affecting other branches
- Work with branch-specific data sets
- Seamlessly switch between branches with proper database state
- Run CI/CD tests with isolated databases

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Production    │    │     Staging     │    │ Local Development│
│   (Turso)       │    │    (Turso)      │    │    (SQLite)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                               ┌─────────────────┐
                                               │ Branch Databases │
                                               │ .db-branches/    │
                                               │ ├── main.db      │
                                               │ ├── feature-*.db │
                                               │ └── bugfix-*.db  │
                                               └─────────────────┘
```

## 🚀 Quick Start

### Initial Setup

```bash
# 1. Set up the workflow (one-time setup)
pnpm db:setup

# 2. Configure your local environment
cp .env.example .env
# Edit .env to add LOCAL_DATABASE_URL="file:local.db"
```

### Daily Usage

The workflow is **automatic** - just use git normally:

```bash
# Create a new feature branch
git checkout -b feature/user-profiles
# → Database automatically switches/creates for this branch

# Switch back to main
git checkout main  
# → Database automatically switches back to main state

# Work on a bugfix
git checkout -b bugfix/login-issue
# → New isolated database created
```

## 🛠️ Manual Commands

| Command | Description |
|---------|-------------|
| `pnpm db:branch current` | Ensure database matches current branch |
| `pnpm db:branch switch <branch>` | Switch to specific branch database |
| `pnpm db:branch list` | Show all branch databases |
| `pnpm db:branch cleanup` | Remove databases for deleted branches |
| `pnpm db:branch init` | Initialize database for current branch |

## 📝 Practical Examples

### Example 1: Creating a New Feature

```bash
# Start new feature
git checkout -b feature/habit-streaks

# The post-checkout hook automatically:
# 1. Saves current database state
# 2. Creates/loads database for feature/habit-streaks
# 3. Applies any pending migrations

# Add new database columns
# Edit src/lib/server/db/schema.ts
export const habitStreaks = sqliteTable('habit_streaks', {
  id: integer('id').primaryKey(),
  habitId: integer('habit_id').references(() => habits.id),
  currentStreak: integer('current_streak').default(0),
  longestStreak: integer('longest_streak').default(0),
});

# Generate and apply migration
pnpm db:generate
pnpm db:push

# Your changes are isolated to this branch!
# Other developers' branches are unaffected
```

### Example 2: Testing Database Schema Changes

```bash
# Create experimental branch
git checkout -b experiment/new-schema

# Make breaking changes to schema
# Test thoroughly with isolated data

# If experiment fails:
git checkout main
# → Automatically switches back to stable database

# If experiment succeeds:
git checkout main
git merge experiment/new-schema
# → Bring changes to main with proper migration
```

### Example 3: Code Review Database State

```bash
# Reviewer wants to test a PR
git fetch origin
git checkout feature/user-analytics

# Database automatically switches to match the branch
# Reviewer can test with branch-specific data/schema
# No need to manually manage database state
```

## 🔄 Migration Workflow

### When Schema Changes

1. **Make schema changes** in `src/lib/server/db/schema.ts`
2. **Generate migration**: `pnpm db:generate`
3. **Apply locally**: `pnpm db:push`
4. **Test thoroughly** in your branch
5. **Commit and push** both schema and migration files
6. **Switch branches** - migrations auto-apply when needed

### When Switching to Updated Branch

```bash
git checkout main
git pull origin main
# → Automatic migration check and application
# → Your database is now up-to-date with main
```

## 🧪 Testing & CI/CD

### Local Testing

```bash
# Tests automatically use isolated test database
pnpm test

# Each test run gets a fresh database state
# No interference between test runs
```

### CI/CD Pipeline

The CI pipeline automatically:
1. Creates isolated test databases per job
2. Applies migrations to test databases
3. Runs tests against fresh database state
4. Cleans up after completion

No production database access required for testing!

## 🔧 Configuration

### Environment Variables

```bash
# Local development (preferred)
LOCAL_DATABASE_URL="file:local.db"

# Production (required for production)
TURSO_DATABASE_URL="libsql://your-db.turso.io"
TURSO_AUTH_TOKEN="your-token"
```

### Database Selection Logic

```
if (development mode && LOCAL_DATABASE_URL exists):
    use SQLite file
else:
    use Turso (production/staging)
```

## 📊 Branch Database Management

### Database Storage

```
.db-branches/
├── main.db                    # Main branch database
├── feature-user-profiles.db   # Feature branch
├── bugfix-login-issue.db      # Bugfix branch
└── experiment-new-ui.db       # Experimental branch
```

### Automatic Cleanup

```bash
# Remove databases for deleted branches
pnpm db:branch cleanup

# List all databases with sizes and dates
pnpm db:branch list
```

## 🚨 Troubleshooting

### Database Not Switching

```bash
# Manually sync database to current branch
pnpm db:branch current

# Check git hooks are installed
ls -la .git/hooks/post-checkout
```

### Migration Issues

```bash
# Check migration status
pnpm db:check

# Force apply migrations
pnpm db:push

# Regenerate migrations if needed
pnpm db:generate
```

### Performance Considerations

- **Database files**: Each branch database is ~50KB-5MB typically
- **Git hooks**: Add ~100-500ms to branch switching
- **CI/CD**: Reduces runtime by using local SQLite vs remote Turso

## 🔒 Security Notes

- Local databases contain development data only
- Production credentials never used in development
- Branch databases are gitignored
- CI uses isolated test databases

## 🆚 Alternative Approaches Comparison

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **SQLite Files** ✅ | Simple, Fast, No deps | File management | **Recommended** |
| Docker | Standardized | Complex, Slow, Resource heavy | Overkill for SQLite |
| Shared DB + Prefixes | Simple setup | Data conflicts, No isolation | Poor developer experience |
| Multiple Turso DBs | Cloud native | Cost, Complexity, API limits | Good for staging only |

## 🎉 Benefits Summary

- ✅ **Zero context switching** - automatic database management
- ✅ **True isolation** - no data conflicts between branches  
- ✅ **Fast development** - local SQLite performance
- ✅ **Safe experimentation** - branch databases are disposable
- ✅ **Simplified CI/CD** - no production database dependencies
- ✅ **Team collaboration** - consistent workflow for all developers
