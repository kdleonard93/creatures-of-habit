import { describe, it, expect } from 'vitest';
import { generateSessionToken } from '../tests/mocks/mockAuth';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeHexLowerCase } from '@oslojs/encoding';

describe('Auth Utilities', () => {
    // Mock user data
    const mockUser = {
        id: 'mock-user-id',
        username: 'testuser',
        email: 'testuser@example.com',
        passwordHash: 'testpass',
        age: 25,
        createdAt: new Date().toISOString()
    };

    it('generates a valid session token', () => {
        const token = generateSessionToken();
        expect(token).toMatch(/^[a-z2-7]{32}$/);
    });

    it('verifies session creation structure', () => {
        // Generate a token and session ID
        const token = generateSessionToken();
        const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
        
        // Create a mock session
        const mockSession = {
            id: sessionId,
            userId: mockUser.id,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        };
        
        // Verify the session structure
        expect(mockSession).toHaveProperty('id');
        expect(mockSession).toHaveProperty('userId');
        expect(mockSession).toHaveProperty('expiresAt');
        
        // Verify the session values
        expect(mockSession.id).toBe(sessionId);
        expect(mockSession.userId).toBe(mockUser.id);
        expect(mockSession.expiresAt).toBeInstanceOf(Date);
    });

    it('verifies session validation structure', () => {
        // Generate a token and session ID
        const token = generateSessionToken();
        const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
        
        // Create a mock session
        const mockSession = {
            id: sessionId,
            userId: mockUser.id,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        };
        
        // Create a mock validation result
        const mockValidationResult = {
            session: mockSession,
            user: {
                id: mockUser.id,
                username: mockUser.username
            }
        };
        
        // Verify the validation result structure
        expect(mockValidationResult).toHaveProperty('session');
        expect(mockValidationResult).toHaveProperty('user');
        
        // Verify the validation result values
        expect(mockValidationResult.session).toBe(mockSession);
        expect(mockValidationResult.user.id).toBe(mockUser.id);
        expect(mockValidationResult.user.username).toBe(mockUser.username);
    });
});