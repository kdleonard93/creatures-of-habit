#!/usr/bin/env tsx

import 'dotenv/config';
import { execSync } from 'node:child_process';
import { existsSync, copyFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const DB_DIR = join(PROJECT_ROOT, '.db-branches');
const MAIN_DB = join(PROJECT_ROOT, 'local.db');
const useLocal = process.env.LOCAL_DATABASE_URL?.startsWith('file:') ?? false;

// Ensure db-branches directory exists
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true });
}

// Get current git branch
function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { 
      cwd: PROJECT_ROOT,
      encoding: 'utf8' 
    }).trim();
  } catch (error) {
    console.error('Failed to get current branch:', error);
    return 'main';
  }
}

// Get safe filename for branch (replace special characters)
function getSafeBranchName(branch: string): string {
  return branch.replace(/[^a-zA-Z0-9-_]/g, '-');
}

// Get database file path for a branch
function getBranchDbPath(branch: string): string {
  const safeBranch = getSafeBranchName(branch);
  return join(DB_DIR, `${safeBranch}.db`);
}

// Check if database migrations are up to date
async function checkMigrations(): Promise<boolean> {
  try {
    execSync('pnpm db:check', { 
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    });
    return true;
  } catch {
    return false;
  }
}

// Apply migrations to current database
async function applyMigrations(): Promise<void> {
  try {
    console.info('🔄 Applying database migrations...');
    execSync('pnpm db:push', { 
      cwd: PROJECT_ROOT,
      stdio: 'inherit'
    });
    console.info('✅ Migrations applied successfully');
  } catch (error) {
    console.error('❌ Failed to apply migrations:', error);
    throw error;
  }
}

// Switch to a branch database
async function switchToBranch(targetBranch: string): Promise<void> {
  const currentBranch = getCurrentBranch();
  const currentDbPath = getBranchDbPath(currentBranch);
  const targetDbPath = getBranchDbPath(targetBranch);
  
  console.info(`🔄 Switching database from '${currentBranch}' to '${targetBranch}'`);

  // Save current database state
  if (existsSync(MAIN_DB)) {
    console.info(`💾 Saving current database state for branch '${currentBranch}'`);
    copyFileSync(MAIN_DB, currentDbPath);
  }

  // Load target branch database or create new one
  if (existsSync(targetDbPath)) {
    console.info(`📂 Loading existing database for branch '${targetBranch}'`);
    copyFileSync(targetDbPath, MAIN_DB);
  } else {
    console.info(`🆕 Creating new database for branch '${targetBranch}'`);
    if (existsSync(currentDbPath)) {
      // Copy from current branch as starting point
      copyFileSync(currentDbPath, targetDbPath);
      copyFileSync(targetDbPath, MAIN_DB);
    } else if (existsSync(MAIN_DB)) {
      // Use existing main db
      copyFileSync(MAIN_DB, targetDbPath);
    }
  }

  // Apply migrations
  if (useLocal) {
    // In local dev, always push migrations to ensure tables exist
    await applyMigrations();
    // Save the migrated state for this branch DB
    if (existsSync(MAIN_DB)) {
      copyFileSync(MAIN_DB, targetDbPath);
    }
  } else {
    // For non-local (e.g., Turso) just run if check indicates drift
    const migrationsUpToDate = await checkMigrations();
    if (!migrationsUpToDate) {
      await applyMigrations();
    }
  }

  console.info(`✅ Successfully switched to database for branch '${targetBranch}'`);
}

// List all branch databases
function listBranchDatabases(): void {
  console.info('\n📊 Branch Databases:');
  console.info('==================');
  
  if (!existsSync(DB_DIR)) {
    console.info('No branch databases found.');
    return;
  }

  const currentBranch = getCurrentBranch();
  const files = readdirSync(DB_DIR);
  const dbFiles = files.filter(f => f.endsWith('.db'));

  if (dbFiles.length === 0) {
    console.info('No branch databases found.');
    return;
  }

  for (const file of dbFiles) {
    const branchName = file.replace('.db', '').replace(/-/g, '/');
    const filePath = join(DB_DIR, file);
    const stats = statSync(filePath);
    const size = (stats.size / 1024).toFixed(2);
    const current = branchName === getSafeBranchName(currentBranch) ? ' (current)' : '';
    
    console.info(`  ${branchName}${current} - ${size}KB - ${stats.mtime.toLocaleDateString()}`);
  }
  
  console.info('');
}

// Clean up old branch databases
function cleanupOldBranches(): void {
  console.info('🧹 Cleaning up databases for deleted branches...');
  
  try {
    const remoteBranches = execSync('git branch -r --format="%(refname:short)"', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    }).trim().split('\n').map(b => b.replace('origin/', ''));

    const localBranches = execSync('git branch --format="%(refname:short)"', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    }).trim().split('\n');

    const allBranches = [...new Set([...remoteBranches, ...localBranches])];
    
    if (!existsSync(DB_DIR)) return;

    const dbFiles = readdirSync(DB_DIR).filter(f => f.endsWith('.db'));
    let cleanedCount = 0;

    for (const file of dbFiles) {
      const branchName = file.replace('.db', '').replace(/-/g, '/');
      if (!allBranches.includes(branchName)) {
        const filePath = join(DB_DIR, file);
        try {
          unlinkSync(filePath);
          console.info(`🗑️  Removed database for deleted branch: ${branchName}`);
          cleanedCount++;
        } catch (error) {
          console.error(`Failed to remove ${filePath}:`, error);
        }
      }
    }

    console.info(`✅ Cleanup complete. Removed ${cleanedCount} database(s).`);
  } catch (error) {
    console.error('Failed to cleanup old branches:', error);
  }
}

// Initialize database for current branch
async function initializeBranch(): Promise<void> {
  const currentBranch = getCurrentBranch();
  console.info(`🚀 Initializing database for branch '${currentBranch}'`);
  
  await switchToBranch(currentBranch);
}

// Main CLI interface
async function main() {
  const command = process.argv[2];
  const targetBranch = process.argv[3];

  try {
    switch (command) {
      case 'switch': {
        if (!targetBranch) {
          console.error('❌ Please provide a target branch name');
          process.exit(1);
        }
        await switchToBranch(targetBranch);
        break;
      }
        
      case 'list': {
        listBranchDatabases();
        break;
      }
        
      case 'cleanup': {
        cleanupOldBranches();
        break;
      }
        
      case 'init': {
        await initializeBranch();
        break;
      }
        
      case 'current': {
        const currentBranch = getCurrentBranch();
        await switchToBranch(currentBranch);
        break;
      }
        
      default: {
        console.info(`
🗄️  Database Branch Manager

Usage:
  pnpm db:branch init          - Initialize database for current branch
  pnpm db:branch current       - Ensure database matches current branch
  pnpm db:branch switch <name> - Switch to database for specific branch
  pnpm db:branch list          - List all branch databases
  pnpm db:branch cleanup       - Remove databases for deleted branches

Examples:
  pnpm db:branch switch feature/new-feature
  pnpm db:branch switch main
  pnpm db:branch list
`);
        break;
      }
    }
  } catch (error) {
    console.error('❌ Operation failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { switchToBranch, initializeBranch, listBranchDatabases, cleanupOldBranches };
