import type { NotificationCategory, NotificationBackend } from '$lib/types';
import { escapeHtml } from '$lib/utils/html';

export class ApiNotificationBackend implements NotificationBackend {
    async sendEmail(subject: string, message: string, category?: NotificationCategory): Promise<void> {
        if (typeof window === 'undefined') return;

        try {
            const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel: 'email',
                    category,
                    subject,
                    message: `<h2>${escapeHtml(subject)}</h2><p>${escapeHtml(message)}</p>`
                })
            });
            if (!res.ok) {
                throw new Error('Failed to send email notification');
            }
        } catch (error) {
            console.error('Failed to send email notification:', error);
            // We re-throw or handle based on app needs, for now just logging as per original
        }
    }
}
