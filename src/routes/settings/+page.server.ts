// src/routes/settings/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user, userPreferences } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '$lib/utils/password';

export const load: PageServerLoad = async ({ locals }) => {
    const session = await locals.auth();
    if (!session?.user) {
        return { preferences: null };
    }

    const preferences = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, session.user.id)
    });

    return {
        preferences
    };
};

export const actions: Actions = {
    updatePassword: async ({ request, locals }) => {
        const session = await locals.auth();
        if (!session?.user) {
            return fail(401, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const currentPassword = data.get('currentPassword');
        const newPassword = data.get('newPassword');

        if (!currentPassword || !newPassword) {
            return fail(400, { message: 'Missing required fields' });
        }

        const foundUser = await db.query.user.findFirst({
            where: eq(user.id, session.user.id)
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
            .where(eq(user.id, session.user.id));

        return { success: true };
    },

    updateNotifications: async ({ request, locals }) => {
        const session = await locals.auth();
        if (!session?.user) {
            return fail(401, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const emailNotifications = data.get('emailNotifications') === 'true' ? 1 : 0;
        const pushNotifications = data.get('pushNotifications') === 'true' ? 1 : 0;
        const reminderNotifications = data.get('reminderNotifications') === 'true' ? 1 : 0;

        await db
            .update(userPreferences)
            .set({
                emailNotifications,
                pushNotifications,
                reminderNotifications
            })
            .where(eq(userPreferences.userId, session.user.id));

        return { success: true };
    },

    updatePrivacy: async ({ request, locals }) => {
        const session = await locals.auth();
        if (!session?.user) {
            return fail(401, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const profileVisibility = data.get('profileVisibility') === 'true' ? 1 : 0;
        const activitySharing = data.get('activitySharing') === 'true' ? 1 : 0;
        const statsSharing = data.get('statsSharing') === 'true' ? 1 : 0;

        await db
            .update(userPreferences)
            .set({
                profileVisibility,
                activitySharing,
                statsSharing
            })
            .where(eq(userPreferences.userId, session.user.id));

        return { success: true };
    }
};