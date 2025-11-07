import type { RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';

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
	referrerPolicy?: string;
	permissionsPolicy?: Record<string, string[]>;
}

const defaultConfig: SecurityHeadersConfig = {
	csp: {
		defaultSrc: ["'self'"],
		scriptSrc: ["'self'", "https://us-assets.i.posthog.com", "https://assets.posthog.com", "'sha256-XL/sUvesv0Q/qFkTNbwrpyF6NzuFIDkC15j3QzhSx6U='"],
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

	if (finalConfig.hsts && !dev && event.url.protocol === 'https:') {
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
