<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { notificationManager } from '$lib/notifications/NotificationManager';
    import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "$lib/components/ui/select";
    import { toast } from 'svelte-sonner';
    import type { Selected } from 'bits-ui';
    import type { NotificationType } from '$lib/types';
    import { EmailNotificationPlugin } from '$lib/plugins/EmailNotificationPlugin';
    
    // Register plugins (would normally be done at app initialization)
    notificationManager.registerPlugin(new EmailNotificationPlugin());
    
    // Runes for state
    let message = $state('Test notification message');
    let subject = $state('Test notification subject');
    let delay = $state('5');
    let type = $state<Selected<NotificationType> | undefined>({
        value: 'email',
        label: 'Email'
    });
    

    function sendImmediateNotification() {
        if (!message) {
            toast.error('Please enter a message');
            return;
        }
        
        if (!type?.value) {
            toast.error('Please select a notification type');
            return;
        }
        
        notificationManager.showNotification(
            `test-${Date.now()}`,
            message,
            type.value,
            subject
        );
        
        toast.success('Notification sent');
    }

    function scheduleDelayedNotification() {
        if (!message) {
            toast.error('Please enter a message');
            return;
        }
        
        if (!type?.value) {
            toast.error('Please select a notification type');
            return;
        }
        
        const delayMs = parseInt(delay) * 1000;
        
        notificationManager.scheduleNotification(
            `test-${Date.now()}`,
            message,
            type.value,
            subject,
            delayMs
        );
        
        toast.success(`Notification scheduled for ${delay} seconds from now`);
    }
    
    function clearAllNotifications() {
        notificationManager.clearAllNotifications();
        toast.success('All notifications cleared');
    }
</script>

<div class="container mx-auto py-8 max-w-2xl">
    <h1 class="text-2xl font-bold mb-6">Notification System Test</h1>
    
    <div class="grid gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Send Test Notification</CardTitle>
                <CardDescription>Configure and send a test notification</CardDescription>
            </CardHeader>
            <CardContent>
                <div class="space-y-4">
                    <div class="space-y-2">
                        <Label for="message">Notification Message</Label>
                        <Input
                            id="message"
                            placeholder="Enter notification message"
                            bind:value={message}
                        />
                    </div>
                    
                    <div class="space-y-2">
                        <Label for="type">Notification Type</Label>
                        <Select selected={type} onSelectedChange={(value) => type = value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select notification type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="in-app">In-App</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="push">Push</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div class="pt-2 flex space-x-2">
                        <Button on:click={sendImmediateNotification} class="flex-1">
                            Send Now
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Schedule Delayed Notification</CardTitle>
                <CardDescription>Schedule a notification to appear after a delay</CardDescription>
            </CardHeader>
            <CardContent>
                <div class="space-y-4">
                    <div class="space-y-2">
                        <Label for="delay">Delay (seconds)</Label>
                        <Input
                            id="delay"
                            type="number"
                            min="1"
                            max="60"
                            bind:value={delay}
                        />
                    </div>
                    
                    <div class="pt-2 flex space-x-2">
                        <Button on:click={scheduleDelayedNotification} class="flex-1" variant="secondary">
                            Schedule
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Notification Management</CardTitle>
            </CardHeader>
            <CardContent>
                <Button on:click={clearAllNotifications} variant="destructive" class="w-full">
                    Clear All Notifications
                </Button>
            </CardContent>
        </Card>
    </div>
</div>