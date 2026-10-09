import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET, POST } from '../../routes/api/habits/+server';
import { POST as completeHabit } from '../../routes/api/habits/[id]/complete/+server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser, seedCreature, seedHabit } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';
import { clearRateLimitStore } from '$lib/server/rateLimit';
import { habitStreak, creature, dailyHabitTracker, habit, habitCategory, habitCompletion } from '$lib/server/db/schema';
import { toDateOnly, addDays, getWeekday } from '$lib/shared/streaks/schedule';
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

	it('rejects an invalid difficulty with 400 and writes no habit', async () => {
		const response = await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/habits',
				user,
				body: { title: 'Bad', difficulty: 'impossible', frequency: 'daily', startDate: '2026-01-01' }
			})
		);
		expect(response.status).toBe(400);
		expect((await response.json()).error).toMatch(/difficulty/i);
		expect(await testDb.db.select().from(habit)).toHaveLength(0);
	});

	it('rejects an invalid frequency with 400', async () => {
		const response = await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/habits',
				user,
				body: { title: 'Bad', difficulty: 'easy', frequency: 'hourly', startDate: '2026-01-01' }
			})
		);
		expect(response.status).toBe(400);
		expect((await response.json()).error).toMatch(/frequency/i);
		expect(await testDb.db.select().from(habit)).toHaveLength(0);
	});

	it('rejects a non-date startDate with 400', async () => {
		const response = await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/habits',
				user,
				body: { title: 'Bad', difficulty: 'easy', frequency: 'daily', startDate: 'not-a-date' }
			})
		);
		expect(response.status).toBe(400);
		expect((await response.json()).error).toMatch(/start date/i);
		expect(await testDb.db.select().from(habit)).toHaveLength(0);
	});

	it('rejects a custom frequency day outside 0-6 with 400', async () => {
		const response = await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/habits',
				user,
				body: {
					title: 'Custom',
					difficulty: 'easy',
					frequency: 'custom',
					startDate: '2026-01-01',
					customFrequency: { days: [9] }
				}
			})
		);
		expect(response.status).toBe(400);
		expect(await testDb.db.select().from(habit)).toHaveLength(0);
	});

	it('rejects a custom frequency with no days with 400', async () => {
		const response = await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/habits',
				user,
				body: {
					title: 'Custom',
					difficulty: 'easy',
					frequency: 'custom',
					startDate: '2026-01-01',
					customFrequency: { days: [] }
				}
			})
		);
		expect(response.status).toBe(400);
		expect((await response.json()).error).toMatch(/at least one day/i);
		expect(await testDb.db.select().from(habit)).toHaveLength(0);
	});

	it('rejects a foreign categoryId with 400 and writes no habit', async () => {
		const categoryOwner = await seedUser(testDb.db, {
			email: 'category-owner@example.com',
			username: 'categoryowner'
		});
		const [foreignCategory] = await testDb.db
			.insert(habitCategory)
			.values({ userId: categoryOwner.id, name: 'Theirs' })
			.returning();

		const response = await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/habits',
				user,
				body: {
					title: 'Sneaky',
					difficulty: 'easy',
					frequency: 'daily',
					startDate: '2026-01-01',
					categoryId: foreignCategory.id
				}
			})
		);
		expect(response.status).toBe(400);
		expect((await response.json()).error).toMatch(/category/i);
		expect(await testDb.db.select().from(habit)).toHaveLength(0);
	});

	it('accepts a categoryId owned by the session user', async () => {
		const [ownCategory] = await testDb.db
			.insert(habitCategory)
			.values({ userId: user.id, name: 'Mine' })
			.returning();

		const response = await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/habits',
				user,
				body: {
					title: 'Owned category',
					difficulty: 'easy',
					frequency: 'daily',
					startDate: '2026-01-01',
					categoryId: ownCategory.id
				}
			})
		);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.habit.categoryId).toBe(ownCategory.id);
	});

	it('rejects a malformed JSON body with 400', async () => {
		const event = createRequestEvent({ method: 'POST', url: '/api/habits', user });
		event.request = new Request('http://localhost:5175/api/habits', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: '{ not valid json'
		});

		const response = await POST(event);
		expect(response.status).toBe(400);
		expect((await response.json()).error).toBe('Invalid JSON body');
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

	it('a duplicate completion is rejected by the unique constraint and does not double-award', async () => {
		const created = await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/habits',
				user,
				body: { title: 'Atomic', difficulty: 'hard', frequency: 'daily', startDate: '2026-01-01' }
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

		expect((await completeHabit(makeEvent())).status).toBe(200);

		const [creatureAfterFirst] = await testDb.db
			.select()
			.from(creature)
			.where(eq(creature.userId, user.id));
		const [streakAfterFirst] = await testDb.db
			.select()
			.from(habitStreak)
			.where(eq(habitStreak.habitId, createdHabit.id));

		const duplicate = await completeHabit(makeEvent());
		expect(duplicate.status).toBe(400);
		expect((await duplicate.json()).error).toMatch(/already completed/i);

		const [creatureAfterSecond] = await testDb.db
			.select()
			.from(creature)
			.where(eq(creature.userId, user.id));
		const [streakAfterSecond] = await testDb.db
			.select()
			.from(habitStreak)
			.where(eq(habitStreak.habitId, createdHabit.id));

		expect(creatureAfterSecond.experience).toBe(creatureAfterFirst.experience);
		expect(streakAfterSecond.currentStreak).toBe(streakAfterFirst.currentStreak);

		const completions = await testDb.db
			.select()
			.from(habitCompletion)
			.where(eq(habitCompletion.habitId, createdHabit.id));
		expect(completions).toHaveLength(1);
	});

	it('enforces one completion per habit per day at the database level', async () => {
		const seeded = await seedHabit(testDb.db, user.id, { title: 'DB Constraint' });
		const today = toDateOnly(new Date());

		await testDb.db.insert(habitCompletion).values({
			habitId: seeded.id,
			userId: user.id,
			completedAt: today,
			experienceEarned: 10
		});

		await expect(
			testDb.db.insert(habitCompletion).values({
				habitId: seeded.id,
				userId: user.id,
				completedAt: today,
				experienceEarned: 10
			})
		).rejects.toThrow(/unique/i);
	});

	it('resets the streak after a missed day', async () => {
		const created = await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/habits',
				user,
				body: { title: 'Journal', difficulty: 'easy', frequency: 'daily', startDate: '2026-01-01' }
			})
		);
		const { habit: createdHabit } = await created.json();

		const today = toDateOnly(new Date());
		const threeDaysAgo = addDays(today, -3);
		await testDb.db
			.update(habitStreak)
			.set({ currentStreak: 3, longestStreak: 5, lastCompletedAt: `${threeDaysAgo} 12:00:00` })
			.where(eq(habitStreak.habitId, createdHabit.id));

		const response = await completeHabit(
			createRequestEvent({
				method: 'POST',
				url: `/api/habits/${createdHabit.id}/complete`,
				params: { id: createdHabit.id },
				user
			})
		);
		expect(response.status).toBe(200);

		const [streak] = await testDb.db
			.select()
			.from(habitStreak)
			.where(eq(habitStreak.habitId, createdHabit.id));
		expect(streak.currentStreak).toBe(1);
		expect(streak.longestStreak).toBe(5);
	});

	it('rejects completing a weekly habit on a non-assigned day', async () => {
		const today = toDateOnly(new Date());
		const startDate = addDays(today, -1);

		const created = await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/habits',
				user,
				body: { title: 'Weekly review', difficulty: 'medium', frequency: 'weekly', startDate }
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
		expect(response.status).toBe(400);
		expect((await response.json()).error).toMatch(/not scheduled/i);
	});

	it('rejects completing a custom habit on a non-assigned day', async () => {
		const today = toDateOnly(new Date());
		const otherDay = (getWeekday(today) + 1) % 7;

		const created = await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/habits',
				user,
				body: {
					title: 'Gym',
					difficulty: 'hard',
					frequency: 'custom',
					startDate: today,
					customFrequency: { days: [otherDay] }
				}
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
		expect(response.status).toBe(400);
		expect((await response.json()).error).toMatch(/not scheduled/i);
	});
});
