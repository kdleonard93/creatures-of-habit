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
	import { LogOut, ScanEye, ShieldAlert, CircleCheck, Trophy, Plus, Filter, Calendar } from '@lucide/svelte';
	import { enhance } from '$app/forms';
    import XPBar from '$lib/components/character/XPBar.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import DailyProgressSummary from '$lib/components/dashboard/DailyProgressSummary.svelte';

	const props = $props<{ data: PageData }>();
	
	// Date formatting for the dashboard header
	const formattedDate = $derived(new Date().toLocaleDateString('en-US', { 
		weekday: 'long', 
		year: 'numeric', 
		month: 'long', 
		day: 'numeric' 
	}));
	

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

			// Refresh the habits list
			await invalidateAll();
		} catch (error) {
			console.error('Error completing habit:', error);
			toast.error('Failed to complete habit');
		}
	}

	function formatCustomDays(days: number[] | undefined): string {
		if (!days || !days.length) return 'Custom';
		const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		return days.map(d => dayNames[d]).join(', ');
	}

	function getDifficultyColor(difficulty: string): string {
		switch (difficulty.toLowerCase()) {
			case 'easy':
				return 'bg-easy/20 text-easy';
			case 'medium':
				return 'bg-medium/20 text-medium';
			case 'hard':
				return 'bg-hard/20 text-hard';
			default:
				return 'bg-medium/20 text-medium';
		}
	}
</script>

<div class="container mx-auto px-4 py-6 space-y-6">
	<div class="flex flex-col gap-4">
		<div>
			<p class="text-muted-foreground flex items-center gap-2 text-sm md:text-base">
				<Calendar class="h-5 w-5" />
				{formattedDate}
			</p>
		</div>
		
		<!-- Daily Progress Summary -->
		<div class="w-full">
			<DailyProgressSummary data={props.data} />
		</div>
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
			
			{#if props.data.habits && props.data.habits.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each props.data.habits as habit (habit.id)}
						<div class="p-4 border rounded-lg shadow-sm bg-card flex flex-col">
							<div class="flex justify-between items-start mb-3">
								<div class="flex flex-col flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<h3 class="font-semibold break-words">{habit.title}</h3>
										{#if habit.completedToday}
											<div class="text-success">
												<Trophy class="h-4 w-4" />
											</div>
										{/if}
									</div>
									<div class="flex flex-wrap gap-2 mt-2">
										<span class="capitalize px-2 py-0.5 rounded-full text-xs {getDifficultyColor(habit.difficulty)}">
											{habit.difficulty}
										</span>
										<span class="capitalize px-2 py-0.5 bg-muted rounded-full text-xs">
											{habit.frequency === 'custom' && habit.customFrequency?.days ? 
												formatCustomDays(habit.customFrequency.days) : 
												habit.frequency}
										</span>
									</div>
								</div>
								<Button 
									variant={habit.completedToday ? "outline" : "success"}
									size="sm"
									onclick={() => completeHabit(habit.id)}
									disabled={habit.completedToday}
									class="flex items-center gap-2 min-w-24 flex-shrink-0"
								>
									<CircleCheck class="h-4 w-4" />
									{habit.completedToday ? 'Completed' : 'Complete'}
								</Button>
							</div>
						</div>
					{/each}
				</div>
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

