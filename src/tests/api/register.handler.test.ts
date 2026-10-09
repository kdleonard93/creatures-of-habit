import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '../../routes/api/register/+server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser } from '../db/fixtures';
import { createRequestEvent } from '../helpers/requestEvent';
import { clearRateLimitStore } from '$lib/server/rateLimit';
import {
	user,
	creature,
	creatureStats,
	userPreferences,
	session,
	emailVerificationToken
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Stub the true network boundary: Resend. The verification service builds a
// real ResendEmailProvider from RESEND_API_KEY, so the transport must not run.
vi.mock('resend', () => {
	const send = vi.fn().mockResolvedValue({ id: 'test-email-id' });
	return {
		Resend: vi.fn().mockImplementation(() => ({ emails: { send } })),
		__send: send
	};
});

/**
 * Representative tests for POST /api/register. These call the real handler
 * against the real migrated test database. They replace register.api.test.ts,
 * which asserted on its own global.fetch mock. See docs/reports/07-tests.md T-1.
 */
describe('POST /api/register (real handler)', () => {
	let testDb: TestDb;

	function payload(overrides: Record<string, unknown> = {}) {
		return {
			email: 'new@example.com',
			username: 'newuser',
			password: 'password123',
			confirmPassword: 'password123',
			age: 25,
			creature: {
				name: 'Fluffy',
				class: 'warrior',
				race: 'human',
				stats: {
					strength: 12,
					dexterity: 12,
					constitution: 12,
					intelligence: 12,
					wisdom: 12,
					charisma: 12
				}
			},
			general: 'Ready to build habits',
			...overrides
		};
	}

	function register(body: unknown, clientAddress = '10.0.0.1') {
		return createRequestEvent({
			method: 'POST',
			url: '/api/register',
			body,
			clientAddress
		});
	}

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
		clearRateLimitStore();
	});

	afterEach(() => {
		testDb.close();
	});

	it('rejects an invalid email with 400', async () => {
		const response = await POST(register(payload({ email: 'not-an-email' })));
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toMatch(/email/i);
	});

	it('rejects mismatched passwords with 400', async () => {
		const response = await POST(register(payload({ confirmPassword: 'different-password' })));
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toMatch(/match/i);
	});

	it('rejects a stat spread above the initial point budget with 400', async () => {
		const response = await POST(
			register(
				payload({
					creature: {
						name: 'Too Strong',
						class: 'warrior',
						race: 'human',
						stats: {
							strength: 15,
							dexterity: 15,
							constitution: 15,
							intelligence: 15,
							wisdom: 15,
							charisma: 15
						}
					}
				})
			)
		);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toMatch(/stat points/i);
	});

	it('rejects a duplicate email with 400', async () => {
		await seedUser(testDb.db, { email: 'taken@example.com', username: 'someoneelse' });
		const response = await POST(register(payload({ email: 'taken@example.com' })));
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toMatch(/email already exists/i);
	});

	it('rejects a duplicate username with 400', async () => {
		await seedUser(testDb.db, { email: 'other@example.com', username: 'takenuser' });
		const response = await POST(register(payload({ username: 'takenuser' })));
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toMatch(/username is already taken/i);
	});

	it('creates the user, creature, stats, preferences, token, and session on success', async () => {
		const event = register(payload());
		const response = await POST(event);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toMatchObject({
			success: true,
			redirectUrl: '/verify-email-pending',
			emailVerificationSent: true
		});
		expect(body.userId).toBeTypeOf('string');

		const [createdUser] = await testDb.db
			.select()
			.from(user)
			.where(eq(user.email, 'new@example.com'));
		expect(createdUser).toBeDefined();
		expect(createdUser.username).toBe('newuser');

		const [createdCreature] = await testDb.db
			.select()
			.from(creature)
			.where(eq(creature.userId, createdUser.id));
		expect(createdCreature.name).toBe('Fluffy');
		expect(createdCreature.class).toBe('warrior');
		expect(createdCreature.race).toBe('human');

		const [createdStats] = await testDb.db
			.select()
			.from(creatureStats)
			.where(eq(creatureStats.creatureId, createdCreature.id));
		expect(createdStats.strength).toBe(12);
		expect(createdStats.statBoostPoints).toBe(0);

		const [createdPrefs] = await testDb.db
			.select()
			.from(userPreferences)
			.where(eq(userPreferences.userId, createdUser.id));
		expect(createdPrefs.inAppNotifications).toBe(1);
		expect(createdPrefs.reminderNotifications).toBe(1);

		const tokens = await testDb.db
			.select()
			.from(emailVerificationToken)
			.where(eq(emailVerificationToken.userId, createdUser.id));
		expect(tokens).toHaveLength(1);

		const sessions = await testDb.db
			.select()
			.from(session)
			.where(eq(session.userId, createdUser.id));
		expect(sessions).toHaveLength(1);

		expect(event.cookies.get('auth-session')).toBeTypeOf('string');
	});

	it('rate limits after five authentication attempts', async () => {
		for (let i = 0; i < 5; i++) {
			const response = await POST(register({}, '10.9.9.9'));
			expect(response.status).toBe(400);
		}

		await expect(POST(register({}, '10.9.9.9'))).rejects.toMatchObject({ status: 429 });
	});
});
