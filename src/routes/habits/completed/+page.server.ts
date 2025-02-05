import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { habit } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
    const session = await locals.auth();
    
    if (!session?.user) {
        throw redirect(302, '/login');
    }

    const completedHabits = await db
        .select()
        .from(habit)
        .where(and(
            eq(habit.userId, session.user.id),
            eq(habit.isArchived, true)
        ));

    return {
        completedHabits
    };
};