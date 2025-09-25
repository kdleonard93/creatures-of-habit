import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    // Get data from parent layout or pass directly
    const potentialHeroes = {
        usersJoined: 1250,
        launchDate: 'Q1 2026',
        betaSpots: 500
    };

    const seo = {
        title: 'Thank You - Creatures of Habit Waitlist',
        description: 'Thank you for joining the Creatures of Habit waitlist! We\'ll notify you when we launch in Q1 2026.'
    };

    return {
        potentialHeroes,
        seo,
        alreadySignedUp: false // Default value, will be updated by API if needed
    };
};
