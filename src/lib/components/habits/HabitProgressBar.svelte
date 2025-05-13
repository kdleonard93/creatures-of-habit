<script lang="ts">
    import { Progress } from "$lib/components/ui/progress";
    
    const props = $props<{
        completed: number;
        total: number;
        size?: 'sm' | 'md' | 'lg';
    }>();
    
    const size = $derived(props.size ?? 'md');
    
    const percentage = $derived(props.total > 0 ? Math.min(100, Math.max(0, Math.round((props.completed / props.total) * 100))) : 0);
    
    const height = $derived(size === 'sm' ? 'h-1.5' : size === 'md' ? 'h-2.5' : 'h-4');
</script>

<div class="w-full space-y-1">
    <div class="flex justify-between text-xs">
        <span class="text-muted-foreground">{props.completed}/{props.total} completed</span>
        <span class="font-medium">{percentage}%</span>
    </div>
    <Progress value={percentage} class={height} />
</div>
