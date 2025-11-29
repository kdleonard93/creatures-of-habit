import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { habit, habitFrequency } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { HabitData } from '$lib/types';

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
       const habitData = await request.json() as HabitData;
       
       // Update frequency for weekly and custom habits
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
                   days: JSON.stringify(habitData.customFrequency.days),
               })
               .returning();
           frequencyId = frequency.id;
       }
       // Daily habits keep frequencyId = null

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