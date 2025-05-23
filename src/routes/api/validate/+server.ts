// src/routes/api/validate/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

// Rate limiting implementation
const rateLimiter = {
  ipRequests: new Map<string, { count: number, timestamp: number }>(),
  lastCleanup: Date.now(),
  
  isRateLimited(ip: string): boolean {
    const now = Date.now();
    
    // Cleanup expired entries every 5 minutes to prevent memory leaks
    if (now - this.lastCleanup > 300000) {
      this.cleanup(now);
      this.lastCleanup = now;
    }
    
    const requestInfo = this.ipRequests.get(ip);
    
    if (!requestInfo || now - requestInfo.timestamp > 60000) {
      this.ipRequests.set(ip, { count: 1, timestamp: now });
      return false;
    }
    
    if (requestInfo.count > 10) {
      return true;
    }
    
    this.ipRequests.set(ip, { 
      count: requestInfo.count + 1, 
      timestamp: requestInfo.timestamp 
    });
    
    return false;
  },
  
  cleanup(now: number): void {
    // Remove entries older than 1 hour
    const expiryTime = now - 3600000;
    for (const [ip, data] of this.ipRequests.entries()) {
      if (data.timestamp < expiryTime) {
        this.ipRequests.delete(ip);
      }
    }
  }
};

// Input validation functions
function isValidEmail(email: string): boolean {
  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return email.length <= 255 && emailRegex.test(email);
}

function isValidUsername(username: string): boolean {
  // Alphanumeric with underscores and hyphens, 3-30 characters
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
}

function isValidCreatureName(name: string): boolean {
  // Allow letters, numbers, spaces, and some special characters, 2-50 characters
  const creatureNameRegex = /^[a-zA-Z0-9 '.,-]{2,50}$/;
  return creatureNameRegex.test(name);
}

function sanitizeInput(input: string): string {
  // Basic sanitization to prevent injection attacks
  return input
    .trim()
    .replace(/[<>]/g, ''); // Remove potential HTML/XML tags
}

export const GET = async (event: RequestEvent) => {
  try {
    const clientIp = event.getClientAddress();
    
    if (rateLimiter.isRateLimited(clientIp)) {
      return json({
        available: false,
        error: 'Too many requests. Please try again later.'
      }, { status: 429 });
    }
    
    const type = event.url.searchParams.get('type');
    let value = event.url.searchParams.get('value');
    
    if (!type || !value) {
      return json({
        available: false,
        error: 'Both type and value parameters are required'
      }, { status: 400 });
    }
    
    // Sanitize input
    value = sanitizeInput(value);
    
    // Validate input based on type
    let isValid = false;
    switch (type) {
      case 'email':
        isValid = isValidEmail(value);
        break;
      case 'username':
        isValid = isValidUsername(value);
        break;
      case 'creature_name':
        isValid = isValidCreatureName(value);
        break;
      default:
        return json({
          available: false,
          error: 'Invalid validation type'
        }, { status: 400 });
    }
    
    if (!isValid) {
      return json({
        available: false,
        error: `Invalid ${type} format`
      }, { status: 400 });
    }

    // Random delay to prevent timing attacks
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Validate based on type
    switch (type) {
      case 'email':
        return await checkEmailAvailability(value);
      case 'username':
        return await checkUsernameAvailability(value);
      case 'creature_name':
        return await checkCreatureNameAvailability(value);
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

// Helper function to ensure consistent timing
async function ensureMinimumProcessingTime(startTime: number, minimumMs: number): Promise<void> {
  const elapsedTime = Date.now() - startTime;
  if (elapsedTime < minimumMs) {
    await new Promise(resolve => setTimeout(resolve, minimumMs - elapsedTime));
  }
}

// Type-safe functions for each validation type
async function checkEmailAvailability(email: string): Promise<Response> {
  try {
    const startTime = Date.now();
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.user)
      .where(eq(schema.user.email, email));
    
    const exists = result[0].count > 0;
    
    await ensureMinimumProcessingTime(startTime, 200);
    
    return json({ available: !exists });
  } catch (error) {
    console.error('Error checking email availability:', error);
    return json({ available: false });
  }
}

async function checkUsernameAvailability(username: string): Promise<Response> {
  try {
    const startTime = Date.now();
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.user)
      .where(eq(schema.user.username, username));
    
    const exists = result[0].count > 0;
    
    await ensureMinimumProcessingTime(startTime, 200);
    
    return json({ available: !exists });
  } catch (error) {
    console.error('Error checking username availability:', error);
    return json({ available: false });
  }
}

async function checkCreatureNameAvailability(name: string): Promise<Response> {
  try {
    const startTime = Date.now();
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.creature)
      .where(eq(schema.creature.name, name));
    
    const exists = result[0].count > 0;
    
    await ensureMinimumProcessingTime(startTime, 200);
    
    return json({ available: !exists });
  } catch (error) {
    console.error('Error checking creature name availability:', error);
    return json({ available: false });
  }
}
