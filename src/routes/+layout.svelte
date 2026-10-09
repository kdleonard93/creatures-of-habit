<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { Toaster } from 'svelte-sonner';
	import type { LayoutData } from './$types';
	import posthog from 'posthog-js';
	import { afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';

	const props = $props<{ data: LayoutData }>();
	const {children} = props;

	let timezoneSyncAttempted = false;

	if (browser) {
		afterNavigate(() => {
        posthog.capture('$pageview');
    });
  }

	$effect(() => {
		// Sync the browser's IANA time zone to the server once so scheduling and
		// the daily tracker use the user's local day. Fire and forget: an ignored
		// failure is retried on the next full load. See C-3.
		if (!browser || timezoneSyncAttempted) return;

		const user = props.data.user;
		if (!user) return;

		timezoneSyncAttempted = true;

		const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (!browserTimeZone || browserTimeZone === user.timezone) return;

		void fetch('/api/user/timezone', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ timezone: browserTimeZone })
		}).catch(() => {
			// Best effort only; the next load retries the sync.
		});
	});
  
</script>

<Header />

<main class="container mx-auto px-4 py-8">
    {@render children?.()}
</main>

<Footer />

<Toaster richColors closeButton position="top-center" />