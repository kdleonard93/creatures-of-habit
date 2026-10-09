import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '../../routes/api/waitlist/+server';
import { createTestDb, type TestDb } from '../db/test-db';
import { createRequestEvent } from '../helpers/requestEvent';
import { clearRateLimitStore } from '$lib/server/rateLimit';
import { userWaitlist } from '$lib/server/db/schema';

/**
 * Representative tests for POST /api/waitlist against the real test database.
 * Cover storage, the honeypot and time-to-submit traps, length caps, the
 * trusted-proxy IP derivation, and the shared rate-limit preset.
 * See docs/reports/06-abuse.md P-2, P-4, P-6.
 */
describe('POST /api/waitlist (real handler)', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
		clearRateLimitStore();
	});

	afterEach(() => {
		testDb.close();
	});

	function request(
		body: unknown,
		clientAddress = '10.0.0.1',
		headers: Record<string, string> = {}
	) {
		return createRequestEvent({
			method: 'POST',
			url: '/api/waitlist',
			body,
			clientAddress,
			headers
		});
	}

	async function rows() {
		return testDb.db.select().from(userWaitlist);
	}

	it('stores a new submission, normalizes the email, and derives the IP', async () => {
		const response = await POST(
			request(
				{ email: 'Mixed@Example.com', referralSource: 'twitter' },
				'10.0.0.4',
				// A spoofable header that must be ignored because TRUST_PROXY is false.
				{ 'x-forwarded-for': '203.0.113.9' }
			)
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.success).toBe(true);
		expect(body.redirectTo).toBe('/waitlist/thank-you');

		const stored = await rows();
		expect(stored).toHaveLength(1);
		expect(stored[0].email).toBe('mixed@example.com');
		expect(stored[0].ipAddress).toBe('10.0.0.4');
		expect(stored[0].status).toBe('new');
		expect(stored[0].referralSource).toBe('twitter');
	});

	it('returns alreadySignedUp without duplicating an existing email', async () => {
		await testDb.db.insert(userWaitlist).values({ email: 'taken@example.com' });

		const response = await POST(request({ email: 'taken@example.com' }, '10.0.0.2'));

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.alreadySignedUp).toBe(true);

		const stored = await rows();
		expect(stored).toHaveLength(1);
	});

	it('rejects an invalid email with 400 and stores nothing', async () => {
		const response = await POST(request({ email: 'not-an-email' }, '10.0.0.3'));

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.success).toBe(false);
		expect(await rows()).toHaveLength(0);
	});

	it('rejects an email over the length cap', async () => {
		const response = await POST(
			request({ email: `${'a'.repeat(250)}@example.com` }, '10.0.0.5')
		);

		expect(response.status).toBe(400);
		expect(await rows()).toHaveLength(0);
	});

	it('rejects a referral source over the length cap', async () => {
		const response = await POST(
			request({ email: 'ada@example.com', referralSource: 'x'.repeat(201) }, '10.0.0.6')
		);

		expect(response.status).toBe(400);
		expect(await rows()).toHaveLength(0);
	});

	it('caps a referer-header fallback referral source at 200 characters', async () => {
		const response = await POST(
			request({ email: 'ada@example.com' }, '10.0.0.7', { referer: 'x'.repeat(300) })
		);

		expect(response.status).toBe(200);
		const stored = await rows();
		expect(stored).toHaveLength(1);
		expect(stored[0].referralSource).toHaveLength(200);
	});

	it('silently accepts a filled honeypot without storing', async () => {
		const response = await POST(
			request(
				{ email: 'bot@example.com', website: 'http://spam.example' },
				'10.0.0.8'
			)
		);

		expect(response.status).toBe(200);
		expect((await response.json()).success).toBe(true);
		expect(await rows()).toHaveLength(0);
	});

	it('silently drops a too-fast submission but stores a normal one', async () => {
		const fast = await POST(
			request({ email: 'fast@example.com', renderedAt: Date.now() }, '10.0.0.9')
		);
		expect(fast.status).toBe(200);
		expect((await fast.json()).success).toBe(true);
		expect(await rows()).toHaveLength(0);

		const normal = await POST(
			request({ email: 'normal@example.com', renderedAt: Date.now() - 10000 }, '10.0.0.10')
		);
		expect(normal.status).toBe(200);
		expect(await rows()).toHaveLength(1);
	});

	it('tolerates missing and malformed timestamps', async () => {
		const noTimestamp = await POST(request({ email: 'nots@example.com' }, '10.0.0.11'));
		expect(noTimestamp.status).toBe(200);

		const malformed = await POST(
			request({ email: 'badts@example.com', renderedAt: 'soon' }, '10.0.0.12')
		);
		expect(malformed.status).toBe(200);

		expect(await rows()).toHaveLength(2);
	});

	it('rate limits after the shared WAITLIST preset allows 5 per hour', async () => {
		for (let i = 0; i < 5; i++) {
			const response = await POST(
				request({ email: `user${i}@example.com` }, '10.0.0.13')
			);
			expect(response.status).toBe(200);
		}

		await expect(
			POST(request({ email: 'user5@example.com' }, '10.0.0.13'))
		).rejects.toMatchObject({ status: 429 });

		expect(await rows()).toHaveLength(5);
	});
});
