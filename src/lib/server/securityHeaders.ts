import type { RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { isSecureRequest } from './auth';

export interface SecurityHeadersConfig {
	csp?: {
		defaultSrc?: string[];
		scriptSrc?: string[];
		styleSrc?: string[];
		imgSrc?: string[];
		fontSrc?: string[];
		connectSrc?: string[];
		frameSrc?: string[];
		objectSrc?: string[];
		mediaSrc?: string[];
		workerSrc?: string[];
		childSrc?: string[];
		formAction?: string[];
		frameAncestors?: string[];
		baseUri?: string[];
		manifestSrc?: string[];
	};
	hsts?: boolean;
	hstsMaxAge?: number;
	hstsIncludeSubDomains?: boolean;
	hstsPreload?: boolean;
	frameOptions?: 'DENY' | 'SAMEORIGIN' | string;
	contentTypeOptions?: boolean;
	crossOriginOpenerPolicy?: string;
	crossOriginResourcePolicy?: string;
	referrerPolicy?: string;
	permissionsPolicy?: Record<string, string[]>;
}

const defaultConfig: SecurityHeadersConfig = {
	csp: {
		defaultSrc: ["'self'"],
		scriptSrc: ["'self'", "https://us-assets.i.posthog.com", "https://assets.posthog.com"],
		styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
		imgSrc: ["'self'", "data:", "https:"],
		fontSrc: ["'self'", "https://fonts.gstatic.com"],
		connectSrc: ["'self'", "https://us.i.posthog.com", "https://api.posthog.com", "https://us-assets.i.posthog.com", "https://assets.posthog.com"],
		frameSrc: ["'none'"],
		objectSrc: ["'none'"],
		mediaSrc: ["'self'"],
		workerSrc: ["'self'"],
		childSrc: ["'self'"],
		formAction: ["'self'"],
		frameAncestors: ["'none'"],
		baseUri: ["'self'"],
		manifestSrc: ["'self'"]
	},
	hsts: true,
	hstsMaxAge: 31536000,
	hstsIncludeSubDomains: true,
	hstsPreload: true,
	frameOptions: 'DENY',
	contentTypeOptions: true,
	crossOriginOpenerPolicy: 'same-origin',
	crossOriginResourcePolicy: 'same-origin',
	referrerPolicy: 'strict-origin-when-cross-origin',
	permissionsPolicy: {
		camera: [],
		microphone: [],
		geolocation: [],
		payment: [],
		usb: [],
		magnetometer: [],
		gyroscope: [],
		accelerometer: []
	}
};

const devCSPAdjustments = {
	scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://us-assets.i.posthog.com", "https://assets.posthog.com"],
	connectSrc: ["'self'", "ws:", "wss:", "https://us.i.posthog.com", "https://api.posthog.com", "https://us-assets.i.posthog.com", "https://assets.posthog.com"],
	styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]
};

function buildCSPHeader(csp: NonNullable<SecurityHeadersConfig['csp']>): string {
	const directives: string[] = [];

	for (const [directive, sources] of Object.entries(csp)) {
		if (sources && sources.length > 0) {
			const kebabDirective = directive.replace(/([A-Z])/g, '-$1').toLowerCase();
			directives.push(`${kebabDirective} ${sources.join(' ')}`);
		}
	}

	return directives.join('; ');
}


function buildPermissionsPolicyHeader(policy: Record<string, string[]>): string {
	const directives: string[] = [];
	for (const [feature, allowlist] of Object.entries(policy)) {
		if (allowlist.length === 0) {
			directives.push(`${feature}=()`);
		} else {
			const origins = allowlist
				.map((origin) => {
					if (origin === 'self' || origin === '*') {
						return origin;
					}
					return /^".*"$/.test(origin) ? origin : `"${origin}"`;
				})
				.join(' ');
			directives.push(`${feature}=(${origins})`);
		}
	}
	return directives.join(', ');
}

