import type { ClassAttributes } from '$lib/types';
import { CreatureClass } from '$lib/types';

export const classDefinitions: Record<string, ClassAttributes> = {
    [CreatureClass.WARRIOR]: {
        name: CreatureClass.WARRIOR,
        description: "Warriors approach habit-building with discipline and strength, excelling at physical and mental challenges alike.",
        startingEquipment: [
            {
                slot: "weapon",
                itemId: "common-sword",
                name: "Training Sword"
            },
            {
                slot: "armor",
                itemId: "common-armor",
                name: "Leather Armor"
            }
        ],
        startingSkills: ["Combat Focus", "Endurance Training"],
        abilities: [
            {
                name: "Warrior's Resolve",
                description: "Gain bonus experience for completing physical exercise habits",
                levelRequired: 1
            },
            {
                name: "Battle Rhythm",
                description: "After maintaining a streak for 5 days, gain increased rewards",
                levelRequired: 5
            }
        ],
        primaryStats: ["strength", "constitution"]
    },
    [CreatureClass.WIZARD]: {
        name: CreatureClass.WIZARD,
        description: "Wizards master habits through study and mental discipline, turning daily practices into powerful routines.",
        startingEquipment: [
            {
                slot: "weapon",
                itemId: "common-staff",
                name: "Apprentice Staff"
            },
            {
                slot: "armor",
                itemId: "common-robes",
                name: "Silk Robe"
            }
        ],
        startingSkills: ["Meditation", "Arcane Studies"],
        abilities: [
            {
                name: "Mental Clarity",
                description: "Gain bonus experience for completing study and learning habits",
                levelRequired: 1
            },
            {
                name: "Focus Mastery",
                description: "Meditation habits provide additional willpower regeneration",
                levelRequired: 5
            }
        ],
        primaryStats: ["intelligence", "wisdom"]
    },

    [CreatureClass.BRAWLER]: {
        name: CreatureClass.BRAWLER,
        description: "Brawlers face challenges head-on, using raw strength and determination to build lasting habits.",
        startingEquipment: [
            {
                slot: "weapon",
                itemId: "common-gloves",
                name: "Training Gloves"
            },
            {
                slot: "armor",
                itemId: "common-vest",
                name: "Training Vest"
            }
        ],
        startingSkills: ["Unarmed Combat", "Physical Conditioning"],
        abilities: [
            {
                name: "Iron Will",
                description: "Gain increased rewards for completing difficult habits",
                levelRequired: 1
            },
            {
                name: "Momentum",
                description: "Each consecutive day of completed habits increases reward bonus",
                levelRequired: 5
            }
        ],
        primaryStats: ["strength", "constitution"]
    },

    [CreatureClass.CLERIC]: {
        name: CreatureClass.CLERIC,
        description: "Clerics blend spiritual practice with daily habits, finding strength in routine and helping others on their journey.",
        startingEquipment: [
            {
                slot: "weapon",
                itemId: "common-mace",
                name: "Rusty Mace"
            },
            {
                slot: "armor",
                itemId: "common-chainmail",
                name: "Worn Chainmail"
            }
        ],
        startingSkills: ["Meditation", "Community Support"],
        abilities: [
            {
                name: "Inner Peace",
                description: "Gain bonus rewards for completing wellness and mindfulness habits",
                levelRequired: 1
            },
            {
                name: "Healing Touch",
                description: "Help other users recover from broken streaks once per day",
                levelRequired: 5
            }
        ],
        primaryStats: ["wisdom", "charisma"]
    },

    [CreatureClass.ASSASSIN]: {
        name: CreatureClass.ASSASSIN,
        description: "Assassins excel at precision and timing, breaking bad habits with surgical precision while building new ones in the shadows.",
        startingEquipment: [
            {
                slot: "weapon",
                itemId: "common-daggers",
                name: "Training Daggers"
            },
            {
                slot: "armor",
                itemId: "common-cloak",
                name: "Shadow Cloak"
            }
        ],
        startingSkills: ["Stealth Practice", "Time Management"],
        abilities: [
            {
                name: "Precision Focus",
                description: "Gain bonus rewards for completing habits at exact scheduled times",
                levelRequired: 1
            },
            {
                name: "Shadow Discipline",
                description: "Maintain streak bonuses even when completing habits late in the day",
                levelRequired: 5
            }
        ],
        primaryStats: ["dexterity", "intelligence"]
    },

    [CreatureClass.ARCHER]: {
        name: CreatureClass.ARCHER,
        description: "Archers approach habit-building with focus and precision, setting long-term goals and hitting their targets consistently.",
        startingEquipment: [
            {
                slot: "weapon",
                itemId: "common-bow",
                name: "Practice Bow"
            },
            {
                slot: "armor",
                itemId: "common-leather",
                name: "Ranger Leather"
            }
        ],
        startingSkills: ["Precise Aim", "Goal Setting"],
        abilities: [
            {
                name: "Perfect Shot",
                description: "Bonus rewards for completing habits at the same time each day",
                levelRequired: 1
            },
            {
                name: "Long Shot",
                description: "Increased rewards for long-term goals and extended streaks",
                levelRequired: 5
            }
        ],
        primaryStats: ["dexterity", "wisdom"]
    },

    [CreatureClass.ALCHEMIST]: {
        name: CreatureClass.ALCHEMIST,
        description: "Alchemists master the art of transformation, experimenting with different habit combinations to create powerful daily routines.",
        startingEquipment: [
            {
                slot: "weapon",
                itemId: "common-catalyst",
                name: "Apprentice Catalyst"
            },
            {
                slot: "armor",
                itemId: "common-coat",
                name: "Thin Lab Coat"
            }
        ],
        startingSkills: ["Experimentation", "Habit Analysis"],
        abilities: [
            {
                name: "Catalyst",
                description: "Chain multiple habits together for compound reward bonuses",
                levelRequired: 1
            },
            {
                name: "Transmutation",
                description: "Convert failed habits into learning opportunities with reduced penalty",
                levelRequired: 5
            }
        ],
        primaryStats: ["intelligence", "dexterity"]
    },
    
    [CreatureClass.ENGINEER]: {
        name: CreatureClass.ENGINEER,
        description: "Engineers build robust systems for habit maintenance, using tools and technology to optimize their daily routines.",
        startingEquipment: [
            {
                slot: "weapon",
                itemId: "common-wrench",
                name: "Basic Wrench"
            },
            {
                slot: "armor",
                itemId: "common-exosuit",
                name: "Basic Power Frame"
            }
        ],
        startingSkills: ["System Design", "Efficiency Planning"],
        abilities: [
            {
                name: "Systematic Approach",
                description: "Gain bonus rewards for completing habits in optimal order",
                levelRequired: 1
            },
            {
                name: "Efficiency Expert",
                description: "Reduce time requirements for habit completion while maintaining full benefits",
                levelRequired: 5
            }
        ],
        primaryStats: ["intelligence", "constitution"]
    }
};