<script lang="ts">
    import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
    import type { CreatureRaceType } from "$lib/types";
    import { raceDefinitions } from "$lib/data/races";
    import { raceIcons } from '$lib/assets/raceIcons';

    export let selectedRace: CreatureRaceType;
    
    $: raceInfo = raceDefinitions[selectedRace];
</script>

<Card>
    <CardHeader>
        <div class="flex items-center gap-3">
            {@html raceIcons[selectedRace]}
            <CardTitle class="capitalize">{raceInfo.name}</CardTitle>
        </div>
    </CardHeader>
    <CardContent>
        <div class="space-y-4">
            <div>
                <p class="text-gray-600">{raceInfo.description}</p>
            </div>

            <div>
                <h4 class="font-semibold mb-2">Racial Bonuses</h4>
                <ul class="space-y-1">
                    {#each Object.entries(raceInfo.statBonuses) as [stat, bonus]}
                        <li class="text-sm">
                            <span class="capitalize">{stat}</span>: +{bonus}
                        </li>
                    {/each}
                </ul>
            </div>

            <div>
                <h4 class="font-semibold mb-2">Abilities</h4>
                <ul class="space-y-2">
                    {#each raceInfo.abilities as ability}
                        <li>
                            <span class="font-medium">{ability.name}</span>
                            <p class="text-sm text-gray-600">{ability.description}</p>
                        </li>
                    {/each}
                </ul>
            </div>

            <div>
                <h4 class="font-semibold mb-2">Background Options</h4>
                <ul class="space-y-2">
                    {#each raceInfo.backgroundOptions as background}
                        <li>
                            <span class="font-medium">{background.title}</span>
                            <p class="text-sm text-gray-600">{background.description}</p>
                        </li>
                    {/each}
                </ul>
            </div>
        </div>
    </CardContent>
</Card>