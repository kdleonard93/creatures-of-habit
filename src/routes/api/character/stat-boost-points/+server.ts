import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { creatureStats, creature } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as auth from '$lib/server/auth';

export const GET: RequestHandler = async ({ cookies }) => {
    try {
        const sessionId = cookies.get(auth.sessionCookieName);
        if (!sessionId) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { user } = await auth.validateSessionToken(sessionId);
        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's creature
        const userCreature = await db
            .select()
            .from(creature)
            .where(eq(creature.userId, user.id))
            .limit(1);

        if (userCreature.length === 0) {
            return json({ error: 'User creature not found' }, { status: 404 });
        }

        // Get or create creature stats
        let stats = await db
            .select()
            .from(creatureStats)
            .where(eq(creatureStats.creatureId, userCreature[0].id))
            .limit(1);

        if (stats.length === 0) {
            // Create default stats for existing users
            const [newStats] = await db
                .insert(creatureStats)
                .values({
                    creatureId: userCreature[0].id,
                    strength: 10,
                    dexterity: 10,
                    constitution: 10,
                    intelligence: 10,
                    wisdom: 10,
                    charisma: 10,
                    statBoostPoints: 0
                })
                .returning();
            stats = [newStats];
        }

        const statData = stats[0];
        return json({
            statBoostPoints: statData.statBoostPoints || 0,
            strength: statData.strength,
            dexterity: statData.dexterity,
            constitution: statData.constitution,
            intelligence: statData.intelligence,
            wisdom: statData.wisdom,
            charisma: statData.charisma
        });
    } catch (error) {
        console.error('Error getting stat boost points:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
