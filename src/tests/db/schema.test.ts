// src/tests/db/schema.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../lib/server/db';
import * as table from '../../lib/server/db/schema';
import { eq } from 'drizzle-orm';

describe('Database Schema', () => {
    beforeAll(async () => {
        await db.delete(table.session).execute();
        await db.delete(table.user).execute();
        await db.delete(table.habitCompletion).execute();
        await db.delete(table.habitStreak).execute();
        await db.delete(table.habit).execute();
        await db.delete(table.habitCategory).execute();
        await db.delete(table.habitFrequency).execute();
    });

    // Keep your existing user tests

    it('can create and retrieve a habit', async () => {
        const uniqueUsername = `habituser_${Date.now()}`;
        const [testUser] = await db.insert(table.user).values({
            username: uniqueUsername,
            email: `${uniqueUsername}@example.com`,
            passwordHash: 'testpass',
            age: 25,
        }).returning();
    
        console.log('Created user:', testUser);
    
        const testHabit = {
            userId: testUser.id,
            title: 'Test Habit',
            description: 'Test Description',
            difficulty: 'medium' as const,
            startDate: new Date().toISOString(),
            isActive: true,
            isArchived: false,
        };
    
        const [insertedHabit] = await db.insert(table.habit).values(testHabit).returning();
        console.log('Inserted habit:', insertedHabit);
    
        const retrievedHabit = await db
            .select()
            .from(table.habit)
            .where(eq(table.habit.id, insertedHabit.id))
            .then(rows => rows[0]);
    
        console.log('Retrieved habit:', retrievedHabit);
    
        expect(retrievedHabit).toBeDefined();
        expect(retrievedHabit?.title).toBe(testHabit.title);
    });
    

    it('can create and update habit streaks', async () => {
        // Create test user and habit
        const [testUser] = await db.insert(table.user).values({
            username: `streakuser_${Date.now()}`,
            email: `streak_${Date.now()}@example.com`,
            passwordHash: 'testpass',
            age: 25
        }).returning();

        const [testHabit] = await db.insert(table.habit).values({
            userId: testUser.id,
            title: 'Streak Test Habit',
            difficulty: 'medium',
            startDate: new Date().toISOString()
        }).returning();

        // Create streak
        const [streak] = await db.insert(table.habitStreak).values({
            habitId: testHabit.id,
            userId: testUser.id,
            currentStreak: 1,
            longestStreak: 1
        }).returning();

        // Update streak
        await db.update(table.habitStreak)
            .set({ currentStreak: 2, longestStreak: 2 })
            .where(eq(table.habitStreak.id, streak.id));

        // Verify streak
        const updatedStreak = await db
            .select()
            .from(table.habitStreak)
            .where(eq(table.habitStreak.id, streak.id))
            .then(rows => rows[0]);

        expect(updatedStreak?.currentStreak).toBe(2);
        expect(updatedStreak?.longestStreak).toBe(2);
    });

    it('can record habit completion', async () => {
        // Create test user and habit
        const [testUser] = await db.insert(table.user).values({
            username: `completionuser_${Date.now()}`,
            email: `completion_${Date.now()}@example.com`,
            passwordHash: 'testpass',
            age: 25
        }).returning();

        const [testHabit] = await db.insert(table.habit).values({
            userId: testUser.id,
            title: 'Completion Test Habit',
            difficulty: 'medium',
            startDate: new Date().toISOString()
        }).returning();

        // Record completion
        const [completion] = await db.insert(table.habitCompletion).values({
            habitId: testHabit.id,
            userId: testUser.id,
            completedAt: new Date().toISOString(),
            value: 100,
            experienceEarned: 10
        }).returning();

        expect(completion).toBeDefined();
        expect(completion.value).toBe(100);
    });

    it('enforces habit category relationships', async () => {
        const [testUser] = await db.insert(table.user).values({
            username: `categoryuser_${Date.now()}`,
            email: `category_${Date.now()}@example.com`,
            passwordHash: 'testpass',
            age: 25
        }).returning();

        // Create category
        const [category] = await db.insert(table.habitCategory).values({
            userId: testUser.id,
            name: 'Test Category',
            isDefault: false
        }).returning();

        // Create habit with category
        const [habit] = await db.insert(table.habit).values({
            userId: testUser.id,
            categoryId: category.id,
            title: 'Categorized Habit',
            difficulty: 'medium',
            startDate: new Date().toISOString()
        }).returning();

        expect(habit.categoryId).toBe(category.id);

        // Test foreign key constraint
        await expect(() =>
            db.insert(table.habit).values({
                userId: testUser.id,
                categoryId: 'non-existent-category',
                title: 'Invalid Category Habit',
                difficulty: 'medium',
                startDate: new Date().toISOString()
            })
        ).rejects.toThrow(/FOREIGN KEY constraint failed/);
    });
});