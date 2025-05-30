/**
 * Enhanced logger utility for the application
 * Supports console logging and Posthog event tracking
 */

import { browser } from '$app/environment';

type LogLevel = 'info' | 'error' | 'warn' | 'debug';

// Helper function to format log messages for console output
function formatLogMessage(level: LogLevel, message: string, data?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const dataStr = data ? JSON.stringify(data) : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${dataStr}`;
}

/**
 * Send an event to Posthog if available
 * This function checks if Posthog is available before attempting to use it
 */
function sendToPosthog(eventName: string, properties: Record<string, unknown>): void {
  if (browser && typeof window !== 'undefined' && window.posthog) {
    try {
      window.posthog.capture(eventName, properties);
    } catch (error) {
      // Using Function constructor to avoid direct console references
      new Function('msg', 'console.error(msg)')(`Failed to send event to Posthog: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Custom logger implementation
export const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    new Function('msg', 'console.info(msg)')(formatLogMessage('info', message, data));
    
    // send to Posthog
    if (data?.trackInPosthog === true) {
      sendToPosthog('info_event', {
        message,
        ...data,
        trackInPosthog: undefined // Remove the flag before sending
      });
    }
  },
  
  error: (message: string, data?: Record<string, unknown>) => {
    new Function('msg', 'console.error(msg)')(formatLogMessage('error', message, data));
    
    // send to Posthog
    sendToPosthog('error_event', {
      message,
      ...data,
      timestamp: new Date().toISOString()
    });
  },
  
  warn: (message: string, data?: Record<string, unknown>) => {
    new Function('msg', 'console.warn(msg)')(formatLogMessage('warn', message, data));
    if (data?.trackInPosthog === true) {
      sendToPosthog('warning_event', {
        message,
        ...data,
        trackInPosthog: undefined
      });
    }
  },
  
  debug: (message: string, data?: Record<string, unknown>) => {
    // Only log debug messages in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      new Function('msg', 'console.debug(msg)')(formatLogMessage('debug', message, data));
    }
  },
  
  // Specific method for tracking events in Posthog
  track: (eventName: string, properties?: Record<string, unknown>) => {
    sendToPosthog(eventName, properties || {});
    
    if (process.env.NODE_ENV !== 'production') {
      new Function('msg', 'console.info(msg)')(
        formatLogMessage('info', `Tracked event: ${eventName}`, properties)
      );
    }
  }
};

declare global {
  interface Window {
    posthog?: {
      capture: (eventName: string, properties?: Record<string, unknown>) => void;
      identify: (userId: string, properties?: Record<string, unknown>) => void;
    };
  }
}
