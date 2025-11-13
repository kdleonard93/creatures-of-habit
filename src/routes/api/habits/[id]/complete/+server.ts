import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { habit, habitCompletion, creature, habitStreak } from '$lib/server/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { calculateHabitXp, getLevelFromXp } from '$lib/server/xp';
import { markHabitCompleted, DailyTrackerError } from '$lib/utils/dailyHabitTracker';
import { logger } from '$lib/utils/logger';
import { formatSqliteTimestamp } from '$lib/utils/date';
import { rateLimit, RateLimitPresets } from '$lib/server/rateLimit';

export const POST: RequestHandler = async (event) => {
    await rateLimit(event, RateLimitPresets.API);

    const session = await event.locals.auth();
    
    if (!session?.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [habitData] = await db
            .select()
            .from(habit)
            .where(and(
                eq(habit.id, event.params.id),
                eq(habit.userId, session.user.id)
            ));

        if (!habitData) {
            return json({ error: 'Habit not found' }, { status: 404 });
        }

        
        // Get current streak data
        const [streakData] = await db
            .select()
            .from(habitStreak)
            .where(eq(habitStreak.habitId, habitData.id)) || [{ currentStreak: 0 }];

        // Calculate experience with streak bonus
        const experienceEarned = calculateHabitXp(
            habitData.difficulty, 
            streakData?.currentStreak || 0
        );

        // Record completion
        const [completion] = await db
            .insert(habitCompletion)
            .values({
                habitId: habitData.id,
                userId: session.user.id,
                completedAt: formatSqliteTimestamp(),
                experienceEarned,
                value: 100
            })
            .returning();

        const newStreakCount = (streakData?.currentStreak || 0) + 1;
        const newLongestStreak = Math.max(newStreakCount, streakData?.longestStreak || 0);
        
        await db
            .update(habitStreak)
            .set({
                currentStreak: newStreakCount,
                longestStreak: newLongestStreak,
                lastCompletedAt: formatSqliteTimestamp(),
                updatedAt: formatSqliteTimestamp()
            })
            .where(eq(habitStreak.habitId, habitData.id));

        const [currentCreature] = await db
            .select()
            .from(creature)
            .where(eq(creature.userId, session.user.id));

        // Calculate new level
        const newExperience = (currentCreature.experience || 0) + experienceEarned;
        const previousLevel = currentCreature.level || 1;
        const newLevel = getLevelFromXp(newExperience);

        // Update creature experience and level
        await db.update(creature)
            .set({
                experience: newExperience,
                level: newLevel
            })
            .where(eq(creature.userId, session.user.id));
        
        // Mark the habit as archived so it shows up in the completed route 
        await db.update(habit)
            .set({
                isArchived: true,
                updatedAt: formatSqliteTimestamp()
            })
            .where(eq(habit.id, habitData.id));
            
        // Mark the habit as completed in the daily tracker for progress bar
        await markHabitCompleted(session.user.id, habitData.id);

        return json({
            success: true,
            completion,
            experienceEarned,
            newLevel,
            previousLevel,
            leveledUp: newLevel > previousLevel
        });
    } catch (error) {
        if (error instanceof DailyTrackerError) {
            // Handle specific tracker errors with appropriate status codes
            logger.error(`Error completing habit: ${error.message}`, { code: error.code });
            return json({ error: error.message }, { status: error.statusCode });
        }
        
        // Handle other errors
        logger.error('Error completing habit:', {
            error: error instanceof Error ? error.message : String(error),
            habitId: event.params.id,
            userId: session.user.id
        });
        return json({ error: 'Failed to complete habit' }, { status: 500 });
    }
};