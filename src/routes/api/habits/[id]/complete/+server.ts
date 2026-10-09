import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
    habit,
    habitCompletion,
    creature,
    habitStreak,
    habitFrequency,
    dailyHabitTracker
} from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { calculateHabitXp, getLevelFromXp } from '$lib/server/xp';
import {
	isScheduledOn,
	computeStreakUpdate,
	getDateOnlyInTimeZone,
	type HabitSchedule,
	type HabitFrequencyName
} from '$lib/shared/streaks/schedule';
import { DailyTrackerError } from '$lib/utils/dailyHabitTracker';
import { logger } from '$lib/utils/logger';
import { formatSqliteTimestamp } from '$lib/utils/date';
import { rateLimit, RateLimitPresets } from '$lib/server/rateLimit';

export const POST: RequestHandler = async (event) => {
    await rateLimit(event, RateLimitPresets.API);

    const session = await event.locals.auth();
    
    if (!session?.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    try {
        const [habitData] = await db
            .select()
            .from(habit)
            .where(and(
                eq(habit.id, event.params.id),
                eq(habit.userId, userId)
            ));

        if (!habitData) {
            return json({ error: 'Habit not found' }, { status: 404 });
        }

        // Compute "today" in the user's time zone so the completion, streak, and
        // tracker all land on the user's local day near a UTC midnight boundary.
        // Storage stays YYYY-MM-DD; only the day key is zoned. See C-3.
        const timeZone = session.user.timezone ?? 'UTC';
        const today = getDateOnlyInTimeZone(new Date(), timeZone);

        // The completion, streak update, creature XP update, and daily tracker
        // mark are one unit of work. The insert uses the unique index on
        // (habit_id, completed_at) as the source of truth: only the request
        // that actually inserts a row awards XP and advances the streak, so
        // concurrent or repeated requests cannot double-award. See S-8.
        const result = await db.transaction(async (tx) => {
            const [frequency] = habitData.frequencyId
                ? await tx
                      .select()
                      .from(habitFrequency)
                      .where(eq(habitFrequency.id, habitData.frequencyId))
                : [];

            const schedule: HabitSchedule = {
                frequency: (frequency?.name as HabitFrequencyName) ?? 'daily',
                days: frequency?.days ? JSON.parse(frequency.days) : null,
                startDate: habitData.startDate
            };

            if (!isScheduledOn(today, schedule)) {
                throw new DailyTrackerError('Habit is not scheduled for today', 'NOT_SCHEDULED', 400);
            }

            const [existingStreak] = await tx
                .select()
                .from(habitStreak)
                .where(eq(habitStreak.habitId, habitData.id));

            // Calculate experience with streak bonus (based on the streak before this completion)
            const experienceEarned = calculateHabitXp(
                habitData.difficulty,
                existingStreak?.currentStreak ?? 0
            );

            const [completion] = await tx
                .insert(habitCompletion)
                .values({
                    habitId: habitData.id,
                    userId: userId,
                    completedAt: today,
                    experienceEarned,
                    value: 100
                })
                .onConflictDoNothing()
                .returning();

            if (!completion) {
                // The unique constraint rejected the duplicate insert.
                throw new DailyTrackerError('Habit already completed today', 'ALREADY_COMPLETED', 400);
            }

            const nextStreak = computeStreakUpdate({
                schedule,
                today,
                lastCompletedDate: existingStreak?.lastCompletedAt
                    ? existingStreak.lastCompletedAt.slice(0, 10)
                    : null,
                state: {
                    currentStreak: existingStreak?.currentStreak ?? 0,
                    longestStreak: existingStreak?.longestStreak ?? 0
                }
            });

            if (existingStreak) {
                await tx
                    .update(habitStreak)
                    .set({
                        currentStreak: nextStreak.currentStreak,
                        longestStreak: nextStreak.longestStreak,
                        lastCompletedAt: today,
                        updatedAt: formatSqliteTimestamp()
                    })
                    .where(eq(habitStreak.habitId, habitData.id));
            } else {
                await tx.insert(habitStreak).values({
                    habitId: habitData.id,
                    userId: userId,
                    currentStreak: nextStreak.currentStreak,
                    longestStreak: nextStreak.longestStreak,
                    lastCompletedAt: today
                });
            }

            const [currentCreature] = await tx
                .select()
                .from(creature)
                .where(eq(creature.userId, userId));

            if (!currentCreature) {
                throw new Error('Creature not found for user');
            }

            const previousLevel = currentCreature.level || 1;
            const newExperience = (currentCreature.experience || 0) + experienceEarned;
            const newLevel = getLevelFromXp(newExperience);

            // Update creature experience and level
            await tx.update(creature)
                .set({
                    experience: newExperience,
                    level: newLevel
                })
                .where(eq(creature.id, currentCreature.id));

            // Mark the habit as completed in the daily tracker for the progress bar
            await tx
                .insert(dailyHabitTracker)
                .values({
                    userId: userId,
                    habitId: habitData.id,
                    date: today,
                    completed: true
                })
                .onConflictDoUpdate({
                    target: [
                        dailyHabitTracker.userId,
                        dailyHabitTracker.habitId,
                        dailyHabitTracker.date
                    ],
                    set: {
                        completed: true,
                        updatedAt: formatSqliteTimestamp()
                    }
                });

            return { completion, experienceEarned, newLevel, previousLevel };
        });

        return json({
            success: true,
            completion: result.completion,
            experienceEarned: result.experienceEarned,
            newLevel: result.newLevel,
            previousLevel: result.previousLevel,
            leveledUp: result.newLevel > result.previousLevel
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
            userId: userId
        });
        return json({ error: 'Failed to complete habit' }, { status: 500 });
    }
};
