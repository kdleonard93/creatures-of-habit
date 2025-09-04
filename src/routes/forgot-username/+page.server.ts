import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { Resend } from "resend";
import { rateLimit, RateLimitPresets } from '$lib/server/rateLimit';

const resendToken = process.env.RESEND_API_KEY;
let resend: Resend | null = null;
if (resendToken) {
  resend = new Resend(resendToken);
}

export const actions = {
  default: async (event) => {
    // Apply rate limiting for username recovery requests
    await rateLimit(event, RateLimitPresets.PASSWORD_RESET);

    const formData = await event.request.formData();
    const email = formData.get('email') as string | null;

    if (!email) {
      return fail(400, { message: 'Email is required' });
    }
    // Sanitize email
    const sanitizedEmail = email.trim().toLowerCase();
    if (!sanitizedEmail) {
      return fail(400, { message: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return fail(400, { message: 'Please enter a valid email address' });
    }

    // Find user by email
    const [user] = await db
      .select()
      .from(table.user)
      .where(eq(table.user.email, email))
      .limit(1);

    if (!user) {
      // Don't reveal if email doesn't exist
      return { success: true };
    }

    // Send email with username
    if (resend) {
      try {
        await resend.emails.send({
          from: 'Creatures of Habit <onboarding@resend.dev>',
          to: sanitizedEmail,
          subject: 'Your Username - Creatures of Habit',
          html: `
            <h2>Your Username</h2>
            <p>Hello,</p>
            <p>Your username for Creatures of Habit is: <strong>${user.username}</strong></p>
            <p><strong>Security Notice:</strong> If you did not request this information, someone may be trying to access your account. Please secure your account immediately.</p>
            <p>If you didn't request this information, you can safely ignore this email.</p>
            <p>Thank you for using Creatures of Habit!</p>
          `
        });
      } catch (error) {
        console.error('Failed to send username email:', error);
        return fail(500, { message: 'Failed to send email. Please try again later.' });
      }
    } else {
      console.info('Email sending skipped - Resend API key not configured');
      return fail(500, { message: 'Email service not configured. Please contact support.' });
    }

    return { success: true };
  }
} satisfies Actions;
