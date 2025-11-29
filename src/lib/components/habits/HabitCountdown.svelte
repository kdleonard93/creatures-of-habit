<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		nextActiveDate: Date | string | null;
		isActive: boolean;
	}

	let { nextActiveDate, isActive }: Props = $props();

	let countdown = $state('');
	let mounted = $state(false);

	function calculateCountdown() {
		if (!nextActiveDate || isActive) {
			countdown = '';
			return;
		}

		const now = new Date();
		const nextDate = typeof nextActiveDate === 'string' ? new Date(nextActiveDate) : nextActiveDate;
		const diff = nextDate.getTime() - now.getTime();

		if (diff <= 0) {
			countdown = '';
			return;
		}

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((diff % (1000 * 60)) / 1000);

		if (days > 0) {
			countdown = `${days}d ${hours}h ${minutes}m`;
		} else if (hours > 0) {
			countdown = `${hours}h ${minutes}m ${seconds}s`;
		} else if (minutes > 0) {
			countdown = `${minutes}m ${seconds}s`;
		} else {
			countdown = `${seconds}s`;
		}
	}

	onMount(() => {
		mounted = true;
		calculateCountdown();
		const interval = setInterval(calculateCountdown, 1000);
		return () => clearInterval(interval);
	});

	$effect(() => {
		if (mounted) {
			calculateCountdown();
		}
	});
</script>

{#if countdown}
	<div class="flex items-center gap-1 text-muted-foreground text-xs md:text-sm font-mono">
		<span class="font-medium">Available in:</span>
		<span class="text-primary font-semibold">{countdown}</span>
	</div>
{/if}
