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
import { clearRateLimitStore } from '$lib/server/rateLimit';

/**
 * Representative tests for the contact form action: storage, email send, and
 * failure handling. Resend is stubbed at the network boundary.
 * See docs/reports/07-tests.md T-2 and docs/reports/06-abuse.md P-1, P-3, P-4.
 */
describe('contact/+page.server.ts', () => {
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

	function submit(fields: Record<string, string>) {
		return createFormRequestEvent({
			method: 'POST',
			url: '/contact',
			user: null,
			fields
		});
	}

	it('stores the submission and sends an email', async () => {
		const event = submit({
			name: 'Ada',
			email: 'ada@example.com',
			message: 'Hello there'
		});

		const result = await actions.default(event as never);
		expect(result).toMatchObject({ success: true });
		expect(mockSend).toHaveBeenCalledOnce();

		const rows = await testDb.db.select().from(contacts);
		expect(rows).toHaveLength(1);
		expect(rows[0].name).toBe('Ada');
		expect(rows[0].email).toBe('ada@example.com');
		expect(rows[0].message).toBe('Hello there');
		expect(rows[0].status).toBe('new');
	});

	it('uses a fixed subject and validated reply-to, with a plain-text body', async () => {
		await actions.default(
			submit({ name: 'Ada <script>', email: 'Ada@Example.com', message: 'Hello there' }) as never
		);

		expect(mockSend).toHaveBeenCalledOnce();
		const payload = mockSend.mock.calls[0][0] as {
			subject: string;
			replyTo: string;
			text: string;
		};
		expect(payload.subject).toBe('New contact form submission');
		// The raw name never reaches the subject header.
		expect(payload.subject).not.toContain('Ada');
		expect(payload.replyTo).toBe('ada@example.com');
		expect(payload.text).toContain('Hello there');
		expect(payload.text).toContain('ada@example.com');
	});

	it('rejects a submission with missing fields', async () => {
		const result = await actions.default(
			submit({ name: 'Ada', email: 'ada@example.com' }) as never
		);

		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(400);

		const rows = await testDb.db.select().from(contacts);
		expect(rows).toHaveLength(0);
		expect(mockSend).not.toHaveBeenCalled();
	});

	it('rejects an invalid email and stores nothing', async () => {
		const result = await actions.default(
			submit({ name: 'Ada', email: 'not-an-email', message: 'Hi' }) as never
		);

		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(400);

		const rows = await testDb.db.select().from(contacts);
		expect(rows).toHaveLength(0);
		expect(mockSend).not.toHaveBeenCalled();
	});

	it('rejects a name over the length cap', async () => {
		const result = await actions.default(
			submit({ name: 'x'.repeat(101), email: 'ada@example.com', message: 'Hi' }) as never
		);

		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(400);

		const rows = await testDb.db.select().from(contacts);
		expect(rows).toHaveLength(0);
	});

	it('rejects a message over the length cap', async () => {
		const result = await actions.default(
			submit({ name: 'Ada', email: 'ada@example.com', message: 'x'.repeat(5001) }) as never
		);

		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(400);

		const rows = await testDb.db.select().from(contacts);
		expect(rows).toHaveLength(0);
	});

	it('silently accepts a filled honeypot without storing or emailing', async () => {
		const result = await actions.default(
			submit({
				name: 'Ada',
				email: 'ada@example.com',
				message: 'Hi',
				website: 'http://spam.example'
			}) as never
		);

		expect(result).toMatchObject({ success: true });
		expect(mockSend).not.toHaveBeenCalled();

		const rows = await testDb.db.select().from(contacts);
		expect(rows).toHaveLength(0);
	});

	it('returns a failure and stores nothing when the email send fails', async () => {
		mockSend.mockRejectedValueOnce(new Error('resend unavailable'));

		const result = await actions.default(
			submit({ name: 'Ada', email: 'ada@example.com', message: 'Hi' }) as never
		);

		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(500);

		const rows = await testDb.db.select().from(contacts);
		expect(rows).toHaveLength(0);
	});

	it('rate limits after the shared CONTACT preset allows 3 per hour', async () => {
		for (let i = 0; i < 3; i++) {
			const result = await actions.default(
				submit({ name: `Ada ${i}`, email: `ada${i}@example.com`, message: 'Hi' }) as never
			);
			expect(result).toMatchObject({ success: true });
		}

		await expect(
			actions.default(
				submit({ name: 'Ada 4', email: 'ada4@example.com', message: 'Hi' }) as never
			)
		).rejects.toMatchObject({ status: 429 });

		const rows = await testDb.db.select().from(contacts);
		expect(rows).toHaveLength(3);
	});
});
