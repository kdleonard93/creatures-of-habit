<script lang="ts">
    import { enhance } from '$app/forms';
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { toast } from 'svelte-sonner';
    import type { ActionData } from './$types';

    const props = $props<{ form: ActionData }>();
    let isSubmitting = $state(false);

    $effect(() => {
        if (props.form?.message) {
            toast.error(props.form.message, {
                description: "Please check your credentials and try again",
                duration: 5000
            });
        }
    });
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
                        
                        if (result.type === 'failure') {
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

                <div class="text-center text-sm text-muted-foreground">
                    <p>
                        Don't have an account? 
                        <a href="/signup" class="text-primary hover:underline">Sign up</a>
                    </p>
                </div>
            </form>
        </CardContent>
    </Card>
</div>