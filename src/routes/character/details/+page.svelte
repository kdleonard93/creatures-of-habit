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
    import { Badge } from "$lib/components/ui/badge";
    import { Progress } from "$lib/components/ui/progress";
    import { Swords, Sword, Brain, Heart, Clover, Wand, Target } from 'lucide-svelte';

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

    const statDescriptions = {
        strength: {
            low: "Struggles with heavy objects",
            medium: "Can lift their own weight",
            high: "Could wrestle a bear"
        },
        dexterity: {
            low: "Occasionally trips on flat surfaces",
            medium: "Nimble and coordinated",
            high: "Moves like a shadow"
        },
        constitution: {
            low: "Gets winded climbing stairs",
            medium: "Resilient to common ailments",
            high: "Could survive in the harshest conditions"
        },
        intelligence: {
            low: "Sometimes forgets their own name",
            medium: "Quick-witted and knowledgeable",
            high: "Solves complex puzzles with ease"
        },
        wisdom: {
            low: "Often makes questionable decisions",
            medium: "Shows good judgment",
            high: "Possesses ancient wisdom"
        },
        charisma: {
            low: "Makes people slightly uncomfortable",
            medium: "Generally likable",
            high: "Could charm their way out of anything"
        }
    };

    function getStatDescription(stat: keyof typeof effectiveStats) {
        const value = effectiveStats[stat];
        if (value < 10) return statDescriptions[stat].low;
        if (value < 16) return statDescriptions[stat].medium;
        return statDescriptions[stat].high;
    }

    function getStatColor(stat: keyof typeof effectiveStats) {
        const value = effectiveStats[stat];
        if (value < 10) return "text-orange-500";
        if (value < 16) return "text-blue-500";
        return "text-green-500";
    }

    function getStatIcon(stat: string) {
        switch(stat) {
            case 'strength': return Swords;
            case 'dexterity': return Target;
            case 'constitution': return Heart;
            case 'intelligence': return Wand;
            case 'wisdom': return Brain;
            case 'charisma': return Clover;
            default: return Sword;
        }
    }
</script>

<svelte:head>
    <title>{creature.name} | Creatures of Habit</title>
</svelte:head>

