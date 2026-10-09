import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '../../routes/api/character/boost-stat/+server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser, seedCreature } from '../db/fixtures';
import { createRequestEvent, type TestRequestEvent } from '../helpers/requestEvent';
import { clearRateLimitStore } from '$lib/server/rateLimit';
import { generateSessionToken, createSession, sessionCookieName } from '$lib/server/auth';
import { creature, creatureStats } from '$lib/server/db/schema';

/**
 * Representative tests for POST /api/character/boost-stat. These call the real
 * handler against the real database and pin the S-2 error mapping: domain
 * errors keep their status and safe message, unexpected faults become a
 * generic 500.
 */
describe('POST /api/character/boost-stat (real handler)', () => {
	let testDb: TestDb;
	let owner: Awaited<ReturnType<typeof seedUser>>;
	let cookies: Record<string, string>;

	async function seedStats(creatureId: string, statBoostPoints: number, statValue = 10) {
		await testDb.db.insert(creatureStats).values({
			creatureId,
			strength: statValue,
			dexterity: statValue,
			constitution: statValue,
			intelligence: statValue,
			wisdom: statValue,
			charisma: statValue,
			statBoostPoints
		});
	}

	function boostEvent(body: unknown, requestCookies: Record<string, string>) {
		return createRequestEvent({
			method: 'POST',
			url: '/api/character/boost-stat',
			body,
			cookies: requestCookies
		});
	}

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
		clearRateLimitStore();
		owner = await seedUser(testDb.db);
		const token = generateSessionToken();
		await createSession(token, owner.id);
		cookies = { [sessionCookieName]: token };
	});

	afterEach(() => {
		testDb.close();
	});

	it('returns 401 without a session cookie', async () => {
		const response = await POST(boostEvent({ stat: 'strength', points: 1 }, {}));
		expect(response.status).toBe(401);
	});

	it('returns 400 when stat or points is missing', async () => {
		const response = await POST(boostEvent({ stat: 'strength' }, cookies));
		expect(response.status).toBe(400);
	});

	it('returns 400 for a non-positive point value', async () => {
		const response = await POST(boostEvent({ stat: 'strength', points: 0 }, cookies));
		expect(response.status).toBe(400);
	});

	it('returns 400 for an invalid stat type', async () => {
		const created = await seedCreature(testDb.db, owner.id);
		await seedStats(created.id, 3);

		const response = await POST(boostEvent({ stat: 'magic', points: 1 }, cookies));
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toMatch(/invalid stat/i);
	});

	it('returns 409 when the user has insufficient points', async () => {
		const created = await seedCreature(testDb.db, owner.id);
		await seedStats(created.id, 0);

		const response = await POST(boostEvent({ stat: 'strength', points: 1 }, cookies));
		expect(response.status).toBe(409);
		const body = await response.json();
		expect(body.error).toMatch(/insufficient/i);
	});

	it('spends points and returns the updated stat and balance', async () => {
		const created = await seedCreature(testDb.db, owner.id);
		await seedStats(created.id, 3, 10);

		const response = await POST(boostEvent({ stat: 'strength', points: 2 }, cookies));
		expect(response.status).toBe(200);

		const body = await response.json();
		expect(body).toMatchObject({
			success: true,
			newStatValue: 12,
			remainingPoints: 1,
			source: 'boost'
		});

		const [row] = await testDb.db.select().from(creatureStats);
		expect(row.strength).toBe(12);
		expect(row.statBoostPoints).toBe(1);
	});

	it('rejects a spend that would raise a base stat above the cap', async () => {
		const created = await seedCreature(testDb.db, owner.id);
		await seedStats(created.id, 5, 14);

		const response = await POST(boostEvent({ stat: 'strength', points: 2 }, cookies));
		expect(response.status).toBe(409);
		const body = await response.json();
		expect(body.error).toMatch(/maximum/i);

		const [row] = await testDb.db.select().from(creatureStats);
		expect(row.strength).toBe(14);
		expect(row.statBoostPoints).toBe(5);
	});

	it('rejects an unknown point source with 400', async () => {
		const created = await seedCreature(testDb.db, owner.id);
		await seedStats(created.id, 3, 10);

		const response = await POST(
			boostEvent({ stat: 'strength', points: 1, source: 'gold' }, cookies)
		);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toMatch(/source/i);
	});

	it('spends level points when source is level', async () => {
		const created = await seedCreature(testDb.db, owner.id, { level: 5 });
		await seedStats(created.id, 0, 10);

		const response = await POST(
			boostEvent({ stat: 'strength', points: 1, source: 'level' }, cookies)
		);
		expect(response.status).toBe(200);

		const body = await response.json();
		expect(body).toMatchObject({
			success: true,
			newStatValue: 11,
			remainingPoints: 0,
			source: 'level',
			levelStatPointsSpent: 1,
			availableLevelPoints: 0
		});

		const [row] = await testDb.db.select().from(creatureStats);
		expect(row.strength).toBe(11);
		expect(row.levelStatPointsSpent).toBe(1);
		// Boost points are untouched by a level spend.
		expect(row.statBoostPoints).toBe(0);
	});

	it('rejects a level spend with no level points available', async () => {
		const created = await seedCreature(testDb.db, owner.id, { level: 4 });
		await seedStats(created.id, 0, 10);

		const response = await POST(
			boostEvent({ stat: 'strength', points: 1, source: 'level' }, cookies)
		);
		expect(response.status).toBe(409);
		const body = await response.json();
		expect(body.error).toMatch(/insufficient/i);
	});


	it('returns 400 for a malformed JSON body without leaking parser internals', async () => {
		const event = boostEvent({}, cookies);
		event.request = new Request('http://localhost:5175/api/character/boost-stat', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: '{ not valid json'
		});

		const response = await POST(event as TestRequestEvent);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('Invalid JSON body');
	});

	it('returns a generic 500 when the user has no stats (internal fault)', async () => {
		// Creature exists but no creatureStats row: the service throws a plain
		// Error, which must not be surfaced as a 400 or leak its message.
		await seedCreature(testDb.db, owner.id);
		const rows = await testDb.db.select().from(creature);
		expect(rows).toHaveLength(1);

		const response = await POST(boostEvent({ stat: 'strength', points: 1 }, cookies));
		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body.error).toBe('Internal server error');
		expect(body.error).not.toMatch(/stats not found/i);
	});
});
