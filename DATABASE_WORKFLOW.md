# Database Workflow Guide

This document explains the simplified database workflow for solo development with Drizzle ORM + SQLite (local) / Turso (production).

## 🎯 Overview

This project uses a streamlined database workflow:
- **Development**: Local SQLite database (`local.db`)
- **Testing**: In-memory SQLite database (automatic in test environment)
- **Production**: Turso database (cloud-based SQLite)

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Production    │    │  Local Dev/Test │
│   (Turso)       │    │    (SQLite)     │
└─────────────────┘    └─────────────────┘
           │                    │
           └────────────────────┘
                    │
            ┌───────┴───────┐
            │  Drizzle ORM  │
            └───────┬───────┘
                    │
           ┌────────┴────────┐
    ┌──────▼──────┐  ┌───────▼───────┐
    │  local.db   │  │  :memory:     │
    │ (SQLite)    │  │ (Test Env)    │
    └─────────────┘  └───────────────┘
```

## 🚀 Getting Started

### 1. Local Development Setup

```bash
# Copy the example environment file
cp .env.example .env

# Start the development server
pnpm dev
```

This will automatically create a `local.db` file in your project root.

### 2. Database Migrations

When you make changes to your database schema:

```bash
# Generate a new migration
pnpm db:generate

# Apply migrations to your local database
pnpm db:push
```

## 🧪 Testing

Tests automatically use an in-memory SQLite database. No setup is required.

```bash
# Run tests
pnpm test
```

## 🚀 Production Deployment

For production, set these environment variables:

```bash
TURSO_DATABASE_URL="libsql://your-db.turso.io"
TURSO_AUTH_TOKEN="your-token"
```

## 🔄 Workflow

### Development Workflow

1. Make changes to `schema.ts`
2. Generate and apply migrations
3. Test your changes locally
4. Commit your changes and push to your repository
5. Deploy to production

### Schema Changes

1. Edit `src/lib/server/db/schema.ts`
2. Generate a migration: `pnpm db:generate`
3. Test the migration locally: `pnpm db:push`
4. Commit both the schema changes and migration files
5. Deploy to production

## 🔧 Troubleshooting

### Reset Local Database

If you need to start fresh:

```bash
rm local.db
pnpm db:push
```

### View Database

Use a SQLite browser or the command line:

```bash
sqlite3 local.db
```

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
