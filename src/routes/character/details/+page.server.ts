import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { creature, creatureStats, creatureEquipment } from '$lib/server/db/schema';
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

        const stats = await db.select().from(creatureStats).where(eq(creatureStats.creatureId, userCreature.id)).then(rows => rows[0]);
        const equipment = await db.select().from(creatureEquipment).where(eq(creatureEquipment.creatureId, userCreature.id));


        return {
            creature: userCreature,
            stats: stats || {
                strength: 10,
                dexterity: 10,
                constitution: 10,
                intelligence: 10,
                wisdom: 10,
                charisma: 10
            },
            equipment: equipment || []
        };
    } catch (e) {
        console.error('Error loading character data:', e);
        throw error(500, 'Error loading character data');
    }
}) satisfies PageServerLoad;