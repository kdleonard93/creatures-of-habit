import { db } from '$lib/server/db';
import { questInstances, questTemplates, questQuestions, questAnswers, creatureStats, creature } from '$lib/server/db/schema';
import { and, eq, isNull, gte, lte, sql, or, desc, asc } from 'drizzle-orm';
import { formatDateOnly } from '$lib/utils/date';
import { generateQuestQuestions as generateQuestionTemplates } from '$lib/utils/questHelpers';
import { getLevelFromXp } from '$lib/server/xp';
import type { CreatureStats } from '$lib/types';
import {
    STAT_BOOST_POINT_CAP,
    STAT_MAX,
    calculateStatCheckChance,
    getAvailableLevelPoints
} from '$lib/shared/stats';

/**
 * A typed domain error for the quest and stat-boost flows.
 *
 * Handlers map this to its `statusCode` and a safe `message`; anything that is
 * not a `QuestError` is treated as an unexpected fault and answered with a
 * generic 500. This replaces the previous behavior of turning every thrown
 * `Error` into a 400 with the raw `message`. See docs/reports/01-server-api.md S-2.
 */
export class QuestError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number,
        public readonly code: string
    ) {
        super(message);
        this.name = 'QuestError';
    }
}

/**
 * Helper function to strip the sensitive correct answer from question data.
 * `requiredStat` and `difficultyThreshold` are intentionally kept: the UI uses
 * them to show which stat is tested and the success chance.
 */
function toSafeQuestion(question: typeof questQuestions.$inferSelect) {
    return {
        id: question.id,
        questInstanceId: question.questInstanceId,
        questionNumber: question.questionNumber,
        questionText: question.questionText,
        choiceA: question.choiceA,
        choiceB: question.choiceB,
        requiredStat: question.requiredStat,
        difficultyThreshold: question.difficultyThreshold,
        createdAt: question.createdAt
    };
}

/**
 * Get the daily quest for a user (creates one if none exists)
 */
export async function getDailyQuest(userId: string) {
    const today = formatDateOnly(new Date());
    
    // Check if user already has a quest for today
    const existingQuest = await db
        .select()
        .from(questInstances)
        .where(
            and(
                eq(questInstances.userId, userId),
                gte(sql`date(${questInstances.createdAt})`, today),
                lte(sql`date(${questInstances.createdAt})`, today)
            )
        )
        .limit(1);

    if (existingQuest.length > 0) {
        return existingQuest[0];
    }

    // Generate a new quest for today
    return await generateDailyQuest(userId);
}

/**
 * Generate a new daily quest for a user
 */
async function generateDailyQuest(userId: string) {
    // Get a random quest template
    const templates = await db
        .select()
        .from(questTemplates)
        .orderBy(sql`RANDOM()`)
        .limit(1);

    if (templates.length === 0) {
        throw new Error('No quest templates available');
    }

    const template = templates[0];

    // Create quest instance
    const [questInstance] = await db
        .insert(questInstances)
        .values({
            userId,
            templateId: template.id,
            title: template.title,
            description: template.description,
            narrative: `Welcome to "${template.title}"! ${template.description}`,
            status: 'available'
        })
        .returning();

    // Generate 5 questions for this quest
    await generateQuestQuestions(questInstance.id, userId);

    return questInstance;
}

/**
 * Generate questions for a quest instance
 */
async function generateQuestQuestions(questInstanceId: string, userId: string) {
    // Get user's current stats to determine difficulty thresholds
    const userStats = await db
        .select()
        .from(creatureStats)
        .innerJoin(creature, eq(creature.id, creatureStats.creatureId))
        .where(eq(creature.userId, userId))
        .limit(1);

    const stats = userStats[0]?.creature_stats || {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10
    };

    // Generate diverse question templates
    const questionTemplates = generateQuestionTemplates(5);
    
    // Create question records with appropriate difficulty
    const questions = questionTemplates.map((template, index) => {
        const userStatValue = stats[template.requiredStat as keyof typeof stats] as number;
        
        // Set difficulty threshold based on user's stat (slightly challenging)
        const difficultyThreshold = Math.max(8, userStatValue - 2 + Math.floor(Math.random() * 5));
        
        return {
            questInstanceId,
            questionNumber: index + 1,
            questionText: template.questionText,
            choiceA: template.choiceA,
            choiceB: template.choiceB,
            correctChoice: (Math.random() < 0.5 ? 'A' : 'B') as 'A' | 'B',
            requiredStat: template.requiredStat as 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma',
            difficultyThreshold
        };
    });

    await db.insert(questQuestions).values(questions);
}

