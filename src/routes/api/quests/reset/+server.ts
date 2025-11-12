import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { resetDailyQuest } from '$lib/server/services/questService';
import * as auth from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
    // Only allow in development mode
    if (!dev) {
        return json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
    }

    try {
        const sessionId = cookies.get(auth.sessionCookieName);
        if (!sessionId) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { user } = await auth.validateSessionToken(sessionId);
        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await resetDailyQuest(user.id);
        
        if (!result.success) {
            return json({ error: result.message }, { status: 404 });
        }

        return json({ message: result.message });
    } catch (error) {
        console.error('Error resetting daily quest:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};