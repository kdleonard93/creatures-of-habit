<script lang="ts">
  import { Progress } from "$lib/components/ui/progress";
  import { getLevelProgress } from '$lib/client/xp/calculations';
  
  const props = $props<{ experience: number }>();
  
  const progress = $derived(getLevelProgress(props.experience));
</script>

<div class="space-y-2 w-full">
  <div class="flex justify-between text-sm">
    <span>Level {progress.currentLevel}</span>
    <span>{progress.xpProgress} / {progress.nextLevelXp - progress.currentLevelXp} XP</span>
  </div>
  
  <Progress value={progress.progressPercentage} />
  
  <div class="text-xs text-center text-muted-foreground">
    {progress.xpProgress} XP to next level ({progress.progressPercentage}%)
  </div>
</div>