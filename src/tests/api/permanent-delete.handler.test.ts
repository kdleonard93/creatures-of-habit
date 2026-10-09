import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DELETE } from '../../routes/api/habits/[id]/permanent-delete/+server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser, seedHabit } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';
import { clearRateLimitStore } from '$lib/server/rateLimit';
import { habit, habitCompletion, habitStreak } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Representative tests for DELETE /api/habits/[id]/permanent-delete. These
 * replace permanent-delete.api.test.ts, which asserted on a fetch mock and
 * expected a 404 the handler never returns. See T-1 and docs/api-reference.md.
 */
describe('DELETE /api/habits/[id]/permanent-delete (real handler)', () => {
	let testDb: TestDb;
	let owner: Awaited<ReturnType<typeof seedUser>>;
	let other: Awaited<ReturnType<typeof seedUser>>;
	let seededHabit: Awaited<ReturnType<typeof seedHabit>>;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
		clearRateLimitStore();
		owner = await seedUser(testDb.db);
		other = await seedUser(testDb.db, { email: 'other@example.com', username: 'otheruser' });
		seededHabit = await seedHabit(testDb.db, owner.id);
	});

	afterEach(() => {
		testDb.close();
	});

	function event(user: typeof owner | null, id?: string) {
		const habitId = id ?? seededHabit.id;
		return createRequestEvent({
			method: 'DELETE',
			url: `/api/habits/${habitId}/permanent-delete`,
			params: { id: habitId },
			user
		});
	}

	async function seedCompletionAndStreak() {
		await testDb.db.insert(habitCompletion).values({
			habitId: seededHabit.id,
			userId: owner.id,
			completedAt: new Date().toISOString(),
			experienceEarned: 10
		});
		await testDb.db.insert(habitStreak).values({
			habitId: seededHabit.id,
			userId: owner.id,
			currentStreak: 3,
			longestStreak: 3
		});
	}

	it('returns 401 without a session', async () => {
		const response = await DELETE(event(null));
		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized' });
	});

	it('deletes the habit and cascades to completions and streaks', async () => {
		await seedCompletionAndStreak();

		const response = await DELETE(event(owner));
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toEqual({ success: true });

		const habits = await testDb.db.select().from(habit).where(eq(habit.id, seededHabit.id));
		expect(habits).toHaveLength(0);

		const completions = await testDb.db
			.select()
			.from(habitCompletion)
			.where(eq(habitCompletion.habitId, seededHabit.id));
		expect(completions).toHaveLength(0);

		const streaks = await testDb.db
			.select()
			.from(habitStreak)
			.where(eq(habitStreak.habitId, seededHabit.id));
		expect(streaks).toHaveLength(0);
	});

	it('does not delete another user habit (ownership isolation)', async () => {
		await seedCompletionAndStreak();

		const response = await DELETE(event(other));
		expect(response.status).toBe(200);

		const habits = await testDb.db.select().from(habit).where(eq(habit.id, seededHabit.id));
		expect(habits).toHaveLength(1);
		const completions = await testDb.db
			.select()
			.from(habitCompletion)
			.where(eq(habitCompletion.habitId, seededHabit.id));
		expect(completions).toHaveLength(1);
	});

	it('returns success for a missing habit but deletes nothing', async () => {
		const response = await DELETE(event(owner, 'missing-habit'));
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toEqual({ success: true });

		const habits = await testDb.db.select().from(habit).where(eq(habit.id, seededHabit.id));
		expect(habits).toHaveLength(1);
	});
});
