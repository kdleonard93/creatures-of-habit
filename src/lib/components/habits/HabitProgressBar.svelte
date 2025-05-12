<script lang="ts">
    import { Progress } from "$lib/components/ui/progress";
    
    export let completed: number;
    export let total: number;
    export let size: 'sm' | 'md' | 'lg' = 'md';
    
    $: percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    $: height = size === 'sm' ? 'h-1.5' : size === 'md' ? 'h-2.5' : 'h-4';
</script>

<div class="w-full space-y-1">
    <div class="flex justify-between text-xs">
        <span class="text-muted-foreground">{completed}/{total} completed</span>
        <span class="font-medium">{percentage}%</span>
    </div>
    <Progress value={percentage} class={height} />
</div>
