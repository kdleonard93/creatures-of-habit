import { fail, redirect, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import * as auth from '$lib/server/auth';
import { hashPassword } from '$lib/utils/password';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  // Validate token on page load
  const token = params.token;
  if (!token) {
    throw error(400, 'Reset token is required');
  }
  const result = await auth.validatePasswordResetToken(token);

  if (!result) {
    throw error(400, 'Invalid or expired token. Please request a new password reset link.');
  }

  return {
    token
  };
};

export const actions = {
  default: async ({ request, params }) => {
    const formData = await request.formData();
    const password = formData.get('password') as string | null;
    const confirmPassword = formData.get('confirmPassword') as string | null;
    
    if (!password || !confirmPassword) {
      return fail(400, { message: 'All fields are required' });
    }
    
    if (password.length < 8) {
      return fail(400, { message: 'Password must be at least 8 characters long' });
    }
    
    if (password !== confirmPassword) {
      return fail(400, { message: "Passwords don't match" });
    }
    
    // Get token from URL params and validate it
    const token = params.token;
    if (!token) {
      return fail(400, { message: 'Reset token is required' });
    }
    
    const tokenValidation = await auth.validatePasswordResetToken(token);
    if (!tokenValidation) {
      return fail(400, { message: 'Invalid or expired token' });
    }
    
    const { user, tokenId } = tokenValidation;
    
    try {
      // Hash new password
      const passwordHash = await hashPassword(password);
      
      await db.transaction(async (tx) => {
        await tx.update(table.user)
          .set({ passwordHash })
          .where(eq(table.user.id, user.id));
        await tx.delete(table.session).where(eq(table.session.userId, user.id));
      });
      await auth.invalidatePasswordResetToken(tokenId);
    } catch (error) {
      console.error('Password reset error:', error);
      return fail(500, { message: 'An error occurred. Please try again.' });
    }
    
    return redirect(302, '/login');
  }
} satisfies Actions;
