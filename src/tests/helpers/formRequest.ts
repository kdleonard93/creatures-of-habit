import { createRequestEvent, type RequestEventOptions, type TestRequestEvent } from './requestEvent';

/**
 * Build a RequestEvent whose request body is readable by `request.formData()`.
 *
 * The shared `formData` option serialises a jsdom `FormData`. Under the jsdom
 * test environment Node's `Request` does not recognise that FormData, so the
 * body falls back to `text/plain` and `request.formData()` throws. Encoding the
 * fields as `application/x-www-form-urlencoded` is equivalent for these route
 * actions and round-trips through `request.formData()`.
 */
export function createFormRequestEvent(
	options: Omit<RequestEventOptions, 'formData'> & { fields: Record<string, string> }
): TestRequestEvent {
	const { fields, ...rest } = options;
	const method = rest.method ?? 'POST';
	const event = createRequestEvent({ ...rest, method });
	const body = new URLSearchParams(fields).toString();

	(event as { request: Request }).request = new Request(event.url, {
		method,
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body
	});

	return event;
}
