import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { 
	validateEmailVerificationToken, 
	markEmailAsVerified,
	invalidateEmailVerificationToken 
} from '$lib/server/auth';
import { sendWelcomeEmail } from '$lib/server/services/emailVerificationService';


export const load: PageServerLoad = async ({ params }) => {
	const token = params.token;
	
	let result: Awaited<ReturnType<typeof validateEmailVerificationToken>>;
	try {
		result = await validateEmailVerificationToken(token);
	} catch (err) {
		console.error('Error validating email verification token:', err);
		throw error(500, {
			message: 'An error occurred while verifying your email. Please try again.'
		});
	}
	
	if (!result) {
		throw error(400, {
			message: 'Invalid or expired verification link. Please request a new verification email.'
		});
	}
	
	const { user, tokenId } = result;
	
	try {
		await markEmailAsVerified(user.id);
		await invalidateEmailVerificationToken(tokenId);
	} catch (err) {
		console.error('Error marking email as verified:', err);
		throw error(500, {
			message: 'An error occurred while verifying your email. Please try again.'
		});
	}
	
	// Send welcome email in the background (non-blocking)
	void sendWelcomeEmail(user.email, user.username).catch((err) => {
		console.error('Failed to send welcome email:', err);
	});
	
	return {
		success: true,
		username: user.username,
		email: user.email
	};
};