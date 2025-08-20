#!/usr/bin/env bash

# Setup script to install git hooks for automatic database branch switching

set -e

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"
SCRIPTS_HOOKS_DIR="$PROJECT_ROOT/scripts/git-hooks"

echo "🔧 Setting up git hooks for database branch management..."

# Create hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# Copy and make executable the post-checkout hook
if [ -f "$SCRIPTS_HOOKS_DIR/post-checkout" ]; then
    cp "$SCRIPTS_HOOKS_DIR/post-checkout" "$HOOKS_DIR/post-checkout"
    chmod +x "$HOOKS_DIR/post-checkout"
    echo "✅ Installed post-checkout hook"
else
    echo "❌ post-checkout hook file not found"
    exit 1
fi

echo "🎉 Git hooks setup complete!"
echo ""
echo "The following hooks are now active:"
echo "  - post-checkout: Automatically switches database when changing branches"
echo ""
echo "To test: git checkout -b test-branch"
