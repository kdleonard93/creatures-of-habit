import { get } from 'svelte/store';
import type { Notifications, NotificationChannel, NotificationCategory } from '$lib/types';
import { notifications } from './NotificationStore';

// Notification Plugin Interface
export interface NotificationPlugin {
    send(notification: Notifications): void;
}

export class NotificationManager {
    private timeouts: Map<string, number> = new Map();
    private plugins: NotificationPlugin[] = [];
    private permission: NotificationPermission = 'default';

    constructor() {
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
    
    
    public escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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

        // Send email notification via API if channel is email
        if (channel === 'email' && typeof window !== 'undefined') {
            try {
                const res = await fetch('/api/notifications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        channel: 'email',
                        category,
                        subject,
                        message: `<h2>${this.escapeHtml(subject)}</h2><p>${this.escapeHtml(message)}</p>`
                    })
                });
                if (!res.ok) {
                    throw new Error('Failed to send email notification');
                }
            } catch (error) {
                console.error('Failed to send email notification:', error);
            }
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