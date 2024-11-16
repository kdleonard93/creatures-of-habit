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
        const token = generateSessionToken();
        const userId = 'test-user-id';

        const session = await createSession(token, userId);
        const [dbSession] = await db
            .select()
            .from(table.session)
            .where(eq(table.session.id, session.id));

        expect(dbSession).toBeDefined();
        expect(dbSession.userId).toBe(userId);
    });

    it('validates an active session token', async () => {
        const token = generateSessionToken();
        const userId = 'test-user-id';

        await createSession(token, userId);
        const { session, user } = await validateSessionToken(token);

        expect(session).not.toBeNull();
        expect(user).not.toBeNull();
        expect(user.id).toBe(userId);
    });
});
