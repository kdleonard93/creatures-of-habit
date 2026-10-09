import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isActionFailure } from '@sveltejs/kit';
import { load, actions } from '../../routes/settings/password/+page.server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';
import { createFormRequestEvent } from '../helpers/formRequest';
import { hashPassword, verifyPassword } from '$lib/utils/password';
import {
	user as userTable,
	session as sessionTable
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Representative tests for settings/password: the load redirect and the
 * password-change action's session handling. Changing a password must revoke
 * every other session while keeping the caller signed in, matching
 * src/routes/settings/+page.server.ts. See docs/audit-backlog.md A-1.
 */
describe('settings/password/+page.server.ts', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
	});

	afterEach(() => {
		testDb.close();
	});

	it('load redirects when there is no session', async () => {
		await expect(
			load(createRequestEvent({ url: '/settings/password', session: null }) as never)
		).rejects.toMatchObject({ status: 302, location: '/login' });
	});

	it('action revokes other sessions but keeps the current session and cookie', async () => {
		const user = await seedUser(testDb.db, {
			passwordHash: await hashPassword('old-password')
		});
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
		const currentSession = { id: 'pw-session-current', userId: user.id, expiresAt };
		await testDb.db.insert(sessionTable).values(currentSession);
		await testDb.db
			.insert(sessionTable)
			.values({ id: 'pw-session-other', userId: user.id, expiresAt });

		const event = createFormRequestEvent({
			method: 'POST',
			url: '/settings/password',
			session: currentSession,
			cookies: { 'auth-session': 'raw-current-token' },
			fields: {
				currentPassword: 'old-password',
				newPassword: 'new-password-123',
				confirmPassword: 'new-password-123'
			}
		});

		const result = await actions.default(event as never);

		expect(isActionFailure(result)).toBe(false);
		expect(result).toMatchObject({ success: true });

		const [updated] = await testDb.db
			.select()
			.from(userTable)
			.where(eq(userTable.id, user.id));
		expect(await verifyPassword(updated.passwordHash, 'new-password-123')).toBe(true);

		const remaining = await testDb.db
			.select()
			.from(sessionTable)
			.where(eq(sessionTable.userId, user.id));
		expect(remaining.map((row) => row.id)).toEqual(['pw-session-current']);

		expect(event.cookies.get('auth-session')).toBe('raw-current-token');
	});

	it('action rejects a wrong current password without touching sessions', async () => {
		const user = await seedUser(testDb.db, {
			passwordHash: await hashPassword('old-password')
		});
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
		const currentSession = { id: 'pw-session-current', userId: user.id, expiresAt };
		await testDb.db.insert(sessionTable).values(currentSession);

		const result = await actions.default(
			createFormRequestEvent({
				method: 'POST',
				url: '/settings/password',
				session: currentSession,
				fields: {
					currentPassword: 'not-the-password',
					newPassword: 'new-password-123',
					confirmPassword: 'new-password-123'
				}
			}) as never
		);

		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(400);

		const remaining = await testDb.db
			.select()
			.from(sessionTable)
			.where(eq(sessionTable.userId, user.id));
		expect(remaining).toHaveLength(1);
	});
});
