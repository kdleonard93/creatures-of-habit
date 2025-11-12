// src/routes/settings/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user, userPreferences, session } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '$lib/utils/password';

export const load: PageServerLoad = async ({ locals }) => {
    const authSession = await locals.auth();
    if (!authSession?.user) {
        return { preferences: null };
    }

    const preferences = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, authSession.user.id)
    });

    return {
        preferences
    };
};

export const actions: Actions = {
    updatePassword: async ({ request, locals }) => {
        const authSession = await locals.auth();
        if (!authSession?.user) {
            return fail(401, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const currentPassword = data.get('currentPassword');
        const newPassword = data.get('newPassword');

        if (!currentPassword || !newPassword) {
            return fail(400, { message: 'Missing required fields' });
        }

        if (newPassword.toString().length < 8) {
            return fail(400, { message: 'Password must be at least 8 characters long' });
        }

        const foundUser = await db.query.user.findFirst({
            where: eq(user.id, authSession.user.id)
        });

        if (!foundUser) {
            return fail(404, { message: 'User not found' });
        }

        const isValid = await verifyPassword(foundUser.passwordHash, currentPassword.toString());
        if (!isValid) {
            return fail(400, { message: 'Invalid current password' });
        }

        const hashedPassword = await hashPassword(newPassword.toString());
        await db
            .update(user)
            .set({ passwordHash: hashedPassword })
            .where(eq(user.id, authSession.user.id));
        
        // Invalidate all sessions for this user after password change
        await db
            .delete(session)
            .where(eq(session.userId, authSession.user.id));

        return { success: true };
    },

    updateNotifications: async ({ request, locals }) => {
        const authSession = await locals.auth();
        if (!authSession?.user) {
            return fail(401, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const emailNotifications = data.get('emailNotifications') === 'true' ? 1 : 0;
        const pushNotifications = data.get('pushNotifications') === 'true' ? 1 : 0;
        const reminderNotifications = data.get('reminderNotifications') === 'true' ? 1 : 0;

        await db
            .insert(userPreferences)
            .values({
                userId: authSession.user.id,
                emailNotifications,
                pushNotifications,
                reminderNotifications
            })
            .onConflictDoUpdate({
                target: userPreferences.userId,
                set: {
                    emailNotifications,
                    pushNotifications,
                    reminderNotifications
                }
            });

        return { success: true };
    }
};