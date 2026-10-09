import { error, fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { contacts, userWaitlist } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

/**
 * Guarded admin review surface for contact and waitlist submissions.
 *
 * The route is intentionally absent from navigation and sitemaps. Anonymous
 * visitors and authenticated non-admins both receive a 404 so its existence is
 * not disclosed. See docs/reports/06-abuse.md P-5.
 */

/** Cap the list so a spam flood cannot turn the page into a memory load. */
const ADMIN_LIST_LIMIT = 100;

type SubmissionType = 'contact' | 'waitlist';
type ModerationAction = 'reviewed' | 'spam' | 'clear';

/**
 * Map a moderation action to the stored state. `clear` returns a submission to
 * the default `new`,` unflagged` state. Both tables default `status` to `new`.
 */
const MODERATION_STATE: Record<ModerationAction, { status: string; flagged: boolean }> = {
	reviewed: { status: 'reviewed', flagged: false },
	spam: { status: 'spam', flagged: true },
	clear: { status: 'new', flagged: false }
};

export const load: PageServerLoad = async ({ locals }) => {
	const auth = await locals.auth();
	// No confirmation for anonymous or non-admin callers that this route exists.
	if (!auth?.user?.isAdmin) {
		throw error(404, 'Not found');
	}

	const [contactRows, waitlistRows] = await Promise.all([
		db.select().from(contacts).orderBy(desc(contacts.createdAt)).limit(ADMIN_LIST_LIMIT),
		db
			.select()
			.from(userWaitlist)
			.orderBy(desc(userWaitlist.subscribedAt))
			.limit(ADMIN_LIST_LIMIT)
	]);

	return {
		contacts: contactRows,
		waitlist: waitlistRows
	};
};

export const actions = {
	update: async ({ request, locals }) => {
		// Re-check admin on every action for defence in depth.
		const auth = await locals.auth();
		if (!auth?.user?.isAdmin) {
			throw error(404, 'Not found');
		}

		const data = await request.formData();
		const type = String(data.get('type') ?? '');
		const id = String(data.get('id') ?? '');
		const action = String(data.get('action') ?? '');

		if (type !== 'contact' && type !== 'waitlist') {
			return fail(400, { error: 'Invalid submission type' });
		}
		if (!id) {
			return fail(400, { error: 'Missing submission id' });
		}
		if (action !== 'reviewed' && action !== 'spam' && action !== 'clear') {
			return fail(400, { error: 'Invalid moderation action' });
		}

		const state = MODERATION_STATE[action];

		if (type === 'contact') {
			await db.update(contacts).set(state).where(eq(contacts.id, id));
		} else {
			await db.update(userWaitlist).set(state).where(eq(userWaitlist.id, id));
		}

		return { success: true, type: type as SubmissionType, id, action };
	}
} satisfies Actions;
