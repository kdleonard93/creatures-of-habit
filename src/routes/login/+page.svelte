<script lang="ts">
    import { enhance } from '$app/forms';
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { toast } from 'svelte-sonner';
    import { toastActionError } from '$lib/client/formToast';
    import type { ActionData } from './$types';

    const props = $props<{ form: ActionData }>();
    let isSubmitting = $state(false);

</script>

<div class="container mx-auto py-8 max-w-md">
    <Card>
        <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Welcome back to Creatures of Habit!</CardDescription>
        </CardHeader>
        <CardContent>
            <form 
                method="POST"
                class="space-y-4"
                use:enhance={(() => {
                    isSubmitting = true;
                    
                    return async ({ result }) => {
                        isSubmitting = false;

                        toastActionError(result);

                        if (result.type === 'failure') {
                            if (result.data) {
                                toast.error(String(result.data.message), {
                                    description: "Please check your credentials and try again.",
                                    duration: 5000
                                });
                            }
                            return;
                        } else if (result.type === 'redirect') {
                            window.location.href = result.location;
                        }
                    };
                })}
            >
                <div class="space-y-2">
                    <label for="username" class="text-sm font-medium">
                        Username
                    </label>
                    <Input
                        type="text"
                        id="username"
                        name="username"
                        required
                        autocomplete="username"
                        placeholder="Enter your username"
                    />
                </div>

                <div class="space-y-2">
                    <label for="password" class="text-sm font-medium">
                        Password
                    </label>
                    <Input
                        type="password"
                        id="password"
                        name="password"
                        required
                        autocomplete="current-password"
                        placeholder="Enter your password"
                    />
                </div>

                <Button type="submit" disabled={isSubmitting} class="w-full">
                    {#if isSubmitting}
                        Logging in...
                    {:else}
                        Login
                    {/if}
                </Button>

                <div class="text-center text-sm text-muted-foreground space-y-2">
                    <div class="flex justify-center space-x-4">
                        <a href="/forgot-username" class="text-primary hover:underline">Forgot username?</a>
                        <span>•</span>
                        <a href="/forgot-password" class="text-primary hover:underline">Forgot password?</a>
                    </div>
                    <p>
                        Don't have an account? 
                        <a href="/signup" class="text-primary hover:underline">Sign up</a>
                    </p>
                </div>
            </form>
        </CardContent>
    </Card>
</div>