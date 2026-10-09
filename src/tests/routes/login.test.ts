import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isActionFailure } from '@sveltejs/kit';
import { load, actions } from '../../routes/login/+page.server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';
import { createFormRequestEvent } from '../helpers/formRequest';
import { clearRateLimitStore } from '$lib/server/rateLimit';
import { hashPassword } from '$lib/utils/password';
import { session } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Representative tests for the login page server load and form action.
 * These call the real module against the real migrated test database. See
 * docs/reports/07-tests.md T-2.
 */
describe('login/+page.server.ts', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
		clearRateLimitStore();
	});

	afterEach(() => {
		testDb.close();
	});

	it('load redirects an authenticated user to /dashboard', async () => {
		const event = createRequestEvent({
			url: '/login',
			user: { id: 'user-1', emailVerified: true }
		});

		await expect(load(event as never)).rejects.toMatchObject({
			status: 302,
			location: '/dashboard'
		});
	});

	it('load returns empty data for an anonymous visitor', async () => {
		const event = createRequestEvent({ url: '/login', user: null });
		await expect(load(event as never)).resolves.toEqual({});
	});

	it('action rejects a bad password without creating a session', async () => {
		await seedUser(testDb.db, {
			username: 'alice',
			passwordHash: await hashPassword('correct-password')
		});

		const event = createFormRequestEvent({
			method: 'POST',
			url: '/login',
			user: null,
			fields: { username: 'alice', password: 'wrong-password' }
		});

		const result = await actions.default(event as never);
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) {
			expect(result.status).toBe(400);
			expect(result.data?.message).toMatch(/incorrect/i);
		}

		const rows = await testDb.db.select().from(session);
		expect(rows).toHaveLength(0);
	});

	it('action creates a session cookie and redirects on success', async () => {
		const user = await seedUser(testDb.db, {
			username: 'alice',
			passwordHash: await hashPassword('correct-password')
		});

		const event = createFormRequestEvent({
			method: 'POST',
			url: '/login',
			user: null,
			fields: { username: 'alice', password: 'correct-password' }
		});

		await expect(actions.default(event as never)).rejects.toMatchObject({
			status: 302,
			location: '/dashboard'
		});

		const token = event.cookies.get('auth-session');
		expect(token).toBeTruthy();

		const rows = await testDb.db.select().from(session).where(eq(session.userId, user.id));
		expect(rows).toHaveLength(1);
	});
});
