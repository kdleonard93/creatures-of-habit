// src/routes/api/validate/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET = async (event: RequestEvent) => {
  try {
    const type = event.url.searchParams.get('type');
    const value = event.url.searchParams.get('value');
    
    if (!type || !value) {
      return json({
        available: false,
        error: 'Both type and value parameters are required'
      }, { status: 400 });
    }

    // Validate based on type
    switch (type) {
      case 'email':
        return await checkEmail(value);
      case 'username':
        return await checkUsername(value);
      case 'creature_name':
        return await checkCreatureName(value);
      default:
        return json({
          available: false,
          error: 'Invalid validation type'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Validation error:', error);
    return json(
      { 
        available: false, 
        error: 'An unexpected error occurred during validation.' 
      }, 
      { status: 500 }
    );
  }
};

async function checkEmail(email: string): Promise<Response> {
  // Check if email already exists
  const existingUser = await db.select()
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);

  return json({
    available: existingUser.length === 0
  });
}

async function checkUsername(username: string): Promise<Response> {
  // Check if username already exists
  const existingUser = await db.select()
    .from(schema.user)
    .where(eq(schema.user.username, username))
    .limit(1);

  return json({
    available: existingUser.length === 0
  });
}

async function checkCreatureName(name: string): Promise<Response> {
  // Check if creature name already exists
  const existingCreature = await db.select()
    .from(schema.creature)
    .where(eq(schema.creature.name, name))
    .limit(1);

  return json({
    available: existingCreature.length === 0
  });
}
