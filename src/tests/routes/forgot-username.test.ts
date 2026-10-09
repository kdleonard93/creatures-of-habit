import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isActionFailure } from '@sveltejs/kit';

// Stub the Resend network boundary. The action constructs a client at import
// time, so the mock must be hoisted above the route import.
const { mockSend } = vi.hoisted(() => ({
	mockSend: vi.fn().mockResolvedValue({ data: { id: 'test-email' }, error: null })
}));
vi.mock('resend', () => ({
	Resend: vi.fn().mockImplementation(() => ({ emails: { send: mockSend } }))
}));

import { actions } from '../../routes/forgot-username/+page.server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser } from '../db/fixtures';
import { createFormRequestEvent } from '../helpers/formRequest';
import { clearRateLimitStore } from '$lib/server/rateLimit';

/**
 * Representative tests for the forgot-username action: enumeration resistance,
 * HTML escaping of the username, and surfacing a resolved Resend error.
 * See docs/reports/04-auth-security.md A-3 and A-4.
 */
describe('forgot-username/+page.server.ts', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
		clearRateLimitStore();
		mockSend.mockReset();
		mockSend.mockResolvedValue({ data: { id: 'test-email' }, error: null });
	});

	afterEach(() => {
		testDb.close();
	});

	it('returns success for an unknown email without sending', async () => {
		const result = await actions.default(
			createFormRequestEvent({
				method: 'POST',
				url: '/forgot-username',
				user: null,
				fields: { email: 'nobody@example.com' }
			}) as never
		);

		expect(result).toMatchObject({ success: true });
		expect(mockSend).not.toHaveBeenCalled();
	});

	it('sends the username with HTML escaped', async () => {
		await seedUser(testDb.db, {
			email: 'user@example.com',
			username: '<script>alert(1)</script>'
		});

		const result = await actions.default(
			createFormRequestEvent({
				method: 'POST',
				url: '/forgot-username',
				user: null,
				fields: { email: 'user@example.com' }
			}) as never
		);

		expect(result).toMatchObject({ success: true });
		expect(mockSend).toHaveBeenCalledOnce();

		const payload = mockSend.mock.calls[0][0] as { html: string };
		expect(payload.html).not.toContain('<script>');
		expect(payload.html).toContain('&lt;script&gt;');
	});

	it('finds the user when the submitted email has mixed case', async () => {
		// Registration lowercases emails, so a stored address is lowercase.
		// The lookup must normalize the submitted value before querying or a
		// mixed-case submission never matches. See docs/audit-backlog.md S-5.
		await seedUser(testDb.db, { email: 'user@example.com', username: 'testuser' });

		const result = await actions.default(
			createFormRequestEvent({
				method: 'POST',
				url: '/forgot-username',
				user: null,
				fields: { email: '  User@Example.COM  ' }
			}) as never
		);

		expect(result).toMatchObject({ success: true });
		expect(mockSend).toHaveBeenCalledOnce();

		const payload = mockSend.mock.calls[0][0] as { to: string };
		expect(payload.to).toBe('user@example.com');
	});

	it('fails when Resend resolves with an error result', async () => {
		await seedUser(testDb.db, { email: 'user@example.com' });
		mockSend.mockResolvedValue({
			data: null,
			error: { message: 'Domain not verified', name: 'validation_error' }
		});

		const result = await actions.default(
			createFormRequestEvent({
				method: 'POST',
				url: '/forgot-username',
				user: null,
				fields: { email: 'user@example.com' }
			}) as never
		);

		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(500);
	});

	it('requires an email', async () => {
		const result = await actions.default(
			createFormRequestEvent({
				method: 'POST',
				url: '/forgot-username',
				user: null,
				fields: {}
			}) as never
		);

		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(400);
	});
});
