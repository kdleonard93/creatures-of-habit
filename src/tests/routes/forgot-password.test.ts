import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isActionFailure, isHttpError } from '@sveltejs/kit';

// Stub the Resend network boundary. The action constructs a client at import
// time, so the mock must be hoisted above the route import.
const { mockSend } = vi.hoisted(() => ({
	mockSend: vi.fn().mockResolvedValue({ id: 'test-email' })
}));
vi.mock('resend', () => ({
	Resend: vi.fn().mockImplementation(() => ({ emails: { send: mockSend } }))
}));

import { actions } from '../../routes/forgot-password/+page.server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser } from '../db/fixtures';
import { createFormRequestEvent } from '../helpers/formRequest';
import { clearRateLimitStore } from '$lib/server/rateLimit';
import { passwordResetToken } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Representative tests for the forgot-password action: the always-success
 * response (enumeration resistance) and the per-IP rate limit.
 * See docs/reports/07-tests.md T-2 and docs/domain-rules.md.
 */
describe('forgot-password/+page.server.ts', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
		clearRateLimitStore();
		mockSend.mockReset();
		mockSend.mockResolvedValue({ id: 'test-email' });
	});

	afterEach(() => {
		testDb.close();
	});

	it('returns success for an unknown username', async () => {
		const result = await actions.default(
			createFormRequestEvent({
				method: 'POST',
				url: '/forgot-password',
				user: null,
				fields: { username: 'nobody' }
			}) as never
		);

		expect(result).toMatchObject({ success: true });
		expect(mockSend).not.toHaveBeenCalled();
	});

	it('returns success and creates a reset token for a known username', async () => {
		const user = await seedUser(testDb.db, { username: 'alice' });

		const result = await actions.default(
			createFormRequestEvent({
				method: 'POST',
				url: '/forgot-password',
				user: null,
				fields: { username: 'alice' }
			}) as never
		);

		expect(result).toMatchObject({ success: true });

		const tokens = await testDb.db
			.select()
			.from(passwordResetToken)
			.where(eq(passwordResetToken.userId, user.id));
		expect(tokens).toHaveLength(1);
		expect(mockSend).toHaveBeenCalledOnce();
	});

	it('requires a username', async () => {
		const result = await actions.default(
			createFormRequestEvent({
				method: 'POST',
				url: '/forgot-password',
				user: null,
				fields: {}
			}) as never
		);

		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(400);
	});

	it('is rate limited after three requests', async () => {
		const makeEvent = () =>
			createFormRequestEvent({
				method: 'POST',
				url: '/forgot-password',
				user: null,
				fields: { username: 'nobody' }
			});

		await actions.default(makeEvent() as never);
		await actions.default(makeEvent() as never);
		await actions.default(makeEvent() as never);

		const thrown = await actions.default(makeEvent() as never).catch((error) => error);
		expect(isHttpError(thrown)).toBe(true);
		if (isHttpError(thrown)) expect(thrown.status).toBe(429);
	});
});
