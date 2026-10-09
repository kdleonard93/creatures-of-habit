import type { RequestEvent } from '@sveltejs/kit';

export interface RequestEventOptions {
	method?: string;
	/** Path or full URL. Defaults to `/`. */
	url?: string;
	params?: Record<string, string>;
	/** JSON body. Sets the content type automatically. */
	body?: unknown;
	/** Form body. Takes precedence over `body`. */
	formData?: FormData;
	user?: {
		id: string;
		username?: string;
		email?: string;
		emailVerified?: boolean;
		isAdmin?: boolean;
		timezone?: string | null;
	} | null;
	session?: unknown;
	cookies?: Record<string, string>;
	clientAddress?: string;
	headers?: Record<string, string>;
	locals?: Record<string, unknown>;
}

export interface TestRequestEvent extends RequestEvent {
	/** Headers the handler set via `event.setHeaders`. */
	capturedHeaders: Headers;
}

/**
 * Build a RequestEvent for calling a SvelteKit handler directly.
 *
 * `locals.auth()` resolves to the provided user/session, and the client
 * address and headers are available to the rate limiter.
 */
export function createRequestEvent(options: RequestEventOptions = {}): TestRequestEvent {
	const url = new URL(options.url ?? '/', 'http://localhost:5175');
	const method = (options.method ?? 'GET').toUpperCase();

	const headers = new Headers(options.headers ?? {});
	let request: Request;
	if (options.formData) {
		request = new Request(url, { method, body: options.formData });
	} else if (options.body !== undefined) {
		headers.set('content-type', 'application/json');
		request = new Request(url, { method, headers, body: JSON.stringify(options.body) });
	} else {
		request = new Request(url, { method, headers });
	}

	const cookieMap = new Map(Object.entries(options.cookies ?? {}));
	const cookies = {
		get: (name: string) => cookieMap.get(name),
		set: (name: string, value: string) => {
			cookieMap.set(name, value);
		},
		delete: (name: string) => {
			cookieMap.delete(name);
		},
		getAll: () =>
			[...cookieMap.entries()].map(([name, value]) => ({
				name,
				value
			})),
		serialize: () => ''
	};

	const user = options.user ?? null;
	const session = options.session ?? null;
	const capturedHeaders = new Headers();

	const event = {
		url,
		params: options.params ?? {},
		request,
		cookies,
		locals: {
			user,
			session,
			nonce: 'test-nonce',
			auth: async () => (user ? { user, session } : null),
			...options.locals
		},
		getClientAddress: () => options.clientAddress ?? '127.0.0.1',
		setHeaders: (values: Record<string, string>) => {
			for (const [key, value] of Object.entries(values)) {
				capturedHeaders.set(key, value);
			}
		},
		fetch: globalThis.fetch,
		route: { id: url.pathname },
		isDataRequest: false,
		isSubRequest: false,
		platform: undefined,
		capturedHeaders
	} as unknown as TestRequestEvent;

	return event;
}
