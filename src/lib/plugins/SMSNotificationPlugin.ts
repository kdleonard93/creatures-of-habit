import type { Notifications } from '$lib/types';
import type { NotificationPlugin } from '$lib/notifications/NotificationManager';

export class SMSNotificationPlugin implements NotificationPlugin {
    send(notification: Notifications): void {
        console.info(`Sending SMS: ${notification.message}`);
    }
}
