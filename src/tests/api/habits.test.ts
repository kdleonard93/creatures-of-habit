import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../lib/server/db';
import * as table from '../../lib/server/db/schema';
import { eq } from 'drizzle-orm';

describe('Habit CRUD Operations', () => {
    let testUserId: string;

    beforeAll(async () => {
        // Clean up existing data
        await db.delete(table.habitCompletion).execute();
        await db.delete(table.habitStreak).execute();
        await db.delete(table.habit).execute();
        
        // Create test user
        const [user] = await db.insert(table.user).values({
            username: `testuser_${Date.now()}`,
            email: `testuser_${Date.now()}@example.com`,
            passwordHash: 'testpass',
            age: 25
        }).returning();
        
        testUserId = user.id;
    });

    it('creates a new habit', async () => {
        const habit = {
            userId: testUserId,
            title: 'Test Habit',
            description: 'Test Description',
            difficulty: 'medium' as const,
            startDate: new Date().toISOString()
        };

        const [created] = await db
            .insert(table.habit)
            .values(habit)
            .returning();

        expect(created).toBeDefined();
        expect(created.title).toBe(habit.title);
    });

    it('reads a habit', async () => {
        // Create a habit first
        const [habit] = await db
            .insert(table.habit)
            .values({
                userId: testUserId,
                title: 'Read Habit',
                difficulty: 'medium' as const,
                startDate: new Date().toISOString()
            })
            .returning();

        // Read the habit
        const retrieved = await db
            .select()
            .from(table.habit)
            .where(eq(table.habit.id, habit.id))
            .then(rows => rows[0]);

        expect(retrieved).toBeDefined();
        expect(retrieved.title).toBe('Read Habit');
    });

    it('updates a habit', async () => {
        // Create a habit
        const [habit] = await db
            .insert(table.habit)
            .values({
                userId: testUserId,
                title: 'Update Test',
                difficulty: 'medium' as const,
                startDate: new Date().toISOString()
            })
            .returning();

        // Update the habit
        const [updated] = await db
            .update(table.habit)
            .set({ title: 'Updated Title' })
            .where(eq(table.habit.id, habit.id))
            .returning();

        expect(updated.title).toBe('Updated Title');
    });

    it('soft deletes a habit', async () => {
        // Create a habit
        const [habit] = await db
            .insert(table.habit)
            .values({
                userId: testUserId,
                title: 'Delete Test',
                difficulty: 'medium' as const,
                startDate: new Date().toISOString()
            })
            .returning();

        // Soft delete the habit
        await db
            .update(table.habit)
            .set({ isArchived: true })
            .where(eq(table.habit.id, habit.id));

        // Try to retrieve the habit
        const archived = await db
            .select()
            .from(table.habit)
            .where(eq(table.habit.id, habit.id))
            .then(rows => rows[0]);

        expect(archived.isArchived).toBe(true);
    });
});