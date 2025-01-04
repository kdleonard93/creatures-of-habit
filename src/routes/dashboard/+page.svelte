<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
    import type { PageData } from './$types';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { classIcons } from '$lib/assets/classIcons';
    import type { CreatureClassType } from "$lib/types";
    
    export let data: PageData;
</script>

<div class="container mx-auto py-8 space-y-6">
    <h1 class="text-3xl font-bold">Welcome, {data.user.username}!</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- User Info Card -->
        <Card>
            <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent>
                <div class="space-y-2">
                    <p><span class="font-semibold">Email:</span> {data.user.email}</p>
                    <p><span class="font-semibold">Age:</span> {data.user.age}</p>
                    <p><span class="font-semibold">Member since:</span> {new Date(data.user.createdAt).toLocaleDateString()}</p>
                </div>
            </CardContent>
        </Card>

        <!-- Creature Info Card -->
        <Card>
            <CardHeader>
                <CardTitle>Your Creature</CardTitle>
                <CardDescription>Your companion details</CardDescription>
            </CardHeader>
            <CardContent>
                {#if data.creature}
                    <div class="space-y-2">
                        <p class="capitalize"><span class="font-semibold">Name:</span> {data.creature.name}</p>
                        <p class="capitalize"><span class="font-semibold">Race:</span> {data.creature.race}</p>
                        <p class="flex items-center gap-2">
                            <span class="font-semibold capitalize">Class:</span> 
                            {@html classIcons[data.creature.class as CreatureClassType]}
                            <span class="capitalize">{data.creature.class}</span>
                        </p>
                        <p><span class="font-semibold">Level:</span> {data.creature.level}</p>
                    </div>
                {:else}
                    <p class="text-muted-foreground">No creature found. Create one to get started!</p>
                {/if}
            </CardContent>
        </Card>
    </div>
</div>