<script lang="ts">
    import { fade, fly } from 'svelte/transition';
    import { X, Bell, Vibrate, AlertTriangle, Info } from 'lucide-svelte';
    import { Button } from "$lib/components/ui/button";
    import type { Notifications, NotificationType } from '$lib/types';
    
    const props = $props<{
        notification: Notifications;
        onDismiss: (id: string) => void;
    }>();

    // Choose icon based on notification type
    function getIcon(type: NotificationType) {
        switch (type) {
            case 'email':
                return Bell;
            case 'sms':
                return Vibrate;
            case 'in-app':
                return AlertTriangle;
            default:
                return Info;
        }
    }

    // Choose color based on notification type
    function getColor(type: NotificationType) {
        switch (type) {
            case 'email':
                return 'text-blue-500';
            case 'sms':
                return 'text-primary-500';
            case 'in-app':
                return 'text-purple-500';
            default:
                return 'text-green-500';
        }
    }

    function formatTime(timestamp: Date) {
        return new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric'
        }).format(timestamp);
    }
</script>

<div
    class="bg-background border rounded-lg shadow-md p-4 mb-2 flex items-start justify-between max-w-md"
    in:fly={{ y: -20, duration: 300 }}
    out:fade={{ duration: 200 }}
>
    <div class="flex items-start">
        <div class="mr-3 mt-1 {getColor(props.notification.type)}">
            {#if getIcon(props.notification.type)}
            {@const Icon = getIcon(props.notification.type)}
            <Icon size={20} />
          {/if}
        </div>
        <div>
            <p class="font-medium">{props.notification.message}</p>
            <p class="text-xs text-muted-foreground">
                {formatTime(props.notification.timestamp)}
            </p>
        </div>
    </div>

    <Button 
        variant="ghost" 
        size="sm" 
        class="h-6 w-6 p-0 rounded-full" 
        on:click={() => props.onDismiss(props.notification.id)}
    >
        <X size={16} />
        <span class="sr-only">Dismiss</span>
    </Button>
</div>