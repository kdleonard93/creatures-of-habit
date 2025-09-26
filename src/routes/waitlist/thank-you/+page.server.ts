import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { userWaitlist } from '$lib/server/db/schema';
import { count } from 'drizzle-orm'

export const load: PageServerLoad = async ({ url }) => {

    const waitlistCount = await db.select({count: count()}).from(userWaitlist);

    const alreadySignedUp = url.searchParams.get('alreadySignedUp') === 'true';
    // Get data from parent layout or pass directly
    const potentialHeroes = {
        usersJoined: waitlistCount[0]?.count ?? 0,
        launchDate: 'Q1 2026',
        treasureChestsFound: 0,
    };

    const seo = {
        title: 'Thank You - Creatures of Habit Waitlist',
        description: 'Thank you for joining the Creatures of Habit waitlist! We\'ll notify you when we launch in Q1 2026.'
    };

    return {
        potentialHeroes,
        seo,
        alreadySignedUp,
    };
};
