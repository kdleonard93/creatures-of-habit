<script lang="ts">
    import { enhance } from "$app/forms";
    import { Button } from "$lib/components/ui/button";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Switch } from "$lib/components/ui/switch";
    import { Toaster, toast } from 'svelte-sonner';
    import type { PageData } from './$types';

    const { data } = $props<{ data: PageData }>();
  
    // Form state
    let loading = $state(false);
    let currentPassword = $state("");
    let newPassword = $state("");
    let confirmPassword = $state("");
    
    // Notification preferences
    let emailNotifications = $state(!!data.preferences?.emailNotifications);
    let pushNotifications = $state(!!data.preferences?.pushNotifications);
    let reminderNotifications = $state(!!data.preferences?.reminderNotifications);
    
  
    // Derived values
    let passwordsMatch = $derived(newPassword === confirmPassword);
    let canSubmitPassword = $derived(
      currentPassword && 
      newPassword && 
      confirmPassword && 
      passwordsMatch && 
      !loading
    );
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
          action="?/updatePassword"
          method="POST"
          use:enhance = {() => {
            loading = true;
            return async ({ result }) => {
              if (result.type === 'success') {
              currentPassword = newPassword = confirmPassword = '';
              toast.success('Password updated successfully');
             } else if (result.type === 'failure' && result.data) {
              const errorMessage = result.data.message as string;
              toast.error(errorMessage || 'Failed to update password.');
              } else {
                toast.error('Failed to update password.');
              }
              loading = false;
            };
          }}
        >
          <div class="space-y-2">
            <Label for="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              bind:value={currentPassword}
              required
            />
          </div>
          
          <div class="space-y-2">
            <Label for="newPassword">New Password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              bind:value={newPassword}
              required
            />
          </div>
          
          <div class="space-y-2">
            <Label for="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
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

          <form
          class="space-y-4" 
          action="?/updateNotifications" 
          method="POST"
          use:enhance={() => {
            loading = true;
            return async ({ result }) => {
              if (result.type === 'success') {
                toast.success("Notifications Updated Successfully.");
              } else if (result.type === 'failure' && result.data) {
                const errorMessage = result.data.message as string;
                toast.error(errorMessage || "Notifications didn't update.")
              } else {
                toast.error("Notifications didn't update.")
              }
              loading = false;
            }
          }}
          >
            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <Label>Email Notifications</Label>
                <p class="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={(checked) => {
                  emailNotifications = checked;
                }}
              />
              <input type="hidden" name="emailNotifications" value={String(emailNotifications)} />
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
              }}
            />
            <input type="hidden" name="pushNotifications" value={String(pushNotifications)} />
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
              }}
            />
            <input type="hidden" name="reminderNotifications" value={String(reminderNotifications)} />
            </div>

            <Button type="submit" variant="default">
            {loading ? 'Updating...' : 'Save Notifications'}
          </Button>
          </form>
      </CardContent>
    </Card>
  </div>