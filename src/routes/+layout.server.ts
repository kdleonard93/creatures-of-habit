import type { Session } from '$lib/server/db/schema';
import type { User } from '$lib/server/db/schema';

type AuthResult = {
  user: User;
  session: Session;
} | null;

type Locals = {
  auth: () => Promise<AuthResult>;
};

export const load = async ({ locals }: { locals: Locals }) => {
    // Get user data from locals
    const auth = await locals.auth();

    return {
        user: auth?.user || null,
        session: auth?.session || null
    };
};