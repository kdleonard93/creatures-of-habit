<script lang="ts">
    import { fly, scale } from 'svelte/transition';
    import { Bell } from 'lucide-svelte';
    import { notifications } from '$lib/notifications/NotificationStore';
    import HabitNotification from '$lib/components/habits/HabitNotification.svelte';
    import { Button } from "$lib/components/ui/button";
    import type { Notifications } from '$lib/types';
    import { NotificationManager } from '$lib/notifications/NotificationManager';

    const notificationManager = new NotificationManager();

    // State variables with runes
    let showPanel = $state(false);
    let localNotifications = $state<Notifications[]>([]);

    // Use $effect to subscribe to the notifications store
    $effect(() => {
        const unsubscribe = notifications.subscribe(value => {
            localNotifications = value;
        });
        
        // Clean up subscription when component is destroyed
        return () => unsubscribe();
    });

    function dismissNotification(id: string) {
        notifications.update(n => n.filter(notification => notification.id !== id));
    }

    function clearAllNotifications() {
        notifications.set([]);
    }

    export { notificationManager };
</script>

<div class="relative">
    <!-- Notification Bell Icon -->
    <Button
        variant="outline"
        size="icon"
        class="relative"
        on:click={() => showPanel = !showPanel}
    >
        <Bell size={20} />
        {#if localNotifications.length > 0}
            <span
                class="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center"
                in:scale={{ duration: 200 }}
            >
                {localNotifications.length}
            </span>
        {/if}
    </Button>

    <!-- Notification Panel -->
    {#if showPanel}
        <div
            class="absolute top-full right-0 mt-2 w-80 bg-card border rounded-lg shadow-lg z-50 p-2"
            in:fly={{ y: -10, duration: 200 }}
            out:fly={{ y: -10, duration: 150 }}
        >
            <div class="flex items-center justify-between p-2 border-b">
                <h3 class="font-medium">Notifications</h3>
                {#if localNotifications.length > 0}
                    <Button variant="ghost" size="sm" on:click={clearAllNotifications}>
                        Clear all
                    </Button>
                {/if}
            </div>

            <div class="max-h-96 overflow-y-auto p-2">
                {#if localNotifications.length === 0}
                    <p class="text-center py-4 text-muted-foreground">
                        No notifications
                    </p>
                {:else}
                    {#each localNotifications as notification (notification.id)}
                        <HabitNotification
                            notification={notification}
                            onDismiss={dismissNotification}
                        />
                    {/each}
                {/if}
            </div>
        </div>
    {/if}
</div>