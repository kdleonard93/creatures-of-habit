import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { habit, habitFrequency, habitCategory, habitCompletion, creature, habitStreak } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getHabitStatus } from '$lib/utils/habitStatus';
import type { HabitFrequency } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();

	if (!session?.user) {
		throw redirect(302, '/login');
	}

	const today = new Date().toISOString().split('T')[0];

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
			value: habitCompletion.value,
			completedAt: habitCompletion.completedAt
		})
		.from(habitCompletion)
		.where(eq(habitCompletion.completedAt, today));

	// Get last completion for each habit (for status calculation)
	const lastCompletions = await db
		.select({
			habitId: habitCompletion.habitId,
			completedAt: habitCompletion.completedAt
		})
		.from(habitCompletion)
		.where(eq(habitCompletion.userId, session.user.id))
		.orderBy(desc(habitCompletion.completedAt));

	const userCreature = await db
		.select()
		.from(creature)
		.where(eq(creature.userId, session.user.id))
		.then((rows) => rows[0]);

	// Create a map of last completions by habit ID
	const lastCompletionMap = new Map<string, string>();
	for (const completion of lastCompletions) {
		if (!lastCompletionMap.has(completion.habitId)) {
			lastCompletionMap.set(completion.habitId, completion.completedAt);
		}
	}

	const habitsWithCompletions = habits.map((h) => {
		const frequency = h.frequency || 'daily';
		const customFrequency = h.customFrequency
			? {
					days: JSON.parse(h.customFrequency)
				}
			: undefined;
		const completedToday = completions.some((c) => c.habitId === h.id);
		const lastCompletion = lastCompletionMap.get(h.id);

		// Calculate habit status
		const status = getHabitStatus(
			{
				frequency: frequency as HabitFrequency,
				customFrequency,
				createdAt: h.createdAt
			},
			lastCompletion ? { completedAt: lastCompletion } : null,
			completedToday
		);

		return {
			...h,
			frequency,
			customFrequency,
			completedToday,
			isActiveToday: status.isActiveToday,
			nextActiveDate: status.nextActiveDate,
			daysUntilActive: status.daysUntilActive,
			availabilityMessage: status.availabilityMessage
		};
	});

	const categories = await db
		.select({
			id: habitCategory.id,
			name: habitCategory.name
		})
		.from(habitCategory)
		.where(eq(habitCategory.userId, session.user.id));

	return {
		habits: habitsWithCompletions,
		categories: categories.map((category) => ({
			...category
		})),
        level: userCreature?.level ?? 1,
        experience: userCreature?.experience ?? 0
	};
};
