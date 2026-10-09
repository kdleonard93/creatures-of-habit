import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDb } from '../db/test-db';
import { seedUser, seedCreature } from '../db/fixtures';
import { answerQuestion } from '$lib/server/services/questService';
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
 * Deterministic tests for the probability-based quest stat check (C-2).
 *
 * `answerQuestion` takes an injectable random function, so these tests drive
 * the roll directly and assert the pass/fail outcome without relying on
 * `Math.random`. Stat 12 vs threshold 10 gives a chance of 12/22 ~ 0.545.
 */
describe('questService answerQuestion stat checks (deterministic)', () => {
	let testDb: TestDb;
	let owner: Awaited<ReturnType<typeof seedUser>>;
	let questId: string;
	let questions: Awaited<ReturnType<typeof seedQuestions>>;

	async function seedQuestions(
		instanceId: string,
		options: { correctChoice?: 'A' | 'B'; difficultyThreshold?: number; count?: number } = {}
	) {
		const { correctChoice = 'A', difficultyThreshold = 10, count = 5 } = options;
		const rows = Array.from({ length: count }, (_, index) => ({
			questInstanceId: instanceId,
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

	async function seedQuest(statBoostPoints: number, statValue = 12) {
		const created = await seedCreature(testDb.db, owner.id);
		await testDb.db.insert(creatureStats).values({
			creatureId: created.id,
			strength: statValue,
			dexterity: statValue,
			constitution: statValue,
			intelligence: statValue,
			wisdom: statValue,
			charisma: statValue,
			statBoostPoints
		});

		const [template] = await testDb.db
			.insert(questTemplates)
			.values({
				title: 'Template Quest',
				description: 'A seeded quest template',
				setting: 'forest',
				difficulty: 'easy'
			})
			.returning();

		const [instance] = await testDb.db
			.insert(questInstances)
			.values({
				userId: owner.id,
				templateId: template.id,
				title: 'Seeded Quest',
				description: 'A seeded quest',
				narrative: 'Once upon a test',
				status: 'active'
			})
			.returning();

		questId = instance.id;
		return created;
	}

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.reset();
		owner = await seedUser(testDb.db);
	});

	afterEach(() => {
		testDb.close();
	});

	it('passes the stat check when the roll is below the chance', async () => {
		await seedQuest(0, 12);
		questions = await seedQuestions(questId, { difficultyThreshold: 10 });

		const result = await answerQuestion(
			questId,
			questions[0].id,
			'A',
			owner.id,
			() => 0.4
		);
		expect(result.correct).toBe(true);

		const [answer] = await testDb.db
			.select()
			.from(questAnswers)
			.where(eq(questAnswers.questionId, questions[0].id));
		expect(answer.passedStatCheck).toBe(true);

		const [row] = await testDb.db
			.select()
			.from(questInstances)
			.where(eq(questInstances.id, questId));
		expect(row.statChecksPassed).toBe(1);
	});

	it('fails the stat check when the roll is above the chance', async () => {
		await seedQuest(0, 12);
		questions = await seedQuestions(questId, { difficultyThreshold: 10 });

		const result = await answerQuestion(
			questId,
			questions[0].id,
			'A',
			owner.id,
			() => 0.7
		);
		// The choice was still correct; only the stat check failed.
		expect(result.correct).toBe(true);

		const [answer] = await testDb.db
			.select()
			.from(questAnswers)
			.where(eq(questAnswers.questionId, questions[0].id));
		expect(answer.passedStatCheck).toBe(false);

		const [row] = await testDb.db
			.select()
			.from(questInstances)
			.where(eq(questInstances.id, questId));
		expect(row.statChecksPassed).toBe(0);
	});

	it('rolls once per question, independent of prior answers', async () => {
		await seedQuest(0, 12);
		questions = await seedQuestions(questId, { difficultyThreshold: 10 });

		const rolls = [0.2, 0.9];
		let call = 0;
		const random = () => rolls[call++];

		const first = await answerQuestion(questId, questions[0].id, 'A', owner.id, random);
		expect(first.correct).toBe(true);

		const second = await answerQuestion(questId, questions[1].id, 'A', owner.id, random);
		expect(second.correct).toBe(true);

		const answers = await testDb.db
			.select()
			.from(questAnswers)
			.where(eq(questAnswers.questInstanceId, questId));
		expect(answers).toHaveLength(2);
		expect(answers.find((a) => a.questionId === questions[0].id)?.passedStatCheck).toBe(true);
		expect(answers.find((a) => a.questionId === questions[1].id)?.passedStatCheck).toBe(false);

		const [row] = await testDb.db
			.select()
			.from(questInstances)
			.where(eq(questInstances.id, questId));
		expect(row.statChecksPassed).toBe(1);
	});

	it('awards two boost points on a perfect run', async () => {
		await seedQuest(0, 12);
		questions = await seedQuestions(questId, { difficultyThreshold: 10 });

		for (const question of questions) {
			await answerQuestion(questId, question.id, 'A', owner.id, () => 0);
		}

		const [questRow] = await testDb.db
			.select()
			.from(questInstances)
			.where(eq(questInstances.id, questId));
		expect(questRow.status).toBe('completed');
		expect(questRow.statChecksPassed).toBe(5);

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

	it('does not award boost points beyond the banked cap of 20', async () => {
		await seedQuest(20, 12);
		questions = await seedQuestions(questId, { difficultyThreshold: 10 });

		for (const question of questions) {
			await answerQuestion(questId, question.id, 'A', owner.id, () => 0);
		}

		const [creatureRow] = await testDb.db
			.select()
			.from(creature)
			.where(eq(creature.userId, owner.id));
		const [statsRow] = await testDb.db
			.select()
			.from(creatureStats)
			.where(eq(creatureStats.creatureId, creatureRow.id));
		expect(statsRow.statBoostPoints).toBe(20);
	});
});
