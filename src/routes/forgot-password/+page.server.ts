import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { Resend } from "resend";
import * as auth from '$lib/server/auth';
import { rateLimit, RateLimitPresets } from '$lib/server/rateLimit';
import { buildPasswordResetUrl } from '$lib/utils/url';
import { escapeHtml } from '$lib/utils/html';

const resendToken = process.env.RESEND_API_KEY;
let resend: Resend | null = null;
if (resendToken) {
  resend = new Resend(resendToken);
}

export const actions = {
  default: async (event) => {
    await rateLimit(event, RateLimitPresets.PASSWORD_RESET);

    const formData = await event.request.formData();
    const username = formData.get('username') as string | null;

    if (!username) {
      return fail(400, { message: 'Username is required' });
    }

    const [user] = await db
      .select()
      .from(table.user)
      .where(eq(table.user.username, username))
      .limit(1);

    if (!user) {
      return { success: true };
    }

    const token = await auth.createPasswordResetToken(user.id);
    
    const resetLink = buildPasswordResetUrl(token);
    if (resend) {
      try {
        const safeUsername = escapeHtml(user.username);
        await resend.emails.send({
          from: 'Creatures of Habit <onboarding@resend.dev>',
          to: user.email,
          subject: 'Password Reset - Creatures of Habit',
          html: `
            <h2>Password Reset</h2>
            <p>Hello ${safeUsername},</p>
            <p>You requested a password reset for your Creatures of Habit account.</p>
            <p><strong>Security Notice:</strong> If you did not request this password reset, please ignore this email and consider changing your password immediately.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <p><strong>Important:</strong> This link will expire in 1 hour for your security.</p>
            <p>Link: ${resetLink}</p>
          `
        });
      } catch (error) {
        console.error('Failed to send password reset email:', error);
        return {success: true}
      }
    } else {
      console.info('Email sending skipped - Resend API key not configured');
      return {success: true}
    }

    return { success: true };
  }
} satisfies Actions;