export function setSecurityHeaders(
	event: RequestEvent,
	config: SecurityHeadersConfig = {}
): void {
	const finalConfig = { ...defaultConfig, ...config };

	let cspConfig = { ...defaultConfig.csp, ...config.csp };


	const nonce = event.locals.nonce;
	if (nonce && cspConfig?.scriptSrc) {
		cspConfig = {
			...cspConfig,
			scriptSrc: [...(cspConfig.scriptSrc || []), `'nonce-${nonce}'`]
		};
	}

	if (dev && cspConfig) {
		cspConfig = {
			...cspConfig,
			scriptSrc: [...(cspConfig.scriptSrc || []), ...devCSPAdjustments.scriptSrc].filter((v, i, a) => a.indexOf(v) === i),
			connectSrc: [...(cspConfig.connectSrc || []), ...devCSPAdjustments.connectSrc].filter((v, i, a) => a.indexOf(v) === i),
			styleSrc: [...(cspConfig.styleSrc || []), ...devCSPAdjustments.styleSrc].filter((v, i, a) => a.indexOf(v) === i)
		};
	}

	if (cspConfig) {
		const cspHeader = buildCSPHeader(cspConfig);
		event.setHeaders({
			'Content-Security-Policy': cspHeader
		});
	}

	if (finalConfig.hsts && !dev && isSecureRequest(event)) {
		let hstsValue = `max-age=${finalConfig.hstsMaxAge}`;
		if (finalConfig.hstsIncludeSubDomains) {
			hstsValue += '; includeSubDomains';
		}
		if (finalConfig.hstsPreload) {
			hstsValue += '; preload';
		}
		event.setHeaders({
			'Strict-Transport-Security': hstsValue
		});
	}

	if (finalConfig.frameOptions) {
		event.setHeaders({
			'X-Frame-Options': finalConfig.frameOptions
		});
	}

	if (finalConfig.contentTypeOptions) {
		event.setHeaders({
			'X-Content-Type-Options': 'nosniff'
		});
	}

	// Cross-origin isolation. COOP severs the opener relationship with
	// cross-origin windows and CORP blocks other origins from embedding our
	// responses, which together limit Spectre-class cross-origin reads.
	// See docs/audit-backlog.md A-5.
	//
	// Cross-Origin-Embedder-Policy is intentionally omitted. Setting it to
	// `require-corp` would block the third-party assets the app depends on
	// (PostHog scripts from us-assets.i.posthog.com and Google Fonts from
	// fonts.googleapis.com / fonts.gstatic.com), because those responses do not
	// send a matching CORP header. `credentialless` is not a safe substitute
	// here either: PostHog and font requests that carry credentials would be
	// dropped in browsers that support it, and browsers that do not ignore it.
	// The isolation benefit of COEP is not worth breaking analytics and fonts,
	// so it stays off until the asset surface can serve CORP.
	//
	// COOP and CORP are safe to set unconditionally: CORP does not affect the
	// third-party resources we pull in, only how other origins may embed us.
	if (finalConfig.crossOriginOpenerPolicy) {
		event.setHeaders({
			'Cross-Origin-Opener-Policy': finalConfig.crossOriginOpenerPolicy
		});
	}

	if (finalConfig.crossOriginResourcePolicy) {
		event.setHeaders({
			'Cross-Origin-Resource-Policy': finalConfig.crossOriginResourcePolicy
		});
	}

	if (finalConfig.referrerPolicy) {
		event.setHeaders({
			'Referrer-Policy': finalConfig.referrerPolicy
		});
	}

	if (finalConfig.permissionsPolicy) {
		const permissionsPolicyHeader = buildPermissionsPolicyHeader(finalConfig.permissionsPolicy);
		event.setHeaders({
			'Permissions-Policy': permissionsPolicyHeader
		});
	}

	event.setHeaders({
		'X-DNS-Prefetch-Control': 'off',
		'X-Download-Options': 'noopen',
		'X-Permitted-Cross-Domain-Policies': 'none'
	});
}
