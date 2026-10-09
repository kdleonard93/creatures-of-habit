import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { activateQuest, QuestError } from '$lib/server/services/questService';
import { logger } from '$lib/utils/logger';
import * as auth from '$lib/server/auth';

export const POST: RequestHandler = async ({ params, cookies }) => {
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

        const result = await activateQuest(questId, user.id);
        
        return json(result);
    } catch (error) {
        if (error instanceof QuestError) {
            return json({ error: error.message }, { status: error.statusCode });
        }

        logger.error('Error activating quest:', {
            error: error instanceof Error ? error.message : String(error),
            questId: params.questId
        });
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
