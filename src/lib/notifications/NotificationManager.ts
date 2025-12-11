import { get } from 'svelte/store';
import type { Notifications, NotificationChannel, NotificationCategory, NotificationBackend } from '$lib/types';
import { notifications } from './NotificationStore';
import { ApiNotificationBackend } from './ApiNotificationBackend';

// Notification Plugin Interface
export interface NotificationPlugin {
    send(notification: Notifications): void;
}

export class NotificationManager {
    private timeouts: Map<string, number> = new Map();
    private plugins: NotificationPlugin[] = [];
    private permission: NotificationPermission = 'default';
    private backend: NotificationBackend;

    constructor(backend: NotificationBackend = new ApiNotificationBackend()) {
        this.backend = backend;
        this.requestPermission();
    }

    private async requestPermission(): Promise<void> {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission !== 'granted') {
                this.permission = await Notification.requestPermission();
            } else {
                this.permission = 'granted';
            }
        }
    }

    private isPermissionGranted(): boolean {
        return this.permission === 'granted';
    }

    public registerPlugin(plugin: NotificationPlugin): void {
        this.plugins.push(plugin);
    }

    public async scheduleNotification(
        id: string, 
        message: string, 
        channel: NotificationChannel, 
        subject: string,
        delay: number,
        category?: NotificationCategory
    ): Promise<void> {
        // Clear existing timeout for this ID if it exists
        this.clearNotification(id);

        // Schedule the notification
        const timeoutId = setTimeout(() => {
            this.showNotification(id, message, channel, subject, category);
        }, delay);

        // Store the timeout ID
        this.timeouts.set(id, Number(timeoutId));
    }

    public async showNotification(
        id: string, 
        message: string, 
        channel: NotificationChannel, 
        subject: string,
        category?: NotificationCategory
    ): Promise<void> {
        const notification: Notifications = {
            id,
            message,
            type: channel, // using type as an alias for channel
            subject,
            timestamp: new Date(),
            category
        };

        // Send email notification via backend if channel is email
        if (channel === 'email') {
            await this.backend.sendEmail(subject, message, category);
        }

        // Show browser notification if permission granted
        if (this.isPermissionGranted() && channel !== 'in-app' && typeof window !== 'undefined' && 'Notification' in window) {
            const browserNotification = new Notification(message, {
                icon: '/favicon.png'
            });
            browserNotification.onclick = () => {
                window.focus();
                browserNotification.close();
            };
            notification.browserNotification = browserNotification;
        }

        // Add to the notifications store
        notifications.update(n => [...n, notification]);

        // Send to plugins
        for (const plugin of this.plugins) {
            plugin.send(notification);
        }
    }

    public clearNotification(id: string): void {
        const timeoutId = this.timeouts.get(id);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.timeouts.delete(id);
        }

        // Remove from notifications store
        notifications.update(n => n.filter(notification => {
            if (notification.id === id && notification.browserNotification) {
                notification.browserNotification.close();
            }
            return notification.id !== id;
        }));
    }

    public clearAllNotifications(): void {
        // Clear all timeouts
        for (const timeoutId of this.timeouts.values()) {
            clearTimeout(timeoutId);
        }
        this.timeouts.clear();

        // Close all browser notifications
        const currentNotifications = get(notifications);
        for (const notification of currentNotifications) {
            if (notification.browserNotification) {
                notification.browserNotification.close();
            }
        }

        // Clear the notifications store
        notifications.set([]);
    }

    public getNotifications(): Notifications[] {
        return get(notifications);
    }
}

// Create a singleton instance to use throughout the app
export const notificationManager = new NotificationManager();