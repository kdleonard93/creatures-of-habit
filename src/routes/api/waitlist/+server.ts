import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { rateLimit } from '$lib/server/rateLimit';
import { z } from 'zod';

const waitlistSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    referralSource: z.string().optional(),
});

export const POST: RequestHandler = async (event) => {
    // Rate limit: 5 attempts per hour for waitlist submissions
    await rateLimit(event, {
         windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 5,
        message: 'Too many waitlist submissions. Please try again later.'
    });

    try {
        const data = await event.request.json();
        const validatedData = waitlistSchema.parse(data);

        console.info('Received waitlist submission:', { email: validatedData.email });

        // Check if email already exists
        const existingEntry = await db.select()
            .from(schema.userWaitlist)
            .where(eq(schema.userWaitlist.email, validatedData.email))
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

        // Get client information for analytics
        const ipAddress = event.request.headers.get('x-forwarded-for') || 'unknown';
        const userAgent = event.request.headers.get('user-agent') || 'unknown';
        const referralSource = validatedData.referralSource || event.request.headers.get('referer') || 'direct';

        // Add to waitlist
        const [waitlistEntry] = await db.insert(schema.userWaitlist).values({
            email: validatedData.email,
            ipAddress,
            userAgent,
            referralSource,
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
