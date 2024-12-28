import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { generateSessionToken, validateSessionToken, createSession } from '../lib/server/auth';
import { db } from '../lib/server/db';
import * as table from '../lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeHexLowerCase } from '@oslojs/encoding';

describe('Auth Utilities', () => {
    // Clean up before all tests
    beforeAll(async () => {
        await db.delete(table.session);
        await db.delete(table.user);
    });

    // Clean up between tests
    beforeEach(async () => {
        await db.delete(table.session);
        await db.delete(table.user);
    });

    it('generates a valid session token', () => {
        const token = generateSessionToken();
        expect(token).toMatch(/^[a-z2-7]{32}$/); 
    });

    it('creates a session in the database', async () => {
        const uniqueUsername = `sessiontestuser_${Date.now()}`;
        const [testUser] = await db.insert(table.user).values({
            username: uniqueUsername,
            email: `${uniqueUsername}@example.com`,
            passwordHash: 'testpass',
            age: 25
        }).returning();

        const token = generateSessionToken();
        await createSession(token, testUser.id);
        
        // Generate the same session ID hash that createSession uses
        const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
        
        const [dbSession] = await db
            .select()
            .from(table.session)
            .where(eq(table.session.id, sessionId));

        expect(dbSession).toBeDefined();
        expect(dbSession.userId).toBe(testUser.id);
        expect(dbSession.id).toBe(sessionId);
    });

    it('validates an active session token', async () => {
        const uniqueUsername = `validationtestuser_${Date.now()}`;
        const [testUser] = await db.insert(table.user).values({
            username: uniqueUsername,
            email: `${uniqueUsername}@example.com`,
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