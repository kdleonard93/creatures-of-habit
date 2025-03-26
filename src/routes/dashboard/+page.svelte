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
	import { LogOut, ScanEye, ShieldAlert } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import XpBar from '$lib/components/character/XpBar.svelte';

	const props = $props<{ data: PageData }>();

</script>

<div class="container mx-auto py-8 space-y-6">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold">Welcome, {props.data.user.username}!</h1>
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
						<p><span class="font-semibold">Email:</span> {props.data.user.email}</p>
						<p><span class="font-semibold">Username:</span> {props.data.user.username}</p>
						<p><span class="font-semibold">Age:</span> {props.data.user.age}</p>
						<p>
							<span class="font-semibold">Member since:</span>
							{new Date(props.data.user.createdAt).toLocaleDateString()}
						</p>
					</div>

					<div class="pt-2">
						<Button
							href="/settings/password"
							variant="outline"
							size="sm"
							class="flex items-center gap-2"
						>
							<ShieldAlert class="h-4 w-4" />
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
				{#if props.data.creature}
					<div class="space-y-4">
						<div class="space-y-2">
							<p class="capitalize">
								<span class="font-semibold">Name:</span>
								{props.data.creature.name}
							</p>
							<p class="flex items-center gap-3">
								<span class="font-semibold capitalize">Race:</span>
								{@html raceIcons[props.data.creature.race as CreatureRaceType]}
								<span class="capitalize">{props.data.creature.race}</span>
							</p>
							<p class="flex items-center gap-3">
								<span class="font-semibold capitalize">Class:</span>
								{@html classIcons[props.data.creature.class as CreatureClassType]}
								<span class="capitalize">{props.data.creature.class}</span>
							</p>
							<p><span class="font-semibold">Level:</span> {props.data.creature.level}</p>
						</div>

						<!-- Add XP progress bar -->
						<div class="pt-4 border-t">
							<h4 class="font-medium mb-2">Experience</h4>
							<XpBar experience={props.data.creature.experience} />
						</div>

						<!-- View Details -->
						<div class="pt-2">
							<Button
								href="/character/details"
								variant="outline"
								size="sm"
								class="w-full flex items-center justify-center gap-2"
							>
								<ScanEye class="h-4 w-4" />
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
