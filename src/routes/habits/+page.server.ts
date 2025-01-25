import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { habit, habitFrequency, habitCategory } from '$lib/server/db/schema';
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
            categoryId: habit.categoryId,
            category: {
                id: habitCategory.id,
                name: habitCategory.name,
                description: habitCategory.description
            },
            frequency: habitFrequency.name,
            customFrequency: habitFrequency.days,
            startDate: habit.startDate,
            endDate: habit.endDate,
            isActive: habit.isActive,
            createdAt: habit.createdAt
        })
        .from(habit)
        .leftJoin(habitFrequency, eq(habit.frequencyId, habitFrequency.id))
        .leftJoin(habitCategory, eq(habit.categoryId, habitCategory.id))
        .where(and(
            eq(habit.userId, session.user.id), 
            eq(habit.isArchived, false)));

    const categories = await db
        .select({
            id: habitCategory.id,
            name: habitCategory.name})
        .from(habitCategory)
        .where(eq(habitCategory.userId, session.user.id));
        
    return {
        habits: habits.map(habit => ({
            ...habit,
            frequency: habit.frequency || 'daily',
            customFrequency: habit.customFrequency ? {
                days: JSON.parse(habit.customFrequency)
            } : undefined
        })),
        categories: categories.map(category => ({
            ...category
        }))
    };
};