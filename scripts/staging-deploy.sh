#!/usr/bin/env bash

# Staging deployment script for database workflow testing
# This creates a separate Turso database for staging environment

set -e

echo "🚀 Setting up staging environment..."

# Check if Turso CLI is installed
if ! command -v turso >/dev/null 2>&1; then
    echo "❌ Turso CLI not found. Install with: curl -sSfL https://get.tur.so/install.sh | bash"
    exit 1
fi

# Set staging database name
STAGING_DB_NAME="creatures-of-habit-staging"
PROJECT_ROOT="$(git rev-parse --show-toplevel)"

# Create staging database if it doesn't exist
echo "📊 Creating staging database..."
if ! turso db list | grep -q "$STAGING_DB_NAME"; then
    turso db create "$STAGING_DB_NAME"
    echo "✅ Created staging database: $STAGING_DB_NAME"
else
    echo "ℹ️  Staging database already exists: $STAGING_DB_NAME"
fi

# Get database URL and create token
STAGING_URL=$(turso db show "$STAGING_DB_NAME" --url)
STAGING_TOKEN=$(turso db tokens create "$STAGING_DB_NAME")

# Create staging environment file
cat > "$PROJECT_ROOT/.env.staging" << EOF
# Staging Environment Configuration
TURSO_DATABASE_URL="$STAGING_URL"
TURSO_AUTH_TOKEN="$STAGING_TOKEN"
RESEND_API_KEY=""
PUBLIC_POSTHOG_KEY=""
EOF
chmod 600 "$PROJECT_ROOT/.env.staging"

echo "✅ Staging environment configuration created: .env.staging"
echo ""
echo "To use staging environment:"
echo "  cp .env.staging .env"
echo "  pnpm db:push"
echo "  pnpm dev"
echo ""
echo "To deploy to staging:"
echo "  # Set up your deployment provider with staging credentials"
echo "  # Deploy using the .env.staging configuration"
