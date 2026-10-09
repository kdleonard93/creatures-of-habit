import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isActionFailure } from '@sveltejs/kit';
import { load, actions } from '../../routes/settings/+page.server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';
import { createFormRequestEvent } from '../helpers/formRequest';
import { hashPassword, verifyPassword } from '$lib/utils/password';
import {
	user as userTable,
	session as sessionTable,
	userPreferences
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Representative tests for the settings page load and its updatePassword and
 * updateNotifications actions. See docs/reports/07-tests.md T-2.
 */
describe('settings/+page.server.ts', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
	});

	afterEach(() => {
		testDb.close();
	});

	it('load returns null preferences when unauthenticated', async () => {
		const data = await load(createRequestEvent({ url: '/settings', user: null }) as never);
		expect(data).toEqual({ preferences: null });
	});

	it('load returns stored preferences for an authenticated user', async () => {
		const user = await seedUser(testDb.db);
		await testDb.db.insert(userPreferences).values({
			userId: user.id,
			emailNotifications: 0,
			pushNotifications: 0,
			reminderNotifications: 0
		});

		const data = (await load(
			createRequestEvent({ url: '/settings', user }) as never
		)) as { preferences: { emailNotifications: number } | null };

		expect(data.preferences).not.toBeNull();
		expect(data.preferences?.emailNotifications).toBe(0);
	});

	it('updatePassword rejects anonymous callers', async () => {
		const result = await actions.updatePassword(
			createFormRequestEvent({
				method: 'POST',
				url: '/settings',
				user: null,
				fields: { currentPassword: 'x', newPassword: 'new-password-123' }
			}) as never
		);

		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(401);
	});

	it('updatePassword rejects a wrong current password', async () => {
		const user = await seedUser(testDb.db, {
			passwordHash: await hashPassword('old-password')
		});

		const result = await actions.updatePassword(
			createFormRequestEvent({
				method: 'POST',
				url: '/settings',
				user,
				fields: { currentPassword: 'not-the-password', newPassword: 'new-password-123' }
			}) as never
		);

		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) {
			expect(result.status).toBe(400);
			expect(result.data?.message).toMatch(/invalid current password/i);
		}
	});

	it('updatePassword updates the password, revokes other sessions, and keeps the current one', async () => {
		const user = await seedUser(testDb.db, {
			passwordHash: await hashPassword('old-password')
		});
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
		const currentSession = { id: 'session-current', userId: user.id, expiresAt };
		await testDb.db.insert(sessionTable).values(currentSession);
		await testDb.db
			.insert(sessionTable)
			.values({ id: 'session-other', userId: user.id, expiresAt });

		const event = createFormRequestEvent({
			method: 'POST',
			url: '/settings',
			user,
			session: currentSession,
			cookies: { 'auth-session': 'current-raw-token' },
			fields: { currentPassword: 'old-password', newPassword: 'new-password-123' }
		});

		const result = await actions.updatePassword(event as never);

		expect(isActionFailure(result)).toBe(false);
		expect(result).toMatchObject({ success: true });

		const [updated] = await testDb.db
			.select()
			.from(userTable)
			.where(eq(userTable.id, user.id));
		expect(await verifyPassword(updated.passwordHash, 'new-password-123')).toBe(true);

		// The session that made the request stays valid; all others are revoked.
		const sessions = await testDb.db
			.select()
			.from(sessionTable)
			.where(eq(sessionTable.userId, user.id));
		expect(sessions.map((row) => row.id)).toEqual(['session-current']);

		// The current session cookie is re-issued so the caller stays logged in.
		expect(event.cookies.get('auth-session')).toBe('current-raw-token');
	});

	it('updatePassword revokes every session when there is no current session', async () => {
		const user = await seedUser(testDb.db, {
			passwordHash: await hashPassword('old-password')
		});
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
		await testDb.db
			.insert(sessionTable)
			.values({ id: 'session-a', userId: user.id, expiresAt });
		await testDb.db
			.insert(sessionTable)
			.values({ id: 'session-b', userId: user.id, expiresAt });

		const result = await actions.updatePassword(
			createFormRequestEvent({
				method: 'POST',
				url: '/settings',
				user,
				session: null,
				fields: { currentPassword: 'old-password', newPassword: 'new-password-123' }
			}) as never
		);

		expect(isActionFailure(result)).toBe(false);
		expect(result).toMatchObject({ success: true });

		const sessions = await testDb.db
			.select()
			.from(sessionTable)
			.where(eq(sessionTable.userId, user.id));
		expect(sessions).toHaveLength(0);
	});

	it('updateNotifications upserts preferences', async () => {
		const user = await seedUser(testDb.db);

		const first = await actions.updateNotifications(
			createFormRequestEvent({
				method: 'POST',
				url: '/settings',
				user,
				fields: {
					emailNotifications: 'false',
					pushNotifications: 'true',
					reminderNotifications: 'false'
				}
			}) as never
		);
		expect(first).toMatchObject({ success: true });

		let rows = await testDb.db
			.select()
			.from(userPreferences)
			.where(eq(userPreferences.userId, user.id));
		expect(rows).toHaveLength(1);
		expect(rows[0].emailNotifications).toBe(0);
		expect(rows[0].pushNotifications).toBe(1);
		expect(rows[0].reminderNotifications).toBe(0);

		await actions.updateNotifications(
			createFormRequestEvent({
				method: 'POST',
				url: '/settings',
				user,
				fields: {
					emailNotifications: 'true',
					pushNotifications: 'false',
					reminderNotifications: 'true'
				}
			}) as never
		);

		rows = await testDb.db
			.select()
			.from(userPreferences)
			.where(eq(userPreferences.userId, user.id));
		expect(rows).toHaveLength(1);
		expect(rows[0].emailNotifications).toBe(1);
		expect(rows[0].pushNotifications).toBe(0);
		expect(rows[0].reminderNotifications).toBe(1);
	});
});
