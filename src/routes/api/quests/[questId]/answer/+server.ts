import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { answerQuestion, QuestError } from '$lib/server/services/questService';
import { logger } from '$lib/utils/logger';
import * as auth from '$lib/server/auth';

export const POST: RequestHandler = async ({ params, request, cookies }) => {
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

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { questionId, choice } = (body ?? {}) as {
            questionId?: unknown;
            choice?: unknown;
        };

        if (!questionId || !choice) {
            return json({ error: 'Question ID and choice are required' }, { status: 400 });
        }

        if (choice !== 'A' && choice !== 'B') {
            return json({ error: 'Choice must be A or B' }, { status: 400 });
        }

        const result = await answerQuestion(questId, questionId as string, choice as 'A' | 'B', user.id);
        
        return json(result);
    } catch (error) {
        if (error instanceof QuestError) {
            return json({ error: error.message }, { status: error.statusCode });
        }

        logger.error('Error answering question:', {
            error: error instanceof Error ? error.message : String(error),
            questId: params.questId
        });
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
