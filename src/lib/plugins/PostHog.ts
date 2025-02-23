import type { PostHogConfig } from 'posthog-js';
import { PUBLIC_POSTHOG_KEY } from '$env/static/public';

const isDev = import.meta.env.DEV;

console.log('🔍 PostHog: Config file loaded');

export const posthogConfig: Partial<PostHogConfig> = {
    api_host: 'https://us.i.posthog.com',
    capture_pageview: false,
    capture_pageleave: false,
    loaded: (posthog) => {
        if (isDev) {
            console.log('🎉 PostHog: Loaded successfully');
            posthog.debug();
        }
    },
    debug: isDev,
    property_blacklist: ['token'],
    persistence: 'localStorage',
    mask_all_text: !isDev,
    mask_all_element_attributes: !isDev
};

export const getPostHogKey = () => {
    if (!PUBLIC_POSTHOG_KEY) {
        console.error('❌ PostHog: API key is not defined');
    }
    return PUBLIC_POSTHOG_KEY;
};