import type { NotificationCategory, NotificationBackend } from '$lib/types';

export class ApiNotificationBackend implements NotificationBackend {
    async sendEmail(subject: string, message: string, category?: NotificationCategory): Promise<void> {
        if (typeof window === 'undefined') return;

        try {
            // Extract habit title from the message for styled email template
            // Message format: "Time to complete your habit: {habitTitle}"
            const habitTitleMatch = message.match(/Time to complete your habit: (.+)/);
            const habitTitle = habitTitleMatch ? habitTitleMatch[1] : message;

            const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel: 'email',
                    category,
                    subject,
                    message,
                    habitTitle
                })
            });
            if (!res.ok) {
                throw new Error('Failed to send email notification');
            }
        } catch (error) {
            console.error('Failed to send email notification:', error);
            throw error;
        }
    }
}
