import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user, creature, habit, habitFrequency, habitCategory, habitCompletion } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { ensureDailyTrackerEntries, getDailyProgressStats, DailyTrackerError } from '$lib/utils/dailyHabitTracker';
import { logger } from '$lib/utils/logger';

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
            logger.error(`User not found: ${session.user.id}`);
            throw error(404, { message: 'User not found' });
        }

        // Get user's creature info
        const userCreature = await db
            .select()
            .from(creature)
            .where(eq(creature.userId, session.user.id))
            .then(rows => rows[0]);

        const today = new Date().toISOString().split('T')[0];

        // Get user's habits
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
            .where(and(eq(habit.userId, session.user.id), eq(habit.isArchived, false)));

        // Get today's completions
        const completions = await db
            .select({
                habitId: habitCompletion.habitId,
                value: habitCompletion.value
            })
            .from(habitCompletion)
            .where(and(eq(habitCompletion.userId, session.user.id), eq(habitCompletion.completedAt, today)));

        // Add completion status to habits
        const habitsWithCompletions = habits.map((habit) => ({
            ...habit,
            frequency: habit.frequency || 'daily',
            customFrequency: (() => {
                if (!habit.customFrequency) return undefined;
                try {
                    return { days: JSON.parse(habit.customFrequency) };
                } catch {
                    logger.warn('Invalid customFrequency JSON for habit', { habitId: habit.id });
                    return undefined;
                }
            })(),
            completedToday: completions.some((c) => c.habitId === habit.id)
        }));

        // Ensure all habits have tracker entries for today
        await ensureDailyTrackerEntries(session.user.id);
        
        // Get daily progress stats from the tracker
        const progressStats = await getDailyProgressStats(session.user.id);

        return {
            user: userInfo,
            creature: userCreature,
            habits: habitsWithCompletions,
            progressStats
        };
    } catch (err) {
        if (err instanceof DailyTrackerError) {
            logger.error(`Dashboard tracker error: ${err.message}`, { code: err.code });
            throw error(err.statusCode, { message: err.message });
        }
        
        logger.error('Error loading dashboard data:', {
            error: err instanceof Error ? err.message : String(err),
            userId: session.user.id
        });
        
        throw error(500, 'Failed to load dashboard data');
    }
};