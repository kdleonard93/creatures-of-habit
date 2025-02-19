import type { Notifications } from '$lib/types';
import type { NotificationPlugin } from '$lib/notifications/NotificationManager';

export class EmailNotificationPlugin implements NotificationPlugin {
    send(notification: Notifications): void {
        console.log(`Sending email: ${notification.message}`);
    }
}
