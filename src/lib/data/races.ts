import type { RaceAttributes } from '$lib/types';
import { CreatureRace } from '$lib/types';

export const raceDefinitions: Record<string, RaceAttributes> = {
    [CreatureRace.HUMAN]: {
        name: CreatureRace.HUMAN,
        description: "Adaptable and ambitious, humans are among the most resourceful creatures. Their determination and versatility allow them to excel at building and maintaining habits.",
        statBonuses: {
            strength: 1,
            constitution: 1,
            charisma: 1
        },
        abilities: [
            {
                name: "Versatile Spirit",
                description: "Humans gain a +1 bonus to all habit completion rolls."
            },
            {
                name: "Quick Learner",
                description: "Humans earn experience 10% faster than other races."
            }
        ],
        backgroundOptions: [
            {
                title: "Urban Professional",
                description: "You grew up in a bustling city, learning to balance work and self-improvement."
            },
            {
                title: "Rural Achiever",
                description: "Your small-town background taught you the value of consistent effort and community support."
            }
        ]
    },
    [CreatureRace.ORC]: {
        name: CreatureRace.ORC,
        description: "Powerful and determined, orcs approach habit-building with raw strength and unwavering dedication.",
        statBonuses: {
            strength: 2,
            constitution: 1
        },
        abilities: [
            {
                name: "Unbreakable Aura",
                description: "Gain +1 on all armor types"
            },
            {
                name: "Endurance",
                description: "Gain bonus EXP for maintaining streaks longer than 7 days."
            }
        ],
        backgroundOptions: [
            {
                title: "Tribal Warrior",
                description: "Your warrior upbringing taught you the importance of daily discipline and routine."
            },
            {
                title: "City Survivor",
                description: "Life in urban environments has honed your adaptability and persistence."
            }
        ]
    },
    [CreatureRace.ELF]: {
        name: CreatureRace.ELF,
        description: "Graceful and patient, elves excel at maintaining long-term habits through their natural focus and centuries of experience.",
        statBonuses: {
            dexterity: 1,
            intelligence: 1,
            wisdom: 1
        },
        abilities: [
            {
                name: "Perfect Memory",
                description: "Never accidentally break a streak due to forgetting to check in."
            },
            {
                name: "Natural Focus",
                description: "Gain +2 to all concentration-based habits."
            }
        ],
        backgroundOptions: [
            {
                title: "Ancient Scholar",
                description: "Centuries of study have taught you the importance of routine and discipline."
            },
            {
                title: "Forest Guardian",
                description: "Living in harmony with nature has shown you the power of consistent, sustainable practices."
            }
        ]
    },
    [CreatureRace.DWARF]: {
        name: CreatureRace.DWARF,
        description: "Sturdy and disciplined, dwarves approach habit-building with the same dedication they bring to their crafts.",
        statBonuses: {
            constitution: 2,
            dexterity: 1
        },
        abilities: [
            {
                name: "Stone Resolve",
                description: "20% chance to double the day's EXP."
            },
            {
                name: "Master Craftsman",
                description: "Gain bonus rewards for completing crafting or skill-based habits."
            }
        ],
        backgroundOptions: [
            {
                title: "Mountain Artisan",
                description: "Your crafting background has instilled the value of daily practice and improvement."
            },
            {
                title: "Clan Elder",
                description: "Your role as a community leader has taught you the importance of leading by example."
            }
        ]
    }
};