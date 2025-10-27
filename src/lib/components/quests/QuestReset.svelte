<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { AlertTriangle } from '@lucide/svelte';

	const { onReset } = $props<{
		onReset: () => Promise<void>;
	}>();

	let isResetting = $state(false);
	let message = $state('');
	let isError = $state(false);

	async function handleReset() {
		if (!confirm('Are you sure you want to reset today\'s quest? This will delete all progress.')) {
			return;
		}

		try {
			isResetting = true;
			message = '';
			isError = false;

			const response = await fetch('/api/quests/reset', {
				method: 'POST'
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to reset quest');
			}

			message = data.message || 'Quest reset successfully!';
			isError = false;

			// Call parent callback to refresh quest data
			await onReset();
		} catch (err) {
			message = err instanceof Error ? err.message : 'Failed to reset quest';
			isError = true;
		} finally {
			isResetting = false;
		}
	}
</script>

<Card class="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
	<CardHeader>
		<div class="flex items-center gap-2">
			<AlertTriangle class="w-5 h-5 text-yellow-600" />
			<CardTitle class="text-lg text-yellow-900 dark:text-yellow-100">Dev Tools</CardTitle>
		</div>
		<CardDescription class="text-yellow-800 dark:text-yellow-200">
			Development-only quest management
		</CardDescription>
	</CardHeader>
	<CardContent class="space-y-3">
		<Button
			onclick={handleReset}
			disabled={isResetting}
			variant="destructive"
			size="sm"
			class="w-full"
		>
			{isResetting ? 'Resetting...' : 'Reset Today\'s Quest'}
		</Button>
		
		{#if message}
			<p class="text-sm {isError ? 'text-red-600' : 'text-green-600'}">
				{message}
			</p>
		{/if}
	</CardContent>
</Card>