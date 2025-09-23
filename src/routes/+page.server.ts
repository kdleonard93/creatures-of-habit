import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { PostHog } from 'posthog-node';
import { getPostHogKey } from '$lib/plugins/PostHog';

export const load: PageServerLoad = async ({ locals }) => {
    const session = await locals.auth();

    if (session?.user) {
        throw redirect(302, '/dashboard');
    }

    const features = {
        showWaitlist: true,
        showTestimonials: true,
        enableTracking: true
    };

    const potentialHeroes = {
        usersJoined: 1250,
        launchDate: 'Q1 2026',
        betaSpots: 500
    };

    const seo = {
        title: 'Join Creatures of Habit Waitlist - Early Access Q1 2026',
        description: 'Transform your habits with our RPG-inspired app...',
        keywords: 'habit tracking, gamification, productivity'
    };

    // Server-side PostHog tracking for home page
    const posthog = new PostHog(getPostHogKey(), { 
      host: 'https://us.i.posthog.com' 
    });
    
    try {
      posthog.capture({
        distinctId: session?.user?.id || 'anonymous',
        event: 'home_page_view',
        properties: {
          authenticated: !!session?.user
        }
      });
    } catch (error) {
      console.error('PostHog tracking failed:', error);
    }
    
    await posthog.shutdown();

    return {
        features,
        potentialHeroes,
        seo,
        redirectTo: '/waitlist'
    };
};
  