import { describe, it, expect } from 'vitest';
import { db } from '../../src/lib/server/db';
import * as table from '../../src/lib/server/db/schema';
import { eq } from 'drizzle-orm';

describe('Database Schema', () => {
    it('can insert and retrieve a user', async () => {
        const testUser = {
            id: 'test-user-id',
            username: 'testuser',
            email: 'testuser@example.com',
            passwordHash: 'testpassword',
        };

        await db.insert(table.user).values(testUser);

        const [retrievedUser] = await db
            .select()
            .from(table.user)
            .where(eq(table.user.id, testUser.id));

        expect(retrievedUser).toBeDefined();
        expect(retrievedUser.username).toBe(testUser.username);
        expect(retrievedUser.email).toBe(testUser.email);
    });

    it('enforces unique constraints', async () => {
        const testUser = {
            id: 'duplicate-id',
            username: 'duplicateuser',
            email: 'duplicate@example.com',
            passwordHash: 'testpassword',
        };

        await db.insert(table.user).values(testUser);

        // Attempting to insert a user with the same ID should throw an error
        await expect(async () => {
            await db.insert(table.user).values(testUser);
        }).rejects.toThrow();
    });

    it('enforces foreign key constraints', async () => {
        const testSession = {
            id: 'test-session-id',
            userId: 'nonexistent-user-id', // This user does not exist
            expiresAt: new Date(),
        };

        // Attempting to insert a session with a non-existent user should throw an error
        await expect(async () => {
            await db.insert(table.session).values(testSession);
        }).rejects.toThrow();
    });
});
