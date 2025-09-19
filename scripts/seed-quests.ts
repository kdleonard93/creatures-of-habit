#!/usr/bin/env tsx

/**
 * Script to seed quest templates into the database
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/lib/server/db/schema';

// Use the same database as drizzle config
const dbUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!dbUrl || !authToken) {
    console.error('Missing database configuration. Please set:');
    console.error('  TURSO_DATABASE_URL');
    console.error('  TURSO_AUTH_TOKEN');
    process.exit(1);
}

const client = createClient({ url: dbUrl, authToken });
const db = drizzle(client, { schema });

const { questTemplates } = schema;

const templates: Array<{
    title: string;
    description: string;
    setting: string;
    difficulty: 'easy' | 'medium' | 'hard';
}> = [
    {
        title: 'The Mysterious Forest',
        description: 'Navigate through an enchanted forest filled with magical creatures and ancient puzzles.',
        setting: 'forest',
        difficulty: 'easy'
    },
    {
        title: 'The Forgotten Dungeon',
        description: 'Explore a dark dungeon filled with traps, treasures, and dangerous monsters.',
        setting: 'dungeon',
        difficulty: 'medium'
    },
    {
        title: 'The City of Shadows',
        description: 'Uncover the dark secrets hidden within the sprawling city streets.',
        setting: 'city',
        difficulty: 'hard'
    },
    {
        title: 'The Crystal Cave',
        description: 'Venture deep into crystal caverns where light and shadow play tricks on your senses.',
        setting: 'cave',
        difficulty: 'medium'
    },
    {
        title: 'The Ancient Library',
        description: 'Search for lost knowledge in a vast library filled with puzzles and riddles.',
        setting: 'library',
        difficulty: 'easy'
    },
    {
        title: 'The Abandoned Temple',
        description: 'Discover the mysteries of an ancient temple lost to time.',
        setting: 'temple',
        difficulty: 'hard'
    },
    {
        title: 'The Merchant\'s Road',
        description: 'Navigate the dangers and opportunities along a bustling trade route.',
        setting: 'road',
        difficulty: 'easy'
    },
    {
        title: 'The Haunted Manor',
        description: 'Investigate strange occurrences in an old manor with a dark history.',
        setting: 'manor',
        difficulty: 'medium'
    },
    {
        title: 'The Sky Pirates',
        description: 'Join or fight against pirates sailing through the clouds.',
        setting: 'airship',
        difficulty: 'hard'
    },
    {
        title: 'The Underground Market',
        description: 'Navigate the complex social dynamics of an illegal marketplace.',
        setting: 'market',
        difficulty: 'medium'
    }
];

async function seedQuestTemplates(): Promise<void> {
    try {
        console.log('Seeding quest templates...');
        await db.insert(questTemplates).values(templates);
        console.log(`Seeded ${templates.length} quest templates successfully!`);
    } catch (error: any) {
        if (error.code === 'SQLITE_ERROR' && error.message?.includes('no such table')) {
            console.error('Database tables not found!');
            console.error('Run: pnpm db:push');
        } else if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            console.log('Quest templates already exist, skipping seed.');
        } else {
            console.error('Error seeding quest templates:', error);
            process.exit(1);
        }
    }
}

// Run the seeding
seedQuestTemplates().then(() => {
    console.log('Quest seeding complete!');
    process.exit(0);
}).catch((err) => {
    console.error('Failed to seed quests:', err);
    process.exit(1);
});
