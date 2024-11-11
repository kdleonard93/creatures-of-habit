<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte'
	import Footer from '$lib/components/Footer.svelte'
</script>

<Header />

<main class="container mx-auto px-4 py-8">
  <slot />
</main>

<Footer />

