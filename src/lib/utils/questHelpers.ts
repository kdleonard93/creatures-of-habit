/**
 * Quest question generator helpers
 */

export interface QuestQuestionTemplate {
    questionText: string;
    choiceA: string;
    choiceB: string;
    requiredStat: string;
}

const STRENGTH_QUESTIONS: QuestQuestionTemplate[] = [
    {
        questionText: 'A massive boulder blocks your path. What do you do?',
        choiceA: 'Push the boulder aside with brute force',
        choiceB: 'Look for another way around',
        requiredStat: 'strength'
    },
    {
        questionText: 'You encounter a heavy iron door. How do you proceed?',
        choiceA: 'Force the door open',
        choiceB: 'Search for a key',
        requiredStat: 'strength'
    },
    {
        questionText: 'A rope bridge starts to collapse as you cross. What\'s your move?',
        choiceA: 'Pull yourself up with raw strength',
        choiceB: 'Try to balance carefully',
        requiredStat: 'strength'
    }
];

const DEXTERITY_QUESTIONS: QuestQuestionTemplate[] = [
    {
        questionText: 'You spot a series of swinging blades ahead. How do you get past?',
        choiceA: 'Time your movements and dodge through',
        choiceB: 'Wait for them to stop',
        requiredStat: 'dexterity'
    },
    {
        questionText: 'A narrow ledge is the only way forward. What do you do?',
        choiceA: 'Carefully balance across',
        choiceB: 'Find another route',
        requiredStat: 'dexterity'
    },
    {
        questionText: 'Arrows suddenly fly from hidden traps! Your reaction?',
        choiceA: 'Dodge and weave through them',
        choiceB: 'Take cover immediately',
        requiredStat: 'dexterity'
    }
];

const INTELLIGENCE_QUESTIONS: QuestQuestionTemplate[] = [
    {
        questionText: 'You find an ancient puzzle lock. How do you approach it?',
        choiceA: 'Analyze the patterns and solve it',
        choiceB: 'Try random combinations',
        requiredStat: 'intelligence'
    },
    {
        questionText: 'Strange runes glow on the wall. What\'s your approach?',
        choiceA: 'Decipher their meaning',
        choiceB: 'Ignore them and move on',
        requiredStat: 'intelligence'
    },
    {
        questionText: 'A complex mechanism controls the door. How do you proceed?',
        choiceA: 'Study and manipulate the mechanism',
        choiceB: 'Look for a simpler solution',
        requiredStat: 'intelligence'
    }
];

const WISDOM_QUESTIONS: QuestQuestionTemplate[] = [
    {
        questionText: 'You sense something is wrong with this path. What do you do?',
        choiceA: 'Trust your instincts and find another way',
        choiceB: 'Proceed with caution',
        requiredStat: 'wisdom'
    },
    {
        questionText: 'An old hermit offers you advice. How do you respond?',
        choiceA: 'Listen carefully and apply the wisdom',
        choiceB: 'Thank them but trust yourself',
        requiredStat: 'wisdom'
    },
    {
        questionText: 'The forest seems to whisper warnings. Your response?',
        choiceA: 'Heed nature\'s warning',
        choiceB: 'Press on regardless',
        requiredStat: 'wisdom'
    }
];

const CHARISMA_QUESTIONS: QuestQuestionTemplate[] = [
    {
        questionText: 'A guard blocks your way. How do you handle this?',
        choiceA: 'Persuade them to let you pass',
        choiceB: 'Try to sneak past',
        requiredStat: 'charisma'
    },
    {
        questionText: 'Local merchants seem suspicious of you. What\'s your approach?',
        choiceA: 'Charm them with conversation',
        choiceB: 'Keep to yourself',
        requiredStat: 'charisma'
    },
    {
        questionText: 'You need information from a reluctant witness. How do you proceed?',
        choiceA: 'Use diplomacy and persuasion',
        choiceB: 'Offer a bribe',
        requiredStat: 'charisma'
    }
];

const CONSTITUTION_QUESTIONS: QuestQuestionTemplate[] = [
    {
        questionText: 'Poisonous gas fills the chamber. What do you do?',
        choiceA: 'Hold your breath and push through',
        choiceB: 'Retreat immediately',
        requiredStat: 'constitution'
    },
    {
        questionText: 'You\'ve been traveling for hours without rest. How do you continue?',
        choiceA: 'Push through the exhaustion',
        choiceB: 'Take a break to rest',
        requiredStat: 'constitution'
    },
    {
        questionText: 'The heat is overwhelming in this area. Your approach?',
        choiceA: 'Endure the heat and continue',
        choiceB: 'Wait for conditions to improve',
        requiredStat: 'constitution'
    }
];

export const QUESTION_BANKS = {
    strength: STRENGTH_QUESTIONS,
    dexterity: DEXTERITY_QUESTIONS,
    intelligence: INTELLIGENCE_QUESTIONS,
    wisdom: WISDOM_QUESTIONS,
    charisma: CHARISMA_QUESTIONS,
    constitution: CONSTITUTION_QUESTIONS
};

/**
 * Get a random question for a specific stat
 */
export function getRandomQuestion(stat: keyof typeof QUESTION_BANKS): QuestQuestionTemplate {
    const questions = QUESTION_BANKS[stat];
    return questions[Math.floor(Math.random() * questions.length)];
}

/**
 * Generate a set of diverse questions for a quest
 */
export function generateQuestQuestions(count = 5) {
    const stats = Object.keys(QUESTION_BANKS) as (keyof typeof QUESTION_BANKS)[];
    const questions: QuestQuestionTemplate[] = [];
    const usedStats = new Set<string>();
    
    // Ensure we use diverse stats
    for (let i = 0; i < count; i++) {
        // Try to use each stat at least once before repeating
        const availableStats = stats.filter(s => !usedStats.has(s));
        const statPool = availableStats.length > 0 ? availableStats : stats;
        
        const randomStat = statPool[Math.floor(Math.random() * statPool.length)];
        usedStats.add(randomStat);
        
        // Reset if we've used all stats
        if (usedStats.size === stats.length) {
            usedStats.clear();
        }
        
        questions.push(getRandomQuestion(randomStat));
    }
    
    return questions;
}

/**
 * Calculate success chance based on user stat vs difficulty
 */
export function calculateSuccessChance(userStatValue: number, difficultyThreshold: number): number {
    const difference = userStatValue - difficultyThreshold;
    
    // Base 50% chance at threshold
    // +5% per point above, -5% per point below
    const baseChance = 50;
    const modifier = difference * 5;
    const chance = Math.max(10, Math.min(90, baseChance + modifier));
    
    return chance;
}
