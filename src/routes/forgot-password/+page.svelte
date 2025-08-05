<script lang="ts">
    import { enhance } from '$app/forms';
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { toast } from 'svelte-sonner';
    import type { ActionData } from './$types';

    const props = $props<{ form: ActionData }>();
    let isSubmitting = $state(false);
</script>

<div class="container mx-auto py-8 max-w-md">
    <Card>
        <CardHeader>
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>Enter your username and we'll send you a password reset link.</CardDescription>
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
                            if (result.data?.message) {
                                toast.error(String(result.data.message), {
                                    description: "Please check your username and try again.",
                                    duration: 5000
                                });
                            } else {
                                toast.error("An error occurred", {
                                    description: "Please try again later.",
                                    duration: 5000
                                });
                            }
                            return;
                        } else if (result.type === 'success') {
                            toast.success("Reset link sent!", {
                                description: "Check your email for password reset instructions.",
                                duration: 5000
                            });
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
                        placeholder="Enter your username"
                    />
                </div>

                <Button type="submit" disabled={isSubmitting} class="w-full">
                    {#if isSubmitting}
                        Sending...
                    {:else}
                        Send Reset Link
                    {/if}
                </Button>

                <div class="text-center text-sm text-muted-foreground">
                    <p>
                        Remember your password? 
                        <a href="/login" class="text-primary hover:underline">Login</a>
                    </p>
                </div>
            </form>
        </CardContent>
    </Card>
</div>
