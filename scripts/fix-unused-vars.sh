#!/bin/bash

echo "🔧 Fixing unused variables..."
# Fix unused variables in stats.ts
find ./src/lib/server/xp/stats.ts -type f -exec sed -i '' 's/const statIncreases/const _statIncreases/g' {} \;
find ./src/lib/server/xp/stats.ts -type f -exec sed -i '' 's/const firstLevelHealth/const _firstLevelHealth/g' {} \;
find ./src/lib/server/xp/stats.ts -type f -exec sed -i '' 's/const classInfo/const _classInfo/g' {} \;

echo "✅ Unused variables fixed!"
