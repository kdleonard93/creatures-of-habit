import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendNotification } from '$lib/server/services/notificationService';

export const POST: RequestHandler = async (event) => {
    const { request, locals } = event;
    const authSession = await locals.auth();
    if (!authSession?.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, subject, message } = body;

    if (!type || !subject || !message) {
        return json(
            { error: 'Missing required fields: type, subject, message' },
            { status: 400 }
        );
    }

    if (!['email', 'push', 'reminder'].includes(type)) {
        return json(
            { error: 'Invalid type. Must be: email, push, or reminder' },
            { status: 400 }
        );
    }

    const result = await sendNotification(
        authSession.user.id,
        type,
        subject,
        message
    );

    if (result.sent) {
        return json({ success: true, message: 'Notification sent' });
    }
    
    return json(
        { success: false, reason: result.reason },
        { status: 400 }
    );
};