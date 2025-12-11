import { db } from '$lib/server/db';
import { user, userPreferences } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { NotificationChannel, NotificationCategory } from '$lib/types';
import type { EmailProvider } from '$lib/types';
import { ResendEmailProvider } from './email/ResendEmailProvider';

// Default configuration
const defaultEmailProvider = new ResendEmailProvider(process.env.RESEND_API_KEY);

export type NotificationType = NotificationChannel;

export interface NotificationResult {
    sent: boolean;
    reason?: string;
}

export class NotificationService {
    constructor(private emailProvider: EmailProvider) {}

    /**
     * Send a notification to a user, respecting their preferences
     */
    async sendNotification(
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
    
        const isEnabled = this.checkNotificationEnabled(preferences, channel, category);
        
        if (!isEnabled) {
            return { sent: false, reason: 'Notification disabled by user preferences' };
        }
    
        switch (channel) {
            case 'email':
                if (!userData.email) {
                    return { sent: false, reason: 'User has no email' };
                }
                return await this.sendEmail(userData.email, subject, message);
            case 'push':
                return { sent: false, reason: 'Push notifications not yet implemented' };
            case 'in-app':
                return { sent: true, reason: 'In-app notification handled by client' };
            default:
                return { sent: false, reason: 'Unknown notification channel' };
        }
    }

    private checkNotificationEnabled(
        preferences: typeof userPreferences.$inferSelect | undefined,
        channel: NotificationChannel,
        category?: NotificationCategory
    ): boolean {
        if (!preferences) {
            return true;
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

    private async sendEmail(
        to: string,
        subject: string,
        htmlContent: string
    ): Promise<NotificationResult> {
        const result = await this.emailProvider.sendEmail({
            from: 'Creatures of Habit <onboarding@resend.dev>',
            to,
            subject,
            html: htmlContent
        });

        if (result.success) {
            return { sent: true };
        }
        
        return { sent: false, reason: result.error || 'Email sending failed' };
    }
}

// Singleton for backward compatibility
export const notificationService = new NotificationService(defaultEmailProvider);
export const sendNotification = notificationService.sendNotification.bind(notificationService);

