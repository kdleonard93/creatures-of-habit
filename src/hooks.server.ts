import * as auth from '$lib/server/auth.js';
import type { Handle } from '@sveltejs/kit';
import { initializeScheduler } from '$lib/server/tasks/scheduler';
import { logger } from '$lib/utils/logger';

// Initialize the task scheduler when the server starts
try {
    logger.info('Initializing task scheduler');
    initializeScheduler();
} catch (error) {
    logger.error('Failed to initialize task scheduler', {
        error: error instanceof Error ? error.message : String(error)
    });
}

export const handle: Handle = async ({ event, resolve }) => {
    // Attach the auth function to locals
    event.locals.auth = async () => {
        const sessionToken = event.cookies.get(auth.sessionCookieName);
        if (!sessionToken) {
            return null;
        }

        const { session, user } = await auth.validateSessionToken(sessionToken);
        if (session) {
            auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
        } else {
            auth.deleteSessionTokenCookie(event);
        }

        if (!user || !session) {
            return null;
        }

        return {
            user,
            session
        };
    };

    const sessionToken = event.cookies.get(auth.sessionCookieName);
    if (!sessionToken) {
        event.locals.user = null;
        event.locals.session = null;
        return resolve(event);
    }

    const { session, user } = await auth.validateSessionToken(sessionToken);
    if (session) {
        auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
    } else {
        auth.deleteSessionTokenCookie(event);
    }

    event.locals.user = user;
    event.locals.session = session;

    return resolve(event);
};