import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../lib/server/db';
import * as table from '../../lib/server/db/schema';
import { eq } from 'drizzle-orm';

describe('Database Schema', () => {
    beforeAll(async () => {
        // Clean up in correct order
        await db.delete(table.session).execute();
        await db.delete(table.user).execute();
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

        // Check all users in database
        const allUsers = await db.select().from(table.user);
        console.log('All users:', allUsers);

        // Use select instead of query
        const retrievedUser = await db
            .select()
            .from(table.user)
            .where(eq(table.user.id, insertedUser.id))
            .then(rows => rows[0]);

        console.log('Retrieved user:', retrievedUser);
        console.log('Using ID:', insertedUser.id);

        expect(retrievedUser).toBeDefined();
        expect(retrievedUser?.username).toBe(testUser.username);
        expect(retrievedUser?.email).toBe(testUser.email);
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

        // Attempting to insert the same user should fail
        await expect(() =>
            db.insert(table.user).values(testUser)
        ).rejects.toThrow(/UNIQUE constraint failed/);
    });

    it('enforces foreign key constraints', async () => {
        const testSession = {
            id: 'test-session-id',
            userId: crypto.randomUUID(),
            expiresAt: new Date()
        };

        await expect(() =>
            db.insert(table.session).values(testSession)
        ).rejects.toThrow(/FOREIGN KEY constraint failed/);
    });
});