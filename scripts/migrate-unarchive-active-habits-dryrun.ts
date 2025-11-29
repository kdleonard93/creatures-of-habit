/**
 * Migration DRY RUN: Un-archive habits that have completion records
 * 
 * This is a safe preview of what the migration would do.
 * NO CHANGES are made to the database.
 * 
 * This script shows:
 * - How many habits would be restored
 * - Which specific habits would be affected
 * - How many habits would remain archived (truly deleted)
 * 
 * Run this first to verify the migration is safe, then run the actual migration.
 */

import 'dotenv/config';
import * as schema from '../src/lib/server/db/schema';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { eq, inArray, and, not } from 'drizzle-orm';

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

async function runDryRun() {
  console.log('🔍 DRY RUN: Analyzing migration impact...\n');

  try {
    // Find all habits that have completion records
    console.log('📊 Analyzing habit completion data...');
    
    const habitsWithCompletions = await db
      .select({ habitId: habitCompletion.habitId })
      .from(habitCompletion)
      .then((rows) => [...new Set(rows.map((r) => r.habitId))]);

    console.log(`   Found ${habitsWithCompletions.length} habits with completion history\n`);

    // Find archived habits that have completions
    console.log('🔍 Finding archived habits with completion history...');
    
    let archivedHabitsWithCompletions: Array<{ id: string; title: string; userId: string }> = [];
    if (habitsWithCompletions.length > 0) {
      archivedHabitsWithCompletions = await db
        .select({ id: habit.id, title: habit.title, userId: habit.userId })
        .from(habit)
        .where(
          and(
            inArray(habit.id, habitsWithCompletions),
            eq(habit.isArchived, true)
          )
        );
    }

    console.log(
      `   Found ${archivedHabitsWithCompletions.length} archived habits to restore\n`
    );

    // Find truly deleted habits (archived with NO completions)
    let trulyDeletedHabits: Array<{ id: string; title: string }> = [];
    if (habitsWithCompletions.length > 0) {
      trulyDeletedHabits = await db
        .select({ id: habit.id, title: habit.title })
        .from(habit)
        .where(
          and(
            eq(habit.isArchived, true),
            not(inArray(habit.id, habitsWithCompletions))
          )
        );
    } else {
      // If no habits have completions, all archived habits are truly deleted
      trulyDeletedHabits = await db
        .select({ id: habit.id, title: habit.title })
        .from(habit)
        .where(eq(habit.isArchived, true));
    }

    console.log(
      `   Found ${trulyDeletedHabits.length} truly deleted habits (will remain archived)\n`
    );

    // Display summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 MIGRATION IMPACT SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`✅ Habits to be RESTORED: ${archivedHabitsWithCompletions.length}`);
    if (archivedHabitsWithCompletions.length > 0) {
      console.log('   Habits:');
      archivedHabitsWithCompletions.forEach((h) => {
        console.log(`   • ${h.title} (ID: ${h.id})`);
      });
    }
    console.log();

    console.log(`🗑️  Habits to REMAIN DELETED: ${trulyDeletedHabits.length}`);
    if (trulyDeletedHabits.length > 0) {
      console.log('   Habits:');
      trulyDeletedHabits.forEach((h) => {
        console.log(`   • ${h.title} (ID: ${h.id})`);
      });
    }
    console.log();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('💾 DATA SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    const totalArchivedHabits = archivedHabitsWithCompletions.length + trulyDeletedHabits.length;
    console.log(`Total archived habits: ${totalArchivedHabits}`);
    console.log(`  → Will be restored: ${archivedHabitsWithCompletions.length}`);
    console.log(`  → Will remain deleted: ${trulyDeletedHabits.length}`);
    console.log();

    // Get completion counts for habits to be restored
    let completionStats = new Map<string, number>();
    if (archivedHabitsWithCompletions.length > 0) {
      const stats = await db
        .select({
          habitId: habitCompletion.habitId
        })
        .from(habitCompletion)
        .where(inArray(habitCompletion.habitId, archivedHabitsWithCompletions.map(h => h.id)))
        .then((rows) => {
          const counts = new Map<string, number>();
          rows.forEach((r) => {
            counts.set(r.habitId, (counts.get(r.habitId) ?? 0) + 1);
          });
          return counts;
        });
      completionStats = stats;
    }

    console.log('📈 Completion counts for habits to be restored:');
    let totalCompletions = 0;
    archivedHabitsWithCompletions.forEach((h) => {
      const count = completionStats.get(h.id) ?? 0;
      totalCompletions += count;
      console.log(`   • ${h.title}: ${count} completions`);
    });
    console.log(`   Total completions: ${totalCompletions}\n`);

    if (archivedHabitsWithCompletions.length > 0) {
      console.log('✅ Migration is safe to run!');
      console.log('   Run: pnpm db:migrate:unarchive');
    } else {
      console.log('ℹ️  No habits need to be restored.');
      console.log('   All archived habits are truly deleted (no completions).');
    }
    console.log();

    process.exit(0);
  } catch (error) {
    console.error('❌ Dry run failed:', error);
    console.error('\n⚠️  No changes were made to the database');
    process.exit(1);
  }
}

// Run the dry run
runDryRun();
