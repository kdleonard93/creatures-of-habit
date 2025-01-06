import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { verifyPassword } from '$lib/server/password';
import { eq } from 'drizzle-orm';
import * as auth from '$lib/server/auth';

export const load: PageServerLoad = async (event) => {
    if (event.locals.user) {
        return redirect(302, '/dashboard');
    }
    return {};
};

export const actions = {
    default: async (event) => {
        const formData = await event.request.formData();
        const username = formData.get('username') as string | null;
        const password = formData.get('password') as string | null;
        const email = formData.get('email') as string | null;

        if (!username) {
            return fail(400, { message: 'Username is required' });
        }
        if (!password) {
            return fail(400, { message: 'Password is required' });
        }
        if (!email) {
            return fail(400, { message: 'Email is required' });
        }

        const results = await db
            .select()
            .from(table.user)
            .where(eq(table.user.username, username));

        const existingUser = results.at(0);
        if (!existingUser) {
            return fail(400, { message: 'Incorrect username or password' });
        }

        const validPassword = await verifyPassword(existingUser.passwordHash, password);
        if (!validPassword) {
            return fail(400, { message: 'Incorrect username or password' });
        }

        const sessionToken = auth.generateSessionToken();
        const session = await auth.createSession(sessionToken, existingUser.id);
        auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

        return redirect(302, '/dashboard');
    }
} satisfies Actions;