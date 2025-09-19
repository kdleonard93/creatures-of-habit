import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDailyQuest } from '$lib/server/services/questService';
import * as auth from '$lib/server/auth';

export const GET: RequestHandler = async ({ cookies }) => {
    try {
        const sessionId = cookies.get(auth.sessionCookieName);
        if (!sessionId) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { user } = await auth.validateSessionToken(sessionId);
        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const quest = await getDailyQuest(user.id);
        
        return json(quest);
    } catch (error) {
        console.error('Error getting daily quest:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
