import { toast } from 'svelte-sonner';
import type { ActionResult } from '@sveltejs/kit';

/**
 * Show a toast for a thrown action error, for example a 429 rate limit. The
 * rate-limit message includes the retry window, so users see how long to wait.
 * Safe to call for any action result; it only acts on `error`.
 */
export function toastActionError(
	result: ActionResult,
	fallback = 'Something went wrong. Please try again.'
): void {
	if (result.type !== 'error') return;
	toast.error(result.error?.message || fallback, { duration: 6000 });
}
