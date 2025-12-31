import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendNotification } from '$lib/server/services/notificationService';
import { sendHabitReminderEmail } from '$lib/server/services/emailVerificationService';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { NotificationChannel, NotificationCategory } from '$lib/types';

export const POST: RequestHandler = async (event) => {
    const { request, locals } = event;
    const authSession = await locals.auth();
    if (!authSession?.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, channel, category, subject, message, habitTitle } = body;

    let notificationChannel: NotificationChannel;
    let notificationCategory: NotificationCategory | undefined;

    if (channel) {
        notificationChannel = channel;
        notificationCategory = category;
    } else if (type) {
        if (type === 'reminder') {
            notificationChannel = 'email';
            notificationCategory = 'reminder';
        } else {
            notificationChannel = type;
        }
    } else {
        return json(
            { error: 'Missing required field: channel (or legacy type)' },
            { status: 400 }
        );
    }

    if (!subject || !message) {
        return json(
            { error: 'Missing required fields: subject, message' },
            { status: 400 }
        );
    }

    const validChannels: NotificationChannel[] = ['email', 'push', 'in-app'];
    if (!validChannels.includes(notificationChannel)) {
        return json(
            { error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` },
            { status: 400 }
        );
    }

    // category === 'reminder' OR habitTitle provided OR message matches habit reminder pattern
    const isHabitReminder = notificationCategory === 'reminder' || 
                            habitTitle || 
                            message.includes('Time to complete your habit:');
    
    if (notificationChannel === 'email' && isHabitReminder) {
        const userData = await db.query.user.findFirst({
            where: eq(user.id, authSession.user.id)
        });

        if (!userData?.email) {
            return json({ success: false, reason: 'User email not found' }, { status: 400 });
        }

        const extractedHabitTitle = habitTitle || message.replace('Time to complete your habit: ', '');
        
        const result = await sendHabitReminderEmail(
            userData.email,
            userData.username,
            extractedHabitTitle
        );

        if (result.success) {
            return json({ success: true, message: 'Notification sent' });
        }
        
        return json(
            { success: false, reason: result.error || 'Failed to send email' },
            { status: 400 }
        );
    }

    const result = await sendNotification(
        authSession.user.id,
        notificationChannel,
        subject,
        message,
        notificationCategory
    );

    if (result.sent) {
        return json({ success: true, message: 'Notification sent' });
    }
    
    return json(
        { success: false, reason: result.reason },
        { status: 400 }
    );
};