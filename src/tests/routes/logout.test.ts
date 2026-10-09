import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { actions } from '../../routes/logout/+page.server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';
import * as auth from '$lib/server/auth';
import { session } from '$lib/server/db/schema';

/**
 * Representative tests for the logout form action. The action invalidates the
 * current session and clears the session cookie. See docs/reports/07-tests.md T-2.
 */
describe('logout/+page.server.ts', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
	});

	afterEach(() => {
		testDb.close();
	});

	it('invalidates the session and clears the session cookie', async () => {
		const user = await seedUser(testDb.db);
		const token = 'logout-session-token';
		const created = await auth.createSession(token, user.id, testDb.db);

		const event = createRequestEvent({
			method: 'POST',
			url: '/logout',
			user,
			session: created,
			cookies: { 'auth-session': token }
		});

		await expect(actions.default(event as never)).rejects.toMatchObject({
			status: 302,
			location: '/'
		});

		expect(event.cookies.get('auth-session')).toBeUndefined();

		const rows = await testDb.db.select().from(session);
		expect(rows).toHaveLength(0);
	});

	it('clears a stale cookie even without a session', async () => {
		const event = createRequestEvent({
			method: 'POST',
			url: '/logout',
			user: null,
			session: null,
			cookies: { 'auth-session': 'stale-token' }
		});

		await expect(actions.default(event as never)).rejects.toMatchObject({
			status: 302,
			location: '/'
		});

		expect(event.cookies.get('auth-session')).toBeUndefined();
	});
});
