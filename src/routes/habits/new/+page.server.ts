import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { habitCategory } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, fetch }) => {
    const session = await locals.auth();
    
    if (!session?.user) {
        throw redirect(302, '/login');
    }

    const user = session.user;

    const categories = await db
        .select({
            id: habitCategory.id,
            name: habitCategory.name,
            description: habitCategory.description
        })
        .from(habitCategory)
        .where(eq(habitCategory.userId, user.id));

    // If no categories exist, create default ones
    if (categories.length === 0) {
        try {
            // Use the full URL for server-side fetch
            const response = await fetch('/api/categories/defaults', {
                method: 'POST'
            });

            if (!response.ok) {
                console.error('Failed to create categories:', await response.text());
                throw new Error('Failed to create default categories');
            }

            const data = await response.json();
            console.log('Created categories:', data.categories);
            return {
                categories: data.categories
            };
        } catch (error) {
            console.error('Error creating default categories:', error);
            // Return empty categories array if creation fails
            return {
                categories: []
            };
        }
    }

    return {
        categories
    };
};