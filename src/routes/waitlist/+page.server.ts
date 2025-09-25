import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    return {
        title: 'Join the Creatures of Habit Waitlist',
        description: 'Be the first to experience the future of habit building. Join our waitlist for early access to Creatures of Habit - launching Q1 2026.'
    };
};
