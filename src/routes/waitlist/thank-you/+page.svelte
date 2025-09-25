<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { CheckCircle, ArrowRight, Sparkles, Users, Calendar, Award } from "@lucide/svelte";

    export let data: {
        potentialHeroes: {
            usersJoined: number;
            launchDate: string;
            betaSpots: number;
        };
        alreadySignedUp: boolean;
    };
</script>

<div class="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
    <div class="container max-w-2xl mx-auto text-center">
        <!-- Success Icon -->
        <div class="flex justify-center mb-8">
            <div class="relative">
                <div class="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center">
                    <CheckCircle class="h-12 w-12 text-primary" />
                </div>
                <div class="absolute -top-2 -right-2">
                    <Sparkles class="h-6 w-6 text-primary animate-pulse" />
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="space-y-6">
            <h1 class="text-4xl md:text-5xl font-bold tracking-tight">
                {#if data.alreadySignedUp}
                    You're already on the list! 🎉
                {:else}
                    You're on the list! 🎉
                {/if}
            </h1>
            <p class="text-xl text-muted-foreground max-w-lg mx-auto">
                {#if data.alreadySignedUp}
                    We already have your email in our system. We'll notify you when we launch in {data.potentialHeroes.launchDate}.
                {:else}
                    Thank you for joining the Creatures of Habit waitlist. We'll send you an email when we launch in {data.potentialHeroes.launchDate}.
                {/if}
            </p>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 max-w-lg mx-auto">
            <Card>
                <CardContent class="p-4 text-center">
                    <Users class="h-6 w-6 text-primary mx-auto mb-2" />
                    <div class="text-2xl font-bold">{data.potentialHeroes.usersJoined.toLocaleString()}</div>
                    <div class="text-sm text-muted-foreground">Users Joined</div>
                </CardContent>
            </Card>
            <Card>
                <CardContent class="p-4 text-center">
                    <Calendar class="h-6 w-6 text-primary mx-auto mb-2" />
                    <div class="text-2xl font-bold">{data.potentialHeroes.launchDate}</div>
                    <div class="text-sm text-muted-foreground">Launch Date</div>
                </CardContent>
            </Card>
            <Card>
                <CardContent class="p-4 text-center">
                    <Award class="h-6 w-6 text-primary mx-auto mb-2" />
                    <div class="text-2xl font-bold">{data.potentialHeroes.betaSpots}</div>
                    <div class="text-sm text-muted-foreground">Beta Spots Left</div>
                </CardContent>
            </Card>
        </div>

        <!-- Next Steps Card -->
        <Card class="mt-12 max-w-md mx-auto">
            <CardHeader>
                <CardTitle class="flex items-center gap-2">
                    <CheckCircle class="h-5 w-5 text-primary" />
                    What's Next?
                </CardTitle>
                <CardDescription>
                    While you wait for launch, here's what you can expect:
                </CardDescription>
            </CardHeader>
            <CardContent class="space-y-3 text-left">
                <div class="flex items-start gap-3">
                    <div class="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p class="text-sm">Early access to beta features</p>
                </div>
                <div class="flex items-start gap-3">
                    <div class="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p class="text-sm">Exclusive launch-day perks</p>
                </div>
                <div class="flex items-start gap-3">
                    <div class="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p class="text-sm">Priority support and feedback opportunities</p>
                </div>
            </CardContent>
        </Card>

        <!-- CTA -->
        <div class="mt-12">
            <Button size="lg" href="/how-to-play">
                Learn More About the App
                <ArrowRight class="ml-2 h-4 w-4" />
            </Button>
        </div>

        <!-- Footer -->
        <div class="mt-16 pt-8 border-t border-muted">
            <p class="text-sm text-muted-foreground">
                Questions? Contact us at <a href="mailto:hello@creaturesofhabit.app" class="text-primary hover:underline">hello@creaturesofhabit.app</a>
            </p>
        </div>
    </div>
</div>
