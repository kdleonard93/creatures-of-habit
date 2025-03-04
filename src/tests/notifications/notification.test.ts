import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationManager } from '../../lib/notifications/NotificationManager';
import { EmailNotificationPlugin } from '../../lib/plugins/EmailNotificationPlugin';
import { SMSNotificationPlugin } from '../../lib/plugins/SMSNotificationPlugin';
import { get } from 'svelte/store';
import { notifications } from '../../lib/notifications/NotificationStore';

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

describe('NotificationManager', () => {
    let notificationManager: NotificationManager;
    
    beforeEach(() => {
        // Reset notification store before each test
        notifications.set([]);
        
        // Create a new instance for each test
        notificationManager = new NotificationManager();
    });
    
    afterEach(() => {
        vi.clearAllTimers();
    });
    
    it('should show an immediate notification', () => {
        // Show notification
        notificationManager.showNotification('test-1', 'Test message', 'in-app');
        
        // Check if added to store
        const notificationsValue = get(notifications);
        expect(notificationsValue.length).toBe(1);
        expect(notificationsValue[0].message).toBe('Test message');
        expect(notificationsValue[0].type).toBe('in-app');
    });
    
    it('should schedule a delayed notification', () => {
        // Schedule notification
        notificationManager.scheduleNotification('test-2', 'Delayed message', 'in-app', 5000);
        
        // Should not be in store yet
        expect(get(notifications).length).toBe(0);
        
        // Advance time
        vi.advanceTimersByTime(5000);
        
        // Now should be in store
        const notificationsValue = get(notifications);
        expect(notificationsValue.length).toBe(1);
        expect(notificationsValue[0].message).toBe('Delayed message');
    });
    
    it('should clear a specific notification', () => {
        // Add two notifications
        notificationManager.showNotification('test-3', 'Message 1', 'in-app');
        notificationManager.showNotification('test-4', 'Message 2', 'in-app');
        
        // Should have 2 notifications
        expect(get(notifications).length).toBe(2);
        
        // Clear one
        notificationManager.clearNotification('test-3');
        
        // Should have 1 left
        const notificationsValue = get(notifications);
        expect(notificationsValue.length).toBe(1);
        expect(notificationsValue[0].id).toBe('test-4');
    });
    
    it('should clear all notifications', () => {
        // Add multiple notifications
        notificationManager.showNotification('test-5', 'Message 1', 'in-app');
        notificationManager.showNotification('test-6', 'Message 2', 'in-app');
        
        // Should have 2 notifications
        expect(get(notifications).length).toBe(2);
        
        // Clear all
        notificationManager.clearAllNotifications();
        
        // Should have none
        expect(get(notifications).length).toBe(0);
    });
    
    it('should work with plugins', () => {
        // Create mock plugins
        const emailPlugin = new EmailNotificationPlugin();
        const smsPlugin = new SMSNotificationPlugin();
        
        // Spy on plugin methods
        const emailSpy = vi.spyOn(emailPlugin, 'send');
        const smsSpy = vi.spyOn(smsPlugin, 'send');
        
        // Register plugins
        notificationManager.registerPlugin(emailPlugin);
        notificationManager.registerPlugin(smsPlugin);
        
        // Show notification
        notificationManager.showNotification('test-7', 'Email Plugin Test', 'email');
        notificationManager.showNotification('test-8', 'SMS Plugin Test', 'sms');
        
        // Plugins should be called
        expect(emailSpy).toHaveBeenCalledTimes(1);
        expect(emailSpy).toHaveBeenCalledWith(expect.objectContaining({
            id: 'test-7',
            message: 'Email Plugin',
            type: 'email'
        }));
        expect(smsSpy).toHaveBeenCalledTimes(1);
        expect(smsSpy).toHaveBeenCalledWith(expect.objectContaining({
            id: 'test-8',
            message: 'SMS Plugin',
            type: 'sms'
        }));
    });
});