//**
// This is a templated example that i need to update when the app is in production. Will be used for testing purposes until then.
//  */

import { browser } from '$app/environment';
import type { PostHog, CaptureResult } from 'posthog-js';

export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low';
export type BusinessFeature =
    | 'authentication' | 'habit_management' | 'character_system' | 'quest_system'
    | 'user_profile' | 'contact_form' | 'payment' | 'admin_panel' | 'api_integration'
    | 'database_operations' | 'unknown';
export type ErrorCategory =
    | 'business_logic' | 'user_input' | 'system_error' | 'network_error'
    | 'authentication_error' | 'validation_error' | 'performance_issue'
    | 'third_party_service' | 'database_error' | 'unknown';

export interface ErrorTrackingOptions {
    severity?: ErrorSeverity;
    feature?: BusinessFeature;
    category?: ErrorCategory;
    errorMessage?: string;
    userId?: string;
    additionalContext?: Record<string, unknown>;
}

export interface PerformanceTrackingOptions {
    feature: BusinessFeature;
    action: string;
    duration: number;
    success?: boolean;
    errorMessage?: string;
    userId?: string;
    additionalContext?: Record<string, unknown>;
}

export interface UserBehaviorOptions {
    action: string;
    feature: BusinessFeature;
    userId?: string;
    properties?: Record<string, unknown>;
}

// Get PostHog instance safely
function getPostHog(): Partial<PostHog> | null {
    if (browser && typeof window !== 'undefined' && window.posthog) {
        return window.posthog as Partial<PostHog>;
    }
    console.warn('⚠️ PostHog not available for tracking');
    return null;
}

// Track user behavior events
export function trackUserBehavior(options: UserBehaviorOptions): CaptureResult | undefined {
    const posthog = getPostHog();
    if (!posthog) return undefined;

    try {
        return posthog.capture?.('user_behavior', {
            action: options.action,
            feature: options.feature,
            user_id: options.userId,
            ...options.properties,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Failed to track user behavior:', error);
        return undefined;
    }
}

// Track business errors
export function trackBusinessError(errorMessage: string, options: ErrorTrackingOptions = {}): CaptureResult | undefined {
    const posthog = getPostHog();
    if (!posthog) return undefined;

    try {
        return posthog.capture?.('business_error', {
            error_message: errorMessage,
            severity: options.severity || 'medium',
            feature: options.feature || 'unknown',
            category: options.category || 'unknown',
            user_id: options.userId,
            additional_context: options.additionalContext,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Failed to track business error:', error);
        return undefined;
    }
}

// Track performance metrics
export function trackPerformance(options: PerformanceTrackingOptions): CaptureResult | undefined {
    const posthog = getPostHog();
    if (!posthog) return undefined;

    try {
        return posthog.capture?.('performance_metric', {
            feature: options.feature,
            action: options.action,
            duration: options.duration,
            success: options.success ?? true,
            error_message: options.errorMessage,
            user_id: options.userId,
            additional_context: options.additionalContext,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Failed to track performance:', error);
        return undefined;
    }
}
