import posthog from 'posthog-js'
import { browser } from '$app/environment';
import { posthogConfig, getPostHogKey } from '$lib/plugins/PostHog';

export const load = async () => {
    if (browser) {
        posthog.init(getPostHogKey(), posthogConfig);
    }
    return {};
};