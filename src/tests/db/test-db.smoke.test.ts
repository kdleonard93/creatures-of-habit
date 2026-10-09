import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDb } from './test-db';
import { user, habit, habitCompletion } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

describe('createTestDb', () => {
	let testDb: TestDb | null = null;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
	});

	afterEach(() => {
		testDb?.close();
		testDb = null;
	});

	it('applies the current application schema', async () => {
		if (!testDb) throw new Error('test db not initialised');

		const tables = await testDb.client.execute(
			"SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
		);
		const names = tables.rows.map((row) => String(row.name));

		for (const expected of [
			'user',
			'creature',
			'creature_stats',
			'habit',
			'habit_completion',
			'habit_streak',
			'quest_instances',
			'quest_questions',
			'quest_answers',
			'daily_habit_tracker',
			'user_waitlist',
			'contacts',
			'user_preferences',
			'session'
		]) {
			expect(names).toContain(expected);
		}
	});

	it('enforces the real unique and cascade behavior', async () => {
		if (!testDb) throw new Error('test db not initialised');

		const [created] = await testDb.db
			.insert(user)
			.values({ email: 'a@example.com', username: 'a', passwordHash: 'x' })
			.returning();
		expect(created.id).toBeTruthy();

		// Unique email is enforced by the database, not application code.
		await expect(
			testDb.db.insert(user).values({ email: 'a@example.com', username: 'b', passwordHash: 'x' })
		).rejects.toThrow();

		const [createdHabit] = await testDb.db
			.insert(habit)
			.values({ userId: created.id, title: 'Read', startDate: '2026-01-01' })
			.returning();

		await testDb.db.insert(habitCompletion).values({
			habitId: createdHabit.id,
			userId: created.id,
			completedAt: '2026-01-01',
			experienceEarned: 10
		});

		// Deleting the habit cascades to its completions.
		await testDb.db.delete(habit).where(eq(habit.id, createdHabit.id));
		const remaining = await testDb.db
			.select()
			.from(habitCompletion)
			.where(eq(habitCompletion.habitId, createdHabit.id));
		expect(remaining).toHaveLength(0);
	});
});
