import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { habit, habitCategory, habitFrequency } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, params }) => {
    const session = await locals.auth();
    
    if (!session?.user) {
        throw redirect(302, '/login');
    }

    const [habitData] = await db
        .select({
            id: habit.id,
            title: habit.title,
            description: habit.description,
            categoryId: habit.categoryId,
            difficulty: habit.difficulty,
            startDate: habit.startDate,
            endDate: habit.endDate,
            frequencyId: habit.frequencyId,
            frequency: habitFrequency.name,
            customFrequency: habitFrequency.days,
        })
        .from(habit)
        .leftJoin(habitFrequency, eq(habit.frequencyId, habitFrequency.id))
        .where(and(
            eq(habit.id, params.id),
            eq(habit.userId, session.user.id)
        ));

    if (!habitData) {
        throw redirect(302, '/habits');
    }

    const categories = await db
        .select()
        .from(habitCategory)
        .where(eq(habitCategory.userId, session.user.id));

    return {
        habit: habitData,
        categories
    };
};