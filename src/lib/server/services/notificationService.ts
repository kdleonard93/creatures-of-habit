import { db } from '$lib/server/db';
import { user, userPreferences } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import type { NotificationChannel, NotificationCategory } from '$lib/types';

const resendToken = process.env.RESEND_API_KEY;
let resend: Resend | null = null;
if (resendToken) {
    resend = new Resend(resendToken);
}

export type NotificationType = NotificationChannel;

export interface NotificationResult {
    sent: boolean;
    reason?: string;
}


/**
 * Send a notification to a user, respecting their preferences
 * 
 * @param userId - The user's ID
 * @param channel - Delivery channel for notification (email, push, sms, in-app)
 * @param subject - Email subject line
 * @param message - Email message content (HTML supported)
 * @param category - Category of notification (reminder, achievement, system, quest)
 * @returns Result indicating if notification was sent
 */

export async function sendNotification(
    userId: string,
    channel: NotificationChannel,
    subject: string,
    message: string,
    category?: NotificationCategory
): Promise<NotificationResult> {
    const userData = await db.query.user.findFirst({
        where: eq(user.id, userId)
    });

    if (!userData) {
        return { sent: false, reason: 'User not found' };
    }

    if (!userData.email) {
        return { sent: false, reason: 'User has no email' };
    }

    const preferences = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId)
    });

    const isEnabled = checkNotificationEnabled(preferences, channel, category);
    
    if (!isEnabled) {
        return { sent: false, reason: 'Notification disabled by user preferences' };
    }

    switch (channel) {
        case 'email':
            if (!userData.email) {
                return { sent: false, reason: 'User has no email' };
            }
            return await sendEmail(userData.email, subject, message);
        case 'push':
            return { sent: false, reason: 'Push notifications not yet implemented' };
        case 'in-app':
            return { sent: true, reason: 'In-app notification handled by client' };
        default:
            return { sent: false, reason: 'Unknown notification channel' };
    }

}

/**
 * Check if a notification type is enabled for the user
 */
function checkNotificationEnabled(
    preferences: typeof userPreferences.$inferSelect | undefined,
    channel: NotificationChannel,
    category?: NotificationCategory
): boolean {
    if (!preferences) {
        return category === 'reminder' && channel === 'email';
    }
    let channelEnabled = false;
    switch (channel) {
        case 'email':
            channelEnabled = preferences.emailNotifications === 1;
            break;
        case 'push':
            channelEnabled = preferences.pushNotifications === 1;
            break;
        case 'in-app':
            channelEnabled = preferences.inAppNotifications === 1;
            break;
    }

    if (!channelEnabled) {
        return false;
    }

    if (category === 'reminder') {
        return preferences.reminderNotifications === 1;
    }

    return true;
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
