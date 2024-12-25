import { describe, it, expect } from 'vitest';
import { generateSessionToken, validateSessionToken, createSession } from '../lib/server/auth';
import { db } from '../lib/server/db';
import * as table from '../lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Generic Test
describe('Auth Utilities', () => {
    it('generates a valid session token', () => {
        const token = generateSessionToken();
        expect(token).toMatch(/^[a-z2-7]{32}$/); 
    });

    it('creates a session in the database', async () => {

        const [testUser] = await db.insert(table.user).values({
            username: 'sessiontestuser',
            email: 'sessiontest@example.com',
            passwordHash: 'testpass',
            age: 25
        }).returning();

        const token = generateSessionToken();
        const session = await createSession(token, testUser.id);

        const [dbSession] = await db
            .select()
            .from(table.session)
            .where(eq(table.session.id, session.id));

        expect(dbSession).toBeDefined();
        expect(dbSession.userId).toBe(testUser.id);
    });

    it('validates an active session token', async () => {

        const [testUser] = await db.insert(table.user).values({
            username: 'validationtestuser',
            email: 'validationtest@example.com',
            passwordHash: 'testpass',
            age: 25
        }).returning();

        const token = generateSessionToken();
        await createSession(token, testUser.id);
        const result = await validateSessionToken(token);

        expect(result.session).not.toBeNull();
        expect(result.user).not.toBeNull();
        if (result.user) {
            expect(result.user.id).toBe(testUser.id);
        } else {
            throw new Error('User should not be null');
        }
    });
});
