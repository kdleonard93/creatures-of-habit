// src/routes/api/register/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { generateSessionToken, createSession, setSessionTokenCookie } from '$lib/server/auth';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import type { RegistrationData } from '$lib/types';

export const POST: RequestHandler = async (event) => {
  try {
    const data = await event.request.json() as RegistrationData;
    console.info('Received registration data:', { ...data, password: '[REDACTED]', confirmPassword: '[REDACTED]' });

    // Check if email already exists
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

    // Check if username already exists
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

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    // Create user
    const [newUser] = await db.insert(schema.user).values({
      email: data.email,
      username: data.username,
      age: data.age,
      passwordHash
    }).returning();

    // Create creature
    await db.insert(schema.creature).values({
      userId: newUser.id,
      name: data.creature.name,
      class: data.creature.class,
      race: data.creature.race
    });

    // Create session
    const sessionToken = generateSessionToken();
    const session = await createSession(sessionToken, newUser.id);
    
    // Set session cookie
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