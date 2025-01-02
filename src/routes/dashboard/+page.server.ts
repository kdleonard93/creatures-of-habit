// src/routes/dashboard/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user, creature } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
    const session = await locals.auth();
    
    if (!session?.user) {
        throw redirect(302, '/login');
    }

    try {
        // Get user's full info
        const userInfo = await db
            .select()
            .from(user)
            .where(eq(user.id, session.user.id))
            .then(rows => rows[0]);

        if (!userInfo) {
            throw new Error('User not found');
        }

        // Get user's creature info
        const userCreature = await db
            .select()
            .from(creature)
            .where(eq(creature.userId, session.user.id))
            .then(rows => rows[0]);

        return {
            user: userInfo,
            creature: userCreature
        };
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        throw error;
    }
};