<!-- src/routes/character/details/+page.svelte -->
<script lang="ts">
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { raceDefinitions } from '$lib/data/races';
    import { classDefinitions } from '$lib/data/classes';
    import { equipmentDefinitions } from '$lib/data/equipment';
    import { raceIcons } from '$lib/assets/raceIcons';
    import { classIcons } from '$lib/assets/classIcons';
    import type { PageData } from './$types';
    import type { CreatureRaceType, CreatureClassType, CreatureStats, EquipmentRecord, EnhancedEquipment } from '$lib/types';
    import XPBar from '$lib/components/character/XPBar.svelte';
    import { calculateStatModifier, calculateHealth, getLevelProgress, applyRacialBonuses, getClassStatModifiers } from '$lib/client/xp';

    const { data } = $props<{ data: PageData }>();
    
    // Using derived state for computed values
    let creature = $derived(data.creature);
    let baseStats = $derived(data.stats as CreatureStats);
    let raceInfo = $derived(raceDefinitions[creature.race as CreatureRaceType]);
    let classInfo = $derived(classDefinitions[creature.class as CreatureClassType]);
    

    let equipmentData = $derived(data.equipment as EquipmentRecord[] || []);
    
    let characterEquipment = $derived(equipmentData.map((item): EnhancedEquipment => {
        const details = equipmentDefinitions[item.itemId];
        return {
            ...item,
            name: details?.name || "Unknown Item",
            details
        };
    }));

    let statsWithRace = $derived(applyRacialBonuses(baseStats, creature.race as CreatureRaceType));
    
    let classModifiers = $derived(getClassStatModifiers(creature.class as CreatureClassType));
    
    let equipmentBonuses = $derived(characterEquipment.reduce((bonuses: Partial<CreatureStats>, item: EnhancedEquipment) => {
        if (item.details?.bonuses) {
            Object.entries(item.details.bonuses).forEach(([stat, bonus]) => {
                const statKey = stat as keyof CreatureStats;
                bonuses[statKey] = (bonuses[statKey] || 0) + (bonus as number);
            });
        }
        return bonuses;
    }, {} as Partial<CreatureStats>));
    
    let effectiveStats = $derived({
        strength: statsWithRace.strength + (classModifiers.strength || 0) + (equipmentBonuses.strength || 0),
        dexterity: statsWithRace.dexterity + (classModifiers.dexterity || 0) + (equipmentBonuses.dexterity || 0),
        constitution: statsWithRace.constitution + (classModifiers.constitution || 0) + (equipmentBonuses.constitution || 0),
        intelligence: statsWithRace.intelligence + (classModifiers.intelligence || 0) + (equipmentBonuses.intelligence || 0),
        wisdom: statsWithRace.wisdom + (classModifiers.wisdom || 0) + (equipmentBonuses.wisdom || 0),
        charisma: statsWithRace.charisma + (classModifiers.charisma || 0) + (equipmentBonuses.charisma || 0)
    });
    
    const statModifiers = $derived(Object.entries(effectiveStats).reduce((acc, [stat, value]) => {
        acc[stat as keyof typeof effectiveStats] = calculateStatModifier(value);
        return acc;
    }, {} as Record<keyof typeof effectiveStats, number>));
    
    const health = $derived(calculateHealth(
        effectiveStats.constitution, 
        creature.level, 
        creature.class as CreatureClassType
    ));
    
    const levelProgress = $derived(getLevelProgress(creature.experience));
</script>

