<script lang="ts">
import type { HabitData } from '$lib/types';

interface DashboardData {
  habits: Array<HabitData & { completedToday: boolean }>
  progressStats: {
    total: number;
    completed: number;
    percentage: number;
  }
}

import { Progress } from "$lib/components/ui/progress";

const props = $props<{ data: DashboardData }>();

// Use the progress stats from the server
const totalHabits = $derived(props.data?.progressStats?.total || 0);
const completedHabits = $derived(props.data?.progressStats?.completed || 0);
const completionPercentage = $derived(props.data?.progressStats?.percentage || 0);
</script>

<div class="bg-card p-3 md:p-4 rounded-lg border shadow-sm flex flex-col items-center w-full" 
     aria-label="Daily habit progress summary">
  <p class="text-xs md:text-sm font-medium mb-2">Today's Progress</p>
  <div class="flex items-center gap-2 md:gap-3 mb-3">
    <div class="text-3xl md:text-4xl font-bold" aria-label="Completion percentage">{completionPercentage}%</div>
    <div class="text-muted-foreground text-xs md:text-sm" aria-label="Habits completed">
      <div>({completedHabits}/{totalHabits})</div>
    </div>
  </div> 
  <div class="w-full">
    <Progress value={completionPercentage} class="h-2" />
  </div>
</div>