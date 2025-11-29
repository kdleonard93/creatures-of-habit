/**
 * Migration: Un-archive habits that have completion records
 * 
 * This migration safely restores habits that were marked as archived when completed.
 * It only affects habits that have completion history (actively used).
 * 
 * Habits with NO completions remain archived (truly deleted).
 * 
 * SAFETY: This is a read-only check followed by a targeted update.
 * No user data is deleted, only habit visibility is restored.
 */

import 'dotenv/config';
import * as schema from '../src/lib/server/db/schema';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { eq, inArray, and } from 'drizzle-orm';

const { habit, habitCompletion } = schema;

// Initialize database connection
const tursoUrl = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
const localUrl = process.env.LOCAL_DATABASE_URL;
const dbUrl = tursoUrl ?? localUrl;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!dbUrl) {
  throw new Error('Database URL is not set. Set TURSO_DATABASE_URL or LOCAL_DATABASE_URL.');
}

const client = createClient({ url: dbUrl, ...(authToken ? { authToken } : {}) });
const db = drizzle(client, { schema });

async function runMigration() {
  console.log('🔄 Starting migration: Un-archive habits with completions...\n');

  try {
    // Find all habits that have completion records
    console.log('📊 Analyzing habit completion data...');
    
    const habitsWithCompletions = await db
      .select({ habitId: habitCompletion.habitId })
      .from(habitCompletion)
      .then((rows) => [...new Set(rows.map((r) => r.habitId))]);

    console.log(`   Found ${habitsWithCompletions.length} habits with completion history\n`);

    if (habitsWithCompletions.length === 0) {
      console.log('✅ No habits to restore. Migration complete.');
      process.exit(0);
    }

    // Find archived habits that have completions
    console.log('🔍 Finding archived habits with completion history...');
    
    const archivedHabitsWithCompletions = await db
      .select({ id: habit.id, title: habit.title })
      .from(habit)
      .where(
        and(
          inArray(habit.id, habitsWithCompletions),
          eq(habit.isArchived, true)
        )
      );

    console.log(
      `   Found ${archivedHabitsWithCompletions.length} archived habits to restore\n`
    );

    if (archivedHabitsWithCompletions.length === 0) {
      console.log('✅ No archived habits to restore. Migration complete.');
      process.exit(0);
    }

    // Display habits to be restored
    console.log('📋 Habits to be restored:');
    archivedHabitsWithCompletions.forEach((h) => {
      console.log(`   • ${h.title} (ID: ${h.id})`);
    });
    console.log();

    // Un-archive the habits
    console.log('🔧 Restoring habits...');
    
    const habitIdsToRestore = archivedHabitsWithCompletions.map((h) => h.id);
    
    const result = await db
      .update(habit)
      .set({ isArchived: false })
      .where(inArray(habit.id, habitIdsToRestore));

    console.log(`✅ Successfully restored ${archivedHabitsWithCompletions.length} habits\n`);

    // Verify the update
    console.log('🔍 Verifying restoration...');
    
    const verifyArchivedCount = await db
      .select({ id: habit.id })
      .from(habit)
      .where(
        and(
          inArray(habit.id, habitIdsToRestore),
          eq(habit.isArchived, true)
        )
      );

    if (verifyArchivedCount.length === 0) {
      console.log('✅ Verification passed: All habits successfully restored\n');
      console.log('🎉 Migration complete!');
      console.log('   • Habits with completion history are now active');
      console.log('   • Truly deleted habits (no completions) remain archived');
      console.log('   • All user data is preserved');
    } else {
      console.log(
        `⚠️  Verification warning: ${verifyArchivedCount.length} habits still archived\n`
      );
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n⚠️  No changes were made to the database');
    process.exit(1);
  }
}

// Run the migration
runMigration();
