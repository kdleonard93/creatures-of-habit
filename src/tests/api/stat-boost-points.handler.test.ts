import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '../../routes/api/character/stat-boost-points/+server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser, seedCreature } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';
import { clearRateLimitStore } from '$lib/server/rateLimit';
import { generateSessionToken, createSession, sessionCookieName } from '$lib/server/auth';
import { creatureStats } from '$lib/server/db/schema';

/**
 * The stat-boost-points endpoint now also reports the level-derived
 * allocatable points (floor(level / 5) minus spent) alongside the banked boost
 * points. See docs/stats-design.md.
 */
describe('GET /api/character/stat-boost-points (real handler)', () => {
	let testDb: TestDb;
	let owner: Awaited<ReturnType<typeof seedUser>>;
	let cookies: Record<string, string>;

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
		const response = await GET(
			createRequestEvent({ method: 'GET', url: '/api/character/stat-boost-points' })
		);
		expect(response.status).toBe(401);
	});

	it('reports the creature level and the available level points', async () => {
		const created = await seedCreature(testDb.db, owner.id, { level: 15 });
		await testDb.db.insert(creatureStats).values({
			creatureId: created.id,
			strength: 10,
			dexterity: 10,
			constitution: 10,
			intelligence: 10,
			wisdom: 10,
			charisma: 10,
			statBoostPoints: 4,
			levelStatPointsSpent: 1
		});

		const response = await GET(
			createRequestEvent({
				method: 'GET',
				url: '/api/character/stat-boost-points',
				cookies
			})
		);
		expect(response.status).toBe(200);

		const body = await response.json();
		expect(body).toMatchObject({
			statBoostPoints: 4,
			level: 15,
			levelStatPointsEarned: 3,
			levelStatPointsSpent: 1,
			availableLevelPoints: 2
		});
	});
});
