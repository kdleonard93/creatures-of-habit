import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { habit } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const DELETE = (async ({ locals, params }) => {
    const session = await locals.auth();
    
    if (!session?.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await db
            .delete(habit)
            .where(and(
                eq(habit.id, params.id),
                eq(habit.userId, session.user.id)
            ));

        return json({ success: true });
    } catch (error) {
        console.error('Error permanently deleting habit:', error);
        return json({ error: 'Failed to delete habit' }, { status: 500 });
    }
}) satisfies RequestHandler;