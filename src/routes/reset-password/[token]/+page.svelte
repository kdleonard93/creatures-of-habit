<script lang="ts">
    import { enhance } from '$app/forms';
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { toast } from 'svelte-sonner';
    import type { ActionData } from './$types';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';

    const props = $props<{ form: ActionData }>();
    let isSubmitting = $state(false);
    
    // Get token from URL
    let token = $derived($page.params.token);
    let password = $state('');
    let confirmPassword = $state('');
    let passwordsMatch = $derived(password === confirmPassword);
</script>

<div class="container mx-auto py-8 max-w-md">
    <Card>
        <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
            <form 
                method="POST"
                class="space-y-4"
                use:enhance={(() => {
                    isSubmitting = true;
                    
                    return async ({ result }) => {
                        isSubmitting = false;
                        
                        if (result.type === 'failure') {
                            if (result.data) {
                                toast.error(String(result.data.message), {
                                    duration: 5000
                                });
                            }
                            return;
                        } else if (result.type === 'redirect') {
                            toast.success("Password reset successfully!", {
                                description: "You can now log in with your new password.",
                                duration: 5000
                            });
                            // Redirect to login page
                            goto(result.location);
                        }
                    };
                })}
            >
                <!-- Hidden token field -->
                <input type="hidden" name="token" value={token} />
                
                <div class="space-y-2">
                    <label for="password" class="text-sm font-medium">
                        New Password
                    </label>
                    <Input
                        type="password"
                        id="password"
                        name="password"
                        bind:value={password}
                        required
                        placeholder="Enter your new password"
                        minlength={8}
                    />
                    <p class="text-xs text-muted-foreground">Password must be at least 8 characters long.</p>
                </div>
                
                <div class="space-y-2">
                    <label for="confirmPassword" class="text-sm font-medium">
                        Confirm New Password
                    </label>
                    <Input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        bind:value={confirmPassword}
                        required
                        placeholder="Confirm your new password"
                    />
                    {#if confirmPassword && !passwordsMatch}
                        <p class="text-xs text-red-500">Passwords do not match</p>
                    {/if}
                </div>

                <Button type="submit" disabled={isSubmitting} class="w-full">
                    {#if isSubmitting}
                        Resetting...
                    {:else}
                        Reset Password
                    {/if}
                </Button>
            </form>
        </CardContent>
    </Card>
</div>
