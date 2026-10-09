import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '../../routes/api/validate/+server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser, seedCreature } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';
import { clearRateLimitStore } from '$lib/server/rateLimit';

/**
 * Representative tests for the GET /api/validate availability endpoint. These
 * replace validate.api.test.ts, which POSTed to a GET-only route and asserted
 * on a fetch mock. See docs/reports/07-tests.md T-1.
 *
 * Note: this route uses a private module-level limiter (10 per minute per IP),
 * separate from the shared rateLimit store, so keep total requests per file
 * under the cap. clearRateLimitStore() does not clear it.
 */
describe('GET /api/validate (real handler)', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
		clearRateLimitStore();
	});

	afterEach(() => {
		testDb.close();
	});

	function request(type?: string, value?: string, clientAddress = '10.4.4.4') {
		const params = new URLSearchParams();
		if (type !== undefined) params.set('type', type);
		if (value !== undefined) params.set('value', value);
		const query = params.toString();
		return createRequestEvent({
			method: 'GET',
			url: `/api/validate${query ? `?${query}` : ''}`,
			clientAddress
		});
	}

	it('returns 400 when type and value are missing', async () => {
		const response = await GET(request());
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.available).toBe(false);
		expect(body.error).toMatch(/required/i);
	});

	it('returns 400 for an unknown validation type', async () => {
		const response = await GET(request('banana', 'whatever'));
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toMatch(/invalid validation type/i);
	});

	it('returns 400 for a value that fails the per-type regex', async () => {
		const response = await GET(request('email', 'not-an-email'));
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.available).toBe(false);
		expect(body.error).toMatch(/invalid email format/i);
	});

	it('reports an unused email as available', async () => {
		const response = await GET(request('email', 'fresh@example.com'));
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toEqual({ available: true });
	});

	it('reports an existing email as unavailable', async () => {
		await seedUser(testDb.db, { email: 'taken@example.com', username: 'takenuser' });

		const response = await GET(request('email', 'taken@example.com'));
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toEqual({ available: false });
	});

	it('reports username availability against the user table', async () => {
		await seedUser(testDb.db, { username: 'existingname' });

		const taken = await GET(request('username', 'existingname'));
		expect(taken.status).toBe(200);
		expect(await taken.json()).toEqual({ available: false });

		const free = await GET(request('username', 'brandnewname'));
		expect(free.status).toBe(200);
		expect(await free.json()).toEqual({ available: true });
	});

	it('reports creature name availability against the creature table', async () => {
		const owner = await seedUser(testDb.db);
		await seedCreature(testDb.db, owner.id, { name: 'TakenCreature' });

		const taken = await GET(request('creature_name', 'TakenCreature'));
		expect(taken.status).toBe(200);
		expect(await taken.json()).toEqual({ available: false });

		const free = await GET(request('creature_name', 'FreeCreature'));
		expect(free.status).toBe(200);
		expect(await free.json()).toEqual({ available: true });
	});

	it('sanitizes angle brackets before validating', async () => {
		const response = await GET(request('username', '<bob>'));
		expect(response.status).toBe(200);
		// `<bob>` becomes `bob`, which is a valid username.
		expect(await response.json()).toEqual({ available: true });
	});
});
