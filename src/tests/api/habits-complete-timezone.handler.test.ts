import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST as completeHabit } from '../../routes/api/habits/[id]/complete/+server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser, seedCreature, seedHabit } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';
import { clearRateLimitStore } from '$lib/server/rateLimit';
import { dailyHabitTracker, habitCompletion } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * The completion endpoint keys the completion, streak, and daily tracker on the
 * user's local day. The clock is pinned to a UTC instant that is the next day in
 * America/Chicago, so the local and UTC days disagree. See C-3.
 */
describe('habit completion uses the user time zone', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
		clearRateLimitStore();
		// 2026-01-06T02:00:00Z is still 2026-01-05 in America/Chicago (UTC-6).
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-01-06T02:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
		testDb.close();
	});

	async function completeAndRead(habitId: string, user: { id: string; timezone?: string | null }) {
		const response = await completeHabit(
			createRequestEvent({
				method: 'POST',
				url: `/api/habits/${habitId}/complete`,
				params: { id: habitId },
				user
			})
		);
		const [completion] = await testDb.db
			.select()
			.from(habitCompletion)
			.where(eq(habitCompletion.habitId, habitId));
		const [tracker] = await testDb.db
			.select()
			.from(dailyHabitTracker)
			.where(eq(dailyHabitTracker.habitId, habitId));
		return { response, completion, tracker };
	}

	it('stores the completion and tracker entry on the local day', async () => {
		const user = await seedUser(testDb.db, { timezone: 'America/Chicago' });
		await seedCreature(testDb.db, user.id);
		const habit = await seedHabit(testDb.db, user.id, { startDate: '2026-01-01' });

		const { response, completion, tracker } = await completeAndRead(habit.id, user);

		expect(response.status).toBe(200);
		expect(completion.completedAt).toBe('2026-01-05');
		expect(tracker.date).toBe('2026-01-05');
		expect(tracker.completed).toBe(true);
	});

	it('falls back to the UTC day for a user without a time zone', async () => {
		const user = await seedUser(testDb.db); // timezone null
		await seedCreature(testDb.db, user.id);
		const habit = await seedHabit(testDb.db, user.id, { startDate: '2026-01-01' });

		const { response, completion, tracker } = await completeAndRead(habit.id, user);

		expect(response.status).toBe(200);
		expect(completion.completedAt).toBe('2026-01-06');
		expect(tracker.date).toBe('2026-01-06');
	});
});
