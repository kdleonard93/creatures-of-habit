import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '../../routes/api/user/timezone/+server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';
import { clearRateLimitStore } from '$lib/server/rateLimit';
import { user as userTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * The timezone endpoint persists the browser's IANA zone. It is called by the
 * layout once per load. See C-3.
 */
describe('user timezone endpoint (real)', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
		clearRateLimitStore();
	});

	afterEach(() => {
		testDb.close();
	});

	it('requires a session', async () => {
		const response = await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/user/timezone',
				user: null,
				body: { timezone: 'America/Chicago' }
			})
		);
		expect(response.status).toBe(401);
	});

	it('rejects an invalid timezone with 400 and does not write', async () => {
		const user = await seedUser(testDb.db);

		const response = await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/user/timezone',
				user,
				body: { timezone: 'Not/AZone' }
			})
		);
		expect(response.status).toBe(400);
		expect((await response.json()).error).toMatch(/timezone/i);

		const [row] = await testDb.db.select().from(userTable).where(eq(userTable.id, user.id));
		expect(row.timezone).toBeNull();
	});

	it('persists a valid timezone', async () => {
		const user = await seedUser(testDb.db);

		const response = await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/user/timezone',
				user,
				body: { timezone: 'America/Chicago' }
			})
		);
		expect(response.status).toBe(200);
		expect((await response.json()).success).toBe(true);

		const [row] = await testDb.db.select().from(userTable).where(eq(userTable.id, user.id));
		expect(row.timezone).toBe('America/Chicago');
	});

	it('leaves an unchanged timezone intact', async () => {
		const user = await seedUser(testDb.db, { timezone: 'Europe/Paris' });

		const response = await POST(
			createRequestEvent({
				method: 'POST',
				url: '/api/user/timezone',
				user,
				body: { timezone: 'Europe/Paris' }
			})
		);
		expect(response.status).toBe(200);

		const [row] = await testDb.db.select().from(userTable).where(eq(userTable.id, user.id));
		expect(row.timezone).toBe('Europe/Paris');
	});
});
