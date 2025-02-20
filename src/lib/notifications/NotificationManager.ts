import { writable } from 'svelte/store';
import type { Notifications} from '$lib/types';

// Store for notifications
export const notifications = writable<Notifications[]>([]);

// Notification Plugin Interface
export interface NotificationPlugin {
    send(notification: Notifications): void;
}

export class NotificationManager {
    private notifications: Map<string, Notifications | number> = new Map();
    private plugins: NotificationPlugin[] = [];
    private permission: NotificationPermission = 'default';

    constructor() {
        this.requestPermission();
    }

    private async requestPermission(): Promise<void> {
        if (Notification.permission !== 'granted') {
            this.permission = await Notification.requestPermission();
        } else {
            this.permission = 'granted';
        }
    }

    private isPermissionGranted(): boolean {
        return this.permission === 'granted';
    }

    public registerPlugin(plugin: NotificationPlugin): void {
        this.plugins.push(plugin);
    }

    public scheduleNotification(notification: Notifications, time: number): void {
        if (!this.isPermissionGranted()) {
            console.warn('Notification permission not granted.');
            return;
        }

        this.clearNotification(notification.id);

        const timeoutId = setTimeout(() => {
            const browserNotification = new Notification(notification.message, {
                body: notification.message,
                icon: '/icons/notification.png',
            });

            this.notifications.set(notification.id, browserNotification);
            this.plugins.forEach(plugin => plugin.send(notification));
        }, time);

        this.notifications.set(notification.id, timeoutId as unknown as Notifications);
    }

    public clearNotification(id: string): void {
        const existingNotification = this.notifications.get(id);
        if (existingNotification) {
            if (existingNotification instanceof Notification) {
                existingNotification.close();
            } else {
                clearTimeout(existingNotification as unknown as number);
            }
            this.notifications.delete(id);
        }
    }

    public clearAllNotifications(): void {
        this.notifications.forEach((_, id) => this.clearNotification(id));
    }
}
