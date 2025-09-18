import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { spendStatBoostPoints } from '$lib/server/services/questService';
import * as auth from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
    try {
        const sessionId = cookies.get(auth.sessionCookieName);
        if (!sessionId) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { user } = await auth.validateSessionToken(sessionId);
        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { stat, points } = body;

        if (!stat || !points) {
            return json({ error: 'Stat and points are required' }, { status: 400 });
        }

        if (typeof points !== 'number' || points <= 0) {
            return json({ error: 'Points must be a positive number' }, { status: 400 });
        }

        const result = await spendStatBoostPoints(user.id, stat, points);
        
        return json(result);
    } catch (error) {
        console.error('Error boosting stat:', error);
        
        if (error instanceof Error) {
            return json({ error: error.message }, { status: 400 });
        }
        
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
