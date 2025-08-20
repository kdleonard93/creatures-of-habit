# Creatures of Habit

**Creatures of Habit** is a gamified habit tracking application that helps users build consistent routines by turning their daily habits into a fun, RPG-like experience.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 18 or later)
- [pnpm](https://pnpm.io/) (version 8 or later)
- A modern web browser

## Features

- **Habit Tracking**: Monitor daily habits and visualize progress over time
- **Gamification**: Earn experience points and level up your creature as you complete habits
- **Streaks**: Build and maintain streaks for consistent habit completion
- **Daily Progress**: Track your daily habit completion with visual progress bars
- **User Authentication**: Secure sign-up and login functionality
- **Responsive Design**: Accessible on various devices for on-the-go habit management

## Tech Stack

- **Frontend**: Built with [Svelte](https://svelte.dev/) and [SvelteKit](https://kit.svelte.dev/) for a reactive and efficient user interface
- **Styling**: Utilizes [Tailwind CSS](https://tailwindcss.com/) for utility-first CSS styling
- **UI Components**: Enhanced with [shadcn-svelte](https://www.shadcn-svelte.com/) for accessible and customizable components
- **Icons**: Integrated with [Lucide Svelte](https://lucide.dev/) for crisp and customizable icons
- **Notifications**: Implemented using [Svelte Sonner](https://github.com/robbrazier/svelte-sonner) for user feedback
- **Backend**:
  - **Database**: Managed with [Drizzle ORM](https://orm.drizzle.team/) and [Drizzle Kit](https://github.com/drizzle-team/drizzle-kit) for type-safe SQL queries
  - **Client**: Connected via [LibSQL Client](https://github.com/libsql/libsql-client) for database interactions
  - **Authentication**: Secured with [Lucia Auth](https://lucia-auth.com/) for session-based authentication
- **Testing**:
  - **Unit Testing**: Conducted with [Vitest](https://vitest.dev/)
  - **Component Testing**: Performed using [Testing Library for Svelte](https://testing-library.com/docs/svelte-testing-library/intro/)
- **Linting and Formatting**:
  - **Biome**: Used for code quality checks and formatting
  - **TypeScript**: For type checking and improved developer experience

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/kdleonard93/creatures-of-habit.git
cd creatures-of-habit
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

1. Duplicate `.env.example` and rename it to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and configure the following variables:
   - `DATABASE_URL`: Connection URL for your database (e.g., LibSQL or SQLite)
   - `DATABASE_AUTH_TOKEN`: If using Turso or another hosted database service
   - `AUTH_SECRET`: A secure, random string for authentication (min 32 chars)

   **Security Note**: 
   - Never commit your `.env` file to version control
   - Use strong, unique values for secrets
   - Keep your environment variables confidential

### 4. Database Setup

Initialize the database:

```bash
# Create a local SQLite database
pnpm db:create

# Push the schema to your database
pnpm db:push

# Optional: Seed the database with initial data
pnpm db:seed
```

### 5. Start the Development Server

```bash
pnpm dev
```

Visit `http://localhost:5173` in your browser to see the application.

## Development Workflow

### Database Migrations

When making changes to the database schema:

1. Update the schema definition in `src/lib/server/db/schema.ts`
2. Run the migration command:
   ```bash
   pnpm db:push
   ```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode during development
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

### Code Quality

The project uses Biome for code quality checks and TypeScript for type checking:

```bash
# Run Biome checks
pnpm lint

# Run TypeScript type checking
pnpm check

# Format code
pnpm format
```

Pre-commit hooks are configured to run these checks automatically before committing.

## Project Structure

```
creatures-of-habit/
├── src/
│   ├── lib/             # Library code
│   │   ├── components/  # Reusable UI components
│   │   ├── server/      # Server-side code
│   │   │   ├── db/      # Database schema and utilities
│   │   ├── utils/       # Utility functions
│   │   └── types.ts     # TypeScript type definitions
│   ├── routes/          # SvelteKit routes
│   └── tests/           # Test files
├── static/              # Static assets
└── ...configuration files
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details
