import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	generateSessionToken,
	createSession,
	validateSessionToken,
	invalidateSession,
	createPasswordResetToken,
	validatePasswordResetToken,
	createEmailVerificationToken,
	validateEmailVerificationToken,
	markEmailAsVerified,
	cleanupExpiredTokens
} from '$lib/server/auth';
import { createTestDb, type TestDb } from './db/test-db';
import { seedUser } from './db/fixtures';
import { session, user as userTable, passwordResetToken } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Real auth tests against the real module and a real database. Replaces the
 * old auth.test.ts that imported a hand-written clone (docs/reports/07-tests.md
 * T-3).
 */
describe('auth (real)', () => {
	let testDb: TestDb;
	let testUser: Awaited<ReturnType<typeof seedUser>>;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
		testUser = await seedUser(testDb.db);
	});

	afterEach(() => {
		testDb.close();
	});

	it('creates a session and validates the token back to the user', async () => {
		const token = generateSessionToken();
		const created = await createSession(token, testUser.id, testDb.db);

		const result = await validateSessionToken(token, testDb.db);
		expect(result.session?.id).toBe(created.id);
		expect(result.user?.id).toBe(testUser.id);
		expect(result.user?.email).toBe(testUser.email);
	});

	it('returns nulls for an unknown token', async () => {
		const result = await validateSessionToken('not-a-real-token', testDb.db);
		expect(result.session).toBeNull();
		expect(result.user).toBeNull();
	});

	it('deletes an expired session and returns nulls', async () => {
		const token = generateSessionToken();
		const created = await createSession(token, testUser.id, testDb.db);

		await testDb.db
			.update(session)
			.set({ expiresAt: new Date(Date.now() - 1000) })
			.where(eq(session.id, created.id));

		const result = await validateSessionToken(token, testDb.db);
		expect(result.session).toBeNull();

		const remaining = await testDb.db.select().from(session).where(eq(session.id, created.id));
		expect(remaining).toHaveLength(0);
	});

	it('invalidateSession removes the session', async () => {
		const token = generateSessionToken();
		const created = await createSession(token, testUser.id, testDb.db);

		await invalidateSession(created.id, testDb.db);

		const result = await validateSessionToken(token, testDb.db);
		expect(result.session).toBeNull();
	});

	it('round-trips a password reset token and invalidates the previous one', async () => {
		const first = await createPasswordResetToken(testUser.id, testDb.db);
		const second = await createPasswordResetToken(testUser.id, testDb.db);

		// Only the newest token remains valid.
		expect(await validatePasswordResetToken(first, testDb.db)).toBeNull();
		const result = await validatePasswordResetToken(second, testDb.db);
		expect(result?.user.id).toBe(testUser.id);

		const tokens = await testDb.db
			.select()
			.from(passwordResetToken)
			.where(eq(passwordResetToken.userId, testUser.id));
		expect(tokens).toHaveLength(1);
	});

	it('deletes an expired password reset token', async () => {
		const token = await createPasswordResetToken(testUser.id, testDb.db);
		await testDb.db
			.update(passwordResetToken)
			.set({ expiresAt: new Date(Date.now() - 1000) })
			.where(eq(passwordResetToken.userId, testUser.id));

		expect(await validatePasswordResetToken(token, testDb.db)).toBeNull();
	});

	it('round-trips an email verification token and marks the user verified', async () => {
		const token = await createEmailVerificationToken(testUser.id, testUser.email, testDb.db);
		const result = await validateEmailVerificationToken(token, testDb.db);
		expect(result?.user.id).toBe(testUser.id);

		await markEmailAsVerified(testUser.id, testDb.db);
		const [updated] = await testDb.db.select().from(userTable).where(eq(userTable.id, testUser.id));
		expect(updated.emailVerified).toBe(true);
		expect(updated.emailVerifiedAt).toBeTruthy();
	});

	it('cleanupExpiredTokens removes only expired reset tokens', async () => {
		const live = await createPasswordResetToken(testUser.id, testDb.db);
		const other = await seedUser(testDb.db, { email: 'other@example.com', username: 'other' });
		await createPasswordResetToken(other.id, testDb.db);

		await testDb.db
			.update(passwordResetToken)
			.set({ expiresAt: new Date(Date.now() - 1000) })
			.where(eq(passwordResetToken.userId, testUser.id));

		await cleanupExpiredTokens(testDb.db);

		expect(await validatePasswordResetToken(live, testDb.db)).toBeNull();
		const remaining = await testDb.db.select().from(passwordResetToken);
		expect(remaining).toHaveLength(1);
		expect(remaining[0].userId).toBe(other.id);
	});
});
