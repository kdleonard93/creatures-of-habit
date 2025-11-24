<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { CheckCircle } from '@lucide/svelte';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	let countdown = $state(5);
	
	onMount(() => {
		const interval = setInterval(() => {
			countdown--;
			if (countdown <= 0) {
				clearInterval(interval);
				goto('/dashboard');
			}
		}, 1000);
		
		return () => clearInterval(interval);
	});
</script>

<div class="min-h-screen flex items-center justify-center bg-background p-4">
	<div class="max-w-md w-full bg-card rounded-lg border border-border shadow-lg p-12 text-center">
		<!-- Success Icon -->
		<div class="flex justify-center mb-6">
			<div class="bg-success rounded-full p-4 animate-scale-in">
				<CheckCircle class="w-16 h-16 text-success-foreground" />
			</div>
		</div>
		
		<!-- Content -->
		<h1 class="text-3xl font-bold text-foreground mb-4">
			Email Verified! 🎉
		</h1>
		<p class="text-lg text-muted-foreground mb-3">
			Welcome, <span class="font-semibold text-primary">{data.username}</span>! Your email has been successfully verified.
		</p>
		
		<p class="text-muted-foreground mb-8">
			Your account is now fully activated and ready to go.
		</p>
		
		<!-- Countdown -->
		<div class="bg-muted rounded-lg p-4 mb-6">
			<p class="text-sm text-foreground">
				Redirecting to dashboard in <span class="font-semibold text-primary">{countdown}</span> seconds...
			</p>
		</div>
		
		<!-- Manual redirect button -->
		<Button 
			class="w-full"
			onclick={() => goto('/dashboard')}
		>
			Go to Dashboard Now
		</Button>
	</div>
</div>

<style>
	@keyframes scale-in {
		from {
			transform: scale(0);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}
	
	.animate-scale-in {
		animation: scale-in 0.5s ease-out;
	}
</style>