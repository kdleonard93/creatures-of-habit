import { fail, redirect, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { 
	validateEmailVerificationToken, 
	markEmailAsVerified,
	invalidateEmailVerificationToken 
} from '$lib/server/auth';
import { sendWelcomeEmail } from '$lib/server/services/emailVerificationService';


export const load: PageServerLoad = async ({ params }) => {
	const token = params.token;
	
	const result = await validateEmailVerificationToken(token);
	
	if (!result) {
		throw error(400, {
			message: 'Invalid or expired verification link. Please request a new verification email.'
		});
	}
	
	const { user, tokenId } = result;
	
	await markEmailAsVerified(user.id);
	
	await invalidateEmailVerificationToken(tokenId);
	
	try {
		await sendWelcomeEmail(user.email, user.username);
	} catch (error) {
		console.error('Failed to send welcome email:', error);
	}
	
	return {
		success: true,
		username: user.username,
		email: user.email
	};
};