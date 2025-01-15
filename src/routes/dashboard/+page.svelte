<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { classIcons } from '$lib/assets/classIcons';
    import { raceIcons } from '$lib/assets/raceIcons';
	import type { CreatureClassType, CreatureRaceType } from '$lib/types';
	import { Lock, LogOut, Eye } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	export let data: PageData;

	async function handleLogout() {
		const response = await fetch('/api/logout', {
			method: 'POST'
		});

		if (response.ok) {
			window.location.href = '/';
		}
	}
</script>

<div class="container mx-auto py-8 space-y-6">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold">Welcome, {data.user.username}!</h1>
		<Button variant="outline" size="sm" class="flex items-center gap-2" on:click={handleLogout}>
			<LogOut class="h-4 w-4" />
			Logout
		</Button>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- User Info Card -->
		<Card>
			<CardHeader>
				<CardTitle>Your Profile</CardTitle>
				<CardDescription>Your account information</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					<div class="space-y-2">
						<p><span class="font-semibold">Email:</span> {data.user.email}</p>
                        <p><span class="font-semibold">Username:</span> {data.user.username}</p>
						<p><span class="font-semibold">Age:</span> {data.user.age}</p>
						<p>
							<span class="font-semibold">Member since:</span>
							{new Date(data.user.createdAt).toLocaleDateString()}
						</p>
					</div>

					<div class="pt-2">
						<Button
							href="/settings/password"
							variant="outline"
							size="sm"
							class="flex items-center gap-2"
						>
							<Lock class="h-4 w-4" />
							Change Password
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Creature Info Card -->
		<Card>
			<CardHeader>
				<CardTitle>Your Creature</CardTitle>
				<CardDescription>Your companion details</CardDescription>
			</CardHeader>
			<CardContent>
				{#if data.creature}
					<div class="space-y-4">
						<div class="space-y-2">
							<p class="capitalize"><span class="font-semibold">Name:</span> {data.creature.name}</p>
							<p class="flex items-center gap-3">
								<span class="font-semibold capitalize">Race:</span> 
								{@html raceIcons[data.creature.race as CreatureRaceType]}
								<span class="capitalize">{data.creature.race}</span>
							</p>
							<p class="flex items-center gap-3">
								<span class="font-semibold capitalize">Class:</span>
								{@html classIcons[data.creature.class as CreatureClassType]}
								<span class="capitalize">{data.creature.class}</span>
							</p>
							<p><span class="font-semibold">Level:</span> {data.creature.level}</p>
						</div>
		
						<!-- Add this new button -->
						<div class="pt-2">
							<Button
								href="/character/details"
								variant="outline"
								size="sm"
								class="w-full flex items-center justify-center gap-2"
							>
								<Eye class="h-4 w-4" />
								View Details
							</Button>
						</div>
					</div>
				{:else}
					<p class="text-muted-foreground">No creature found. Create one to get started!</p>
				{/if}
			</CardContent>
		</Card>
	</div>
</div>
<form action="/logout" method="POST" use:enhance>
	<Button type="submit" variant="outline" size="sm" class="flex items-center gap-2">
		<LogOut class="h-4 w-4" />
		Logout
	</Button>
</form>
