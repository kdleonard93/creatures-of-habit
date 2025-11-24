import { json, type RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createEmailVerificationToken } from '$lib/server/auth';
import { sendVerificationEmail } from '$lib/server/services/emailVerificationService';
import { rateLimit } from '$lib/server/rateLimit';

export const POST = async (event: RequestEvent) => {
	await rateLimit(event, {
		maxRequests: 3,
		windowMs: 60 * 60 * 1000
	});
	
	const { email } = await event.request.json();
	
	if (!email) {
		return json({ success: false, error: 'Email is required' }, { status: 400 });
	}
	
	const [user] = await db
		.select()
		.from(schema.user)
		.where(eq(schema.user.email, email.toLowerCase()))
		.limit(1);
	

	if (!user) {
		return json({ success: true, message: 'If an account exists, verification email has been sent.' });
	}
	
	if (user.emailVerified) {
		return json({ success: true, message: 'Email already verified.' });
	}
	
	try {
		const token = await createEmailVerificationToken(user.id, user.email);
		await sendVerificationEmail(user.email, user.username, token);
	} catch (error) {
		console.error('Failed to resend verification email:', error);
	}
	
	return json({ 
		success: true, 
		message: 'If an account exists, verification email has been sent.' 
	});
};