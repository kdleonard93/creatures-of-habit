import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { load } from '../../routes/dashboard/+page.server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser, seedCreature, seedHabit } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';

/**
 * Representative tests for the dashboard page server load: session gating,
 * the unverified-email redirect, and the verified data payload.
 * See docs/reports/07-tests.md T-2.
 */
describe('dashboard/+page.server.ts', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
	});

	afterEach(() => {
		testDb.close();
	});

	it('load redirects unauthenticated visitors to /login', async () => {
		const event = createRequestEvent({ url: '/dashboard', user: null });
		await expect(load(event as never)).rejects.toMatchObject({
			status: 302,
			location: '/login'
		});
	});

	it('load redirects unverified users to /verify-email-pending', async () => {
		const user = await seedUser(testDb.db, { emailVerified: false });

		const event = createRequestEvent({
			url: '/dashboard',
			user: {
				id: user.id,
				username: user.username,
				email: user.email,
				emailVerified: false
			}
		});

		await expect(load(event as never)).rejects.toMatchObject({
			status: 302,
			location: '/verify-email-pending'
		});
	});

	it('load returns the user, creature, habits, and progress for a verified user', async () => {
		const user = await seedUser(testDb.db, { emailVerified: true });
		await seedCreature(testDb.db, user.id, { name: 'Sparky' });
		await seedHabit(testDb.db, user.id, { title: 'Read a book' });

		const event = createRequestEvent({
			url: '/dashboard',
			user: {
				id: user.id,
				username: user.username,
				email: user.email,
				emailVerified: true
			}
		});

		const data = (await load(event as never)) as {
			user: { id: string };
			creature: { name: string } | null;
			habits: Array<{ title: string }>;
			progressStats: { total: number; completed: number };
		};

		expect(data.user.id).toBe(user.id);
		expect(data.creature?.name).toBe('Sparky');
		expect(data.habits).toHaveLength(1);
		expect(data.habits[0].title).toBe('Read a book');
		expect(data.progressStats.total).toBe(1);
	});
});
