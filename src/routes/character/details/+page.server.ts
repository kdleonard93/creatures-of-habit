import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { creature } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load = (async ({ locals }) => {
    const session = await locals.auth();
    
    if (!session?.user) {
        throw redirect(302, '/login');
    }

    try {
        const userCreature = await db
            .select()
            .from(creature)
            .where(eq(creature.userId, session.user.id))
            .then(rows => rows[0]);

        if (!userCreature) {
            throw error(404, 'Character not found');
        }

        return {
            creature: userCreature
        };
    } catch (e) {
        console.error('Error loading character data:', e);
        throw error(500, 'Error loading character data');
    }
}) satisfies PageServerLoad;