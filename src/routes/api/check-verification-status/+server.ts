import { json, type RequestEvent } from '@sveltejs/kit';

export const GET = async (event: RequestEvent) => {
	const authResult = await event.locals.auth();
	
	if (!authResult || !authResult.user) {
		return json({ verified: false, authenticated: false });
	}
	
	return json({ 
		verified: authResult.user.emailVerified,
		authenticated: true
	});
};
