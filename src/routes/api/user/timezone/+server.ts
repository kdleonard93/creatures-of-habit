import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '$lib/utils/logger';
import { rateLimit, RateLimitPresets } from '$lib/server/rateLimit';

/**
 * Persist the browser's IANA time zone so scheduling and the daily tracker use
 * the user's local day while storage stays UTC. See C-3.
 */
export const POST: RequestHandler = async (event) => {
	await rateLimit(event, RateLimitPresets.API);

	const session = await event.locals.auth();
	if (!session?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const timeZone = (body as { timezone?: unknown } | null)?.timezone;
	if (typeof timeZone !== 'string' || timeZone.length === 0) {
		return json({ error: 'A valid IANA timezone is required' }, { status: 400 });
	}

	// Reject anything Intl does not recognise as a zone. The constructor throws
	// a RangeError for an unknown zone.
	try {
		new Intl.DateTimeFormat('en-US', { timeZone });
	} catch {
		return json({ error: 'Invalid timezone' }, { status: 400 });
	}

	try {
		// Avoid a write on every page load: only update when the value changed.
		if (session.user.timezone !== timeZone) {
			await db.update(user).set({ timezone: timeZone }).where(eq(user.id, session.user.id));
		}

		return json({ success: true });
	} catch (error) {
		logger.error('Failed to update user timezone', {
			error: error instanceof Error ? error.message : String(error),
			userId: session.user.id
		});
		return json({ error: 'Failed to update timezone' }, { status: 500 });
	}
};
