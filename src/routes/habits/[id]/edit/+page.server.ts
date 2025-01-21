import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { habit } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, params }) => {
    const session = await locals.auth();
    
    if (!session?.user) {
        throw redirect(302, '/login');
    }

    const [habitData] = await db
        .select()
        .from(habit)
        .where(and(
            eq(habit.id, params.id),
            eq(habit.userId, session.user.id)
        ));

    if (!habitData) {
        throw redirect(302, '/habits');
    }

    return {
        habit: habitData
    };
};