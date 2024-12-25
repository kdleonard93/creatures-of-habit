import { describe, it, expect } from 'vitest';
import { db } from '../../lib/server/db';
import * as table from '../../lib/server/db/schema';
import { eq } from 'drizzle-orm';

describe('Database Schema', () => {
    it('can insert and retrieve a user', async () => {
        const testUser = {
            username: 'testuser',
            email: 'testuser@example.com',
            passwordHash: 'testpassword',
            age: 25
        };

        const [insertedUser] = await db.insert(table.user).values(testUser).returning();

        const [retrievedUser] = await db
            .select()
            .from(table.user)
            .where(eq(table.user.id, insertedUser.id));

        expect(retrievedUser).toBeDefined();
        expect(retrievedUser.username).toBe(testUser.username);
        expect(retrievedUser.email).toBe(testUser.email);
    });

    it('enforces unique constraints', async () => {
        const testUser = {
            username: 'duplicateuser',
            email: 'duplicate@example.com',
            passwordHash: 'testpassword',
            age: 25
        };

        await db.insert(table.user).values(testUser);

        // Attempting to insert a user with the same ID should throw an error
        await expect(async () => {
            await db.insert(table.user).values({
                ...testUser,
                username: 'uniqueuser2'
            });
        }).rejects.toThrow();
    });


    it('enforces foreign key constraints', async () => {
        const testSession = {
            id: 'test-session-id',
            userId: crypto.randomUUID(), // This user does not exist
            expiresAt: new Date(),
        };

        // Attempting to insert a session with a non-existent user should throw an error
        await expect(async () => {
            await db.insert(table.session).values(testSession);
        }).rejects.toThrow();
    });
});
