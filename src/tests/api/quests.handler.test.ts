import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET as dailyGet } from '../../routes/api/quests/daily/+server';
import { POST as activatePost } from '../../routes/api/quests/[questId]/activate/+server';
import { POST as answerPost } from '../../routes/api/quests/[questId]/answer/+server';
import { GET as progressGet } from '../../routes/api/quests/[questId]/progress/+server';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser, seedCreature } from '../db/fixtures';
import { createRequestEvent, type TestRequestEvent } from '../helpers/requestEvent';
import { clearRateLimitStore } from '$lib/server/rateLimit';
import { generateSessionToken, createSession, sessionCookieName } from '$lib/server/auth';
import {
	questInstances,
	questQuestions,
	questTemplates,
	questAnswers,
	creature,
	creatureStats
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Representative tests for the quest JSON endpoints. These call the real
 * handlers against the real database and replace quests.api.test.ts, which
 * asserted on local literals and never imported a handler.
 *
 * Current behavior note: stat checks are probability based
 * (`calculateStatCheckChance` plus a single roll), not the previous
 * deterministic `userStat >= difficultyThreshold` (C-2). The answer tests pin
 * the roll with a `Math.random` spy so the outcome is deterministic.
 */
describe('quest endpoints (real handlers)', () => {
	let testDb: TestDb;
	let owner: Awaited<ReturnType<typeof seedUser>>;
	let other: Awaited<ReturnType<typeof seedUser>>;
	let ownerCookies: Record<string, string>;
	let otherCookies: Record<string, string>;
	let template: Awaited<ReturnType<typeof seedQuestTemplateRow>>;

	async function seedStatsFor(userId: string, statValue = 12) {
		const created = await seedCreature(testDb.db, userId, { name: `Creature ${userId.slice(0, 6)}` });
		await testDb.db.insert(creatureStats).values({
			creatureId: created.id,
			strength: statValue,
			dexterity: statValue,
			constitution: statValue,
			intelligence: statValue,
			wisdom: statValue,
			charisma: statValue,
			statBoostPoints: 0
		});
		return created;
	}

	async function seedQuestTemplateRow() {
		const [row] = await testDb.db
			.insert(questTemplates)
			.values({
				title: 'Template Quest',
				description: 'A seeded quest template',
				setting: 'forest',
				difficulty: 'easy'
			})
			.returning();
		return row;
	}

	async function seedQuest(
		userId: string,
		overrides: Partial<typeof questInstances.$inferInsert> = {}
	) {
		const [row] = await testDb.db
			.insert(questInstances)
			.values({
				userId,
				templateId: template.id,
				title: 'Seeded Quest',
				description: 'A seeded quest',
				narrative: 'Once upon a test',
				status: 'available',
				...overrides
			})
			.returning();
		return row;
	}

	async function seedQuestions(
		questInstanceId: string,
		options: { correctChoice?: 'A' | 'B'; difficultyThreshold?: number; count?: number } = {}
	) {
		const { correctChoice = 'A', difficultyThreshold = 10, count = 5 } = options;
		const rows = Array.from({ length: count }, (_, index) => ({
			questInstanceId,
			questionNumber: index + 1,
			questionText: `Question ${index + 1}`,
			choiceA: 'Choice A',
			choiceB: 'Choice B',
			correctChoice,
			requiredStat: 'strength' as const,
			difficultyThreshold
		}));
		return testDb.db.insert(questQuestions).values(rows).returning();
	}

	async function cookieFor(userId: string) {
		const token = generateSessionToken();
		await createSession(token, userId);
		return { [sessionCookieName]: token };
	}

	function dailyEvent(cookies: Record<string, string> = {}) {
		return createRequestEvent({ method: 'GET', url: '/api/quests/daily', cookies });
	}

	function activateEvent(questId: string | undefined, cookies: Record<string, string>) {
		return createRequestEvent({
			method: 'POST',
			url: `/api/quests/${questId ?? ''}/activate`,
			params: questId ? { questId } : {},
			cookies
		});
	}

	function answerEvent(
		questId: string | undefined,
		body: unknown,
		cookies: Record<string, string>
	) {
		return createRequestEvent({
			method: 'POST',
			url: `/api/quests/${questId ?? ''}/answer`,
			params: questId ? { questId } : {},
			body,
			cookies
		});
	}

	function progressEvent(questId: string | undefined, cookies: Record<string, string>) {
		return createRequestEvent({
			method: 'GET',
			url: `/api/quests/${questId ?? ''}/progress`,
			params: questId ? { questId } : {},
			cookies
		});
	}

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
		clearRateLimitStore();
		owner = await seedUser(testDb.db);
		other = await seedUser(testDb.db, { email: 'other@example.com', username: 'otheruser' });
		await seedStatsFor(owner.id);
		await seedStatsFor(other.id);
		ownerCookies = await cookieFor(owner.id);
		otherCookies = await cookieFor(other.id);
		template = await seedQuestTemplateRow();
	});

	afterEach(() => {
		testDb.close();
	});

	describe('GET /api/quests/daily', () => {
		it('returns 401 without a session cookie', async () => {
			const response = await dailyGet(dailyEvent());
			expect(response.status).toBe(401);
		});

		it('returns 401 for an unknown session token', async () => {
			const response = await dailyGet(dailyEvent({ [sessionCookieName]: 'bogus-token' }));
			expect(response.status).toBe(401);
		});

		it('creates a daily quest with five questions', async () => {
			const response = await dailyGet(dailyEvent(ownerCookies));
			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.id).toBeTypeOf('string');
			expect(body.status).toBe('available');
			expect(body.currentQuestion).toBe(0);
			expect(body.totalQuestions).toBe(5);

			const quests = await testDb.db
				.select()
				.from(questInstances)
				.where(eq(questInstances.userId, owner.id));
			expect(quests).toHaveLength(1);

			const questions = await testDb.db
				.select()
				.from(questQuestions)
				.where(eq(questQuestions.questInstanceId, body.id));
			expect(questions).toHaveLength(5);
		});

		it('returns the same quest on a second call in the same day', async () => {
			const first = await dailyGet(dailyEvent(ownerCookies));
			const firstBody = await first.json();

			const second = await dailyGet(dailyEvent(ownerCookies));
			const secondBody = await second.json();

			expect(secondBody.id).toBe(firstBody.id);
			const quests = await testDb.db
				.select()
				.from(questInstances)
				.where(eq(questInstances.userId, owner.id));
			expect(quests).toHaveLength(1);
		});
	});

	describe('POST /api/quests/[questId]/activate', () => {
		it('returns 401 without a session cookie', async () => {
			const quest = await seedQuest(owner.id);
			const response = await activatePost(activateEvent(quest.id, {}));
			expect(response.status).toBe(401);
		});

		it('returns 400 when the quest id is missing', async () => {
			const response = await activatePost(activateEvent(undefined, ownerCookies));
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toMatch(/quest id is required/i);
		});

		it('activates an available quest and returns the first question', async () => {
			const quest = await seedQuest(owner.id);
			await seedQuestions(quest.id);

			const response = await activatePost(activateEvent(quest.id, ownerCookies));
			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.quest.status).toBe('active');
			expect(body.firstQuestion.questionNumber).toBe(1);
			expect(body.firstQuestion).not.toHaveProperty('correctChoice');

			const [row] = await testDb.db
				.select()
				.from(questInstances)
				.where(eq(questInstances.id, quest.id));
			expect(row.status).toBe('active');
			expect(row.activatedAt).toBeTruthy();
		});

		it('rejects activating an already active quest with 409', async () => {
			const quest = await seedQuest(owner.id, { status: 'active' });
			await seedQuestions(quest.id);

			const response = await activatePost(activateEvent(quest.id, ownerCookies));
			expect(response.status).toBe(409);
			const body = await response.json();
			expect(body.error).toMatch(/not available/i);
		});

		it('returns 404 for an unknown quest', async () => {
			const response = await activatePost(activateEvent('missing-quest', ownerCookies));
			expect(response.status).toBe(404);
			const body = await response.json();
			expect(body.error).toMatch(/quest not found/i);
		});

		it('rejects activating another user quest with 404', async () => {
			const quest = await seedQuest(other.id);
			await seedQuestions(quest.id);

			const response = await activatePost(activateEvent(quest.id, ownerCookies));
			expect(response.status).toBe(404);
			const body = await response.json();
			expect(body.error).toMatch(/quest not found/i);

			const [row] = await testDb.db
				.select()
				.from(questInstances)
				.where(eq(questInstances.id, quest.id));
			expect(row.status).toBe('available');
		});
	});

	describe('POST /api/quests/[questId]/answer', () => {
		beforeEach(() => {
			// Quest stat checks are probability based (C-2). Pin the roll to 0
			// so the stat-check outcome is deterministic in these tests.
			vi.spyOn(Math, 'random').mockReturnValue(0);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('returns 401 without a session cookie', async () => {
			const quest = await seedQuest(owner.id, { status: 'active' });
			const response = await answerPost(answerEvent(quest.id, {}, {}));
			expect(response.status).toBe(401);
		});

		it('returns 400 when question id or choice is missing', async () => {
			const quest = await seedQuest(owner.id, { status: 'active' });
			await seedQuestions(quest.id);

			const response = await answerPost(answerEvent(quest.id, {}, ownerCookies));
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toMatch(/required/i);
		});

		it('returns 400 for an invalid choice', async () => {
			const quest = await seedQuest(owner.id, { status: 'active' });
			const questions = await seedQuestions(quest.id);

			const response = await answerPost(
				answerEvent(quest.id, { questionId: questions[0].id, choice: 'C' }, ownerCookies)
			);
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toMatch(/choice must be a or b/i);
		});

		it('returns 409 when the quest is not active yet', async () => {
			const quest = await seedQuest(owner.id, { status: 'available' });
			const questions = await seedQuestions(quest.id);

			const response = await answerPost(
				answerEvent(quest.id, { questionId: questions[0].id, choice: 'A' }, ownerCookies)
			);
			expect(response.status).toBe(409);
			const body = await response.json();
			expect(body.error).toMatch(/not active/i);
		});

		it('records a correct answer and advances to the next question', async () => {
			const quest = await seedQuest(owner.id, { status: 'active' });
			const questions = await seedQuestions(quest.id, {
				correctChoice: 'A',
				difficultyThreshold: 10
			});

			const response = await answerPost(
				answerEvent(quest.id, { questionId: questions[0].id, choice: 'A' }, ownerCookies)
			);
			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.correct).toBe(true);
			expect(body.questComplete).toBe(false);
			expect(body.rewards).toBeNull();
			expect(body.nextQuestion.questionNumber).toBe(2);

			const answers = await testDb.db
				.select()
				.from(questAnswers)
				.where(eq(questAnswers.questInstanceId, quest.id));
			expect(answers).toHaveLength(1);
			expect(answers[0].wasCorrect).toBe(true);
			// Roll pinned to 0: 0 < chance (12/22), so the stat check passes.
			expect(answers[0].passedStatCheck).toBe(true);

			const [row] = await testDb.db
				.select()
				.from(questInstances)
				.where(eq(questInstances.id, quest.id));
			expect(row.currentQuestion).toBe(1);
			expect(row.correctAnswers).toBe(1);
			expect(row.statChecksPassed).toBe(1);
		});

		it('rejects an out-of-order question with 409 and a generic message', async () => {
			const quest = await seedQuest(owner.id, { status: 'active' });
			const questions = await seedQuestions(quest.id);

			const response = await answerPost(
				answerEvent(quest.id, { questionId: questions[1].id, choice: 'A' }, ownerCookies)
			);
			expect(response.status).toBe(409);
			const body = await response.json();
			expect(body.error).toMatch(/not the next one/i);
			expect(body.error).not.toMatch(/expected question \d/i);
		});

		it('rejects answering a question that already has an answer with 409', async () => {
			const quest = await seedQuest(owner.id, { status: 'active' });
			const questions = await seedQuestions(quest.id, { correctChoice: 'A' });

			// Pre-seed the answer for the expected first question so the
			// already-answered branch (not the out-of-order branch) is exercised.
			await testDb.db.insert(questAnswers).values({
				questInstanceId: quest.id,
				questionId: questions[0].id,
				userChoice: 'A',
				wasCorrect: true,
				passedStatCheck: true
			});

			const response = await answerPost(
				answerEvent(quest.id, { questionId: questions[0].id, choice: 'A' }, ownerCookies)
			);
			expect(response.status).toBe(409);
			const body = await response.json();
			expect(body.error).toMatch(/already been answered/i);
		});

		it('rejects answering another user quest with 404', async () => {
			const quest = await seedQuest(other.id, { status: 'active' });
			const questions = await seedQuestions(quest.id);

			const response = await answerPost(
				answerEvent(quest.id, { questionId: questions[0].id, choice: 'A' }, ownerCookies)
			);
			expect(response.status).toBe(404);
			const body = await response.json();
			expect(body.error).toMatch(/quest not found/i);
		});

		it('returns 400 for a malformed JSON body without leaking parser internals', async () => {
			const quest = await seedQuest(owner.id, { status: 'active' });
			await seedQuestions(quest.id);

			const event = answerEvent(quest.id, {}, ownerCookies);
			event.request = new Request('http://localhost:5175/api/quests/answer', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: '{ not valid json'
			});

			const response = await answerPost(event);
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe('Invalid JSON body');
		});

		it('returns a generic 500 when the user has no stats (internal fault)', async () => {
			// A user with a quest but no creatureStats: the service throws a plain
			// Error, which must not be surfaced as a 400 or leak its message.
			const statless = await seedUser(testDb.db, {
				email: 'statless@example.com',
				username: 'statless'
			});
			const cookies = await cookieFor(statless.id);
			const quest = await seedQuest(statless.id, { status: 'active' });
			const questions = await seedQuestions(quest.id);

			const response = await answerPost(
				answerEvent(quest.id, { questionId: questions[0].id, choice: 'A' }, cookies)
			);
			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toBe('Internal server error');
			expect(body.error).not.toMatch(/stats not found/i);
		});

		it('completes a full quest, awards experience, and updates the creature', async () => {
			const quest = await seedQuest(owner.id, { status: 'active' });
			const questions = await seedQuestions(quest.id, {
				correctChoice: 'A',
				difficultyThreshold: 10
			});

			let lastBody: Record<string, unknown> | undefined;
			for (const question of questions) {
				const response = await answerPost(
					answerEvent(quest.id, { questionId: question.id, choice: 'A' }, ownerCookies)
				);
				expect(response.status).toBe(200);
				lastBody = await response.json();
				expect(lastBody.correct).toBe(true);
			}

			expect(lastBody?.questComplete).toBe(true);
			expect(lastBody?.rewards).toEqual({ exp: 150, statBoostPoints: 2 });

			const [questRow] = await testDb.db
				.select()
				.from(questInstances)
				.where(eq(questInstances.id, quest.id));
			expect(questRow.status).toBe('completed');
			expect(questRow.completedAt).toBeTruthy();

			const [creatureRow] = await testDb.db
				.select()
				.from(creature)
				.where(eq(creature.userId, owner.id));
			expect(creatureRow.experience).toBe(150);

			const [statsRow] = await testDb.db
				.select()
				.from(creatureStats)
				.where(eq(creatureStats.creatureId, creatureRow.id));
			expect(statsRow.statBoostPoints).toBe(2);
		});
	});

	describe('GET /api/quests/[questId]/progress', () => {
		it('returns 401 without a session cookie', async () => {
			const quest = await seedQuest(owner.id);
			const response = await progressGet(progressEvent(quest.id, {}));
			expect(response.status).toBe(401);
		});

		it('returns 400 when the quest id is missing', async () => {
			const response = await progressGet(progressEvent(undefined, ownerCookies));
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toMatch(/quest id is required/i);
		});

		it('returns 404 for an unknown quest', async () => {
			const response = await progressGet(progressEvent('missing-quest', ownerCookies));
			expect(response.status).toBe(404);
		});

		it('returns 404 for another user quest', async () => {
			const quest = await seedQuest(other.id);
			await seedQuestions(quest.id);

			const response = await progressGet(progressEvent(quest.id, ownerCookies));
			expect(response.status).toBe(404);
		});

		it('returns progress with safe questions and strips the correct answer', async () => {
			const quest = await seedQuest(owner.id, {
				status: 'active',
				currentQuestion: 2,
				correctAnswers: 1
			});
			await seedQuestions(quest.id);

			const response = await progressGet(progressEvent(quest.id, ownerCookies));
			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.currentQuestion).toBe(2);
			expect(body.totalQuestions).toBe(5);
			expect(body.correctAnswers).toBe(1);
			expect(body.questions).toHaveLength(5);
			expect(body.questions[0]).toHaveProperty('requiredStat', 'strength');
			expect(body.questions[0]).toHaveProperty('difficultyThreshold', 10);
			expect(body.questions[0]).not.toHaveProperty('correctChoice');
		});
	});
});
