import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Stub the Resend network boundary used by the fire-and-forget welcome email.
const { mockSend } = vi.hoisted(() => ({
	mockSend: vi.fn().mockResolvedValue({ id: 'test-email' })
}));
vi.mock('resend', () => ({
	Resend: vi.fn().mockImplementation(() => ({ emails: { send: mockSend } }))
}));

import { load } from '../../routes/verify-email/[token]/+page.server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';
import * as auth from '$lib/server/auth';
import { user as userTable, emailVerificationToken } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Representative tests for the verify-email page load: token validation plus
 * the mark-verified and consume-token side effects. See docs/reports/07-tests.md T-2.
 */
describe('verify-email/[token]/+page.server.ts', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
		mockSend.mockReset();
		mockSend.mockResolvedValue({ id: 'test-email' });
	});

	afterEach(() => {
		testDb.close();
	});

	it('load rejects an invalid token', async () => {
		const event = createRequestEvent({
			url: '/verify-email/not-a-real-token',
			params: { token: 'not-a-real-token' }
		});

		await expect(load(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('load marks the user verified and invalidates the token', async () => {
		const user = await seedUser(testDb.db, { emailVerified: false });
		const token = await auth.createEmailVerificationToken(user.id, user.email, testDb.db);

		const event = createRequestEvent({
			url: `/verify-email/${token}`,
			params: { token }
		});

		const data = (await load(event as never)) as {
			success: boolean;
			username: string;
			email: string;
		};

		expect(data.success).toBe(true);
		expect(data.username).toBe(user.username);
		expect(data.email).toBe(user.email);

		const [updated] = await testDb.db
			.select()
			.from(userTable)
			.where(eq(userTable.id, user.id));
		expect(updated.emailVerified).toBe(true);
		expect(updated.emailVerifiedAt).toBeTruthy();

		const tokens = await testDb.db
			.select()
			.from(emailVerificationToken)
			.where(eq(emailVerificationToken.userId, user.id));
		expect(tokens).toHaveLength(0);
	});
});
