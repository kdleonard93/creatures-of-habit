import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {

    const alreadySignedUp = url.searchParams.get('alreadySignedUp') === 'true';
    // Get data from parent layout or pass directly
    const potentialHeroes = {
        usersJoined: alreadySignedUp ? 1250 : 1251,
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
        alreadySignedUp,
    };
};
