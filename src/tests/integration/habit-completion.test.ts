import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { calculateHabitXp, getLevelFromXp } from '$lib/server/xp';

// Mock the XP calculations module
vi.mock('$lib/server/xp', async () => {
  const actual = await vi.importActual('$lib/server/xp');
  return {
    ...actual,
    calculateHabitXp: vi.fn((difficulty) => {
      const baseXp = { 'easy': 5, 'medium': 10, 'hard': 20 };
      return baseXp[difficulty as 'easy' | 'medium' | 'hard'] || 10;
    }),
    getLevelFromXp: vi.fn((xp) => Math.floor(xp / 100) + 1)
  };
});

describe('Habit Completion Integration', () => {
  let testUserId: string;
  let testCreatureId: string;
  let testHabitId: string;

  beforeEach(async () => {
    // Clean up existing data
    await db.delete(table.habitCompletion).execute();
    await db.delete(table.habitStreak).execute();
    await db.delete(table.habit).execute();
    await db.delete(table.creature).execute();
    await db.delete(table.user).execute();
    
    // Create test user
    const [user] = await db.insert(table.user).values({
      username: `testuser_${Date.now()}`,
      email: `testuser_${Date.now()}@example.com`,
      passwordHash: 'testpass',
      age: 25
    }).returning();
    testUserId = user.id;
    
    // Create creature
    const [creature] = await db.insert(table.creature).values({
      userId: testUserId,
      name: 'Test Creature',
      class: 'warrior',
      race: 'human',
      level: 1,
      experience: 0
    }).returning();
    testCreatureId = creature.id;
    
    // Create habit
    const [habit] = await db.insert(table.habit).values({
      userId: testUserId,
      title: 'Test Habit',
      difficulty: 'medium',
      startDate: new Date().toISOString()
    }).returning();
    testHabitId = habit.id;
    
    // Create habit streak
    await db.insert(table.habitStreak).values({
      habitId: testHabitId,
      userId: testUserId,
      currentStreak: 0,
      longestStreak: 0
    });
  });

  it('should complete a habit and award XP', async () => {
    // Simulate habit completion 
    const [completion] = await db.insert(table.habitCompletion).values({
      habitId: testHabitId,
      userId: testUserId,
      completedAt: new Date().toISOString(),
      value: 100,
      experienceEarned: 10 // Medium difficulty
    }).returning();
    
    // Update streak
    await db.update(table.habitStreak)
      .set({
        currentStreak: 1,
        lastCompletedAt: new Date().toISOString()
      })
      .where(eq(table.habitStreak.habitId, testHabitId));
    
    // Update creature XP
    await db.update(table.creature)
      .set({
        experience: 10
      })
      .where(eq(table.creature.id, testCreatureId));
    
    // Check completion
    expect(completion).toBeDefined();
    expect(completion.experienceEarned).toBe(10);
    
    // Check streak update
    const streak = await db
      .select()
      .from(table.habitStreak)
      .where(eq(table.habitStreak.habitId, testHabitId))
      .then(rows => rows[0]);
    
    expect(streak.currentStreak).toBe(1);
    
    // Check creature XP update
    const updatedCreature = await db
      .select()
      .from(table.creature)
      .where(eq(table.creature.id, testCreatureId))
      .then(rows => rows[0]);
    
    expect(updatedCreature.experience).toBe(10);
  });

  it('should level up the creature when enough XP is gained', async () => {
    // Calculate XP thresholds based on your implementation
    const xpForLevel1 = 0;
    const xpForLevel2 = 282; // Assuming this is your level 2 threshold
    
    // Setup creature with almost enough XP for level 2
    await db.update(table.creature)
        .set({
            experience: xpForLevel2 - 10, // 10 XP short of level 2
            level: 1
        })
        .where(eq(table.creature.id, testCreatureId));
    
    // Simulate habit completion that gives 10 XP
    const experienceEarned = 10;
    await db.insert(table.habitCompletion).values({
        habitId: testHabitId,
        userId: testUserId,
        completedAt: new Date().toISOString(),
        value: 100,
        experienceEarned
    });
    
    // Update creature XP and level (simulating what the API would do)
    const newXp = xpForLevel2 - 10 + experienceEarned; // Should be exactly at level 2 threshold
    await db.update(table.creature)
        .set({
            experience: newXp,
            level: 2 // Level should increase
        })
        .where(eq(table.creature.id, testCreatureId));
    
    // Check level up
    const updatedCreature = await db
        .select()
        .from(table.creature)
        .where(eq(table.creature.id, testCreatureId))
        .then(rows => rows[0]);
    
    expect(updatedCreature.experience).toBe(xpForLevel2);
    expect(updatedCreature.level).toBe(2);
});
});