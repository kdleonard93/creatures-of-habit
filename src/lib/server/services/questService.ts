import { db } from '$lib/server/db';
import { generatedQuest, habit } from '$lib/server/db/schema';
import { and, eq, isNull, gte, lte, sql, or } from 'drizzle-orm';
import { formatDateOnly } from '$lib/utils/date';

export async function generateDailyQuests(userId: string) {
    const today = formatDateOnly(new Date());
    const existingQuests = await db
        .select()
        .from(generatedQuest)
        .where(
            and(
                eq(generatedQuest.userId, userId),
                gte(sql`date(${generatedQuest.createdAt})`, today),
                lte(sql`date(${generatedQuest.createdAt})`, today)
            )
        );

    if (existingQuests.length > 0) {
        return; 
    }


    const activeHabits = await db
        .select()
        .from(habit)
        .where(
            and(
                eq(habit.userId, userId),
                eq(habit.isActive, true),
                lte(habit.startDate, today),
                or(
                    isNull(habit.endDate),
                    gte(habit.endDate, today)
                )
            )
        );

    const questsToInsert = activeHabits.map(h => ({
        userId,
        title: `Daily: ${h.title}`,
        type: 'daily' as const,
        startsAt: new Date().toISOString(),
        questId: h.id, // This maps to the habit ID in the schema
        createdAt: new Date().toISOString()
    }));

    if (questsToInsert.length > 0) {
        await db.insert(generatedQuest).values(questsToInsert);
    }

    return questsToInsert.length;
}

export async function completeQuest(questId: string, userId: string) {
    const [updatedQuest] = await db
        .update(generatedQuest)
        .set({ 
            completedAt: new Date().toISOString()
        })
        .where(
            and(
                eq(generatedQuest.id, questId),
                eq(generatedQuest.userId, userId),
                isNull(generatedQuest.completedAt)
            )
        )
        .returning();

    if (!updatedQuest) {
        throw new Error('Quest not found or already completed');
    }


    if (!updatedQuest.habitId) {
        return
    }
    
    const [associatedHabit] = await db
        .select()
        .from(habit)
        .where(eq(habit.id, updatedQuest.habitId));

    if (associatedHabit) {
        // TODO: Add experience to user's creature using associatedHabit.baseExperience
    }
    
    return updatedQuest;
}
