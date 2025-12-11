import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationManager } from '../../lib/notifications/NotificationManager';
import { EmailNotificationPlugin } from '../../lib/plugins/EmailNotificationPlugin';
import { get } from 'svelte/store';
import { notifications } from '../../lib/notifications/NotificationStore';
import { NotificationBackend, NotificationCategory, NotificationChannel } from '../../lib/types';

// Mock the browser Notification API
class MockNotification {
    static permission = 'granted';
    static requestPermission = vi.fn().mockResolvedValue('granted');
    
    constructor(public title: string, public options?: string) {}
    
    close = vi.fn();
    onclick = null;
}

global.Notification = MockNotification as never;

// Mock setTimeout and clearTimeout
vi.useFakeTimers();
class MockNotificationBackend implements NotificationBackend {
    async sendEmail(subject: string, message: string, category?: NotificationCategory): Promise<void> {
        return Promise.resolve();
    }
}

describe('NotificationManager', () => {
    let notificationManager: NotificationManager;
    const getStoreNotifications = () => get(notifications);
    const showTestNotification = (
        id: string,
        message: string,
        channel: NotificationChannel = 'in-app',
        subject = 'Test Notification'
    ) => notificationManager.showNotification(id, message, channel, subject);
    
    beforeEach(() => {
        // Reset notification store before each test
        notifications.set([]);
        
        notificationManager = new NotificationManager(new MockNotificationBackend());
    });
    
    afterEach(() => {
        vi.clearAllTimers();
        vi.restoreAllMocks();
    });
    
    it('should show an immediate notification', async () => {
        // Show notification
        await showTestNotification('test-1', 'Test message');
        
        // Check if added to store
        const notificationsValue = getStoreNotifications();
        expect(notificationsValue.length).toBe(1);
        expect(notificationsValue[0].message).toBe('Test message');
        expect(notificationsValue[0].type).toBe('in-app');
    });
    
    it('should schedule a delayed notification', async () => {
        // Schedule notification
        await notificationManager.scheduleNotification('test-2', 'Delayed message', 'in-app', 'Delayed Notification', 5000);
        
        // Should not be in store yet
        expect(getStoreNotifications().length).toBe(0);
        
        // Advance time
        vi.advanceTimersByTime(5000);
        
        // Now should be in store
        const notificationsValue = getStoreNotifications();
        expect(notificationsValue.length).toBe(1);
        expect(notificationsValue[0].message).toBe('Delayed message');
    });
    
    it('should clear a specific notification', async () => {
        // Add two notifications
        await showTestNotification('test-3', 'Message 1');
        await showTestNotification('test-4', 'Message 2');
        
        // Should have 2 notifications
        expect(getStoreNotifications().length).toBe(2);
        
        // Clear one
        await notificationManager.clearNotification('test-3');
        
        // Should have 1 left
        const notificationsValue = getStoreNotifications();
        expect(notificationsValue.length).toBe(1);
        expect(notificationsValue[0].id).toBe('test-4');
    });
    
    it('should clear all notifications', async () => {
        // Add multiple notifications
        await showTestNotification('test-5', 'Message 1');
        await showTestNotification('test-6', 'Message 2');
        
        // Should have 2 notifications
        expect(getStoreNotifications().length).toBe(2);
        
        // Clear all
        await notificationManager.clearAllNotifications();
        
        // Should have none
        expect(getStoreNotifications().length).toBe(0);
    });
    
    it('should work with plugins', async () => {
        // Create mock plugin
        const emailPlugin = new EmailNotificationPlugin();
        
        // Spy on plugin method
        const emailSpy = vi.spyOn(emailPlugin, 'send');
        
        // Register plugin
        notificationManager.registerPlugin(emailPlugin);
        
        // Show notifications
        await showTestNotification('test-7', 'Email Plugin Test', 'email', 'Email Plugin Test');
        await showTestNotification('test-8', 'In-App Test', 'in-app', 'In-App Test');
        
        // Plugin should be called for both notifications
        expect(emailSpy).toHaveBeenCalledTimes(2);
        expect(emailSpy).toHaveBeenCalledWith(expect.objectContaining({
            id: 'test-7',
            message: 'Email Plugin Test',
            type: 'email'
        }));
        expect(emailSpy).toHaveBeenCalledWith(expect.objectContaining({
            id: 'test-8',
            message: 'In-App Test',
            type: 'in-app'
        }));
    });
});