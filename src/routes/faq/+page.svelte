<script lang="ts">
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { CircleQuestionMark } from '@lucide/svelte'
</script>

<div class="container mx-auto py-8 space-y-8">
	<!-- Hero Section -->
	<div class="text-center space-y-4">
		<div class="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
			<CircleQuestionMark class="h-4 w-4" />
			FAQ
		</div>
		<h1 class="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
			Frequently Asked Questions
		</h1>
	</div>
</div>