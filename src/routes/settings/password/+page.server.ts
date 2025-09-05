// src/routes/settings/password/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { verifyPassword, hashPassword } from '$lib/utils/password';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.session) {
        throw redirect(302, '/login');
    }
    return {};
};

export const actions = {
    default: async ({ request, locals }) => {
        if (!locals.session) {
            console.info('No session found, redirecting to login');
            throw redirect(302, '/login');
        }

        const formData = await request.formData();
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        console.info('Password change attempt for user:', locals.session.userId);

        if (!currentPassword || !newPassword || !confirmPassword) {
            console.info('Missing required fields');
            return fail(400, {
                message: 'All fields are required'
            });
        }

        if (newPassword !== confirmPassword) {
            console.info('Passwords do not match');
            return fail(400, {
                message: 'New passwords do not match'
            });
        }

        try {
            // Get user from database
            const [user] = await db
                .select({
                    id: table.user.id,
                    passwordHash: table.user.passwordHash
                })
                .from(table.user)
                .where(eq(table.user.id, locals.session.userId));

            console.info('User found:', user ? 'yes' : 'no');

            if (!user) {
                return fail(404, {
                    message: 'User not found'
                });
            }

            // Verify current password
            const validPassword = await verifyPassword(user.passwordHash, currentPassword.toString());
            if (!validPassword) {
                return fail(400, {
                    message: 'Current password is incorrect'
                });
            }

            // Hash new password
            const newHashedPassword = await hashPassword(newPassword.toString());

            // Update password in database
            await db
                .update(table.user)
                .set({ passwordHash: newHashedPassword })
                .where(eq(table.user.id, user.id));

            console.info('Password updated successfully');

            return {
                success: true,
                message: 'Password updated successfully'
            };
        } catch (error) {
            console.error('Password update error:', error);
            return fail(500, {
                message: 'An error occurred while updating your password'
            });
        }
    }
} satisfies Actions;