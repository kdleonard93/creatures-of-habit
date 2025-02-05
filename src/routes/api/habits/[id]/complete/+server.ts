import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { habit, habitCompletion, creature } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';

// Calculate experience based on difficulty
function calculateExperience(difficulty: string): number {
    const baseXP = 10;
    switch(difficulty) {
        case 'easy': return baseXP;
        case 'medium': return baseXP * 2;
        case 'hard': return baseXP * 3;
        default: return baseXP;
    }
}

export const POST = (async ({ locals, params }) => {
    const session = await locals.auth();
    
    if (!session?.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get the habit
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

        // Calculate experience
        const experienceEarned = calculateExperience(habitData.difficulty);

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

        // Get current creature
        const [currentCreature] = await db
            .select()
            .from(creature)
            .where(eq(creature.userId, session.user.id));

        // Calculate new level
        const newExperience = (currentCreature.experience ?? 0) + experienceEarned;
        const newLevel = Math.floor(newExperience / 100) + 1;
        const previousLevel = currentCreature.level;

        // Update creature and mark habit as completed (archived)
        await Promise.all([
            // Update creature experience and level
            db.update(creature)
                .set({
                    experience: newExperience,
                    level: newLevel
                })
                .where(eq(creature.userId, session.user.id)),
            
            // Mark habit as completed
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
            previousLevel
        });
    } catch (error) {
        console.error('Error completing habit:', error);
        return json({ error: 'Failed to complete habit' }, { status: 500 });
    }
}) satisfies RequestHandler;