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
	import { LogOut, ScanEye, ShieldAlert, Plus, Filter, Calendar } from '@lucide/svelte';
	import { enhance } from '$app/forms';
    import XPBar from '$lib/components/character/XPBar.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import DailyProgressSummary from '$lib/components/dashboard/DailyProgressSummary.svelte';
	import HabitCard from '$lib/components/habits/HabitCard.svelte';

	const props = $props<{ data: PageData }>();
	
	// Date formatting for the dashboard header
	const formattedDate = $derived(new Date().toLocaleDateString('en-US', { 
		weekday: 'long', 
		year: 'numeric', 
		month: 'long', 
		day: 'numeric' 
	}));

	const displayedHabits = $derived(props.data.habits?.slice(0, 6) || []);
	const totalHabits = $derived(props.data.habits?.length || 0);
	const hasMoreHabits = $derived(totalHabits > 6);
	

	async function completeHabit(habitId: string) {
		try {
			const response = await fetch(`/api/habits/${habitId}/complete`, {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Failed to complete habit');
			}

			const data = await response.json();
			
			toast.success(`Gained ${data.experienceEarned} XP!`);
			if (data.newLevel > data.previousLevel) {
				toast.success(`Level up! Now level ${data.newLevel}`);
			}

			await invalidateAll();
		} catch (error) {
			console.error('Error completing habit:', error);
			toast.error('Failed to complete habit');
		}
	}

	function editHabit(habitId: string) {
		goto(`/habits/${habitId}/edit`);
	}

	async function deleteHabit(habitId: string, habitTitle: string) {
		if (!confirm('Are you sure you want to delete this habit?')) return;
		
		try {
			const response = await fetch(`/api/habits/${habitId}`, {
				method: 'DELETE'
			});
			
			if (!response.ok) {
				throw new Error('Failed to delete habit');
			}

			toast.success(`${habitTitle} deleted successfully`);
			await invalidateAll();
		} catch (error) {
			toast.error(`Error deleting habit: ${error}`);
		}
	}
</script>

<div class="container mx-auto px-4 py-6 space-y-6">
	<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
		<div>
			<p class="text-muted-foreground flex items-center gap-2">
				<Calendar class="h-6 w-6" />
				{formattedDate}
			</p>
		</div>
		
		<!-- Daily Progress Summary -->
		<DailyProgressSummary data={props.data} />
	</div>

	<!-- Today's Habits Section -->
	<Card>
		<CardHeader>
			<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<CardTitle>Today's Habits</CardTitle>
					<CardDescription>Track your daily progress</CardDescription>
				</div>
				<div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
					<Button 
						variant="outline" 
						size="sm" 
						class="flex items-center justify-center gap-2"
						onclick={() => goto('/habits')}
					>
						<Filter class="h-4 w-4" />
						View All
					</Button>
					<Button 
						variant="outline" 
						size="sm" 
						class="flex items-center justify-center gap-2"
						onclick={() => goto('/habits/new')}
					>
						<Plus class="h-4 w-4" />
						New Habit
					</Button>
				</div>
			</div>
		</CardHeader>
		<CardContent>
			
			{#if displayedHabits.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each displayedHabits as habit (habit.id)}
						<HabitCard 
							{habit}
							onEdit={editHabit}
							onDelete={deleteHabit}
							onComplete={completeHabit}
							showReminder={false}
						/>
					{/each}
				</div>
				
				{#if hasMoreHabits}
					<div class="mt-6 text-center">
						<Button 
							variant="outline" 
							onclick={() => goto('/habits')}
							class="w-full sm:w-auto"
						>
							View All {totalHabits} Habits
						</Button>
					</div>
				{/if}
			{:else}
				<div class="text-center py-8">
					<p class="text-muted-foreground">You don't have any habits yet.</p>
					<Button 
						variant="outline" 
						class="mt-4"
						onclick={() => goto('/habits/new')}
					>
						Create Your First Habit
					</Button>
				</div>
			{/if}
		</CardContent>
	</Card>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- User Info Card -->
		<Card>
			<CardHeader>
				<CardTitle>Your Profile</CardTitle>
				<CardDescription>Your account information</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					<div class="space-y-3 text-sm md:text-base">
						<p><span class="font-semibold">Email:</span> <span class="break-all">{props.data.user.email}</span></p>
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
							class="w-full flex items-center justify-center gap-2"
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
						<div class="space-y-3 text-sm md:text-base">
							<p class="capitalize">
								<span class="font-semibold">Name:</span>
								{props.data.creature.name}
							</p>
							<p class="flex items-center gap-2 flex-wrap">
								<span class="font-semibold capitalize">Race:</span>
								<span class="flex items-center gap-1">
									{@html raceIcons[props.data.creature.race as CreatureRaceType]}
									<span class="capitalize">{props.data.creature.race}</span>
								</span>
							</p>
							<p class="flex items-center gap-2 flex-wrap">
								<span class="font-semibold capitalize">Class:</span>
								<span class="flex items-center gap-1">
									{@html classIcons[props.data.creature.class as CreatureClassType]}
									<span class="capitalize">{props.data.creature.class}</span>
								</span>
							</p>
						</div>

						<!-- Add XP progress bar -->
						<div class="pt-4 border-t">
							<h4 class="font-medium mb-2 text-sm md:text-base">Experience</h4>
							<XPBar experience={props.data.creature.experience} />
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