<div class="container mx-auto py-8 space-y-8">
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-6 shadow-md">
        <div class="flex flex-col md:flex-row items-center gap-6">
            <div class="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 bg-primary/20 rounded-full flex items-center justify-center text-4xl">
                {@html raceIcons[creature.race as CreatureRaceType]}
            </div>
            <div class="flex-1 text-center md:text-left">
                <h1 class="text-3xl md:text-4xl font-bold capitalize flex items-center gap-2 justify-center md:justify-start">
                    {creature.name}
                    <Badge variant="outline" class="ml-2">Level {creature.level}</Badge>
                </h1>
                <div class="flex items-center gap-3 mt-2 justify-center md:justify-start">
                    <span class="inline-flex items-center gap-1">
                        {@html raceIcons[creature.race as CreatureRaceType]}
                        <span class="capitalize">{creature.race}</span>
                    </span>
                    <span class="text-muted-foreground">•</span>
                    <span class="inline-flex items-center gap-1">
                        {@html classIcons[creature.class as CreatureClassType]}
                        <span class="capitalize">{creature.class}</span>
                    </span>
                </div>
                <div class="mt-4 max-w-md mx-auto md:mx-0">
                    <h3 class="font-medium mb-1">Experience</h3>
                    <XPBar experience={creature.experience} />
                    <p class="text-sm text-muted-foreground mt-1">
                        {levelProgress.currentLevelXp} / {levelProgress.nextLevelXp} XP 
                        ({Math.floor(levelProgress.xpProgress * 100)}% to level {creature.level + 1})
                    </p>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Core Stats Card -->
        <Card class="overflow-hidden">
            <CardHeader class="bg-primary/5">
                <CardTitle>Core Attributes</CardTitle>
                <CardDescription>Your creature's fundamental abilities</CardDescription>
            </CardHeader>
            <CardContent class="pt-6">
                <div class="space-y-6">
                    {#each Object.entries(effectiveStats) as [stat, value]}
                        {@const modifier = statModifiers[stat as keyof typeof effectiveStats]}
                        {@const statIcon = getStatIcon(stat)}
                        <div class="space-y-2">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    {#if stat}
                                        {@const IconComponent = getStatIcon(stat)}
                                        <IconComponent class="h-5 w-5 text-primary" />
                                    {/if}
                                    <h3 class="font-medium capitalize">{stat}</h3>
                                </div>
                                <div class="text-right">    
                                    <span class="text-xl font-bold">{value}</span>
                                    <span class="text-sm ml-1 font-medium {modifier >= 0 ? 'text-green-500' : 'text-red-500'}">
                                        ({modifier >= 0 ? '+' : ''}{modifier})
                                    </span>
                                </div>
                            </div>
                            <Progress value={Math.min(value * 5, 100)} class="h-2" />
                            <p class="text-sm {getStatColor(stat as keyof typeof effectiveStats)}">
                                {getStatDescription(stat as keyof typeof effectiveStats)}
                            </p>
                        </div>
                    {/each}
                </div>
            </CardContent>
        </Card>

        <!-- Character Details Card -->
        <Card>
            <CardHeader class="bg-secondary/5">
                <CardTitle>Character Details</CardTitle>
                <CardDescription>Background and abilities</CardDescription>
            </CardHeader>
            <CardContent class="pt-6">
                <div class="space-y-6">
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
                                    <li class="text-sm p-2 rounded-md bg-primary/5">
                                        <span class="font-medium block">{ability.name}</span>
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
                                    <li class="text-sm p-2 rounded-md {creature.level < ability.levelRequired ? 'bg-gray-100 dark:bg-gray-800' : 'bg-secondary/5'}">
                                        <div class="flex justify-between">
                                            <span class="font-medium">{ability.name}</span>
                                            {#if creature.level < ability.levelRequired}
                                                <Badge variant="outline" class="text-red-500">Lvl {ability.levelRequired}</Badge>
                                            {/if}
                                        </div>
                                        <span class={creature.level < ability.levelRequired ? 'text-muted-foreground' : ''}>
                                            {ability.description}
                                        </span>
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <!-- Equipment and Skills Card -->
        <Card>
            <CardHeader class="bg-primary/5">
                <CardTitle>Equipment & Skills</CardTitle>
                <CardDescription>Gear and proficiencies</CardDescription>
            </CardHeader>
            <CardContent class="pt-6">
                <div class="space-y-6">
                    <!-- Health -->
                    <div class="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                        <div class="flex items-center justify-between">
                            <h3 class="font-medium flex items-center gap-2 text-red-500">
                                <Heart class="h-5 w-5 text-red-500"  fill="currentColor"/>
                                Health
                            </h3>
                            <span class="text-xl font-bold text-red-600 dark:text-red-400">{health}</span>
                        </div>
                        <p class="text-sm text-red-600/70 dark:text-red-400/70 mt-1">
                            {#if health < 20}
                                Fragile as a glass figurine
                            {:else if health < 40}
                                Sturdy enough for most challenges
                            {:else}
                                Tough as ancient dragonhide
                            {/if}
                        </p>
                    </div>

                    <!-- Equipment -->
                    <div>
                        <h3 class="font-medium mb-3">Equipment</h3>
                        <div class="space-y-2">
                            {#each characterEquipment as item}
                                <div class="flex flex-col gap-1 p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                                    <div class="flex items-center justify-between">
                                        <span class="capitalize font-medium">{item.slot}</span>
                                        <span class="text-sm">{item.name}</span>
                                    </div>
                                    {#if item.details?.bonuses}
                                        <div class="flex flex-wrap gap-2 mt-1">
                                            {#each Object.entries(item.details.bonuses) as [stat, bonus]}
                                                <Badge variant="secondary" class="capitalize">+{bonus} {stat}</Badge>
                                            {/each}
                                        </div>
                                    {/if}
                                </div>
                            {:else}
                                <p class="text-sm text-muted-foreground italic">No equipment found</p>
                            {/each}
                        </div>
                    </div>

                    <!-- Skills -->
                    <div class="pt-4 border-t">
                        <h3 class="font-medium mb-3">Skills</h3>
                        <div class="flex flex-wrap gap-2">
                            {#each classInfo.startingSkills as skill}
                                <Badge variant="outline" class="capitalize">{skill}</Badge>
                            {/each}
                        </div>
                    </div>

                    <!-- Racial Stat Bonuses -->
                    <div class="pt-4 border-t">
                        <h3 class="font-medium mb-3">Racial Bonuses</h3>
                        <div class="flex flex-wrap gap-2">
                            {#each Object.entries(raceInfo.statBonuses) as [stat, bonus]}
                                <Badge class="capitalize bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                    +{bonus} {stat}
                                </Badge>
                            {/each}
                        </div>
                    </div>

                    <!-- Primary Stats -->
                    <div class="pt-4 border-t">
                        <h3 class="font-medium mb-3">Class Affinities</h3>
                        <p class="text-sm text-muted-foreground mb-2">
                            Your class excels with these attributes:
                        </p>
                        <div class="flex flex-wrap gap-2">
                            {#each classInfo.primaryStats as stat}
                                <Badge variant="default" class="capitalize">{stat}</Badge>
                            {/each}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
</div>