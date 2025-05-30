declare global {
    namespace App {
        interface Locals {
            user: import('$lib/server/auth').SessionValidationResult['user'];
            session: import('$lib/server/auth').SessionValidationResult['session'];
            auth(): Promise<{ user: import('$lib/server/auth').SessionValidationResult['user']; session: import('$lib/server/auth').SessionValidationResult['session']; } | null>;
        }
    }
    
    namespace svelteHTML {
        interface HTMLAttributes {
            'aria-label'?: string;
            'aria-labelledby'?: string;
            'aria-describedby'?: string;
            'aria-hidden'?: boolean | 'true' | 'false';
            'aria-expanded'?: boolean | 'true' | 'false';
            'aria-controls'?: string;
            'aria-live'?: 'off' | 'polite' | 'assertive';
            'aria-selected'?: boolean | 'true' | 'false';
            'data-testid'?: string;
        }
    }
}

declare module 'svelte-sonner' {
    import type { ComponentType, SvelteComponent } from 'svelte';
    
    interface ToasterProps {
        theme?: 'light' | 'dark' | 'system';
        richColors?: boolean;
        expand?: boolean;
        duration?: number;
        position?: Position;
        closeButton?: boolean;
    }

    interface ToastProps {
        id?: string | number;
        title?: string;
        description?: string;
        duration?: number;
        dismiss?: boolean;
    }

    type Position =
        | 'top-left'
        | 'top-center'
        | 'top-right'
        | 'bottom-left'
        | 'bottom-center'
        | 'bottom-right';

    interface Toast {
        success: (message: string, props?: ToastProps) => void;
        error: (message: string, props?: ToastProps) => void;
        info: (message: string, props?: ToastProps) => void;
        warning: (message: string, props?: ToastProps) => void;
        message: (message: string, props?: ToastProps) => void;
        promise: <T>(
            promise: Promise<T>,
            messages: {
                loading: string;
                success: string;
                error: string;
            },
            props?: ToastProps
        ) => Promise<T>;
        dismiss: (toastId?: string | number) => void;
        custom: (message: string, props?: ToastProps) => void;
    }

    type ToasterComponent = ComponentType<SvelteComponent<ToasterProps>>;
    export const Toaster: ToasterComponent;
    export const toast: Toast;
    export type { ToasterProps, ToastProps, Position };
}

export {};