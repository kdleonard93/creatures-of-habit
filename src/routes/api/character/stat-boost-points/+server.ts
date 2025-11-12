import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { creatureStats, creature } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as auth from '$lib/server/auth';
import { creatureEquipment } from '$lib/server/db/schema';
import { getEffectiveStats } from '$lib/server/xp';
import { equipmentDefinitions } from '$lib/data/equipment';
import type { CreatureRaceType, CreatureClassType, CreatureStats } from '$lib/types';

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
        
        // Get creature equipment
        const equipment = await db
            .select()
            .from(creatureEquipment)
            .where(eq(creatureEquipment.creatureId, userCreature[0].id));

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
        const baseStats: CreatureStats = {
            strength: statData.strength,
            dexterity: statData.dexterity,
            constitution: statData.constitution,
            intelligence: statData.intelligence,
            wisdom: statData.wisdom,
            charisma: statData.charisma
        };

        // Map equipment to include bonuses
        const equipmentWithBonuses = equipment.map(item => ({
            slot: item.slot,
            bonuses: equipmentDefinitions[item.itemId]?.bonuses
        }));

        // Calculate effective stats with all bonuses
        const effectiveStats = getEffectiveStats(
            baseStats,
            userCreature[0].race as CreatureRaceType,
            userCreature[0].class as CreatureClassType,
            userCreature[0].level as number,
            equipmentWithBonuses
        );

        return json({
            statBoostPoints: statData.statBoostPoints || 0,
            strength: effectiveStats.strength,
            dexterity: effectiveStats.dexterity,
            constitution: effectiveStats.constitution,
            intelligence: effectiveStats.intelligence,
            wisdom: effectiveStats.wisdom,
            charisma: effectiveStats.charisma
        });
    } catch (error) {
        console.error('Error getting stat boost points:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
