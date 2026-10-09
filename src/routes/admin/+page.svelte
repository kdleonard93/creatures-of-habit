<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	function badgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		if (status === 'spam') return 'destructive';
		if (status === 'reviewed') return 'secondary';
		return 'outline';
	}
</script>

<div class="container mx-auto max-w-4xl space-y-8 py-8">
	<div>
		<h1 class="text-2xl font-bold">Submission review</h1>
		<p class="text-sm text-muted-foreground">
			Recent contact and waitlist submissions, newest first.
		</p>
	</div>

	<Card>
		<CardHeader>
			<CardTitle>Contact submissions ({data.contacts.length})</CardTitle>
		</CardHeader>
		<CardContent>
			{#if data.contacts.length === 0}
				<p class="text-sm text-muted-foreground">No contact submissions.</p>
			{:else}
				<ul class="space-y-4">
					{#each data.contacts as submission (submission.id)}
						<li class="rounded-md border p-4">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<div>
									<p class="font-medium">{submission.name}</p>
									<p class="text-sm text-muted-foreground">{submission.email}</p>
								</div>
								<div class="flex items-center gap-2">
									<Badge variant={badgeVariant(submission.status)}>
										{submission.status}
									</Badge>
									{#if submission.flagged}
										<Badge variant="destructive">flagged</Badge>
									{/if}
								</div>
							</div>
							<p class="mt-2 whitespace-pre-wrap text-sm">{submission.message}</p>
							<p class="mt-2 text-xs text-muted-foreground">{submission.createdAt}</p>
							<form method="POST" action="?/update" class="mt-3 flex flex-wrap gap-2">
								<input type="hidden" name="type" value="contact" />
								<input type="hidden" name="id" value={submission.id} />
								<Button type="submit" name="action" value="reviewed" size="sm" variant="secondary">
									Mark reviewed
								</Button>
								<Button type="submit" name="action" value="spam" size="sm" variant="destructive">
									Mark spam
								</Button>
								<Button type="submit" name="action" value="clear" size="sm" variant="outline">
									Clear
								</Button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Waitlist submissions ({data.waitlist.length})</CardTitle>
		</CardHeader>
		<CardContent>
			{#if data.waitlist.length === 0}
				<p class="text-sm text-muted-foreground">No waitlist submissions.</p>
			{:else}
				<ul class="space-y-4">
					{#each data.waitlist as submission (submission.id)}
						<li class="rounded-md border p-4">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<div>
									<p class="font-medium">{submission.email}</p>
									<p class="text-sm text-muted-foreground">
										Referral: {submission.referralSource ?? 'direct'}
									</p>
								</div>
								<div class="flex items-center gap-2">
									<Badge variant={badgeVariant(submission.status)}>
										{submission.status}
									</Badge>
									{#if submission.flagged}
										<Badge variant="destructive">flagged</Badge>
									{/if}
								</div>
							</div>
							<p class="mt-2 text-xs text-muted-foreground">{submission.subscribedAt}</p>
							<form method="POST" action="?/update" class="mt-3 flex flex-wrap gap-2">
								<input type="hidden" name="type" value="waitlist" />
								<input type="hidden" name="id" value={submission.id} />
								<Button type="submit" name="action" value="reviewed" size="sm" variant="secondary">
									Mark reviewed
								</Button>
								<Button type="submit" name="action" value="spam" size="sm" variant="destructive">
									Mark spam
								</Button>
								<Button type="submit" name="action" value="clear" size="sm" variant="outline">
									Clear
								</Button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</CardContent>
	</Card>
</div>
