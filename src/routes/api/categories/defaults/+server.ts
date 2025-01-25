import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';

export const POST: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const userId = session.user.id;

  const defaultCategories = [
    { name: 'Health', description: 'Physical and mental well-being habits', isDefault: true },
    { name: 'Productivity', description: 'Work and task management habits', isDefault: true },
    { name: 'Learning', description: 'Educational and skill development habits', isDefault: true },
    { name: 'Social', description: 'Relationships and communication habits', isDefault: true },
    { name: 'Creativity', description: 'Artistic and creative habits', isDefault: true },
    { name: 'Personal Growth', description: 'Self-improvement and development habits', isDefault: true }
  ];

  const newCategories = await db.insert(schema.habitCategory)
    .values(
      defaultCategories.map(category => ({
        userId,
        name: category.name,
        description: category.description,
        isDefault: category.isDefault
      }))
    )
    .returning({
      id: schema.habitCategory.id,
      name: schema.habitCategory.name,
      description: schema.habitCategory.description
    });

  return json({ categories: newCategories });
};