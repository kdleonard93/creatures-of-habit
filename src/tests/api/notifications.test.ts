import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../routes/api/notifications/+server';
import type { RequestEvent } from '@sveltejs/kit';

// Mock the notification service
vi.mock('$lib/server/services/notificationService', () => ({
    sendNotification: vi.fn()
}));

// Mock the email verification service (for habit reminder emails)
vi.mock('$lib/server/services/emailVerificationService', () => ({
    sendHabitReminderEmail: vi.fn()
}));

// Mock the database
vi.mock('$lib/server/db', () => ({
    db: {
        query: {
            user: {
                findFirst: vi.fn()
            }
        }
    }
}));

import { sendNotification } from '../../lib/server/services/notificationService';
import { sendHabitReminderEmail } from '../../lib/server/services/emailVerificationService';
import { db } from '../../lib/server/db';

describe('POST /api/notifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return 401 when not authenticated', async () => {
        const mockEvent = {
            request: new Request('http://localhost/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'email', subject: 'Test', message: 'Test' })
            }),
            locals: {
                auth: vi.fn().mockResolvedValue(null)
            }
        } as unknown as RequestEvent;

        const response = await POST(mockEvent);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should return 400 when channel/type is missing', async () => {
        const mockEvent = {
            request: new Request('http://localhost/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject: 'Test', message: 'Test' }) // Missing channel/type
            }),
            locals: {
                auth: vi.fn().mockResolvedValue({ user: { id: 'user-1' }, session: {} })
            }
        } as unknown as RequestEvent;

        const response = await POST(mockEvent);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Missing required field');
    });

    it('should return 400 when subject is missing', async () => {
        const mockEvent = {
            request: new Request('http://localhost/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'email', message: 'Test' }) // Missing subject
            }),
            locals: {
                auth: vi.fn().mockResolvedValue({ user: { id: 'user-1' }, session: {} })
            }
        } as unknown as RequestEvent;

        const response = await POST(mockEvent);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 when message is missing', async () => {
        const mockEvent = {
            request: new Request('http://localhost/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'email', subject: 'Test' }) // Missing message
            }),
            locals: {
                auth: vi.fn().mockResolvedValue({ user: { id: 'user-1' }, session: {} })
            }
        } as unknown as RequestEvent;

        const response = await POST(mockEvent);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 when channel is invalid', async () => {
        const mockEvent = {
            request: new Request('http://localhost/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel: 'invalid', subject: 'Test', message: 'Test' })
            }),
            locals: {
                auth: vi.fn().mockResolvedValue({ user: { id: 'user-1' }, session: {} })
            }
        } as unknown as RequestEvent;

        const response = await POST(mockEvent);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Invalid channel');
    });

    it('should return success when notification is sent (legacy type param)', async () => {
        vi.mocked(sendNotification).mockResolvedValue({ sent: true });

        const mockEvent = {
            request: new Request('http://localhost/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'email', subject: 'Test', message: 'Test Message' })
            }),
            locals: {
                auth: vi.fn().mockResolvedValue({ user: { id: 'user-1' }, session: {} })
            }
        } as unknown as RequestEvent;

        const response = await POST(mockEvent);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ success: true, message: 'Notification sent' });
        expect(sendNotification).toHaveBeenCalledWith('user-1', 'email', 'Test', 'Test Message', undefined);
    });

    it('should return success with new channel + category API', async () => {
        // Reminder emails now use sendHabitReminderEmail with styled template
        vi.mocked(db.query.user.findFirst).mockResolvedValue({
            id: 'user-1',
            email: 'test@example.com',
            username: 'testuser'
        } as never);
        vi.mocked(sendHabitReminderEmail).mockResolvedValue({ success: true });

        const mockEvent = {
            request: new Request('http://localhost/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    channel: 'email', 
                    category: 'reminder',
                    subject: 'Habit Reminder', 
                    message: 'Time to complete your habit!' 
                })
            }),
            locals: {
                auth: vi.fn().mockResolvedValue({ user: { id: 'user-1' }, session: {} })
            }
        } as unknown as RequestEvent;

        const response = await POST(mockEvent);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ success: true, message: 'Notification sent' });
        expect(sendHabitReminderEmail).toHaveBeenCalledWith('test@example.com', 'testuser', 'Time to complete your habit!');
    });

    it('should map legacy reminder type to email channel with reminder category', async () => {
        // Reminder emails now use sendHabitReminderEmail with styled template
        vi.mocked(db.query.user.findFirst).mockResolvedValue({
            id: 'user-1',
            email: 'test@example.com',
            username: 'testuser'
        } as never);
        vi.mocked(sendHabitReminderEmail).mockResolvedValue({ success: true });

        const mockEvent = {
            request: new Request('http://localhost/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'reminder', subject: 'Reminder', message: 'Test' })
            }),
            locals: {
                auth: vi.fn().mockResolvedValue({ user: { id: 'user-1' }, session: {} })
            }
        } as unknown as RequestEvent;

        const response = await POST(mockEvent);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(sendHabitReminderEmail).toHaveBeenCalledWith('test@example.com', 'testuser', 'Test');
    });

    it('should return 400 when notification fails to send', async () => {
        vi.mocked(sendNotification).mockResolvedValue({ 
            sent: false, 
            reason: 'Notification type disabled by user' 
        });

        const mockEvent = {
            request: new Request('http://localhost/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'email', subject: 'Test', message: 'Test Message' })
            }),
            locals: {
                auth: vi.fn().mockResolvedValue({ user: { id: 'user-1' }, session: {} })
            }
        } as unknown as RequestEvent;

        const response = await POST(mockEvent);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toEqual({ 
            success: false, 
            reason: 'Notification type disabled by user' 
        });
    });
});