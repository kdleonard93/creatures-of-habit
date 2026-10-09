import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET, PUT, DELETE } from '../../routes/api/habits/[id]/+server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser, seedHabit } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';
import { clearRateLimitStore } from '$lib/server/rateLimit';
import { habit } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Representative tests for GET/PUT/DELETE /api/habits/[id]. These call the real
 * handlers and assert status, body, and database effects. They replace
 * habits.api.test.ts, which asserted on a fetch mock. See T-1.
 */
describe('/api/habits/[id] handlers (real)', () => {
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
		seededHabit = await seedHabit(testDb.db, owner.id, { title: 'Original Title' });
	});

	afterEach(() => {
		testDb.close();
	});

	function event(options: {
		method: 'GET' | 'PUT' | 'DELETE';
		user: typeof owner | null;
		id?: string;
		body?: unknown;
	}) {
		const id = options.id ?? seededHabit.id;
		return createRequestEvent({
			method: options.method,
			url: `/api/habits/${id}`,
			body: options.body,
			params: { id },
			user: options.user
		});
	}

	describe('GET', () => {
		it('returns 401 without a session', async () => {
			const response = await GET(event({ method: 'GET', user: null }));
			expect(response.status).toBe(401);
		});

		it('returns 404 for a habit that does not exist', async () => {
			const response = await GET(event({ method: 'GET', user: owner, id: 'missing-habit' }));
			expect(response.status).toBe(404);
			const body = await response.json();
			expect(body.error).toBe('Habit not found');
		});

		it('returns 404 for another user habit (ownership isolation)', async () => {
			const response = await GET(event({ method: 'GET', user: other }));
			expect(response.status).toBe(404);
		});

		it('returns the habit for the owner', async () => {
			const response = await GET(event({ method: 'GET', user: owner }));
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.habit.id).toBe(seededHabit.id);
			expect(body.habit.title).toBe('Original Title');
			expect(body.habit.userId).toBe(owner.id);
		});
	});

	describe('PUT', () => {
		it('returns 401 without a session', async () => {
			const response = await PUT(event({ method: 'PUT', user: null, body: { isArchived: true } }));
			expect(response.status).toBe(401);
		});

		it('archives a habit through the single-key isArchived branch', async () => {
			const response = await PUT(event({ method: 'PUT', user: owner, body: { isArchived: true } }));
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.habit.isArchived).toBe(true);

			const [row] = await testDb.db.select().from(habit).where(eq(habit.id, seededHabit.id));
			expect(row.isArchived).toBe(true);
		});

		it('restores an archived habit through the same branch', async () => {
			await PUT(event({ method: 'PUT', user: owner, body: { isArchived: true } }));
			const response = await PUT(
				event({ method: 'PUT', user: owner, body: { isArchived: false } })
			);
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.habit.isArchived).toBe(false);

			const [row] = await testDb.db.select().from(habit).where(eq(habit.id, seededHabit.id));
			expect(row.isArchived).toBe(false);
		});

		it('applies a full update and returns the updated habit', async () => {
			const response = await PUT(
				event({
					method: 'PUT',
					user: owner,
					body: {
						title: 'Updated Title',
						description: 'Updated description',
						difficulty: 'hard',
						frequency: 'daily',
						startDate: '2026-02-01'
					}
				})
			);
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.habit.title).toBe('Updated Title');
			expect(body.habit.difficulty).toBe('hard');

			const [row] = await testDb.db.select().from(habit).where(eq(habit.id, seededHabit.id));
			expect(row.title).toBe('Updated Title');
			expect(row.description).toBe('Updated description');
			expect(row.difficulty).toBe('hard');
			expect(row.startDate).toBe('2026-02-01');
		});

		it('does not modify another user habit (ownership isolation, undocumented 200)', async () => {
			const response = await PUT(
				event({
					method: 'PUT',
					user: other,
					body: {
						title: 'Hijacked',
						difficulty: 'easy',
						frequency: 'daily',
						startDate: '2026-03-01'
					}
				})
			);
			expect(response.status).toBe(200);

			const [row] = await testDb.db.select().from(habit).where(eq(habit.id, seededHabit.id));
			expect(row.title).toBe('Original Title');
		});

		it('does not modify a habit that does not exist', async () => {
			const response = await PUT(
				event({
					method: 'PUT',
					user: owner,
					id: 'missing-habit',
					body: { isArchived: true }
				})
			);
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.habit).toBeUndefined();
		});
	});

	describe('DELETE', () => {
		it('returns 401 without a session', async () => {
			const response = await DELETE(event({ method: 'DELETE', user: null }));
			expect(response.status).toBe(401);
		});

		it('soft deletes by setting isArchived and keeps the row', async () => {
			const response = await DELETE(event({ method: 'DELETE', user: owner }));
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body).toEqual({ success: true });

			const [row] = await testDb.db.select().from(habit).where(eq(habit.id, seededHabit.id));
			expect(row).toBeDefined();
			expect(row.isArchived).toBe(true);
		});

		it('does not archive another user habit (ownership isolation)', async () => {
			const response = await DELETE(event({ method: 'DELETE', user: other }));
			expect(response.status).toBe(200);

			const [row] = await testDb.db.select().from(habit).where(eq(habit.id, seededHabit.id));
			expect(row.isArchived).toBe(false);
		});

		it('returns success for a missing habit but changes nothing', async () => {
			const response = await DELETE(
				event({ method: 'DELETE', user: owner, id: 'missing-habit' })
			);
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body).toEqual({ success: true });

			const rows = await testDb.db.select().from(habit).where(eq(habit.id, seededHabit.id));
			expect(rows).toHaveLength(1);
			expect(rows[0].isArchived).toBe(false);
		});
	});
});
