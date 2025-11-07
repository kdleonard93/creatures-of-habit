import * as auth from '$lib/server/auth.js';
import type { Handle, HandleServerError, RequestEvent } from '@sveltejs/kit';
import { initializeScheduler } from '$lib/server/tasks/scheduler';
import { logger } from '$lib/utils/logger';
import { setSecurityHeaders } from '$lib/server/securityHeaders';
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
    }

    const { session, user } = await auth.validateSessionToken(sessionToken);
    if (session) {
        auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
    } else {
        auth.deleteSessionTokenCookie(event);
    }

    event.locals.user = user;
    event.locals.session = session;

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

export const handleError = async ({ error, status }: {
    error: unknown;
    status: number;
    event?: RequestEvent;
    message?: string;
}) => {
    if (status !== 404 && posthogClient) {
        posthogClient.captureException(error);
    }
};
  