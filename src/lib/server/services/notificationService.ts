import { db } from '$lib/server/db';
import { user, userPreferences } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';

const resendToken = process.env.RESEND_API_KEY;
let resend: Resend | null = null;
if (resendToken) {
    resend = new Resend(resendToken);
}

export type NotificationType = 'email' | 'push' | 'reminder';

export interface NotificationResult {
    sent: boolean;
    reason?: string;
}


/**
 * Send a notification to a user, respecting their preferences
 * 
 * @param userId - The user's ID
 * @param type - Type of notification (email, push, reminder)
 * @param subject - Email subject line
 * @param message - Email message content (HTML supported)
 * @returns Result indicating if notification was sent
 */

export async function sendNotification(
    userId: string,
    type: NotificationType,
    subject: string,
    message: string
): Promise<NotificationResult> {
    const userData = await db.query.user.findFirst({
        where: eq(user.id, userId)
    });

    if (!userData) {
        return { sent: false, reason: 'User not found' };
    }

    const preferences = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId)
    });

    const isEnabled = checkNotificationEnabled(preferences, type);
    
    if (!isEnabled) {
        return { sent: false, reason: 'Notification type disabled by user' };
    }


    if (type === 'email') {
        return await sendEmail(userData.email, subject, message);
    } 
    if (type === 'push') {
        return { sent: false, reason: 'Push notifications not yet implemented' };
    } 
    if (type === 'reminder') {
        return await sendEmail(userData.email, subject, message);
    }

    return { sent: false, reason: 'Unknown notification type' };
}

/**
 * Check if a notification type is enabled for the user
 */
function checkNotificationEnabled(
    preferences: typeof userPreferences.$inferSelect | undefined,
    type: NotificationType
): boolean {
    if (!preferences) {
        return type === 'reminder';
    }

    if (type === 'email') {
        return preferences.emailNotifications === 1;
    } 
    if (type === 'push') {
        return preferences.pushNotifications === 1;
    } 
    if (type === 'reminder') {
        return preferences.reminderNotifications === 1;
    }

    return false;
}

/**
 * Send an email via Resend
 */
async function sendEmail(
    to: string,
    subject: string,
    htmlContent: string
): Promise<NotificationResult> {
    if (!resend) {
        console.warn('Resend API key not configured - email not sent');
        return { sent: false, reason: 'Email service not configured' };
    }

    try {
        await resend.emails.send({
            from: 'Creatures of Habit <onboarding@resend.dev>',
            to,
            subject,
            html: htmlContent
        });

        return { sent: true };
    } catch (error) {
        console.error('Failed to send email:', error);
        return { sent: false, reason: 'Email sending failed' };
    }
}
