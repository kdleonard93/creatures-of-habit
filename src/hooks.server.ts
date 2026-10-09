import * as auth from '$lib/server/auth.js';
import { json, redirect } from '@sveltejs/kit';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { initializeScheduler } from '$lib/server/tasks/scheduler';
import { logger } from '$lib/utils/logger';
import { setSecurityHeaders } from '$lib/server/securityHeaders';
import { getVerificationGate } from '$lib/server/verification';
import { PostHog } from 'posthog-node';
import { getPostHogKey, posthogServerConfig } from '$lib/plugins/PostHog';
import { randomBytes } from 'node:crypto';

const posthogKey = getPostHogKey();
const posthogClient = posthogKey ? new PostHog(posthogKey, posthogServerConfig) : null;

// Initialize the task scheduler when the server starts
try {
    logger.info('Initializing task scheduler');
    initializeScheduler();
} catch (error) {
    logger.error('Failed to initialize task scheduler', {
        error: error instanceof Error ? error.message : String(error)
    });
}

export const handle: Handle = async ({ event, resolve }) => {
    // Generate a nonce for CSP inline scripts
    const nonce = randomBytes(16).toString('base64');
    event.locals.nonce = nonce;

    // Apply security headers to all responses (includes nonce in CSP)
    setSecurityHeaders(event);

    // Attach the auth function to locals
    event.locals.auth = async () => {
        const sessionToken = event.cookies.get(auth.sessionCookieName);
        if (!sessionToken) {
            return null;
        }

        const { session, user } = await auth.validateSessionToken(sessionToken);
        if (session) {
            auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
        } else {
            auth.deleteSessionTokenCookie(event);
        }

        if (!user || !session) {
            return null;
        }

        return {
            user,
            session
        };
    };

    const sessionToken = event.cookies.get(auth.sessionCookieName);
    if (!sessionToken) {
        event.locals.user = null;
        event.locals.session = null;
    } else {
        const { session, user } = await auth.validateSessionToken(sessionToken);
        if (session) {
            auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
        } else {
            auth.deleteSessionTokenCookie(event);
        }

        event.locals.user = user;
        event.locals.session = session;
    }

    const currentUser = event.locals.user;
    if (currentUser) {
        const gate = getVerificationGate(event.url.pathname, currentUser.emailVerified);
        if (gate === 'api') {
            return json({ error: 'Email verification required' }, { status: 403 });
        }
        if (gate === 'redirect') {
            throw redirect(302, '/verify-email-pending');
        }
    }

    return resolve(event, {
        transformPageChunk: ({ html }) => {
            return html.replace(
                /<script(?![^>]*\ssrc=)(?![^>]*\snonce=)([^>]*)>/gi,
                (match, attrs) => {
                    // If nonce already exists, don't add it again
                    if (attrs.includes('nonce=')) return match;
                    return `<script nonce="${nonce}"${attrs}>`;
                }
            );
        }
    });
};

export const handleError: HandleServerError = async ({ error, status, event }) => {
    // Capture only unexpected server failures. Expected 4xx responses
    // (400/401/403/404/405/409/422/429) are not errors and only add noise.
    // See docs/audit-backlog.md O-1.
    if (status < 500 || !posthogClient) {
        return;
    }

    posthogClient.captureException(error, event?.locals?.user?.id, {
        status_code: status,
        environment: process.env.NODE_ENV,
        ...(process.env.APP_RELEASE ? { release: process.env.APP_RELEASE } : {}),
        route: event?.route?.id,
        method: event?.request?.method,
        path: event?.url?.pathname
    });
};
  