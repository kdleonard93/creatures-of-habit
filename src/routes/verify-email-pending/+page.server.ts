import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const authResult = await locals.auth();
	
	if (!authResult || !authResult.user) {
		throw redirect(302, '/login');
	}
	
	const { user } = authResult;
	
	// If already verified, redirect to dashboard
	if (user.emailVerified) {
		throw redirect(302, '/dashboard');
	}
	
	return {
		user: {
			email: user.email,
			username: user.username
		}
	};
};
