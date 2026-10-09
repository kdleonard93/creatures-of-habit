import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '../../routes/api/categories/defaults/+server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';
import { clearRateLimitStore } from '$lib/server/rateLimit';
import { habitCategory } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

/**
 * Representative tests for POST /api/categories/defaults. This route has no
 * GET; the old categories.api.test.ts tested a GET that does not exist and
 * asserted on a fetch mock. See docs/reports/07-tests.md T-1 and S-4.
 */
describe('POST /api/categories/defaults (real handler)', () => {
	let testDb: TestDb;
	let seededUser: Awaited<ReturnType<typeof seedUser>>;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
		clearRateLimitStore();
		seededUser = await seedUser(testDb.db);
	});

	afterEach(() => {
		testDb.close();
	});

	it('returns 401 without a session', async () => {
		const event = createRequestEvent({
			method: 'POST',
			url: '/api/categories/defaults',
			user: null
		});
		const response = await POST(event);
		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized' });
	});

	it('inserts the six default categories for the caller', async () => {
		const event = createRequestEvent({
			method: 'POST',
			url: '/api/categories/defaults',
			user: seededUser
		});
		const response = await POST(event);
		expect(response.status).toBe(200);

		const body = await response.json();
		expect(body.categories).toHaveLength(6);
		expect(body.categories[0]).toHaveProperty('id');
		expect(body.categories[0]).toHaveProperty('name');
		expect(body.categories[0]).toHaveProperty('description');
		// The real response never includes a `color` field.
		expect(body.categories[0]).not.toHaveProperty('color');

		const rows = await testDb.db
			.select()
			.from(habitCategory)
			.where(eq(habitCategory.userId, seededUser.id));
		expect(rows).toHaveLength(6);
		const names = rows.map((row) => row.name);
		expect(names).toContain('Health');
		expect(names).toContain('Personal Growth');
	});

	function callAs(user: typeof seededUser) {
		return createRequestEvent({
			method: 'POST',
			url: '/api/categories/defaults',
			user
		});
	}

	it('is not idempotent: a second call creates duplicate defaults', async () => {
		await POST(
			createRequestEvent({ method: 'POST', url: '/api/categories/defaults', user: seededUser })
		);
		const second = await POST(
			createRequestEvent({ method: 'POST', url: '/api/categories/defaults', user: seededUser })
		);

		const body = await second.json();
		expect(body.categories).toHaveLength(6);

		const rows = await testDb.db
			.select()
			.from(habitCategory)
			.where(eq(habitCategory.userId, seededUser.id));
		expect(rows).toHaveLength(12);
		expect(
			rows.filter((row) => row.name === 'Health')
		).toHaveLength(2);
	});

	it('scopes inserted categories to the calling user', async () => {
		const other = await seedUser(testDb.db, {
			email: 'other@example.com',
			username: 'otheruser'
		});

		await POST(
			createRequestEvent({ method: 'POST', url: '/api/categories/defaults', user: seededUser })
		);
		await POST(createRequestEvent({ method: 'POST', url: '/api/categories/defaults', user: other }));

		const mine = await testDb.db
			.select()
			.from(habitCategory)
			.where(eq(habitCategory.userId, seededUser.id));
		const others = await testDb.db
			.select()
			.from(habitCategory)
			.where(eq(habitCategory.userId, other.id));

		expect(mine).toHaveLength(6);
		expect(others).toHaveLength(6);
		expect(
			await testDb.db
				.select()
				.from(habitCategory)
				.where(
					and(eq(habitCategory.userId, seededUser.id), eq(habitCategory.name, 'Health'))
				)
		).toHaveLength(1);
	});
});
