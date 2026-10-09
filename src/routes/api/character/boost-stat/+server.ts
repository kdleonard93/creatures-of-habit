import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { spendStatBoostPoints, QuestError } from '$lib/server/services/questService';
import { logger } from '$lib/utils/logger';
import * as auth from '$lib/server/auth';
import { rateLimit, RateLimitPresets } from '$lib/server/rateLimit';

export const POST: RequestHandler = async (event) => {
    await rateLimit(event, RateLimitPresets.API);

    try {
        const sessionId = event.cookies.get(auth.sessionCookieName);
        if (!sessionId) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { user } = await auth.validateSessionToken(sessionId);
        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body: unknown;
        try {
            body = await event.request.json();
        } catch {
            return json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { stat, points, source } = (body ?? {}) as {
            stat?: unknown;
            points?: unknown;
            source?: unknown;
        };

        if (!stat || !points) {
            return json({ error: 'Stat and points are required' }, { status: 400 });
        }

        if (typeof points !== 'number' || points <= 0) {
            return json({ error: 'Points must be a positive number' }, { status: 400 });
        }

        if (source !== undefined && source !== 'boost' && source !== 'level') {
            return json({ error: 'Source must be "boost" or "level"' }, { status: 400 });
        }

        const result = await spendStatBoostPoints(
            user.id,
            stat as string,
            points,
            (source as 'boost' | 'level' | undefined) ?? 'boost'
        );
        
        return json(result);
    } catch (error) {
        if (error instanceof QuestError) {
            return json({ error: error.message }, { status: error.statusCode });
        }

        logger.error('Error boosting stat:', {
            error: error instanceof Error ? error.message : String(error)
        });
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
