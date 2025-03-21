import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { habit, habitCompletion, creature, habitStreak } from '$lib/server/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { calculateHabitXp, getLevelFromXp } from '$lib/server/xp';

export const POST = (async ({ locals, params }) => {
    const session = await locals.auth();
    
    if (!session?.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [habitData] = await db
            .select()
            .from(habit)
            .where(and(
                eq(habit.id, params.id),
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
                completedAt: new Date().toISOString(),
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
                lastCompletedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            })
            .where(eq(habitStreak.habitId, habitData.id));

        const [currentCreature] = await db
            .select()
            .from(creature)
            .where(eq(creature.userId, session.user.id));

        // Calculate new level
        const newExperience = (currentCreature.experience || 0) + experienceEarned;
        const previousLevel = currentCreature.level;
        const newLevel = getLevelFromXp(newExperience);

        // Update creature and mark habit as completed (archived)
        await Promise.all([
            db.update(creature)
                .set({
                    experience: newExperience,
                    level: newLevel
                })
                .where(eq(creature.userId, session.user.id)),
            
            db.update(habit)
                .set({
                    isArchived: true,
                    updatedAt: new Date().toISOString()
                })
                .where(eq(habit.id, habitData.id))
        ]);

        return json({
            success: true,
            completion,
            experienceEarned,
            newLevel,
            previousLevel,
            leveledUp: newLevel > previousLevel
        });
    } catch (error) {
        console.error('Error completing habit:', error);
        return json({ error: 'Failed to complete habit' }, { status: 500 });
    }
}) satisfies RequestHandler;