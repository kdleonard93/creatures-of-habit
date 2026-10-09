import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
 * Current behavior note: stat checks are deterministic (`userStat >=
 * difficultyThreshold`), not probability based. These tests pin the behavior
 * that ships today; they do not assert it is the intended design (C-2).
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

		it('rejects activating an already active quest with 400', async () => {
			const quest = await seedQuest(owner.id, { status: 'active' });
			await seedQuestions(quest.id);

			const response = await activatePost(activateEvent(quest.id, ownerCookies));
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toMatch(/not found or already activated/i);
		});

		it('rejects activating another user quest with 400', async () => {
			const quest = await seedQuest(other.id);
			await seedQuestions(quest.id);

			const response = await activatePost(activateEvent(quest.id, ownerCookies));
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toMatch(/not found or already activated/i);

			const [row] = await testDb.db
				.select()
				.from(questInstances)
				.where(eq(questInstances.id, quest.id));
			expect(row.status).toBe('available');
		});
	});

	describe('POST /api/quests/[questId]/answer', () => {
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

		it('returns 400 when the quest is not active yet', async () => {
			const quest = await seedQuest(owner.id, { status: 'available' });
			const questions = await seedQuestions(quest.id);

			const response = await answerPost(
				answerEvent(quest.id, { questionId: questions[0].id, choice: 'A' }, ownerCookies)
			);
			expect(response.status).toBe(400);
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
			// Deterministic stat check: stat 12 >= threshold 10.
			expect(answers[0].passedStatCheck).toBe(true);

			const [row] = await testDb.db
				.select()
				.from(questInstances)
				.where(eq(questInstances.id, quest.id));
			expect(row.currentQuestion).toBe(1);
			expect(row.correctAnswers).toBe(1);
			expect(row.statChecksPassed).toBe(1);
		});

		it('rejects an out-of-order question with 400', async () => {
			const quest = await seedQuest(owner.id, { status: 'active' });
			const questions = await seedQuestions(quest.id);

			const response = await answerPost(
				answerEvent(quest.id, { questionId: questions[1].id, choice: 'A' }, ownerCookies)
			);
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toMatch(/expected question 1/i);
		});

		it('rejects answering another user quest with 400', async () => {
			const quest = await seedQuest(other.id, { status: 'active' });
			const questions = await seedQuestions(quest.id);

			const response = await answerPost(
				answerEvent(quest.id, { questionId: questions[0].id, choice: 'A' }, ownerCookies)
			);
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toMatch(/not found or access denied/i);
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
