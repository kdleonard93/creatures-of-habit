#!/bin/bash

echo "📝 Fixing console.log statements..."
# Replace console.log with console.info in specific files
find ./src -type f -name "*.ts" -exec sed -i '' 's/console\.log/console\.info/g' {} \;
find ./drizzle.config.ts -type f -exec sed -i '' 's/console\.log/console\.info/g' {} \;

echo "✅ Console.log fixes applied!"
