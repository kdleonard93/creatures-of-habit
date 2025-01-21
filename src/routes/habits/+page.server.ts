import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { habit, habitFrequency } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
export const load: PageServerLoad = async ({ locals }) => {
    const session = await locals.auth();
    
    if (!session?.user) {
        throw redirect(302, '/login');
    }

    const habits = await db
        .select({
            id: habit.id,
            title: habit.title,
            description: habit.description,
            difficulty: habit.difficulty,
            frequency: habitFrequency.name,
            startDate: habit.startDate,
            endDate: habit.endDate,
            isActive: habit.isActive,
            createdAt: habit.createdAt
        })
        .from(habit)
        .leftJoin(habitFrequency, eq(habit.frequencyId, habitFrequency.id))
        .where(and(
            eq(habit.userId, session.user.id), 
            eq(habit.isArchived, false)));
    return {
        habits: habits.map(habit => ({
            ...habit,
            frequency: habit.frequency || 'daily' // Provide a default if no frequency found
        }))
    };
};