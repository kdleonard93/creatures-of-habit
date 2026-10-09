import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { load } from '../../routes/habits/+page.server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser, seedCreature, seedHabit } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';

/**
 * Representative tests for the habits page server load: session gating and
 * the habits plus creature payload. See docs/reports/07-tests.md T-2.
 */
describe('habits/+page.server.ts', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
	});

	afterEach(() => {
		testDb.close();
	});

	it('load redirects unauthenticated visitors to /login', async () => {
		const event = createRequestEvent({ url: '/habits', user: null });
		await expect(load(event as never)).rejects.toMatchObject({
			status: 302,
			location: '/login'
		});
	});

	it('load returns the user habits and creature level/experience', async () => {
		const user = await seedUser(testDb.db);
		await seedCreature(testDb.db, user.id, { level: 3, experience: 120 });
		await seedHabit(testDb.db, user.id, { title: 'Meditate' });

		const event = createRequestEvent({ url: '/habits', user });

		const data = (await load(event as never)) as {
			habits: Array<{ title: string }>;
			categories: Array<{ id: string; name: string }>;
			level: number;
			experience: number;
		};

		expect(data.habits).toHaveLength(1);
		expect(data.habits[0].title).toBe('Meditate');
		expect(data.level).toBe(3);
		expect(data.experience).toBe(120);
	});
});
