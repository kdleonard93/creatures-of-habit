// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
    namespace App {
        interface Locals {
            user: import('$lib/server/auth').SessionValidationResult['user'];
            session: import('$lib/server/auth').SessionValidationResult['session'];
            auth(): Promise<{ user: import('$lib/server/auth').SessionValidationResult['user']; session: import('$lib/server/auth').SessionValidationResult['session']; } | null>;
        }
    }
}

declare module 'svelte-sonner' {
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

    export const Toaster: (props: ToasterProps) => void;
    export const toast: Toast;
    export type { ToasterProps, ToastProps, Position };
}

export {};