import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '../../lib/server/db';
import * as table from '../../lib/server/db/schema';
import { eq } from 'drizzle-orm';

describe('Database Schema', () => {
    async function cleanupDatabase() {
        // First delete tables that have foreign key dependencies
        await db.delete(table.session).execute();
        // Then delete the main tables
        await db.delete(table.user).execute();
    }

    beforeAll(async () => {
        await cleanupDatabase();
    });

    beforeEach(async () => {
        await cleanupDatabase();
    });

    it('can insert and retrieve a user', async () => {
        const uniqueUsername = `testuser_${Date.now()}`;
        const testUser = {
            username: uniqueUsername,
            email: `${uniqueUsername}@example.com`,
            passwordHash: 'testpassword',
            age: 25
        };

        console.log('About to insert user:', testUser);

        const [insertedUser] = await db.insert(table.user)
            .values(testUser)
            .returning();

        console.log('Inserted user:', insertedUser);

        // Check if user exists in database immediately after insert
        const allUsers = await db.select().from(table.user);
        console.log('All users in database:', allUsers);

        // Try to retrieve the specific user
        const [retrievedUser] = await db
            .select()
            .from(table.user)
            .where(eq(table.user.id, insertedUser.id));

        console.log('Retrieved user:', retrievedUser);
        console.log('Using ID:', insertedUser.id);

        expect(retrievedUser).toBeDefined();
        expect(retrievedUser.username).toBe(testUser.username);
        expect(retrievedUser.email).toBe(testUser.email);
    });

    it('enforces unique constraints', async () => {
        const uniqueUsername = `duplicateuser_${Date.now()}`;
        const testUser = {
            username: uniqueUsername,
            email: `${uniqueUsername}@example.com`,
            passwordHash: 'testpassword',
            age: 25
        };

        await db.insert(table.user).values(testUser);

        // Attempting to insert a user with the same email should throw an error
        await expect(async () => {
            await db.insert(table.user).values({
                ...testUser,
                username: `${uniqueUsername}_2`
            });
        }).rejects.toThrow();
    });

    it('enforces foreign key constraints', async () => {
        const testSession = {
            id: 'test-session-id',
            userId: crypto.randomUUID(),
            expiresAt: new Date(),
        };

        // Attempting to insert a session with a non-existent user should throw an error
        await expect(async () => {
            await db.insert(table.session).values(testSession);
        }).rejects.toThrow();
    });
});