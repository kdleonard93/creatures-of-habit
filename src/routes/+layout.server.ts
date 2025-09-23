type User = {
  id: string;
  username: string;
};

type AuthResult = {
  user: User;
  session: any;
} | null;

type Locals = {
  auth: () => Promise<AuthResult>;
};

export const load = async ({ locals }: { locals: Locals }) => {
    // Get user data from locals
    const auth = await locals.auth();

    return {
        user: auth?.user || null
    };
};