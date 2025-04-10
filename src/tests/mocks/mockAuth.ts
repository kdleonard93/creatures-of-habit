// Mock auth implementations for testing
import { encodeBase32LowerCase, encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';

// Define types locally to avoid database dependencies
interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  age: number;
  createdAt: string;
}

const DAY_IN_MS = 1000 * 60 * 60 * 24;

// Mock session data
export const mockSessions: Record<string, Session> = {
  'session-1': {
    id: 'session-1',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + DAY_IN_MS * 30)
  },
  'session-2': {
    id: 'session-2',
    userId: 'user-2',
    expiresAt: new Date(Date.now() + DAY_IN_MS * 15)
  }
};

// Mock user data
export const mockUsers: Record<string, User> = {
  'user-1': {
    id: 'user-1',
    username: 'testuser1',
    email: 'testuser1@example.com',
    passwordHash: 'hashedpassword1',
    age: 25,
    createdAt: new Date().toISOString()
  },
  'user-2': {
    id: 'user-2',
    username: 'testuser2',
    email: 'testuser2@example.com',
    passwordHash: 'hashedpassword2',
    age: 30,
    createdAt: new Date().toISOString()
  }
};

// Mock auth functions
export function generateSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const token = encodeBase32LowerCase(bytes);
  return token;
}

export async function createSession(token: string, userId: string) {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const session: Session = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + DAY_IN_MS * 30)
  };
  mockSessions[sessionId] = session;
  return session;
}

export async function validateSessionToken(token: string) {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const session = mockSessions[sessionId];
  
  if (!session) {
    return { session: null, user: null };
  }
  
  const user = mockUsers[session.userId];
  if (!user) {
    return { session: null, user: null };
  }
  
  // Check if session is expired
  const sessionExpired = Date.now() >= session.expiresAt.getTime();
  if (sessionExpired) {
    delete mockSessions[sessionId];
    return { session: null, user: null };
  }
  
  // Renew session if close to expiration
  const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
  if (renewSession) {
    session.expiresAt = new Date(Date.now() + DAY_IN_MS * 30);
  }
  
  return { 
    session, 
    user: { 
      id: user.id, 
      username: user.username 
    } 
  };
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSession(sessionId: string): Promise<void> {
  delete mockSessions[sessionId];
}
