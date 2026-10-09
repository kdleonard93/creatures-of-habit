import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET, POST } from '../../routes/api/habits/+server';
import { POST as completeHabit } from '../../routes/api/habits/[id]/complete/+server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser, seedCreature } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';
import { clearRateLimitStore } from '$lib/server/rateLimit';
import { habitStreak, creature, dailyHabitTracker } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Representative tests: these call the real route handlers against a real
 * SQLite database with the application schema applied. They replace the
 * mocked-fetch tests in habits.api.test.ts, which only asserted on their own
 * mocks. See docs/reports/07-tests.md T-1.
 */
describe('habits API handlers (real)', () => {
	let testDb: TestDb;
	let user: Awaited<ReturnType<typeof seedUser>>;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
		clearRateLimitStore();
		user = await seedUser(testDb.db);
		await seedCreature(testDb.db, user.id);
	});

	afterEach(() => {
		testDb.close();
	});

	it('GET returns 401 without a session', async () => {
		const event = createRequestEvent({ method: 'GET', url: '/api/habits', user: null });
		const response = await GET(event);
		expect(response.status).toBe(401);
	});

	it('POST creates a habit and initializes its streak row', async () => {
		const event = createRequestEvent({
			method: 'POST',
			url: '/api/habits',
			user,
			body: { title: 'Read a book', difficulty: 'medium', frequency: 'daily', startDate: '2026-01-01' }
		});

		const response = await POST(event);
		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data.habit.title).toBe('Read a book');
		expect(data.habit.userId).toBe(user.id);

		const streakRows = await testDb.db
			.select()
			.from(habitStreak)
			.where(eq(habitStreak.habitId, data.habit.id));
		expect(streakRows).toHaveLength(1);
	});

	it('GET lists only the current user habits', async () => {
		const other = await seedUser(testDb.db, { email: 'other@example.com', username: 'other' });

		await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/habits',
				user,
				body: { title: 'Mine', difficulty: 'easy', frequency: 'daily', startDate: '2026-01-01' }
			})
		);
		await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/habits',
				user: other,
				body: { title: 'Theirs', difficulty: 'easy', frequency: 'daily', startDate: '2026-01-01' }
			})
		);

		const response = await GET(createRequestEvent({ method: 'GET', url: '/api/habits', user }));
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.habits).toHaveLength(1);
		expect(data.habits[0].title).toBe('Mine');
	});

	it('completing a habit awards XP, increments the streak, and marks the tracker', async () => {
		const created = await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/habits',
				user,
				body: { title: 'Exercise', difficulty: 'hard', frequency: 'daily', startDate: '2026-01-01' }
			})
		);
		const { habit: createdHabit } = await created.json();

		const response = await completeHabit(
			createRequestEvent({
				method: 'POST',
				url: `/api/habits/${createdHabit.id}/complete`,
				params: { id: createdHabit.id },
				user
			})
		);
		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data.success).toBe(true);
		expect(data.experienceEarned).toBeGreaterThan(0);

		const [updatedCreature] = await testDb.db
			.select()
			.from(creature)
			.where(eq(creature.userId, user.id));
		expect(updatedCreature.experience).toBe(data.experienceEarned);

		const [streak] = await testDb.db
			.select()
			.from(habitStreak)
			.where(eq(habitStreak.habitId, createdHabit.id));
		expect(streak.currentStreak).toBe(1);

		const tracker = await testDb.db
			.select()
			.from(dailyHabitTracker)
			.where(eq(dailyHabitTracker.habitId, createdHabit.id));
		expect(tracker).toHaveLength(1);
		expect(tracker[0].completed).toBe(true);
	});

	it('completing the same habit twice in a day is rejected', async () => {
		const created = await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/habits',
				user,
				body: { title: 'Meditate', difficulty: 'easy', frequency: 'daily', startDate: '2026-01-01' }
			})
		);
		const { habit: createdHabit } = await created.json();

		const makeEvent = () =>
			createRequestEvent({
				method: 'POST',
				url: `/api/habits/${createdHabit.id}/complete`,
				params: { id: createdHabit.id },
				user
			});

		const first = await completeHabit(makeEvent());
		expect(first.status).toBe(200);

		const second = await completeHabit(makeEvent());
		expect(second.status).toBe(400);
		const body = await second.json();
		expect(body.error).toMatch(/already completed/i);
	});
});
