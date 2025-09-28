<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { ArrowRight, CheckCircle, Mail, Sparkles, Users } from "@lucide/svelte";
    import { toast } from "svelte-sonner";
    import type { WaitlistData } from "$lib/types";
	import { type PostHog, type CaptureResult, posthog } from 'posthog-js';


    const { data } = $props<{ data: WaitlistData }>();
    
    let email = $state('');
    let isSubmitting = $state(false);
    let redirectTo = $state('');
    let errors = $state({
        email: "",
        general: ""
    });

    async function handleSubmit(event: Event) {
        event.preventDefault();
        const formData = new FormData(event.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        async function anonymizeEmail(email: string): Promise<string> {
            const emailHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email));
            return Array.from(new Uint8Array(emailHash)).map(b => b.toString(16).padStart(2, '0')).join('');
        }

        try {
            isSubmitting = true;
            errors = {
                email: "",
                general: ""
            };
            const response = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) {
                if (response.status === 400 && result?.error) {
                    errors.email = result.error;
                    toast.error(result.error, { duration: 4000 });
                } else {
                    errors.general = result?.error || "Failed to join waitlist";
                    toast.error(errors.general, { duration: 4000 });
                }
                return;
            }
            if (result.success) {
                const emailHash = await anonymizeEmail(data.email as string);
                posthog.capture('waitlist_submission', {
                        email_hash: emailHash,
                        success: true,
                        redirectTo: result.redirectTo || null,
                        error: null
                });
                toast.success('Successfully joined waitlist!', { duration: 4000 });
                setTimeout(() => {
                    window.location.href = result.redirectTo || '/waitlist/thank-you';
                }, 1000);
            } else {
                const emailHash = await anonymizeEmail(data.email as string);
                posthog.capture('waitlist_submission', {
                        email_hash: emailHash,
                        success: false,
                        redirectTo: result.redirectTo || null,
                        error: result.error || "Failed to join waitlist"
                });
                errors.general = result.error || "Failed to join waitlist";
                toast.error(errors.general, { duration: 4000 });
            }
        } catch (error) {
            errors.general = "An unexpected error occurred. Please try again.";
            toast.error('An unexpected error occurred. Please try again.', { duration: 4000 });
            console.error('Waitlist submission error:', error);
            const emailHash = await anonymizeEmail(data.email as string);
            posthog.capture('waitlist_submission', {
                    email_hash: emailHash,
                    success: false,
                    redirectTo: null,
                    error: "An unexpected error occurred. Please try again."
            });
        } finally {
            isSubmitting = false;
        }
    }
</script>

