import * as schema from '../../lib/server/db/schema';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { sql } from 'drizzle-orm';

// Create an in-memory SQLite database for testing
const testClient = createClient({
  url: 'file::memory:',
});

export const testDb = drizzle(testClient, { schema });

// Function to initialize test database with required schema
export async function initTestDb() {
  // Create tables based on the schema structure
  await testClient.execute(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      age INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS creature (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      class TEXT NOT NULL,
      race TEXT NOT NULL,
      experience INTEGER NOT NULL DEFAULT 0,
      level INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS creature_stats (
      id TEXT PRIMARY KEY,
      creature_id TEXT NOT NULL,
      strength INTEGER NOT NULL DEFAULT 0,
      dexterity INTEGER NOT NULL DEFAULT 0,
      constitution INTEGER NOT NULL DEFAULT 0,
      intelligence INTEGER NOT NULL DEFAULT 0,
      wisdom INTEGER NOT NULL DEFAULT 0,
      charisma INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (creature_id) REFERENCES creature(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS habit_category (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS habit_frequency (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      days TEXT,
      every_x INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS habit (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      frequency_id TEXT,
      difficulty TEXT NOT NULL,
      base_experience INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_archived INTEGER NOT NULL DEFAULT 0,
      start_date TEXT NOT NULL,
      end_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES habit_category(id),
      FOREIGN KEY (frequency_id) REFERENCES habit_frequency(id)
    );
    
    CREATE TABLE IF NOT EXISTS habit_streak (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (habit_id) REFERENCES habit(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS habit_completion (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      value INTEGER DEFAULT 1,
      experience_earned INTEGER,
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (habit_id) REFERENCES habit(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS quest_templates (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      setting TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS quest_instances (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      template_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      narrative TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      current_question INTEGER NOT NULL DEFAULT 0,
      correct_answers INTEGER NOT NULL DEFAULT 0,
      total_questions INTEGER NOT NULL DEFAULT 5,
      exp_reward_base INTEGER NOT NULL DEFAULT 50,
      exp_reward_bonus INTEGER NOT NULL DEFAULT 100,
      activated_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
      FOREIGN KEY (template_id) REFERENCES quest_templates(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS quest_questions (
      id TEXT PRIMARY KEY,
      quest_instance_id TEXT NOT NULL,
      question_number INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      choice_a TEXT NOT NULL,
      choice_b TEXT NOT NULL,
      correct_choice TEXT NOT NULL,
      required_stat TEXT NOT NULL,
      difficulty_threshold INTEGER NOT NULL DEFAULT 10,
      success_chance INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (quest_instance_id) REFERENCES quest_instances(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS quest_answers (
      id TEXT PRIMARY KEY,
      quest_instance_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      user_choice TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      answered_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (quest_instance_id) REFERENCES quest_instances(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES quest_questions(id) ON DELETE CASCADE
    );
  `);
}

// Function to clean up test database
export async function cleanupTestDb() {
  // Drop all tables
  await testClient.execute(`
    DROP TABLE IF EXISTS quest_answers;
    DROP TABLE IF EXISTS quest_questions;
    DROP TABLE IF EXISTS quest_instances;
    DROP TABLE IF EXISTS quest_templates;
    DROP TABLE IF EXISTS habit_completion;
    DROP TABLE IF EXISTS habit_streak;
    DROP TABLE IF EXISTS habit;
    DROP TABLE IF EXISTS habit_frequency;
    DROP TABLE IF EXISTS habit_category;
    DROP TABLE IF EXISTS session;
    DROP TABLE IF EXISTS creature_stats;
    DROP TABLE IF EXISTS creature;
    DROP TABLE IF EXISTS user;
  `);
}
