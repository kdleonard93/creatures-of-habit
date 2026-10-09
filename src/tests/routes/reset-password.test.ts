import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isActionFailure } from '@sveltejs/kit';
import { load, actions } from '../../routes/reset-password/[token]/+page.server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';
import { createFormRequestEvent } from '../helpers/formRequest';
import { hashPassword, verifyPassword } from '$lib/utils/password';
import * as auth from '$lib/server/auth';
import {
	user as userTable,
	session as sessionTable,
	passwordResetToken
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Representative tests for the reset-password page load and action: token
 * validation, password update, session invalidation, and token consumption.
 * See docs/reports/07-tests.md T-2.
 */
describe('reset-password/[token]/+page.server.ts', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
	});

	afterEach(() => {
		testDb.close();
	});

	it('load rejects an invalid token', async () => {
		const event = createRequestEvent({
			url: '/reset-password/not-a-real-token',
			params: { token: 'not-a-real-token' }
		});

		await expect(load(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('load accepts a valid token', async () => {
		const user = await seedUser(testDb.db);
		const token = await auth.createPasswordResetToken(user.id, testDb.db);

		const event = createRequestEvent({
			url: `/reset-password/${token}`,
			params: { token }
		});

		await expect(load(event as never)).resolves.toEqual({ token });
	});

	it('action updates the password, deletes sessions, and consumes the token', async () => {
		const user = await seedUser(testDb.db, {
			passwordHash: await hashPassword('old-password')
		});
		const token = await auth.createPasswordResetToken(user.id, testDb.db);
		await testDb.db.insert(sessionTable).values({
			id: 'reset-session',
			userId: user.id,
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
		});

		const event = createFormRequestEvent({
			method: 'POST',
			url: `/reset-password/${token}`,
			params: { token },
			fields: {
				password: 'brand-new-password',
				confirmPassword: 'brand-new-password'
			}
		});

		await expect(actions.default(event as never)).rejects.toMatchObject({
			status: 302,
			location: '/login'
		});

		const [updated] = await testDb.db
			.select()
			.from(userTable)
			.where(eq(userTable.id, user.id));
		expect(await verifyPassword(updated.passwordHash, 'brand-new-password')).toBe(true);

		const sessions = await testDb.db
			.select()
			.from(sessionTable)
			.where(eq(sessionTable.userId, user.id));
		expect(sessions).toHaveLength(0);

		const tokens = await testDb.db
			.select()
			.from(passwordResetToken)
			.where(eq(passwordResetToken.userId, user.id));
		expect(tokens).toHaveLength(0);
	});

	it('action rejects mismatched passwords', async () => {
		const user = await seedUser(testDb.db);
		const token = await auth.createPasswordResetToken(user.id, testDb.db);

		const result = await actions.default(
			createFormRequestEvent({
				method: 'POST',
				url: `/reset-password/${token}`,
				params: { token },
				fields: { password: 'password-one', confirmPassword: 'password-two' }
			}) as never
		);

		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) {
			expect(result.status).toBe(400);
			expect(result.data?.message).toMatch(/match/i);
		}
	});

	it('action rejects an invalid token', async () => {
		const result = await actions.default(
			createFormRequestEvent({
				method: 'POST',
				url: '/reset-password/bad-token',
				params: { token: 'bad-token' },
				fields: { password: 'password-one', confirmPassword: 'password-one' }
			}) as never
		);

		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(400);
	});
});
