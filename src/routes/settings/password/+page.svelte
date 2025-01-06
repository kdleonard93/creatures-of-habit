// src/routes/settings/password/+page.svelte
<script lang="ts">
    import { enhance } from "$app/forms";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { toast } from 'svelte-sonner';
    import type { ActionData } from './$types';

    const props = $props<{ form: ActionData }>();
    let isSubmitting = $state(false);

    $effect(() => {
        if (props.form?.message) {
            toast.error(props.form.message);
        }
        if (props.form?.success) {
            toast.success('Password updated successfully');
            // Reset form
            const form = document.querySelector('form') as HTMLFormElement;
            form?.reset();
        }
    });
</script>

<div class="container mx-auto py-8 max-w-md">
    <Card>
        <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
            <form 
                method="POST"
                class="space-y-4"
                use:enhance={() => {
                    isSubmitting = true;
                    return async ({ result }) => {
                        isSubmitting = false;
                    };
                }}
            >
                <div class="space-y-2">
                    <label for="currentPassword" class="text-sm font-medium">
                        Current Password
                    </label>
                    <Input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        required
                        autocomplete="current-password"
                        placeholder="Enter your current password"
                    />
                </div>

                <div class="space-y-2">
                    <label for="newPassword" class="text-sm font-medium">
                        New Password
                    </label>
                    <Input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        required
                        autocomplete="new-password"
                        placeholder="Enter your new password"
                    />
                </div>

                <div class="space-y-2">
                    <label for="confirmPassword" class="text-sm font-medium">
                        Confirm New Password
                    </label>
                    <Input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        required
                        autocomplete="new-password"
                        placeholder="Confirm your new password"
                    />
                </div>

                <Button type="submit" disabled={isSubmitting} class="w-full">
                    {#if isSubmitting}
                        Updating Password...
                    {:else}
                        Update Password
                    {/if}
                </Button>
            </form>
        </CardContent>
    </Card>
</div>