/**
 * Activate a quest for a user
 */
export async function activateQuest(questId: string, userId: string) {
    // Distinguish "does not exist / not owned" (404) from "wrong state" (409)
    // before mutating, so the handler can map the failure correctly.
    const [existing] = await db
        .select()
        .from(questInstances)
        .where(
            and(
                eq(questInstances.id, questId),
                eq(questInstances.userId, userId)
            )
        )
        .limit(1);

    if (!existing) {
        throw new QuestError('Quest not found', 404, 'QUEST_NOT_FOUND');
    }

    if (existing.status !== 'available') {
        throw new QuestError('Quest is not available to activate', 409, 'QUEST_NOT_ACTIVATABLE');
    }

    const [updatedQuest] = await db
        .update(questInstances)
        .set({
            status: 'active',
            activatedAt: new Date().toISOString()
        })
        .where(
            and(
                eq(questInstances.id, questId),
                eq(questInstances.userId, userId),
                eq(questInstances.status, 'available')
            )
        )
        .returning();

    if (!updatedQuest) {
        // Lost a race with another activation between the check and the update.
        throw new QuestError('Quest is not available to activate', 409, 'QUEST_NOT_ACTIVATABLE');
    }

    // Get the first question
    const firstQuestion = await db
        .select()
        .from(questQuestions)
        .where(
            and(
                eq(questQuestions.questInstanceId, questId),
                eq(questQuestions.questionNumber, 1)
            )
        )
        .limit(1);

    return {
        quest: updatedQuest,
        firstQuestion: firstQuestion[0] ? toSafeQuestion(firstQuestion[0]) : null
    };
}

/**
 * Answer a quest question
 * All authorization and data integrity checks are performed within this function
 * Uses individual queries with database constraints instead of explicit transactions
 */
export async function answerQuestion(
    questId: string,
    questionId: string,
    choice: 'A' | 'B',
    userId: string,
    random: () => number = Math.random
) {
    // Validate that the quest exists and belongs to the user
    const [questInstance] = await db
        .select()
        .from(questInstances)
        .where(
            and(
                eq(questInstances.id, questId),
                eq(questInstances.userId, userId)
            )
        )
        .limit(1);

    if (!questInstance) {
        throw new QuestError('Quest not found', 404, 'QUEST_NOT_FOUND');
    }

    if (questInstance.status !== 'active') {
        throw new QuestError('Quest is not active', 409, 'QUEST_NOT_ACTIVE');
    }

    // Validate that the question belongs to this quest and is the next expected question
    const [question] = await db
        .select()
        .from(questQuestions)
        .where(
            and(
                eq(questQuestions.id, questionId),
                eq(questQuestions.questInstanceId, questId)
            )
        )
        .limit(1);

    if (!question) {
        throw new QuestError('Question not found', 404, 'QUESTION_NOT_FOUND');
    }

    const expectedQuestionNumber = questInstance.currentQuestion + 1;
    if (question.questionNumber !== expectedQuestionNumber) {
        // Do not leak the internal question counters in the public message.
        throw new QuestError('Question is not the next one to answer', 409, 'QUESTION_OUT_OF_ORDER');
    }

    // Ensure the question has not already been answered
    const existingAnswer = await db
        .select()
        .from(questAnswers)
        .where(
            and(
                eq(questAnswers.questInstanceId, questId),
                eq(questAnswers.questionId, questionId)
            )
        )
        .limit(1);

    if (existingAnswer.length > 0) {
        throw new QuestError('Question has already been answered', 409, 'QUESTION_ALREADY_ANSWERED');
    }

        // Get user's stats
        const userStats = await db
        .select()
        .from(creatureStats)
        .innerJoin(creature, eq(creature.id, creatureStats.creatureId))
        .where(eq(creature.userId, userId))
        .limit(1);

    const stats = userStats[0]?.creature_stats;
    if (!stats) {
        throw new Error('User stats not found');
    }

    // Determine if answer was correct
    const wasCorrect = choice === question.correctChoice;

    // Stat checks are probability based: a single roll per question. The same
    // model is intended to drive boss battles later. See C-2.
    const userStatValue = stats[question.requiredStat as keyof typeof stats] as number;
    const successChance = calculateStatCheckChance(userStatValue, question.difficultyThreshold);
    const passedStatCheck = random() < successChance;

    // Record the answer - use try-catch to handle unique constraint violations
    try {
        await db.insert(questAnswers).values({
            questInstanceId: questId,
            questionId,
            userChoice: choice,
            wasCorrect,
            passedStatCheck
        });
    } catch (error) {
        // Handle unique constraint violation
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
            throw new QuestError('Question has already been answered', 409, 'QUESTION_ALREADY_ANSWERED');
        }
        throw error;
    }

    // Update quest progress
    const newCorrectAnswers = questInstance.correctAnswers + (wasCorrect ? 1 : 0);
    const newCurrentQuestion = questInstance.currentQuestion + 1;
    const newStatChecksPassed = (questInstance.statChecksPassed || 0) + (passedStatCheck ? 1: 0);

    await db
        .update(questInstances)
        .set({
            currentQuestion: newCurrentQuestion,
            correctAnswers: newCorrectAnswers,
            statChecksPassed: newStatChecksPassed
        })
        .where(eq(questInstances.id, questId));

    // Check if quest is complete
    const questComplete = newCurrentQuestion >= 5;
    let rewards = null;

    if (questComplete) {
        rewards = await completeQuest(questId, userId, newCorrectAnswers, newStatChecksPassed);
    }

    // Get next question if not complete
    let nextQuestion = null;
    if (!questComplete) {
        const nextQuestions = await db
            .select()
            .from(questQuestions)
            .where(
                and(
                    eq(questQuestions.questInstanceId, questId),
                    eq(questQuestions.questionNumber, newCurrentQuestion + 1)
                )
            )
            .orderBy(asc(questQuestions.questionNumber))
            .limit(1);
        
        nextQuestion = nextQuestions[0] ? toSafeQuestion(nextQuestions[0]) : null;
    }

    return {
        correct: wasCorrect,
        nextQuestion,
        questComplete,
        rewards
    };
}

