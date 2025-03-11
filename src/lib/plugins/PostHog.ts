import type { PostHogConfig } from 'posthog-js';
import { PUBLIC_POSTHOG_KEY } from '$env/static/public';


console.log('🔍 PostHog: Config file loaded');

export const posthogConfig: Partial<PostHogConfig> = {
    api_host: 'https://us.i.posthog.com',
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
};

export const getPostHogKey = () => {
    if (!PUBLIC_POSTHOG_KEY) {
        console.error('❌ PostHog: API key is not defined');
    }
    return PUBLIC_POSTHOG_KEY;
};