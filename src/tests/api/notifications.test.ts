import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../routes/api/notifications/+server';
import type { RequestEvent } from '@sveltejs/kit';

// Mock the notification service
vi.mock('$lib/server/services/notificationService', () => ({
    sendNotification: vi.fn()
}));

import { sendNotification } from '../../lib/server/services/notificationService';

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
        vi.mocked(sendNotification).mockResolvedValue({ sent: true });

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
        expect(sendNotification).toHaveBeenCalledWith('user-1', 'email', 'Habit Reminder', 'Time to complete your habit!', 'reminder');
    });

    it('should map legacy reminder type to email channel with reminder category', async () => {
        vi.mocked(sendNotification).mockResolvedValue({ sent: true });

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
        expect(sendNotification).toHaveBeenCalledWith('user-1', 'email', 'Reminder', 'Test', 'reminder');
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