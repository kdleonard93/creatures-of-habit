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

	if (browser) {
		afterNavigate(() => {
        posthog.capture('$pageview');
    });
  }
  
</script>

<Header />

<main class="container mx-auto px-4 py-8">
    {@render children?.()}
</main>

<Footer />

<Toaster richColors closeButton position="top-center" />