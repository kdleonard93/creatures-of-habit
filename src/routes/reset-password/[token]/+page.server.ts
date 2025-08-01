import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import * as auth from '$lib/server/auth';
import { hashPassword } from '$lib/server/password';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  // Validate token on page load
  const token = params.token;
  const result = await auth.validatePasswordResetToken(token);
  
  if (!result) {
    return fail(400, { message: 'Invalid or expired token' });
  }
  
  return {};
};

export const actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const token = formData.get('token') as string | null;
    const password = formData.get('password') as string | null;
    const confirmPassword = formData.get('confirmPassword') as string | null;
    
    if (!token || !password || !confirmPassword) {
      return fail(400, { message: 'All fields are required' });
    }
    
    if (password.length < 8) {
      return fail(400, { message: 'Password must be at least 8 characters long' });
    }
    
    if (password !== confirmPassword) {
      return fail(400, { message: "Passwords don't match" });
    }
    
    // Validate token
    const tokenValidation = await auth.validatePasswordResetToken(token);
    if (!tokenValidation) {
      return fail(400, { message: 'Invalid or expired token' });
    }
    
    const { user, tokenId } = tokenValidation;
    
    try {
      // Hash new password
      const passwordHash = await hashPassword(password);
      
      // Update user password
      await db.update(table.user)
        .set({ passwordHash })
        .where(eq(table.user.id, user.id));
      
      // Delete all sessions for this user to log them out from all devices
      await db.delete(table.session).where(eq(table.session.userId, user.id));
      
      // Invalidate the reset token
      await auth.invalidatePasswordResetToken(tokenId);
      
      // Redirect to login
      return redirect(302, '/login');
    } catch (error) {
      console.error('Password reset error:', error);
      return fail(500, { message: 'An error occurred. Please try again.' });
    }
  }
} satisfies Actions;
