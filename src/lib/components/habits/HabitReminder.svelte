<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { notificationManager } from '$lib/notifications/NotificationManager';
    import { Bell, Clock } from "lucide-svelte";
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

<Card>
    <CardHeader>
        <CardTitle class="flex items-center gap-2">
            <Bell size={18} />
            Habit Reminder
        </CardTitle>
        <CardDescription>Set a daily reminder for this habit</CardDescription>
    </CardHeader>
    <CardContent>
        {#if reminderEnabled}
            <div class="space-y-4">
                <div class="flex items-center gap-2 text-sm">
                    <Clock size={16} />
                    <span>Reminder set for {reminderTime}</span>
                </div>
                <Button variant="destructive" size="sm" on:click={removeReminder}>
                    Remove Reminder
                </Button>
            </div>
        {:else}
            <div class="space-y-4">
                <div class="space-y-2">
                    <Label for="reminderTime">Reminder Time</Label>
                    <div class="flex gap-2">
                        <Input
                            id="reminderTime"
                            type="time"
                            bind:value={reminderTime}
                        />
                        <Button on:click={scheduleReminder}>
                            Set Reminder
                        </Button>
                    </div>
                </div>
            </div>
        {/if}
    </CardContent>
</Card>