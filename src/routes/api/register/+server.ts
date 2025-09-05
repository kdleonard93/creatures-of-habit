// src/routes/api/register/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { generateSessionToken, createSession, setSessionTokenCookie } from '$lib/server/auth';
import { eq } from 'drizzle-orm';
import { hashPassword } from '$lib/utils/password';
import { rateLimit, RateLimitPresets } from '$lib/server/rateLimit';
import type { RegistrationData } from '$lib/types';

export const POST: RequestHandler = async (event) => {
  try {
    await rateLimit(event, RateLimitPresets.AUTH);

    const data = await event.request.json() as RegistrationData;
    console.info('Received registration request', { email: data.email, username: data.username, password: '[REDACTED]', confirmPassword: '[REDACTED]' });

    if (!data.password || data.password.length < 8) {
      return json({ success: false, error: 'Password must be at least 8 characters long' }, { status: 400 });
    }
    if (data.password !== data.confirmPassword) {
      return json({ success: false, error: 'Passwords do not match' }, { status: 400 });
    }

    const existingUserByEmail = await db.select()
      .from(schema.user)
      .where(eq(schema.user.email, data.email))
      .limit(1);

    if (existingUserByEmail.length > 0) {
      return json({
        success: false,
        error: 'An account with this email already exists'
      }, { status: 400 });
    }

    const existingUserByUsername = await db.select()
      .from(schema.user)
      .where(eq(schema.user.username, data.username))
      .limit(1);

    if (existingUserByUsername.length > 0) {
      return json({
        success: false,
        error: 'This username is already taken'
      }, { status: 400 });
    }

    const passwordHash = await hashPassword(data.password);

    const [newUser] = await db.insert(schema.user).values({
      email: data.email,
      username: data.username,
      age: data.age,
      passwordHash
    }).returning();

    await db.insert(schema.creature).values({
      userId: newUser.id,
      name: data.creature.name,
      class: data.creature.class,
      race: data.creature.race
    });

    const sessionToken = generateSessionToken();
    const session = await createSession(sessionToken, newUser.id);
    
    setSessionTokenCookie(event, sessionToken, session.expiresAt);

    return json({ success: true, userId: newUser.id, redirectUrl: '/dashboard'  });
  } catch (error) {
    console.error('Registration error:', error);
    return json(
      { 
        success: false, 
        error: 'An unexpected error occurred during registration. Please try again.' 
      }, 
      { status: 500 }
    );
  }
};