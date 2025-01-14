import type { Equipment } from '$lib/types';
import { CreatureClass } from '$lib/types';

export const equipmentDefinitions: Record<string, Equipment> = {
    // Warrior Equipment
    "common-sword": {
        id: "common-sword",
        name: "Training Sword",
        slot: "weapon",
        bonuses: {
            strength: 1
        },
        classRestrictions: [CreatureClass.WARRIOR]
    },
    "common-armor": {
        id: "common-armor",
        name: "Leather Armor",
        slot: "armor",
        bonuses: {
            constitution: 1
        }
    },

    // Wizard Equipment
    "common-staff": {
        id: "common-staff",
        name: "Apprentice Staff",
        slot: "weapon",
        bonuses: {
            intelligence: 1
        },
        classRestrictions: [CreatureClass.WIZARD]
    },
    "common-robes": {
        id: "common-robes",
        name: "Silk Robe",
        slot: "armor",
        bonuses: {
            wisdom: 1
        },
        classRestrictions: [CreatureClass.WIZARD]
    },

    // Brawler Equipment
    "common-gloves": {
        id: "common-gloves",
        name: "Training Gloves",
        slot: "weapon",
        bonuses: {
            strength: 1
        },
        classRestrictions: [CreatureClass.BRAWLER]
    },
    "common-vest": {
        id: "common-vest",
        name: "Training Vest",
        slot: "armor",
        bonuses: {
            constitution: 1
        },
        classRestrictions: [CreatureClass.BRAWLER]
    },

    // Cleric Equipment
    "common-mace": {
        id: "common-mace",
        name: "Rusty Mace",
        slot: "weapon",
        bonuses: {
            wisdom: 1
        },
        classRestrictions: [CreatureClass.CLERIC]
    },
    "common-chainmail": {
        id: "common-chainmail",
        name: "Worn Chainmail",
        slot: "armor",
        bonuses: {
            constitution: 1
        },
        classRestrictions: [CreatureClass.CLERIC]
    },

    // Assassin Equipment
    "common-daggers": {
        id: "common-daggers",
        name: "Training Daggers",
        slot: "weapon",
        bonuses: {
            dexterity: 1
        },
        classRestrictions: [CreatureClass.ASSASSIN]
    },
    "common-cloak": {
        id: "common-cloak",
        name: "Shadow Cloak",
        slot: "armor",
        bonuses: {
            dexterity: 1
        },
        classRestrictions: [CreatureClass.ASSASSIN]
    },

    // Archer Equipment
    "common-bow": {
        id: "common-bow",
        name: "Practice Bow",
        slot: "weapon",
        bonuses: {
            dexterity: 1
        },
        classRestrictions: [CreatureClass.ARCHER]
    },
    "common-leather": {
        id: "common-leather",
        name: "Ranger Leather",
        slot: "armor",
        bonuses: {
            wisdom: 1
        },
        classRestrictions: [CreatureClass.ARCHER]
    },

    // Alchemist Equipment
    "common-catalyst": {
        id: "common-catalyst",
        name: "Apprentice Catalyst",
        slot: "weapon",
        bonuses: {
            intelligence: 1
        },
        classRestrictions: [CreatureClass.ALCHEMIST]
    },
    "common-coat": {
        id: "common-coat",
        name: "Thin Lab Coat",
        slot: "armor",
        bonuses: {
            intelligence: 1
        },
        classRestrictions: [CreatureClass.ALCHEMIST]
    },

    // Engineer Equipment
    "common-wrench": {
        id: "common-wrench",
        name: "Basic Wrench",
        slot: "weapon",
        bonuses: {
            intelligence: 1
        },
        classRestrictions: [CreatureClass.ENGINEER]
    },
    "common-exosuit": {
        id: "common-exosuit",
        name: "Basic Power Frame",
        slot: "armor",
        bonuses: {
            constitution: 1,
            intelligence: 1
        },
        classRestrictions: [CreatureClass.ENGINEER]
    }
};