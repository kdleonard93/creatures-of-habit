import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isActionFailure } from '@sveltejs/kit';
import { load, actions } from '../../routes/admin/+page.server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';
import { createFormRequestEvent } from '../helpers/formRequest';
import { contacts, userWaitlist } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Tests for the guarded admin review surface: the 404 gate for anonymous and
 * non-admin callers, the submission listing for an admin, and the moderation
 * action. These call the real module against the migrated test database.
 * See docs/reports/06-abuse.md P-5.
 */
describe('admin/+page.server.ts', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
	});

	afterEach(() => {
		testDb.close();
	});

	async function seedSubmissions() {
		await testDb.db.insert(contacts).values([
			{
				name: 'Older',
				email: 'older@example.com',
				message: 'First',
				createdAt: '2026-01-01T00:00:00.000Z'
			},
			{
				name: 'Newer',
				email: 'newer@example.com',
				message: 'Second',
				createdAt: '2026-02-01T00:00:00.000Z'
			}
		]);
		await testDb.db.insert(userWaitlist).values([
			{
				email: 'wait-early@example.com',
				referralSource: 'direct',
				subscribedAt: '2026-01-01T00:00:00.000Z'
			},
			{
				email: 'wait-late@example.com',
				referralSource: 'twitter',
				subscribedAt: '2026-02-01T00:00:00.000Z'
			}
		]);
	}

	it('load returns 404 for an anonymous visitor', async () => {
		const event = createRequestEvent({ url: '/admin', user: null });
		await expect(load(event as never)).rejects.toMatchObject({ status: 404 });
	});

	it('load returns 404 for an authenticated non-admin', async () => {
		const user = await seedUser(testDb.db, { isAdmin: false });

		const event = createRequestEvent({
			url: '/admin',
			user: {
				id: user.id,
				username: user.username,
				email: user.email,
				emailVerified: true,
				isAdmin: false
			}
		});

		await expect(load(event as never)).rejects.toMatchObject({ status: 404 });
	});

	it('load lists contact and waitlist submissions newest first for an admin', async () => {
		await seedSubmissions();
		const admin = await seedUser(testDb.db, {
			email: 'admin@example.com',
			username: 'adminuser',
			isAdmin: true
		});

		const event = createRequestEvent({
			url: '/admin',
			user: {
				id: admin.id,
				username: admin.username,
				email: admin.email,
				emailVerified: true,
				isAdmin: true
			}
		});

		const data = (await load(event as never)) as {
			contacts: Array<{ email: string; status: string; flagged: boolean }>;
			waitlist: Array<{ email: string }>;
		};

		expect(data.contacts.map((row) => row.email)).toEqual([
			'newer@example.com',
			'older@example.com'
		]);
		expect(data.waitlist.map((row) => row.email)).toEqual([
			'wait-late@example.com',
			'wait-early@example.com'
		]);
		expect(data.contacts[0].status).toBe('new');
		expect(data.contacts[0].flagged).toBe(false);
	});

	it('action marks a contact submission reviewed and unflags it', async () => {
		await testDb.db
			.insert(contacts)
			.values({ name: 'Ada', email: 'ada@example.com', message: 'Hi', flagged: true });
		const [row] = await testDb.db.select().from(contacts);
		const admin = await seedUser(testDb.db, { isAdmin: true });

		const result = await actions.update(
			createFormRequestEvent({
				method: 'POST',
				url: '/admin',
				user: { id: admin.id, isAdmin: true },
				fields: { type: 'contact', id: row.id, action: 'reviewed' }
			}) as never
		);

		expect(isActionFailure(result)).toBe(false);
		expect(result).toMatchObject({ success: true });

		const [updated] = await testDb.db.select().from(contacts).where(eq(contacts.id, row.id));
		expect(updated.status).toBe('reviewed');
		expect(updated.flagged).toBe(false);
	});

	it('action marks a waitlist submission spam and flags it', async () => {
		await testDb.db.insert(userWaitlist).values({ email: 'spam@example.com' });
		const [row] = await testDb.db.select().from(userWaitlist);
		const admin = await seedUser(testDb.db, { isAdmin: true });

		const result = await actions.update(
			createFormRequestEvent({
				method: 'POST',
				url: '/admin',
				user: { id: admin.id, isAdmin: true },
				fields: { type: 'waitlist', id: row.id, action: 'spam' }
			}) as never
		);

		expect(isActionFailure(result)).toBe(false);

		const [updated] = await testDb.db
			.select()
			.from(userWaitlist)
			.where(eq(userWaitlist.id, row.id));
		expect(updated.status).toBe('spam');
		expect(updated.flagged).toBe(true);
	});

	it('action clear resets a submission to new and unflagged', async () => {
		await testDb.db
			.insert(contacts)
			.values({ name: 'Ada', email: 'ada@example.com', message: 'Hi', status: 'spam', flagged: true });
		const [row] = await testDb.db.select().from(contacts);
		const admin = await seedUser(testDb.db, { isAdmin: true });

		const result = await actions.update(
			createFormRequestEvent({
				method: 'POST',
				url: '/admin',
				user: { id: admin.id, isAdmin: true },
				fields: { type: 'contact', id: row.id, action: 'clear' }
			}) as never
		);

		expect(isActionFailure(result)).toBe(false);

		const [updated] = await testDb.db.select().from(contacts).where(eq(contacts.id, row.id));
		expect(updated.status).toBe('new');
		expect(updated.flagged).toBe(false);
	});

	it('action rejects a non-admin and leaves the submission unchanged', async () => {
		await testDb.db
			.insert(contacts)
			.values({ name: 'Ada', email: 'ada@example.com', message: 'Hi' });
		const [row] = await testDb.db.select().from(contacts);
		const user = await seedUser(testDb.db, { isAdmin: false });

		const event = createFormRequestEvent({
			method: 'POST',
			url: '/admin',
			user: { id: user.id, isAdmin: false },
			fields: { type: 'contact', id: row.id, action: 'spam' }
		});

		await expect(actions.update(event as never)).rejects.toMatchObject({ status: 404 });

		const [unchanged] = await testDb.db.select().from(contacts).where(eq(contacts.id, row.id));
		expect(unchanged.status).toBe('new');
		expect(unchanged.flagged).toBe(false);
	});
});
