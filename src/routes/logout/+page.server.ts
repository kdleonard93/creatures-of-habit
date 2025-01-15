// src/routes/logout/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import * as auth from '$lib/server/auth';

export const actions = {
    default: async (event) => {
        const sessionId = event.locals.session?.id;
        if (sessionId) {
            await auth.invalidateSession(sessionId);
        }
        auth.deleteSessionTokenCookie(event);
        throw redirect(302, '/');
    }
} satisfies Actions;
