import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendNotification, NotificationService } from '../../lib/server/services/notificationService';
import { db } from '../../lib/server/db';

// Mock the database
vi.mock('../../lib/server/db', () => ({
    db: {
        query: {
            user: {
                findFirst: vi.fn()
            },
            userPreferences: {
                findFirst: vi.fn()
            }
        }
    }
}));

// Mock Resend
vi.mock('resend', () => ({
    Resend: vi.fn().mockImplementation(() => ({
        emails: {
            send: vi.fn().mockResolvedValue({ id: 'test-email-id' })
        }
    }))
}));

describe('Notification Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('sendNotification', () => {
        it('should return false when user not found', async () => {
            // Mock: User doesn't exist
            vi.mocked(db.query.user.findFirst).mockResolvedValue(undefined);

            const result = await sendNotification('non-existent-user', 'email', 'Test', 'Test');

            expect(result.sent).toBe(false);
            expect(result.reason).toBe('User not found');
        });

        it('should not send email when user has disabled email notifications', async () => {
            // Mock: User exists
            vi.mocked(db.query.user.findFirst).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                username: 'testuser',
                passwordHash: 'hash',
                age: null,
                createdAt: new Date().toISOString()
            });

            // Mock: Email notifications disabled
            vi.mocked(db.query.userPreferences.findFirst).mockResolvedValue({
                id: 'pref-1',
                userId: 'user-1',
                emailNotifications: 0,
                pushNotifications: 0,
                inAppNotifications: 1,
                reminderNotifications: 1,
                profileVisibility: 0,
                activitySharing: 0,
                statsSharing: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            const result = await sendNotification('user-1', 'email', 'Test', 'Test');

            expect(result.sent).toBe(false);
            expect(result.reason).toBe('Notification disabled by user preferences');
        });

        it('should send email when user has enabled email notifications', async () => {
            // Mock: User exists
            vi.mocked(db.query.user.findFirst).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                username: 'testuser',
                passwordHash: 'hash',
                age: null,
                createdAt: new Date().toISOString(),
            });

            // Mock: Email notifications enabled
            vi.mocked(db.query.userPreferences.findFirst).mockResolvedValue({
                id: 'pref-1',
                userId: 'user-1',
                emailNotifications: 1, 
                pushNotifications: 0,
                inAppNotifications: 1,
                reminderNotifications: 1,
                profileVisibility: 0,
                activitySharing: 0,
                statsSharing: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            const result = await sendNotification('user-1', 'email', 'Test Subject', '<p>Test Message</p>');

            expect(result.sent).toBe(true);
            expect(result.reason).toBeUndefined();
        });

        it('should use default preferences when no preferences exist', async () => {
            // Mock: User exists
            vi.mocked(db.query.user.findFirst).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                username: 'testuser',
                passwordHash: 'hash',
                age: null,
                createdAt: new Date().toISOString(),
            });

            // Mock: No preferences exist
            vi.mocked(db.query.userPreferences.findFirst).mockResolvedValue(undefined);

            // All channels should be allowed by default (permissive fallback)
            const reminderResult = await sendNotification('user-1', 'email', 'Test', 'Test', 'reminder');
            expect(reminderResult.sent).toBe(true);

            const emailResult = await sendNotification('user-1', 'email', 'Test', 'Test');
            expect(emailResult.sent).toBe(true);

            const inAppResult = await sendNotification('user-1', 'in-app', 'Test', 'Test');
            expect(inAppResult.sent).toBe(true);
        });

        it('should return not implemented for push notifications', async () => {
            // Mock: User exists with push enabled
            vi.mocked(db.query.user.findFirst).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                username: 'testuser',
                passwordHash: 'hash',
                age: null,
                createdAt: new Date().toISOString(),
            });

            vi.mocked(db.query.userPreferences.findFirst).mockResolvedValue({
                id: 'pref-1',
                userId: 'user-1',
                emailNotifications: 0,
                pushNotifications: 1,
                inAppNotifications: 1,
                reminderNotifications: 1,
                profileVisibility: 0,
                activitySharing: 0,
                statsSharing: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            const result = await sendNotification('user-1', 'push', 'Test', 'Test');

            expect(result.sent).toBe(false);
            expect(result.reason).toBe('Push notifications not yet implemented');
        });

        it('escapes HTML in the message and sanitizes the subject', async () => {
            vi.mocked(db.query.user.findFirst).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                username: 'testuser',
                passwordHash: 'hash',
                age: null,
                createdAt: new Date().toISOString()
            });
            vi.mocked(db.query.userPreferences.findFirst).mockResolvedValue(undefined);

            const received: Array<{ subject: string; html: string }> = [];
            const provider = {
                sendEmail: vi.fn(async (options: { subject: string; html: string }) => {
                    received.push(options);
                    return { success: true };
                })
            };

            const service = new NotificationService(provider);
            const result = await service.sendNotification(
                'user-1',
                'email',
                'Reminder\r\nBcc: attacker@example.com',
                '<img src=x onerror=alert(1)>'
            );

            expect(result.sent).toBe(true);
            expect(received).toHaveLength(1);

            // The body is escaped, so markup cannot be injected into the email.
            expect(received[0].html).not.toContain('<img');
            expect(received[0].html).toContain('&lt;img');

            // Control characters cannot smuggle extra headers into the subject.
            expect(received[0].subject).not.toContain('\r');
            expect(received[0].subject).not.toContain('\n');
        });
    });
});