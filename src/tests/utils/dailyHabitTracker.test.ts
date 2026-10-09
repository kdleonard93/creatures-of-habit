import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ensureDailyTrackerEntries, markHabitCompleted } from '$lib/utils/dailyHabitTracker';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser, seedHabit } from '../db/fixtures';
import { dailyHabitTracker } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * The daily tracker keys its rows on the user's local day. These tests run the
 * real service against the real schema and pin the clock to a UTC instant that
 * falls on the previous day in America/Chicago. See C-3.
 */
describe('dailyHabitTracker time zone', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
		// 2026-01-06T02:00:00Z is still 2026-01-05 in America/Chicago (UTC-6).
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-01-06T02:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
		testDb.close();
	});

	async function trackerRows(habitId: string) {
		return testDb.db
			.select()
			.from(dailyHabitTracker)
			.where(eq(dailyHabitTracker.habitId, habitId));
	}

	it('marks the tracker entry on the user local day', async () => {
		const user = await seedUser(testDb.db, { timezone: 'America/Chicago' });
		const habit = await seedHabit(testDb.db, user.id);

		await markHabitCompleted(user.id, habit.id, 'America/Chicago');

		const rows = await trackerRows(habit.id);
		expect(rows).toHaveLength(1);
		expect(rows[0].date).toBe('2026-01-05');
	});

	it('keeps the UTC day when no time zone is given', async () => {
		const user = await seedUser(testDb.db, { timezone: 'America/Chicago' });
		const habit = await seedHabit(testDb.db, user.id);

		await markHabitCompleted(user.id, habit.id);

		const rows = await trackerRows(habit.id);
		expect(rows).toHaveLength(1);
		expect(rows[0].date).toBe('2026-01-06');
	});

	it('creates the daily entry on the user local day', async () => {
		const user = await seedUser(testDb.db, { timezone: 'America/Chicago' });
		const habit = await seedHabit(testDb.db, user.id);

		await ensureDailyTrackerEntries(user.id, 'America/Chicago');

		const rows = await trackerRows(habit.id);
		expect(rows).toHaveLength(1);
		expect(rows[0].date).toBe('2026-01-05');
	});
});
