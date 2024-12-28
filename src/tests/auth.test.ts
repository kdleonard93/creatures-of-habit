import { describe, it, expect, beforeAll } from 'vitest';
import { generateSessionToken, validateSessionToken, createSession } from '../lib/server/auth';
import { db } from '../lib/server/db';
import * as table from '../lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeHexLowerCase } from '@oslojs/encoding';

describe('Auth Utilities', () => {
    beforeAll(async () => {
        // Clean up in correct order
        await db.delete(table.session).execute();
        await db.delete(table.user).execute();
    });

    it('generates a valid session token', () => {
        const token = generateSessionToken();
        expect(token).toMatch(/^[a-z2-7]{32}$/);
    });

    it('creates a session in the database', async () => {
        // First create a test user
        const uniqueUsername = `sessiontestuser_${Date.now()}`;
        const [testUser] = await db.insert(table.user).values({
            username: uniqueUsername,
            email: `${uniqueUsername}@example.com`,
            passwordHash: 'testpass',
            age: 25
        }).returning();

        console.log('Created test user:', testUser);

        // Create session
        const token = generateSessionToken();
        console.log('Generated token:', token);

        await createSession(token, testUser.id);

        // Get session ID
        const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
        console.log('Session ID:', sessionId);

        // Check all sessions for debugging
        const allSessions = await db.select().from(table.session);
        console.log('All sessions:', allSessions);

        // Find specific session
        const dbSession = await db
            .select()
            .from(table.session)
            .where(eq(table.session.id, sessionId))
            .then(rows => rows[0]);

        console.log('Retrieved session:', dbSession);

        expect(dbSession).toBeDefined();
        expect(dbSession?.userId).toBe(testUser.id);
        expect(dbSession?.id).toBe(sessionId);
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
        expect(result.user?.id).toBe(testUser.id);
    });
});