<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { Toaster } from 'svelte-sonner';
	import type { LayoutData } from './$types';

	const props = $props<{ data: LayoutData }>();
	const {children} = props;
</script>

<Header />

<main class="container mx-auto px-4 py-8">
	{@render children?.()}
</main>

<Footer />

<Toaster richColors closeButton position="top-center" />