import { db } from '$lib/server/db';
import { questInstances, questTemplates, questQuestions, questAnswers, creatureStats, creature } from '$lib/server/db/schema';
import { and, eq, isNull, gte, lte, sql, or, desc, asc } from 'drizzle-orm';
import { formatDateOnly } from '$lib/utils/date';
import { generateQuestQuestions as generateQuestionTemplates } from '$lib/utils/questHelpers';
import { getLevelFromXp } from '$lib/server/xp';

/**
 * Helper function to strip sensitive fields from question data
 */
function toSafeQuestion(question: typeof questQuestions.$inferSelect) {
    return {
        id: question.id,
        questInstanceId: question.questInstanceId,
        questionNumber: question.questionNumber,
        questionText: question.questionText,
        choiceA: question.choiceA,
        choiceB: question.choiceB,
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
        throw new Error('Quest not found or already activated');
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
export async function answerQuestion(questId: string, questionId: string, choice: 'A' | 'B', userId: string) {
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
        throw new Error('Quest not found or access denied');
    }

    if (questInstance.status !== 'active') {
        throw new Error('Quest is not active');
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
        throw new Error('Question not found or does not belong to this quest');
    }

    const expectedQuestionNumber = questInstance.currentQuestion + 1;
    if (question.questionNumber !== expectedQuestionNumber) {
        throw new Error(`Expected question ${expectedQuestionNumber}, but received question ${question.questionNumber}`);
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
        throw new Error('Question has already been answered');
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

    const userStatValue = stats[question.requiredStat as keyof typeof stats] as number;
    const passedStatCheck = userStatValue >= question.difficultyThreshold;

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
            throw new Error('Question has already been answered (concurrent request detected)');
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

    // Award stat boost points
    if (statBoostPoints > 0) {
        const userStats = await db
            .select()
            .from(creatureStats)
            .innerJoin(creature, eq(creature.id, creatureStats.creatureId))
            .where(eq(creature.userId, userId))
            .limit(1);

        if (userStats.length > 0) {
            await db
                .update(creatureStats)
                .set({
                    statBoostPoints: sql`${creatureStats.statBoostPoints} + ${statBoostPoints}`
                })
                .where(eq(creatureStats.id, userStats[0].creature_stats.id));
        }
    }

    return {
        exp: totalExp,
        statBoostPoints
    };
}

/**
 * Spend stat boost points to increase a stat
 */
export async function spendStatBoostPoints(userId: string, stat: string, points: number) {
    if (points <= 0) {
        throw new Error('Points must be positive');
    }

    const validStats = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    if (!validStats.includes(stat)) {
        throw new Error('Invalid stat type');
    }

    // Get user's current stats
    const userStats = await db
        .select()
        .from(creatureStats)
        .innerJoin(creature, eq(creature.id, creatureStats.creatureId))
        .where(eq(creature.userId, userId))
        .limit(1);

    if (userStats.length === 0) {
        throw new Error('User stats not found');
    }

    const currentStats = userStats[0].creature_stats;
    
    if (currentStats.statBoostPoints < points) {
        throw new Error('Insufficient stat boost points');
    }

    // Update the stat and reduce boost points
    const updateObj: Record<string, unknown> = {
        statBoostPoints: sql`${creatureStats.statBoostPoints} - ${points}`
    };
    switch (stat) {
        case 'strength':
            updateObj.strength = sql`${creatureStats.strength} + ${points}`;
            break;
        case 'dexterity':
            updateObj.dexterity = sql`${creatureStats.dexterity} + ${points}`;
            break;
        case 'constitution':
            updateObj.constitution = sql`${creatureStats.constitution} + ${points}`;
            break;
        case 'intelligence':
            updateObj.intelligence = sql`${creatureStats.intelligence} + ${points}`;
            break;
        case 'wisdom':
            updateObj.wisdom = sql`${creatureStats.wisdom} + ${points}`;
            break;
        case 'charisma':
            updateObj.charisma = sql`${creatureStats.charisma} + ${points}`;
            break;
    }
    await db
        .update(creatureStats)
        .set(updateObj)
        .where(eq(creatureStats.id, currentStats.id));

    // Return updated values
    const newStatValue = (currentStats[stat as keyof typeof currentStats] as number) + points;
    const remainingPoints = currentStats.statBoostPoints - points;

    return {
        success: true,
        newStatValue,
        remainingPoints
    };
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
