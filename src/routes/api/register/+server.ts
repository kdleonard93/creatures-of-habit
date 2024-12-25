import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { generateSessionToken, createSession, setSessionTokenCookie } from '$lib/server/auth';
import bcrypt from 'bcrypt';
import type { CreatureClassType, CreatureRaceType } from '$lib/types';

interface RegistrationData {
  email: string;
  username: string;
  password: string;
  age: number;
  creature: {
    name: string;
    class: CreatureClassType;
    race: CreatureRaceType;
  };
}

export const POST: RequestHandler = async (event) => {
  const data = await event.request.json() as RegistrationData;
  
  try {
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

    return json({ success: true, userId: newUser.id });
  } catch (error) {
    console.error('Registration error:', error);
    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed. Email or username may already exist.' 
      }, 
      { status: 400 }
    );
  }
};