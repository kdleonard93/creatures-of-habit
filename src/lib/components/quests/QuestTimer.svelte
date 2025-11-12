<script lang="ts">
    import {onMount, onDestroy} from 'svelte';
    import {getTimeUntilMidnight, formatRemainingTime} from '$lib/utils/timer'
    import { Clock } from '@lucide/svelte';

    const { 
        showIcon = true,
        className = ''
    } = $props<{
        showIcon?: boolean;
        class?: string;
    }>();

    // State
    let remainingTime = $state({ hours: 0, minutes: 0, seconds: 0 });
    let intervalId: number | null = null;

    // Update timer every second
    function updateTimer() {
        remainingTime = getTimeUntilMidnight();
    }

    // Lifecycle
    onMount(() => {
        updateTimer(); // Initial update
        intervalId = window.setInterval(updateTimer, 1000);
    });

    onDestroy(() => {
        if (intervalId !== null) {
            clearInterval(intervalId);
        }
    });

    // Derived values
    const formattedTime = $derived(
        formatRemainingTime(remainingTime.hours, remainingTime.minutes, remainingTime.seconds)
    );
</script>

<div class="flex items-center gap-2 {className}">
{#if showIcon}
    <Clock class="w-3 h-3 text-muted-foreground" />
{/if}
<span class="text-sm text-muted-foreground">
    Brand Spankin' New Quest In <span class="text-md text-primary">{formattedTime}</span>
</span>
</div>
    