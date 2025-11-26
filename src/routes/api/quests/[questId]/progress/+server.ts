import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { questInstances, questQuestions, questAnswers } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import * as auth from '$lib/server/auth';

export const GET: RequestHandler = async ({ params, cookies }) => {
    try {
        const sessionId = cookies.get(auth.sessionCookieName);
        if (!sessionId) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { user } = await auth.validateSessionToken(sessionId);
        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { questId } = params;
        if (!questId) {
            return json({ error: 'Quest ID is required' }, { status: 400 });
        }

        // Get quest instance
        const [quest] = await db
            .select()
            .from(questInstances)
            .where(
                and(
                    eq(questInstances.id, questId),
                    eq(questInstances.userId, user.id)
                )
            )
            .limit(1);

        if (!quest) {
            return json({ error: 'Quest not found' }, { status: 404 });
        }

        // Get all questions for this quest
        const questions = await db
            .select()
            .from(questQuestions)
            .where(eq(questQuestions.questInstanceId, questId));

        const safeQuestions = questions.map(question => ({
            id: question.id,
            questionNumber: question.questionNumber,
            questionText: question.questionText,
            choiceA: question.choiceA,
            choiceB: question.choiceB,
            requiredStat: question.requiredStat,
            difficultyThreshold: question.difficultyThreshold
        }));

        return json({
            currentQuestion: quest.currentQuestion,
            totalQuestions: quest.totalQuestions,
            correctAnswers: quest.correctAnswers,
            questions: safeQuestions
        });
    } catch (error) {
        console.error('Error getting quest progress:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
