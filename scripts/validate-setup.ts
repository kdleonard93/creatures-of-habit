#!/usr/bin/env tsx

import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const PROJECT_ROOT = process.cwd();

interface ValidationCheck {
  name: string;
  check: () => boolean;
  fix?: string;
}

const checks: ValidationCheck[] = [
  {
    name: 'Environment file exists',
    check: () => existsSync(join(PROJECT_ROOT, '.env')),
    fix: 'Run: cp .env.example .env'
  },
  {
    name: 'LOCAL_DATABASE_URL is set',
    check: () => {
      try {
        const env = readFileSync(join(PROJECT_ROOT, '.env'), 'utf8');
        // Needed to allow optional whitespace around key & equals, and require a non-empty value
        const re = /^\s*LOCAL_DATABASE_URL\s*=\s*.+/m;
        return re.test(env);
      } catch {
        return false;
      }
    },
    fix: 'Add LOCAL_DATABASE_URL="file:local.db" to your .env file'
  },
  {
    name: 'Git hooks directory exists',
    check: () => existsSync(join(PROJECT_ROOT, '.git/hooks')),
    fix: 'Ensure you are in a git repository'
  },
  {
    name: 'Post-checkout hook is installed',
    check: () => existsSync(join(PROJECT_ROOT, '.git/hooks/post-checkout')),
    fix: 'Run: pnpm db:setup'
  },
  {
    name: 'Database branch directory exists',
    check: () => existsSync(join(PROJECT_ROOT, '.db-branches')),
    fix: 'Run: pnpm db:branch init'
  },
  {
    name: 'Dependencies are installed',
    check: () => {
      try {
        execSync('which tsx', { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    },
    fix: 'Run: pnpm install'
  }
];

function runValidation() {
  console.info('🔍 Validating database workflow setup...\n');
  
  let allPassed = true;
  
  for (const check of checks) {
    const passed = check.check();
    const status = passed ? '✅' : '❌';
    
    console.info(`${status} ${check.name}`);
    
    if (!passed) {
      allPassed = false;
      if (check.fix) {
        console.info(`   💡 Fix: ${check.fix}`);
      }
    }
  }
  
  console.info('');
  
  if (allPassed) {
    console.info('🎉 All checks passed! Database workflow is ready.');
    console.info('');
    console.info('Next steps:');
    console.info('  1. Create a new branch: git checkout -b feature/test-workflow');
    console.info('  2. Check database: pnpm db:branch list');
    console.info('  3. Make schema changes and test');
  } else {
    console.info('⚠️  Some checks failed. Please fix the issues above and run again.');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runValidation();
}
