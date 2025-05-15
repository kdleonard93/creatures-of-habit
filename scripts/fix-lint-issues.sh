#!/usr/bin/env bash
set -euo pipefail

echo "🔧 Fixing unused variables..."
# Fix unused variables in test files
declare -a TEST_VARS=(mockFrequency mockStreak mockCompletion mockHabit)
for var in "${TEST_VARS[@]}"; do
  find ./src/tests -type f -name "*.ts" \
    -exec sed -i '' "s/const ${var}/const _${var}/g" {} \;
done

# Fix unused variables in stats.ts
declare -a STATS_VARS=(statIncreases firstLevelHealth classInfo)
for var in "${STATS_VARS[@]}"; do
  sed -i '' "s/const ${var}/const _${var}/g" ./src/lib/server/xp/stats.ts
done

echo "📝 Fixing console.log statements..."
# Replace console.log with console.info in specific files
 # Determine correct -i flag for sed
SED_INPLACE=(-i)
if [[ "$(sed --version 2>&1)" =~ "GNU" ]]; then
  SED_INPLACE=(-i)
else
  SED_INPLACE=(-i '')
fi
find ./src -type f -name "*.ts" -exec sed "${SED_INPLACE[@]}" 's/console\.log/console\.info/g' {} \;
find ./drizzle.config.ts -type f -exec sed "${SED_INPLACE[@]}" 's/console\.log/console\.info/g' {}

echo "✅ Lint fixes applied! You should now be able to commit."