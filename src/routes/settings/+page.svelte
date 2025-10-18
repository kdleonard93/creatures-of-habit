<script lang="ts">
    import { enhance } from "$app/forms";
    import { Button } from "$lib/components/ui/button";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Switch } from "$lib/components/ui/switch";
    import { Toaster, toast } from 'svelte-sonner';
  
    // Form state
    let loading = $state(false);
    let currentPassword = $state("");
    let newPassword = $state("");
    let confirmPassword = $state("");
    
    // Notification preferences
    let emailNotifications = $state(false);
    let pushNotifications = $state(false);
    let reminderNotifications = $state(false);
    
    // Privacy settings
    let profileVisibility = $state(false);
    let activitySharing = $state(false);
    let statsSharing = $state(false);
  
    // Derived values
    let passwordsMatch = $derived(newPassword === confirmPassword);
    let canSubmitPassword = $derived(
      currentPassword && 
      newPassword && 
      confirmPassword && 
      passwordsMatch && 
      !loading
    );
  
    async function handlePasswordSubmit(event: SubmitEvent) {
      loading = true;
      
      try {
        const form = event.target as HTMLFormElement;
        const formData = new FormData(form);
        
        const response = await fetch('/api/settings/password', {
          method: 'POST',
          body: JSON.stringify({
            currentPassword,
            newPassword
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(error);
        }
        
        toast.success('Password updated successfully');
        currentPassword = newPassword = confirmPassword = '';
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error('Failed to update password');
        }
      } finally {
        loading = false;
      }
    }
  
    async function updateNotificationPreferences() {
      try {
        const response = await fetch('/api/settings/notifications', {
          method: 'POST',
          body: JSON.stringify({
            email: emailNotifications,
            push: pushNotifications,
            reminders: reminderNotifications
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) throw new Error('Failed to update preferences');
        toast.success('Notification preferences updated');
      } catch (error) {
        toast.error('Failed to update notification preferences');
      }
    }
  </script>
  
  <svelte:head>
    <title>Account Settings - Creatures of Habit</title>
  </svelte:head>
  
  <div class="container mx-auto py-8 space-y-8">
    <h1 class="text-3xl font-bold">Account Settings</h1>
    
    <!-- Password Change Section -->
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Update your account password</CardDescription>
      </CardHeader>
      <CardContent>
        <form 
          class="space-y-4" 
          onsubmit={handlePasswordSubmit}
          use:enhance
        >
          <div class="space-y-2">
            <Label for="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              bind:value={currentPassword}
              required
            />
          </div>
          
          <div class="space-y-2">
            <Label for="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              bind:value={newPassword}
              required
            />
          </div>
          
          <div class="space-y-2">
            <Label for="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              bind:value={confirmPassword}
              required
            />
            {#if confirmPassword && !passwordsMatch}
              <p class="text-sm text-destructive">Passwords do not match</p>
            {/if}
          </div>
          
          <Button 
            type="submit" 
            disabled={!canSubmitPassword}
            variant="default"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
    
    <!-- Notification Preferences -->
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Manage how you receive updates</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Email Notifications</Label>
              <p class="text-sm text-muted-foreground">Receive updates via email</p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={(checked) => {
                emailNotifications = checked;
                updateNotificationPreferences();
              }}
            />
          </div>
          
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Push Notifications</Label>
              <p class="text-sm text-muted-foreground">Receive push notifications</p>
            </div>
            <Switch
              checked={pushNotifications}
              onCheckedChange={(checked) => {
                pushNotifications = checked;
                updateNotificationPreferences();
              }}
            />
          </div>
          
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Habit Reminders</Label>
              <p class="text-sm text-muted-foreground">Get reminded about your habits</p>
            </div>
            <Switch
              checked={reminderNotifications}
              onCheckedChange={(checked) => {
                reminderNotifications = checked;
                updateNotificationPreferences();
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>