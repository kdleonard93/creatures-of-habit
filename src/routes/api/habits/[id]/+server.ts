import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { habit, habitCategory, habitFrequency } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import {
	habitWriteSchema,
	habitArchiveSchema,
	firstZodMessage
} from '$lib/server/validation/habit';

/** A provided category must belong to the session user. See S-1. */
async function categoryBelongsToUser(categoryId: string, userId: string): Promise<boolean> {
	const [row] = await db
		.select({ id: habitCategory.id })
		.from(habitCategory)
		.where(and(eq(habitCategory.id, categoryId), eq(habitCategory.userId, userId)));
	return Boolean(row);
}

function isArchiveOnlyBody(body: unknown): boolean {
	return (
		typeof body === 'object' &&
		body !== null &&
		Object.keys(body).length === 1 &&
		'isArchived' in body
	);
}

// GET - Fetch a single habit
export const GET = (async ({ locals, params }) => {
   const session = await locals.auth();
   
   if (!session?.user) {
       return json({ error: 'Unauthorized' }, { status: 401 });
   }

   try {
       const [foundHabit] = await db
           .select()
           .from(habit)
           .where(and(
               eq(habit.id, params.id),
               eq(habit.userId, session.user.id)
           ));

       if (!foundHabit) {
           return json({ error: 'Habit not found' }, { status: 404 });
       }

       return json({ habit: foundHabit });
   } catch (error) {
       console.error('Error fetching habit:', error);
       return json({ error: 'Failed to fetch habit' }, { status: 500 });
   }
}) satisfies RequestHandler;

// PUT - Update a habit
export const PUT = (async ({ locals, params, request }) => {
   const session = await locals.auth();
   
   if (!session?.user) {
       return json({ error: 'Unauthorized' }, { status: 401 });
   }

   try {
       let body: unknown;
       try {
           body = await request.json();
       } catch {
           return json({ error: 'Invalid JSON body' }, { status: 400 });
       }

       // Check if this is a simple restore/archive operation
       if (isArchiveOnlyBody(body)) {
           const archive = habitArchiveSchema.safeParse(body);
           if (!archive.success) {
               return json({ error: 'isArchived must be a boolean' }, { status: 400 });
           }

           const [updatedHabit] = await db
               .update(habit)
               .set({
                   isArchived: archive.data.isArchived,
                   updatedAt: new Date().toISOString()
               })
               .where(and(
                   eq(habit.id, params.id),
                   eq(habit.userId, session.user.id)
               ))
               .returning();
           
           return json({ habit: updatedHabit });
       }
       
       // Otherwise, treat as full habit update
       const parsed = habitWriteSchema.safeParse(body);
       if (!parsed.success) {
           return json({ error: firstZodMessage(parsed.error) }, { status: 400 });
       }
       const habitData = parsed.data;

       if (habitData.categoryId && !(await categoryBelongsToUser(habitData.categoryId, session.user.id))) {
           return json({ error: 'Category not found' }, { status: 400 });
       }

       let frequencyId = null;
       if (habitData.frequency === 'weekly') {
           const [frequency] = await db
               .insert(habitFrequency)
               .values({
                   name: 'weekly',
                   days: null,
               })
               .returning();
           frequencyId = frequency.id;
       } else if (habitData.frequency === 'custom' && habitData.customFrequency) {
           const [frequency] = await db
               .insert(habitFrequency)
               .values({
                   name: 'custom',
                   days: JSON.stringify(habitData.customFrequency.days ?? []),
               })
               .returning();
           frequencyId = frequency.id;
       }

       const [updatedHabit] = await db
           .update(habit)
           .set({
               title: habitData.title,
               description: habitData.description,
               categoryId: habitData.categoryId,
               frequencyId,
               difficulty: habitData.difficulty,
               startDate: habitData.startDate,
               endDate: habitData.endDate,
               updatedAt: new Date().toISOString()
           })
           .where(and(
               eq(habit.id, params.id),
               eq(habit.userId, session.user.id)
           ))
           .returning();

       return json({ habit: updatedHabit });
   } catch (error) {
       console.error('Error updating habit:', error);
       return json({ error: 'Failed to update habit' }, { status: 500 });
   }
}) satisfies RequestHandler;

// DELETE - Soft delete a habit
export const DELETE = (async ({ locals, params }) => {
   const session = await locals.auth();
   
   if (!session?.user) {
       return json({ error: 'Unauthorized' }, { status: 401 });
   }

   try {
       // Soft delete by setting isArchived to true
       await db
           .update(habit)
           .set({
               isArchived: true,
               updatedAt: new Date().toISOString()
           })
           .where(and(
               eq(habit.id, params.id),
               eq(habit.userId, session.user.id)
           ));

       return json({ success: true });
   } catch (error) {
       console.error('Error deleting habit:', error);
       return json({ error: 'Failed to delete habit' }, { status: 500 });
   }
}) satisfies RequestHandler;