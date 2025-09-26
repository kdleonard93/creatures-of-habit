import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { PostHog } from 'posthog-node';
import { getPostHogKey } from '$lib/plugins/PostHog';

export const load: PageServerLoad = async ({ locals }) => {
    const session = await locals.auth();

    if (session?.user) {
        throw redirect(302, '/dashboard');
    }

    // Server-side PostHog tracking for home page
    const posthog = new PostHog(getPostHogKey(), { 
      host: 'https://us.i.posthog.com' 
    });
    
    try {
      posthog.capture({
        distinctId: session?.user?.id || `anon_${crypto.randomUUID()}`,
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
        redirectTo: '/waitlist'
    };
};
  