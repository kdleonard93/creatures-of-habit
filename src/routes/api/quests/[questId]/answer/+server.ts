import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { answerQuestion } from '$lib/server/services/questService';
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

        const body = await request.json();
        const { questionId, choice } = body;

        if (!questionId || !choice) {
            return json({ error: 'Question ID and choice are required' }, { status: 400 });
        }

        if (choice !== 'A' && choice !== 'B') {
            return json({ error: 'Choice must be A or B' }, { status: 400 });
        }

        const result = await answerQuestion(questId, questionId, choice, user.id);
        
        return json(result);
    } catch (error) {
        console.error('Error answering question:', error);
        
        if (error instanceof Error) {
            return json({ error: error.message }, { status: 400 });
        }
        
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
