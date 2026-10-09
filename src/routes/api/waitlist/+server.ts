import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { rateLimit, RateLimitPresets, getClientIP } from '$lib/server/rateLimit';
import { z } from 'zod';

/**
 * Server-side validation for waitlist submissions. `website` is the honeypot and
 * `renderedAt` is the optional client timestamp for a time-to-submit check.
 * See docs/reports/06-abuse.md P-2, P-4, P-6.
 */
const waitlistSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email('Please enter a valid email address')
        .max(254, 'Email is too long'),
    referralSource: z.string().trim().max(200, 'Referral source is too long').optional(),
    website: z.string().optional(),
    // Optional and tolerant: a missing or malformed timestamp is ignored rather
    // than rejected, because an unsigned client timestamp is advisory only.
    renderedAt: z.coerce.number().int().optional().catch(undefined),
});

/** Submissions faster than this are treated as automated and silently dropped. */
const MIN_SUBMIT_MS = 2000;

export const POST: RequestHandler = async (event) => {
    // Shared preset: 5 submissions per hour per client IP plus path.
    await rateLimit(event, RateLimitPresets.WAITLIST);

    try {
        const data = await event.request.json();
        const validatedData = waitlistSchema.parse(data);
        const email = validatedData.email;

        // Honeypot: a bot filled the hidden field. Pretend success, store nothing.
        if (validatedData.website) {
            return json({
                success: true,
                message: 'Thanks for joining the waitlist! We\'ll notify you when we launch.',
                redirectTo: '/waitlist/thank-you'
            });
        }

        // Time-to-submit: a bot posts instantly. Skip the store but stay quiet.
        if (
            validatedData.renderedAt !== undefined &&
            Date.now() - validatedData.renderedAt < MIN_SUBMIT_MS
        ) {
            return json({
                success: true,
                message: 'Thanks for joining the waitlist! We\'ll notify you when we launch.',
                redirectTo: '/waitlist/thank-you'
            });
        }

        console.info('Received waitlist submission:', { email: "REDACTED" });

        // Check if email already exists
        const existingEntry = await db.select()
            .from(schema.userWaitlist)
            .where(eq(schema.userWaitlist.email, email))
            .limit(1);
        if (existingEntry.length > 0) {
            // Email already exists - redirect to thank you page with already signed up flag
            return json({
                success: true,
                message: 'You\'re already on our waitlist! We\'ll notify you when we launch.',
                alreadySignedUp: true,
                redirectTo: '/waitlist/thank-you'
            });
        }

        // Derive the client IP with the trusted-proxy logic rather than storing
        // the attacker-controlled x-forwarded-for value directly.
        const ipAddress = getClientIP(event);
        const userAgent = (event.request.headers.get('user-agent') ?? 'unknown').slice(0, 300);
        const referralSource = (
            validatedData.referralSource ??
            event.request.headers.get('referer') ??
            'direct'
        ).slice(0, 200);

        // Add to waitlist
        const [waitlistEntry] = await db.insert(schema.userWaitlist).values({
            email,
            ipAddress,
            userAgent,
            referralSource,
            status: 'new',
        }).returning();

        console.info('Successfully added to waitlist:', { id: "REDACTED", email: "REDACTED" });

        return json({
            success: true,
            message: 'Thanks for joining the waitlist! We\'ll notify you when we launch.',
            entryId: waitlistEntry.id,
            redirectTo: '/waitlist/thank-you'
        });

    } catch (error) {
        console.error('Waitlist submission error:', error);

        if (error instanceof SyntaxError) {
            return json({
                success: false,
                error: 'Invalid request payload'
            }, { status: 400 });
        }

        if (error && typeof error === 'object' && 'issues' in error) {
            // Zod validation error
            const zodError = error as z.ZodError;
            return json({
                success: false,
                error: zodError.issues[0]?.message || 'Invalid email address'
            }, { status: 400 });
        }

        // Handle database unique constraint violations
        if (error && typeof error === 'object' && 'message' in error) {
            const message = String(error.message).toLowerCase();
            if (message.includes('unique') || message.includes('constraint')) {
                return json({
                    success: true,
                    message: 'You\'re already on our waitlist! We\'ll notify you when we launch.',
                    alreadySignedUp: true,
                    redirectTo: '/waitlist/thank-you'
                });
            }
        }

        return json({
            success: false,
            error: 'An unexpected error occurred. Please try again.'
        }, { status: 500 });
    }
};
