import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { habit, habitFrequency, habitCategory, habitCompletion, creature, habitStreak } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getHabitStatus } from '$lib/utils/habitStatus';
import { getDateOnlyInTimeZone } from '$lib/shared/streaks/schedule';
import { logger } from '$lib/utils/logger';
import type { HabitFrequency } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();

	if (!session?.user) {
		throw redirect(302, '/login');
	}

	// Compute "today" in the user's time zone so the habits page matches the
	// completion endpoint near a UTC midnight boundary. See C-3.
	const timeZone = session.user.timezone ?? 'UTC';
	const today = getDateOnlyInTimeZone(new Date(), timeZone);

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

	const completions = await db
		.select({
			habitId: habitCompletion.habitId,
			value: habitCompletion.value,
			completedAt: habitCompletion.completedAt
		})
		.from(habitCompletion)
		.where(and(
			eq(habitCompletion.userId, session.user.id),
			eq(habitCompletion.completedAt, today)
		));

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

	const lastCompletionMap = new Map<string, string>();
	for (const completion of lastCompletions) {
		if (!lastCompletionMap.has(completion.habitId)) {
			lastCompletionMap.set(completion.habitId, completion.completedAt);
		}
	}

	const habitsWithCompletions = habits.map((h) => {
		const frequency = h.frequency || 'daily';
		const customFrequency = (() => {
			if (!h.customFrequency) return undefined;
			try {
				return { days: JSON.parse(h.customFrequency) };
			} catch (error) {
				logger.warn('Invalid customFrequency JSON for habit', { habitId: h.id, error: error instanceof Error ? error.message : String(error) });
				return undefined;
			}
		})();
		const completedToday = completions.some((c) => c.habitId === h.id);
		const lastCompletion = lastCompletionMap.get(h.id);

		const status = getHabitStatus(
			{
				frequency: frequency as HabitFrequency,
				customFrequency,
				createdAt: h.createdAt,
				startDate: h.startDate
			},
			lastCompletion ? { completedAt: lastCompletion } : null,
			completedToday,
			new Date(),
			timeZone
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
