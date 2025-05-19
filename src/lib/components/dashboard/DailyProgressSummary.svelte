<script lang="ts">
import type { HabitData } from '$lib/types';

interface DashboardData {
  habits: Array<HabitData & { completedToday: boolean }>
}
import { calculateDailyProgress } from '$lib/utils/dailyHabitProgress';
import { Progress } from "$lib/components/ui/progress";

const props = $props<{ data: DashboardData }>();

// Use the shared utility function to calculate stats
const stats = $derived(calculateDailyProgress(props.data?.habits));
const totalHabits = $derived(stats.total);
const completedHabits = $derived(stats.completed);
const completionPercentage = $derived(stats.percentage);
</script>

<div class="bg-card p-2 rounded-lg border shadow-sm flex flex-col items-center w-full" 
     aria-label="Daily habit progress summary">
  <p class="text-sm font-medium mb-1">Today's Progress</p>
  <div class="flex items-center gap-2 mb-2">
    <div class="text-2xl font-bold" aria-label="Completion percentage">{completionPercentage}%</div>
    <div class="text-muted-foreground text-sm" aria-label="Habits completed">
      ({completedHabits}/{totalHabits})
    </div>
  </div> 
  <div class="w-full">
    <Progress value={completionPercentage} class="h-2" />
  </div>
</div>