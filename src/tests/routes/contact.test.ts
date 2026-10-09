import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isActionFailure } from '@sveltejs/kit';

// Stub the Resend network boundary. The action constructs a client at import
// time, so the mock must be hoisted above the route import.
const { mockSend } = vi.hoisted(() => ({
	mockSend: vi.fn().mockResolvedValue({ id: 'test-email' })
}));
vi.mock('resend', () => ({
	Resend: vi.fn().mockImplementation(() => ({ emails: { send: mockSend } }))
}));

import { actions } from '../../routes/contact/+page.server';
import { createTestDb, type TestDb } from '../db/test-db';
import { createFormRequestEvent } from '../helpers/formRequest';
import { contacts } from '$lib/server/db/schema';

/**
 * Representative tests for the contact form action: storage, email send, and
 * failure handling. Resend is stubbed at the network boundary.
 * See docs/reports/07-tests.md T-2.
 */
describe('contact/+page.server.ts', () => {
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

	it('stores the submission and sends an email', async () => {
		const event = createFormRequestEvent({
			method: 'POST',
			url: '/contact',
			user: null,
			fields: {
				name: 'Ada',
				email: 'ada@example.com',
				message: 'Hello there'
			}
		});

		const result = await actions.default(event as never);
		expect(result).toMatchObject({ success: true });
		expect(mockSend).toHaveBeenCalledOnce();

		const rows = await testDb.db.select().from(contacts);
		expect(rows).toHaveLength(1);
		expect(rows[0].name).toBe('Ada');
		expect(rows[0].email).toBe('ada@example.com');
		expect(rows[0].message).toBe('Hello there');
	});

	it('rejects a submission with missing fields', async () => {
		const result = await actions.default(
			createFormRequestEvent({
				method: 'POST',
				url: '/contact',
				user: null,
				fields: { name: 'Ada', email: 'ada@example.com' }
			}) as never
		);

		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(400);

		const rows = await testDb.db.select().from(contacts);
		expect(rows).toHaveLength(0);
	});

	it('returns a failure and stores nothing when the email send fails', async () => {
		mockSend.mockRejectedValueOnce(new Error('resend unavailable'));

		const result = await actions.default(
			createFormRequestEvent({
				method: 'POST',
				url: '/contact',
				user: null,
				fields: { name: 'Ada', email: 'ada@example.com', message: 'Hi' }
			}) as never
		);

		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(500);

		const rows = await testDb.db.select().from(contacts);
		expect(rows).toHaveLength(0);
	});
});