/**
 * Complete a quest and award rewards
 */
async function completeQuest(questId: string, userId: string, correctAnswers: number, statChecksPassed: number) {
    // Calculate rewards based on performance
    const baseExp = 50;
    const bonusExp = correctAnswers >= 3 ? 100 : 0;

    let statBoostPoints = 0;
    if (correctAnswers >= 3) {
        statBoostPoints += 1; 
    }
    if (statChecksPassed >= 5) {
        statBoostPoints += 1;
    }

    const totalExp = baseExp + bonusExp;

    // Mark quest as completed
    await db
        .update(questInstances)
        .set({
            status: 'completed',
            completedAt: new Date().toISOString()
        })
        .where(eq(questInstances.id, questId));

    // Award experience to creature
    const userCreature = await db
        .select()
        .from(creature)
        .where(eq(creature.userId, userId))
        .limit(1);

    if (userCreature.length > 0) {
        const newExperience = (userCreature[0].experience || 0) + totalExp;
        const newLevel = getLevelFromXp(newExperience)

        await db
            .update(creature)
            .set({
                experience: newExperience,
                level: newLevel
            })
            .where(eq(creature.id, userCreature[0].id));
    }

    // Award stat boost points, capped at the banked maximum. Points over the
    // cap are simply not credited.
    let creditedBoostPoints = 0;
    if (statBoostPoints > 0) {
        const userStats = await db
            .select()
            .from(creatureStats)
            .innerJoin(creature, eq(creature.id, creatureStats.creatureId))
            .where(eq(creature.userId, userId))
            .limit(1);

        if (userStats.length > 0) {
            const currentBoostPoints = userStats[0].creature_stats.statBoostPoints || 0;
            creditedBoostPoints = Math.max(
                0,
                Math.min(statBoostPoints, STAT_BOOST_POINT_CAP - currentBoostPoints)
            );

            if (creditedBoostPoints > 0) {
                await db
                    .update(creatureStats)
                    .set({
                        statBoostPoints: sql`${creatureStats.statBoostPoints} + ${creditedBoostPoints}`
                    })
                    .where(eq(creatureStats.id, userStats[0].creature_stats.id));
            }
        }
    }

    return {
        exp: totalExp,
        statBoostPoints: creditedBoostPoints
    };
}

