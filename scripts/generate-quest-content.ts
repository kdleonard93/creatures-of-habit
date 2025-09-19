#!/usr/bin/env tsx

/**
 * AI-powered quest content generation script
 * Generates initial quest templates, questions, and narrative fragments
 */

import { db } from '../src/lib/server/db';
import { questTemplates } from '../src/lib/server/db/schema';

interface QuestTemplate {
    title: string;
    description: string;
    setting: string;
    difficulty: 'easy' | 'medium' | 'hard';
    narrative: string;
    questions: QuestionTemplate[];
}

interface QuestionTemplate {
    questionText: string;
    choiceA: string;
    choiceB: string;
    requiredStat: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
    context: string;
}

// Pre-defined quest content (rule-based generation for now)
const QUEST_TEMPLATES: QuestTemplate[] = [
    {
        title: "The Mysterious Cave",
        description: "Explore an ancient cave filled with unknown dangers and treasures.",
        setting: "forest",
        difficulty: "medium",
        narrative: "While wandering through the ancient forest, you stumble upon a hidden cave entrance. Strange sounds echo from within, and you notice fresh tracks leading inside. The air grows cold as you approach, and an eerie blue glow emanates from the depths.",
        questions: [
            {
                questionText: "A massive boulder blocks part of the entrance. How do you proceed?",
                choiceA: "Use your raw strength to move the boulder aside",
                choiceB: "Look for another way around the obstacle",
                requiredStat: "strength",
                context: "obstacle"
            },
            {
                questionText: "You hear growling echoing from deeper in the cave. What's your approach?",
                choiceA: "Carefully listen and assess the situation before proceeding",
                choiceB: "Charge forward boldly to face whatever awaits",
                requiredStat: "wisdom",
                context: "danger_assessment"
            },
            {
                questionText: "The cave floor is covered in loose rocks and seems unstable. How do you navigate?",
                choiceA: "Use your agility to carefully step across the treacherous terrain",
                choiceB: "Move slowly and test each step cautiously",
                requiredStat: "dexterity",
                context: "navigation"
            },
            {
                questionText: "You discover ancient runes carved into the wall. What do you do?",
                choiceA: "Use your knowledge to decipher the mysterious symbols",
                choiceB: "Ignore the runes and continue exploring",
                requiredStat: "intelligence",
                context: "puzzle"
            },
            {
                questionText: "A strange mist fills the chamber, making you feel drowsy. How do you respond?",
                choiceA: "Use your physical resilience to push through the effects",
                choiceB: "Retreat to fresh air and wait for the mist to clear",
                requiredStat: "constitution",
                context: "endurance"
            }
        ]
    },
    {
        title: "The Merchant's Dilemma",
        description: "Help a troubled merchant resolve a dispute in the bustling marketplace.",
        setting: "city",
        difficulty: "easy",
        narrative: "In the heart of the city's marketplace, you encounter a distressed merchant arguing with an angry customer. A crowd is gathering, and tensions are rising. The merchant's reputation and livelihood hang in the balance.",
        questions: [
            {
                questionText: "The customer claims they were sold a defective item. How do you intervene?",
                choiceA: "Use your charm to calm both parties and mediate the dispute",
                choiceB: "Stay out of it and let them resolve it themselves",
                requiredStat: "charisma",
                context: "social"
            },
            {
                questionText: "You need to examine the disputed item for defects. What's your approach?",
                choiceA: "Use your analytical skills to thoroughly inspect the item",
                choiceB: "Take a quick glance and make a judgment",
                requiredStat: "intelligence",
                context: "investigation"
            },
            {
                questionText: "The crowd is getting restless and pushing closer. How do you handle the situation?",
                choiceA: "Use your physical presence to create space and maintain order",
                choiceB: "Try to disperse the crowd with words alone",
                requiredStat: "strength",
                context: "crowd_control"
            },
            {
                questionText: "You notice subtle signs that someone might be lying. What do you do?",
                choiceA: "Trust your intuition and probe deeper into their story",
                choiceB: "Accept their explanation at face value",
                requiredStat: "wisdom",
                context: "deception_detection"
            },
            {
                questionText: "The situation requires you to stand for hours mediating. How do you manage?",
                choiceA: "Draw on your stamina to remain focused and alert throughout",
                choiceB: "Take frequent breaks to rest and recharge",
                requiredStat: "constitution",
                context: "endurance"
            }
        ]
    },
    {
        title: "The Crumbling Tower",
        description: "Scale a dangerous, ancient tower to retrieve a lost artifact.",
        setting: "ruins",
        difficulty: "hard",
        narrative: "Before you stands a towering spire of crumbling stone, its peak lost in the clouds above. Legend speaks of a powerful artifact hidden at its summit, but many who have attempted the climb have never returned. The wind howls through broken windows, and loose stones rain down from above.",
        questions: [
            {
                questionText: "The tower's entrance is blocked by heavy debris. How do you clear the way?",
                choiceA: "Use your strength to lift and move the heavy stones",
                choiceB: "Search for tools or another entrance",
                requiredStat: "strength",
                context: "obstacle"
            },
            {
                questionText: "The spiral staircase is partially collapsed with dangerous gaps. How do you proceed?",
                choiceA: "Use your agility to leap across the treacherous gaps",
                choiceB: "Climb along the outer wall to bypass the stairs",
                requiredStat: "dexterity",
                context: "navigation"
            },
            {
                questionText: "Poisonous gas seeps from cracks in the walls. How do you deal with it?",
                choiceA: "Hold your breath and push through using your endurance",
                choiceB: "Wait for the gas to dissipate naturally",
                requiredStat: "constitution",
                context: "hazard"
            },
            {
                questionText: "You find a complex magical lock barring your way. What's your approach?",
                choiceA: "Use your knowledge of magic to solve the intricate puzzle",
                choiceB: "Try to force the lock or find another way",
                requiredStat: "intelligence",
                context: "puzzle"
            },
            {
                questionText: "Strange whispers fill your mind, trying to turn you back. How do you respond?",
                choiceA: "Use your mental fortitude to resist the psychological pressure",
                choiceB: "Listen to the warnings and consider retreating",
                requiredStat: "wisdom",
                context: "mental_challenge"
            }
        ]
    },
    {
        title: "The Lost Caravan",
        description: "Track down a missing trade caravan in the vast desert.",
        setting: "desert",
        difficulty: "medium",
        narrative: "A wealthy merchant has hired you to find their missing caravan, last seen heading into the endless dunes three days ago. The desert sun beats down mercilessly, and sandstorms have erased most tracks. Time is running out for any survivors.",
        questions: [
            {
                questionText: "You find faint tracks in the sand. How do you follow them?",
                choiceA: "Use your keen perception to read the subtle signs in the desert",
                choiceB: "Follow the most obvious path and hope for the best",
                requiredStat: "wisdom",
                context: "tracking"
            },
            {
                questionText: "A sandstorm approaches rapidly. What's your strategy?",
                choiceA: "Use your physical endurance to push through the storm",
                choiceB: "Seek shelter and wait for it to pass",
                requiredStat: "constitution",
                context: "weather"
            },
            {
                questionText: "You encounter desert nomads who might have information. How do you approach?",
                choiceA: "Use your social skills to gain their trust and cooperation",
                choiceB: "Offer payment immediately for any information",
                requiredStat: "charisma",
                context: "negotiation"
            },
            {
                questionText: "You must climb a steep dune to get a better view of the area. How do you manage?",
                choiceA: "Use your agility to quickly scale the shifting sands",
                choiceB: "Take your time and climb slowly but steadily",
                requiredStat: "dexterity",
                context: "climbing"
            },
            {
                questionText: "You discover strange symbols carved in a rock formation. What do you do?",
                choiceA: "Apply your knowledge to decipher their meaning",
                choiceB: "Mark the location and continue your search",
                requiredStat: "intelligence",
                context: "investigation"
            }
        ]
    },
    {
        title: "The Haunted Manor",
        description: "Investigate supernatural occurrences in an abandoned estate.",
        setting: "manor",
        difficulty: "hard",
        narrative: "The old Blackwood Manor has stood empty for decades, but recently, locals report seeing lights in the windows and hearing screams in the night. You've been asked to investigate these supernatural claims and put the spirits to rest, if they exist.",
        questions: [
            {
                questionText: "The manor's front door is sealed shut with rusted chains. How do you enter?",
                choiceA: "Use your strength to break through the chains and door",
                choiceB: "Look for an unlocked window or back entrance",
                requiredStat: "strength",
                context: "entry"
            },
            {
                questionText: "Ghostly whispers seem to lead you toward a particular room. Do you follow?",
                choiceA: "Trust your intuition about whether the spirits mean harm",
                choiceB: "Ignore the whispers and explore systematically",
                requiredStat: "wisdom",
                context: "supernatural"
            },
            {
                questionText: "The floorboards are rotted and dangerous. How do you navigate safely?",
                choiceA: "Use your nimbleness to step lightly across weak spots",
                choiceB: "Test each board carefully before putting your weight on it",
                requiredStat: "dexterity",
                context: "navigation"
            },
            {
                questionText: "You find a library with books about the manor's history. What's your approach?",
                choiceA: "Use your scholarly knowledge to research the family's dark past",
                choiceB: "Skim quickly for any obvious clues",
                requiredStat: "intelligence",
                context: "research"
            },
            {
                questionText: "A cold, draining presence fills the room, sapping your energy. How do you cope?",
                choiceA: "Draw on your physical resilience to resist the supernatural drain",
                choiceB: "Leave the room immediately to recover",
                requiredStat: "constitution",
                context: "supernatural_endurance"
            }
        ]
    }
];