<div class="min-h-screen bg-gradient-to-b from-background to-muted/30">
    <!-- Hero Section -->
    <section class="py-12 md:py-24 lg:py-32">
        <div class="container px-4 md:px-6">
            <div class="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
                <div class="flex flex-col justify-center space-y-4">
                    <div class="space-y-2">
                        <h1 class="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                            {data.title}
                        </h1>
                        <p class="max-w-[600px] text-muted-foreground md:text-xl">
                            {data.description}
                        </p>
                    </div>
                    <div class="flex flex-col gap-2 min-[400px]:flex-row">
                        <Button size="lg" href="#waitlist-form">
                            Join the Waitlist
                            <ArrowRight class="ml-2 h-4 w-4" />
                        </Button>
                        <Button size="lg" variant="outline" href="/how-to-play">
                            Learn More
                            <ArrowRight class="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                    <div class="flex items-center space-x-4 text-sm">
                        <div class="flex items-center">
                            <CheckCircle class="mr-1 h-4 w-4 text-primary" />
                            <span>Launching Q1 2026</span>
                        </div>
                        <div class="flex items-center">
                            <Users class="mr-1 h-4 w-4 text-primary" />
                            <span>Join 1,000+ early adopters</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center justify-center">
                    <div class="relative w-full max-w-[500px]">
                        <div class="relative overflow-hidden rounded-lg border bg-background p-6 shadow-xl">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="h-16 w-16 overflow-hidden rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center">
                                    <Sparkles class="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <h3 class="text-xl font-bold">Creatures of Habit</h3>
                                    <div class="flex items-center text-sm text-muted-foreground">
                                        <Mail class="mr-1 h-4 w-4 text-primary" />
                                        <span>Coming Q1 2026</span>
                                    </div>
                                </div>
                            </div>
                            <div class="space-y-3">
                                <div class="bg-primary/5 rounded-lg p-3">
                                    <p class="text-sm font-medium">✨ Early Access</p>
                                    <p class="text-xs text-muted-foreground">Beta features & launch perks</p>
                                </div>
                                <div class="bg-primary/5 rounded-lg p-3">
                                    <p class="text-sm font-medium">🎮 RPG Experience</p>
                                    <p class="text-xs text-muted-foreground">Level up your habits</p>
                                </div>
                                <div class="bg-primary/5 rounded-lg p-3">
                                    <p class="text-sm font-medium">🏆 Achievements</p>
                                    <p class="text-xs text-muted-foreground">Unlock badges & rewards</p>
                                </div>
                            </div>
                        </div>
                        <div class="absolute -top-4 -right-4 h-24 w-24 rotate-12 rounded-lg bg-primary/20 blur-xl"></div>
                        <div class="absolute -bottom-4 -left-4 h-24 w-24 -rotate-12 rounded-lg bg-primary/20 blur-xl"></div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Waitlist Form Section -->
    <section id="waitlist-form" class="py-12 md:py-24 bg-muted/30">
        <div class="container px-4 md:px-6">
            <div class="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                <div class="space-y-2">
                    <div class="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
                        Join the Waitlist
                    </div>
                    <h2 class="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                        Ready to Level Up Your Habits?
                    </h2>
                    <p class="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                        Drop your email below and be the first to know when we launch
                    </p>
                </div>
            </div>

            <div class="max-w-md mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Reserve Your Spot</CardTitle>
                        <CardDescription>
                            We'll notify you the moment we launch
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onsubmit={handleSubmit} class="space-y-4">
                            <div class="space-y-2">
                                <Label for="email">Email Address</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    bind:value={email}
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            {#if errors.general}
                                <div class="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                                    {errors.general}
                                </div>
                            {/if}

                            {#if errors.email}
                                <div class="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                                    {errors.email}
                                </div>
                            {/if}

                            <Button
                                type="submit"
                                class="w-full"
                                size="lg"
                                disabled={isSubmitting}
                            >
                                {#if isSubmitting}
                                    Joining...
                                {:else}
                                    Join Waitlist
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                {/if}
                            </Button>

                            <!-- Hidden redirect input for client-side navigation -->
                            <input type="hidden" name="redirectTo" bind:value={redirectTo} />
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    </section>

    <!-- Features Preview -->
    <section class="py-12 md:py-24 bg-background">
        <div class="container px-4 md:px-6">
            <div class="flex flex-col items-center justify-center space-y-4 text-center">
                <div class="space-y-2">
                    <div class="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
                        Coming Soon
                    </div>
                    <h2 class="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                        What to Expect
                    </h2>
                    <p class="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                        Here's a sneak peek at the features you'll get early access to
                    </p>
                </div>
            </div>
            <div class="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
                <Card>
                    <CardHeader>
                        <div class="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle>Habit RPG System</CardTitle>
                        <CardDescription>
                            Turn daily habits into an engaging role-playing game
                        </CardDescription>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <div class="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                            <CheckCircle className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle>XP & Leveling</CardTitle>
                        <CardDescription>
                            Earn experience points and watch your character grow
                        </CardDescription>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <div class="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle>Community Features</CardTitle>
                        <CardDescription>
                            Share your progress and compete with friends
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        </div>
    </section>
</div>
