<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { notificationManager } from '$lib/notifications/NotificationManager';
    import { Bell, Clock } from "@lucide/svelte";
    import { toast } from 'svelte-sonner';
    
    const props = $props<{
        habitId: string;
        habitTitle: string;
    }>();

    let reminderTime = $state('');
    let reminderEnabled = $state(false);
    
    // Check if local storage is available
    const hasLocalStorage = typeof localStorage !== 'undefined';
    
    // Get existing reminders from local storage
    $effect(() => {
        if (hasLocalStorage && props.habitId) {
            const savedReminder = localStorage.getItem(`reminder_${props.habitId}`);
            if (savedReminder) {
                const reminderData = JSON.parse(savedReminder);
                reminderTime = reminderData.time;
                reminderEnabled = true;
            }
        }
    });

    // Schedule the reminder based on the selected time
    function scheduleReminder() {
        if (!reminderTime) {
            toast.error('Please select a time for the reminder');
            return;
        }

        try {
            // Parse the time input (HH:MM)
            const [hours, minutes] = reminderTime.split(':').map(Number);
            
            // Calculate when the reminder should trigger
            const now = new Date();
            const reminderDate = new Date();
            reminderDate.setHours(hours, minutes, 0, 0);
            
            // If the time is earlier today, schedule for tomorrow
            if (reminderDate <= now) {
                reminderDate.setDate(reminderDate.getDate() + 1);
            }
            
            const delay = reminderDate.getTime() - now.getTime();
            
            // Schedule the notification
            notificationManager.scheduleNotification(
                `habit-reminder-${props.habitId}`,
                `Time to complete your habit: ${props.habitTitle}`,
                'in-app',
                delay
            );
            
            if (hasLocalStorage) {
                localStorage.setItem(`reminder_${props.habitId}`, JSON.stringify({
                    time: reminderTime,
                    habitTitle: props.habitTitle
                }));
            }
            
            reminderEnabled = true;
            toast.success(`Reminder set for ${reminderTime}`);
            
        } catch (error) {
            console.error('Error scheduling reminder:', error);
            toast.error('Could not schedule reminder');
        }
    }

    // Remove the reminder
    function removeReminder() {
        notificationManager.clearNotification(`habit-reminder-${props.habitId}`);
        
        if (hasLocalStorage) {
            localStorage.removeItem(`reminder_${props.habitId}`);
        }
        
        reminderEnabled = false;
        toast.success('Reminder removed');
    }
</script>

<div class="border-t pt-3 mt-3">
    <div class="flex items-center gap-2 mb-2">
        <Bell size={16} class="text-primary" />
        <span class="text-sm font-medium">Reminder</span>
    </div>
    
    {#if reminderEnabled}
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm">
                <Clock size={14} />
                <span>Set for {reminderTime}</span>
            </div>
            <Button variant="destructive" size="sm" on:click={removeReminder} class="h-7 px-2 text-xs">
                Remove
            </Button>
        </div>
    {:else}
        <div class="flex gap-2 items-center">
            <Input
                type="time"
                bind:value={reminderTime}
                class="h-8 w-32 text-sm"
            />
            <Button 
                on:click={scheduleReminder} 
                size="sm" 
                variant="outline" 
                class="h-8 text-xs"
            >
                Set Reminder
            </Button>
        </div>
    {/if}
</div>