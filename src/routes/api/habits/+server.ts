import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { habit, habitFrequency, habitStreak } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { HabitData } from '$lib/types';
import { rateLimit, RateLimitPresets } from '$lib/server/rateLimit';

// GET - List habits for the current user
export const GET = (async (event) => {
    await rateLimit(event, RateLimitPresets.API);
    const session = await event.locals.auth();
    
    if (!session?.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
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
                createdAt: habit.createdAt,
                customFrequency: habitFrequency.days
            })
            .from(habit)
            .leftJoin(habitFrequency, eq(habit.frequencyId, habitFrequency.id))
            .where(and(
                eq(habit.userId, session.user.id),
                eq(habit.isArchived, false)
            ));

        // Parse the customFrequency days if they exist
        const habitsWithParsedFrequency = habits.map(habit => ({
            ...habit,
            customFrequency: habit.customFrequency ? JSON.parse(habit.customFrequency) : null
        }));

        return json({ habits: habitsWithParsedFrequency });
    } catch (error) {
        console.error('Error fetching habits:', error);
        return json({ error: 'Failed to fetch habits' }, { status: 500 });
    }
}) satisfies RequestHandler;

// POST - Create a new habit
export const POST = (async (event) => {
    await rateLimit(event, RateLimitPresets.API);

    const session = await event.locals.auth();
    
    if (!session?.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const habitData = await event.request.json() as HabitData;
        
        // Create the habit frequency first if it's custom
        let frequencyId = null;
        if (habitData.frequency === 'custom' && habitData.customFrequency) {
            const [frequency] = await db
                .insert(habitFrequency)
                .values({
                    name: 'custom',
                    days: JSON.stringify(habitData.customFrequency.days),
                })
                .returning();
            frequencyId = frequency.id;
        }

        // Create the habit
        const [newHabit] = await db
            .insert(habit)
            .values({
                userId: session.user.id,
                title: habitData.title,
                description: habitData.description,
                categoryId: habitData.categoryId,
                frequencyId,
                difficulty: habitData.difficulty,
                startDate: habitData.startDate,
                endDate: habitData.endDate
            })
            .returning();

        // Initialize streak tracking
        await db
            .insert(habitStreak)
            .values({
                habitId: newHabit.id,
                userId: session.user.id
            });

        return json({ habit: newHabit });
    } catch (error) {
        console.error('Error creating habit:', error);
        return json({ error: 'Failed to create habit' }, { status: 500 });
    }
}) satisfies RequestHandler;