<div class="container mx-auto py-8 space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Basic Character Info -->
        <Card>
            <CardHeader>
                <CardTitle class="flex items-center gap-3">
                    <span class="capitalize">{creature.name}</span>
                    <span class="text-sm text-muted-foreground">Level {creature.level}</span>
                </CardTitle>
                <CardDescription>Character Overview</CardDescription>
            </CardHeader>
            <CardContent>
                <div class="space-y-4">
                    <!-- Race Info -->
                    <div>
                        <h3 class="text-lg font-semibold flex items-center gap-2">
                            {@html raceIcons[creature.race as CreatureRaceType]}
                            <span class="capitalize">{creature.race}</span>
                        </h3>
                        <p class="text-sm text-muted-foreground mt-1">{raceInfo.description}</p>
                        
                        <div class="mt-3">
                            <h4 class="font-medium text-sm">Racial Abilities</h4>
                            <ul class="mt-2 space-y-2">
                                {#each raceInfo.abilities as ability}
                                    <li class="text-sm">
                                        <span class="font-medium">{ability.name}:</span>
                                        <span class="text-muted-foreground">{ability.description}</span>
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    </div>

                    <!-- Class Info -->
                    <div class="pt-4 border-t">
                        <h3 class="text-lg font-semibold flex items-center gap-2">
                            {@html classIcons[creature.class as CreatureClassType]}
                            <span class="capitalize">{creature.class}</span>
                        </h3>
                        <p class="text-sm text-muted-foreground mt-1">{classInfo.description}</p>
                        
                        <div class="mt-3">
                            <h4 class="font-medium text-sm">Class Abilities</h4>
                            <ul class="mt-2 space-y-2">
                                {#each classInfo.abilities as ability}
                                    <li class="text-sm" class:text-muted-foreground={creature.level < ability.levelRequired}>
                                        <span class="font-medium">{ability.name}:</span>
                                        <span>{ability.description}</span>
                                        {#if creature.level < ability.levelRequired}
                                            <span class="text-red-500 text-xs">(Unlocks at level {ability.levelRequired})</span>
                                        {/if}
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <!-- Stats and Equipment -->
        <Card>
            <CardHeader>
                <CardTitle>Stats & Equipment</CardTitle>
                <CardDescription>Current attributes and gear</CardDescription>
            </CardHeader>
            <CardContent>
                <div class="space-y-4">
                    <!-- Experience Bar -->
                    <div>
                        <h3 class="font-medium mb-2">Experience</h3>
                        <XPBar experience={creature.experience} />
                    </div>

                    <!-- Equipment -->
                    <div class="pt-4 border-t">
                        <h3 class="font-medium">Equipment</h3>
                        <div class="mt-2 space-y-2">
                            {#each characterEquipment as item}
                                <div class="flex flex-col gap-1 p-2 rounded-lg bg-secondary/10">
                                    <div class="flex items-center justify-between text-sm">
                                        <span class="capitalize font-medium">{item.slot}:</span>
                                        <span>{item.name}</span>
                                    </div>
                                    {#if item.details?.bonuses}
                                        <div class="text-xs text-muted-foreground">
                                            {#each Object.entries(item.details.bonuses) as [stat, bonus]}
                                                <span class="capitalize">+{bonus} {stat}</span>
                                            {/each}
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>

                    <!-- Starting Skills -->
                    <div class="pt-4 border-t">
                        <h3 class="font-medium">Skills</h3>
                        <div class="mt-2">
                            <ul class="grid grid-cols-2 gap-2">
                                {#each classInfo.startingSkills as skill}
                                    <li class="text-sm p-2 bg-secondary/10 rounded-lg">{skill}</li>
                                {/each}
                            </ul>
                        </div>
                    </div>

                    <!-- Stat Bonuses -->
                    <div class="pt-4 border-t">
                        <h3 class="font-medium">Racial Stat Bonuses</h3>
                        <div class="mt-2 grid grid-cols-2 gap-2">
                            {#each Object.entries(raceInfo.statBonuses) as [stat, bonus]}
                                <div class="flex items-center justify-between p-2 bg-secondary/10 rounded-lg">
                                    <span class="text-sm capitalize">{stat}:</span>
                                    <span class="text-sm font-medium text-green-600">+{bonus}</span>
                                </div>
                            {/each}
                        </div>
                    </div>

                    <!-- Primary Stats -->
                    <div class="pt-4 border-t">
                        <h3 class="font-medium">Primary Stats</h3>
                        <div class="mt-2">
                            <div class="text-sm flex gap-2">
                                {#each classInfo.primaryStats as stat}
                                    <span class="capitalize px-2 py-1 bg-primary/10 rounded-lg">{stat}</span>
                                {/each}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
</div>