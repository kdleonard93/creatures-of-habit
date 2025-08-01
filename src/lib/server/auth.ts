import type { RequestEvent } from '@sveltejs/kit';
import { eq, lt } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase32LowerCase, encodeHexLowerCase } from '@oslojs/encoding';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const sessionCookieName = 'auth-session';

export function generateSessionToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(20));
	const token = encodeBase32LowerCase(bytes);
	return token;
}

export async function createSession(token: string, userId: string, dbInstance = db) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: table.Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + DAY_IN_MS * 30)
	};
	await dbInstance.insert(table.session).values(session);
	return session;
}

export async function validateSessionToken(token: string, dbInstance = db) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const [result] = await dbInstance
		.select({
			// Adjust user table here to tweak returned data
			user: { id: table.user.id, username: table.user.username },
			session: table.session
		})
		.from(table.session)
		.innerJoin(table.user, eq(table.session.userId, table.user.id))
		.where(eq(table.session.id, sessionId));

	if (!result) {
		return { session: null, user: null };
	}
	const { session, user } = result;

	// Check if session is expired
	const sessionExpired = Date.now() >= session.expiresAt.getTime();
	if (sessionExpired) {
		await dbInstance.delete(table.session).where(eq(table.session.id, session.id));
		return { session: null, user: null };
	}
	// Renew session if close to expiration
	const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
	if (renewSession) {
		session.expiresAt = new Date(Date.now() - DAY_IN_MS * 15);
		await dbInstance
			.update(table.session)
			.set({ expiresAt: session.expiresAt })
			.where(eq(table.session.id, session.id));
	}

	return { session, user };
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSession(sessionId: string, dbInstance = db): Promise<void> {
	await dbInstance.delete(table.session).where(eq(table.session.id, sessionId));
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date): void {
	event.cookies.set(sessionCookieName, token, {
		httpOnly: true,
		sameSite: "lax",
		expires: expiresAt,
		path: '/'
	});
}

export function deleteSessionTokenCookie(event: RequestEvent): void {
	event.cookies.delete(sessionCookieName, {
		httpOnly: true,
		sameSite: "lax",
		maxAge: 0,
		path: '/'
	});
}

// Password Reset Functions
const HOUR_IN_MS = 1000 * 60 * 60;

export async function createPasswordResetToken(userId: string, dbInstance = db) {
	// Delete any existing tokens for this user
	await dbInstance.delete(table.passwordResetToken).where(eq(table.passwordResetToken.userId, userId));
	
	// Create new token
	const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
	const token = encodeHexLowerCase(tokenBytes);
	const tokenId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	
	const expiresAt = new Date(Date.now() + HOUR_IN_MS);
	
	await dbInstance.insert(table.passwordResetToken).values({
		id: tokenId,
		userId,
		expiresAt
	});
	
	return token;
}

export async function validatePasswordResetToken(token: string, dbInstance = db) {
	const tokenId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	
	const [result] = await dbInstance
		.select({
			user: table.user,
			token: table.passwordResetToken
		})
		.from(table.passwordResetToken)
		.innerJoin(table.user, eq(table.passwordResetToken.userId, table.user.id))
		.where(eq(table.passwordResetToken.id, tokenId));
	
	if (!result) {
		return null;
	}
	
	const { user, token: resetToken } = result;
	
	// Check if token is expired
	const tokenExpired = Date.now() >= resetToken.expiresAt.getTime();
	if (tokenExpired) {
		await dbInstance.delete(table.passwordResetToken).where(eq(table.passwordResetToken.id, resetToken.id));
		return null;
	}
	
	return { user, tokenId: resetToken.id };
}

export async function invalidatePasswordResetToken(tokenId: string, dbInstance = db) {
	await dbInstance.delete(table.passwordResetToken).where(eq(table.passwordResetToken.id, tokenId));
}

export async function cleanupExpiredTokens(dbInstance = db) {
	const now = new Date();
	await dbInstance.delete(table.passwordResetToken)
		.where(lt(table.passwordResetToken.expiresAt, now));
}