async function generateQuestContent() {
    console.log('Starting quest content generation...');
    
    try {
        // Clear existing templates (for development)
        const allowDestructive =
            process.env.NODE_ENV !== 'production' || process.env.FORCE_GENERATE === 'true';
        if (allowDestructive) {
            await db.delete(questTemplates);
            console.log('Cleared existing quest templates');
        } else {
            console.warn('Skipping destructive delete in production. Set FORCE_GENERATE=true to override.');
        }

        // Insert quest templates
        const insertedTemplates = [];
        for (const template of QUEST_TEMPLATES) {
            const [inserted] = await db
                .insert(questTemplates)
                .values({
                    title: template.title,
                    description: template.description,
                    setting: template.setting,
                    difficulty: template.difficulty
                })
                .returning();
            
            insertedTemplates.push(inserted);
            console.log(`Created quest template: "${template.title}"`);
        }

        console.log(`\nSuccessfully generated ${insertedTemplates.length} quest templates!`);
        console.log('\nContent Summary:');
        console.log(`- Quest Templates: ${insertedTemplates.length}`);
        console.log(`- Total Questions: ${QUEST_TEMPLATES.reduce((sum, t) => sum + t.questions.length, 0)}`);
        console.log(`- Settings: ${[...new Set(QUEST_TEMPLATES.map(t => t.setting))].join(', ')}`);
        console.log(`- Difficulties: ${[...new Set(QUEST_TEMPLATES.map(t => t.difficulty))].join(', ')}`);

        console.log('\nQuest system is ready! Users can now generate daily quests.');
        
    } catch (error) {
        console.error('❌ Error generating quest content:', error);
        process.exit(1);
    }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    generateQuestContent()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { generateQuestContent, QUEST_TEMPLATES };
