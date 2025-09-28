import posthog from 'posthog-js';
import type { HandleClientError } from '@sveltejs/kit';
import { getPostHogKey, posthogConfig } from '$lib/plugins/PostHog';

// Initialize PostHog on the client side
if (typeof window !== 'undefined') {
    const posthogKey = getPostHogKey();
    if (posthogKey) {
        posthog.init(posthogKey, {
            ...posthogConfig,
            debug: false,
        });
    }
}

// Enhanced error tracking with context
export const handleError: HandleClientError = ({ error, status, event }) => {
    console.error('🚨 Client error captured:', error);
    
    // Skip 404 errors as they're not typically critical
    if (status === 404) {
        return;
    }

    // Capture error with rich context
    posthog.captureException(error, {
        severity: 'error',
        status_code: status,
        url: window.location.href,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        context: {
            route: event?.route?.id,
            params: event?.params,
            url: event?.url?.pathname
        }
    });

    // Track specific error types for business insights
    if (error instanceof Error) {
        trackErrorByType(error, status);
    }

    // Track user impact
    if (error instanceof Error) {
        trackUserImpact(error, status);
    }
};

// Classify and track errors by type
function trackErrorByType(error: Error, status: number): void {
    const errorType = classifyError(error, status);
    
    posthog.capture('client_error', {
        error_type: errorType,
        error_name: error.name,
        error_message: error.message,
        status_code: status,
        stack_trace: error.stack,
        severity: getErrorSeverity(errorType, status),
        timestamp: new Date().toISOString()
    });
}

// Track user impact of errors
function trackUserImpact(error: Error, status: number): void {
    const impact = assessUserImpact(error, status);
    
    posthog.capture('user_impact', {
        impact_level: impact.level,
        affected_feature: impact.feature,
        error_type: error.name,
        status_code: status,
        timestamp: new Date().toISOString()
    });
}

// Error classification logic
function classifyError(error: Error, status: number): string {
    if (error.name === 'NetworkError' || status >= 500) {
        return 'network_error';
    }
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
        return 'javascript_error';
    }
    if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
        return 'authentication_error';
    }
    if (error.message?.includes('validation') || error.message?.includes('invalid')) {
        return 'validation_error';
    }
    if (status >= 400 && status < 500) {
        return 'client_error';
    }
    return 'unknown_error';
}

// Error severity assessment
function getErrorSeverity(errorType: string, status: number): 'critical' | 'high' | 'medium' | 'low' {
    if (status >= 500 || errorType === 'network_error') {
        return 'critical';
    }
    if (status >= 400 || errorType === 'authentication_error') {
        return 'high';
    }
    if (errorType === 'validation_error') {
        return 'medium';
    }
    return 'low';
}

// User impact assessment
function assessUserImpact(error: Error, status: number): { level: string; feature: string } {
    const url = window.location.pathname;
    
    // Determine affected feature based on URL
    let feature = 'unknown';
    if (url.includes('/character')) feature = 'character_management';
    else if (url.includes('/habits')) feature = 'habit_tracking';
    else if (url.includes('/auth')) feature = 'authentication';
    else if (url.includes('/contact')) feature = 'contact_form';
    
    // Determine impact level
    let level = 'low';
    if (status >= 500 || error.name === 'NetworkError') {
        level = 'critical';
    } else if (error.message?.includes('authentication') || status === 401) {
        level = 'high';
    } else if (status >= 400) {
        level = 'medium';
    }
    
    return { level, feature };
}

// Global error handlers for unhandled errors
if (typeof window !== 'undefined') {
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('🔥 Unhandled promise rejection:', event.reason);
        
        posthog.capture('unhandled_promise_rejection', {
            reason: event.reason?.toString() || 'Unknown reason',
            stack: event.reason?.stack,
            timestamp: new Date().toISOString(),
            severity: 'high'
        });
    });

    // Uncaught errors
    window.addEventListener('error', (event) => {
        console.error('💥 Uncaught error:', event.error);
        
        posthog.capture('uncaught_error', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack,
            timestamp: new Date().toISOString(),
            severity: 'critical'
        });
    });

    // Performance monitoring
    if ('performance' in window) {
        // Track page load performance
        window.addEventListener('load', () => {
            setTimeout(() => {
                const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
                if (navigation) {
                    posthog.capture('page_performance', {
                        load_time: navigation.loadEventEnd - navigation.loadEventStart,
                        dom_complete: navigation.domComplete,
                        first_paint: navigation.responseEnd,
                        timestamp: new Date().toISOString()
                    });
                }
            }, 0);
        });
    }
}