/**
 * Source of the points being spent on a stat.
 * - `boost`: quest stat boost points (`stat_boost_points`).
 * - `level`: allocatable level points (`floor(level / 5) - level_stat_points_spent`).
 */
export type StatPointSource = 'boost' | 'level';

/**
 * Spend stat points to permanently raise a base stat.
 *
 * Both point sources are enforced against the base stat cap of `STAT_MAX`.
 * The check and the update happen inside a single transaction so concurrent
 * spends cannot overspend or exceed the cap.
 */
export async function spendStatBoostPoints(
    userId: string,
    stat: string,
    points: number,
    source: StatPointSource = 'boost'
) {
    if (points <= 0) {
        throw new QuestError('Points must be positive', 400, 'INVALID_POINTS');
    }

    const validStats = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    if (!validStats.includes(stat)) {
        throw new QuestError('Invalid stat type', 400, 'INVALID_STAT');
    }

    if (source !== 'boost' && source !== 'level') {
        throw new QuestError('Invalid point source', 400, 'INVALID_SOURCE');
    }

    const statKey = stat as keyof CreatureStats;

    return await db.transaction(async (tx) => {
        // Read the stats and the creature level inside the transaction.
        const userStats = await tx
            .select()
            .from(creatureStats)
            .innerJoin(creature, eq(creature.id, creatureStats.creatureId))
            .where(eq(creature.userId, userId))
            .limit(1);

        if (userStats.length === 0) {
            // Internal data-integrity fault, not a client error: handled as a 500.
            throw new Error('User stats not found');
        }

        const currentStats = userStats[0].creature_stats;
        const currentLevel = userStats[0].creature.level as number;
        const currentValue = currentStats[statKey] as number;

        // A base stat may not be raised above the cap by any point source.
        if (currentValue + points > STAT_MAX) {
            throw new QuestError('Stat cannot exceed the maximum', 409, 'STAT_CAP_REACHED');
        }

        const updateObj: Record<string, unknown> = {};
        let remainingPoints: number;
        let levelStatPointsSpent = currentStats.levelStatPointsSpent || 0;
        let availableLevelPoints = getAvailableLevelPoints(currentLevel, levelStatPointsSpent);

        if (source === 'boost') {
            const currentBoostPoints = currentStats.statBoostPoints || 0;
            if (currentBoostPoints < points) {
                throw new QuestError('Insufficient stat boost points', 409, 'INSUFFICIENT_POINTS');
            }
            updateObj.statBoostPoints = sql`${creatureStats.statBoostPoints} - ${points}`;
            remainingPoints = currentBoostPoints - points;
        } else {
            if (availableLevelPoints < points) {
                throw new QuestError('Insufficient level points', 409, 'INSUFFICIENT_POINTS');
            }
            updateObj.levelStatPointsSpent = sql`${creatureStats.levelStatPointsSpent} + ${points}`;
            levelStatPointsSpent += points;
            availableLevelPoints -= points;
            remainingPoints = availableLevelPoints;
        }

        updateObj[stat] = sql`${creatureStats[statKey]} + ${points}`;

        await tx
            .update(creatureStats)
            .set(updateObj)
            .where(eq(creatureStats.id, currentStats.id));

        return {
            success: true,
            newStatValue: currentValue + points,
            remainingPoints,
            source,
            levelStatPointsSpent,
            availableLevelPoints
        };
    });
}

/**
 * Resets the daily quest (development only)
 */
export async function resetDailyQuest(userId: string) {
    const today = formatDateOnly(new Date());
    
    // Find today's quest
    const todayQuest = await db
        .select()
        .from(questInstances)
        .where(
            and(
                eq(questInstances.userId, userId),
                gte(sql`date(${questInstances.createdAt})`, today),
                lte(sql`date(${questInstances.createdAt})`, today)
            )
        )
        .limit(1);

    if (todayQuest.length === 0) {
        return { success: false, message: 'No quest found for today' };
    }

    const questId = todayQuest[0].id;

    await db
        .delete(questAnswers)
        .where(eq(questAnswers.questInstanceId, questId));

    await db
        .delete(questQuestions)
        .where(eq(questQuestions.questInstanceId, questId));

    await db
        .delete(questInstances)
        .where(eq(questInstances.id, questId));

    return { success: true, message: 'Quest reset successfully' };
}
