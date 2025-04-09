# Creatures of Habit (WIP)

**Creatures of Habit** is a web application designed to help users track and develop habits, promoting personal growth and productivity!

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 18 or later)
- [pnpm](https://pnpm.io/) (version 8 or later)
- A modern web browser

## Features

- **Habit Tracking**: Monitor daily habits and visualize progress over time.
- **User Authentication**: Secure sign-up and login functionality.
- **Responsive Design**: Accessible on various devices for on-the-go habit management.

## Tech Stack

- **Frontend**: Built with [Svelte](https://svelte.dev/) and [SvelteKit](https://kit.svelte.dev/) for a reactive and efficient user interface.
- **Styling**: Utilizes [Tailwind CSS](https://tailwindcss.com/) for utility-first CSS styling.
- **Icons**: Integrated with [Lucide Svelte](https://lucide.dev/) for crisp and customizable icons.
- **Notifications**: Implemented using [Svelte Sonner](https://github.com/robbrazier/svelte-sonner) for user feedback.
- **Backend**:
  - **Database**: Managed with [Drizzle ORM](https://orm.drizzle.team/) and [Drizzle Kit](https://github.com/drizzle-team/drizzle-kit) for type-safe SQL queries.
  - **Client**: Connected via [LibSQL Client](https://github.com/libsql/libsql-client) for database interactions.
  - **Authentication**: Secured with [bcrypt](https://www.npmjs.com/package/bcrypt) and [@node-rs/argon2](https://github.com/napi-rs/node-rs/tree/main/packages/argon2) for password hashing.
- **Testing**:
  - **Unit Testing**: Conducted with [Vitest](https://vitest.dev/).
  - **Component Testing**: Performed using [Testing Library for Svelte](https://testing-library.com/docs/svelte-testing-library/intro/).
- **Linting and Formatting**:
  - **ESLint**: Configured for code linting.
  - **Prettier**: Used for code formatting, with Svelte support via [prettier-plugin-svelte](https://github.com/sveltejs/prettier-plugin-svelte).

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
   - `JWT_SECRET`: A secure, random string for JWT token generation
   - `SALT_ROUNDS`: Number of salt rounds for password hashing (recommended: 10-12)

   **Security Note**: 
   - Never commit your `.env` file to version control
   - Use strong, unique values for `JWT_SECRET`
   - Keep your environment variables confidential

### 4. Database Setup

Initialize the database:

```bash
# Push database schema
pnpm run db:push

# Generate Drizzle client
pnpm run db:generate

# Run migrations
pnpm run db:migrate
```

### 5. Start Development Server

```bash
pnpm run dev
```

The application will be available at `http://localhost:5173`.

## Authentication Flow

1. **Registration**:
   - Navigate to the registration page
   - Provide required details (email, password)
   - Password requirements:
     * Minimum 8 characters
     * At least one uppercase letter
     * At least one lowercase letter
     * At least one number
     * At least one special character

2. **Login**:
   - Use registered email and password
   - Passwords are securely hashed before storage
   - JWT tokens are used for maintaining user sessions

## Troubleshooting

- **Database Connection Issues**: 
  - Verify `DATABASE_URL` in `.env`
  - Ensure database service is running
  - Check network connectivity

- **Authentication Problems**:
  - Confirm `.env` variables are correctly set
  - Verify password meets complexity requirements
  - Clear browser cache and cookies

## Available Scripts

- `pnpm run dev`: Start development server
- `pnpm run build`: Build for production
- `pnpm run preview`: Preview production build
- `pnpm run test`: Run all tests
- `pnpm run lint`: Lint code
- `pnpm run format`: Format code

## Added CI

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before getting started.


## Support

For issues or questions, please [open an issue](https://github.com/kdleonard93/creatures-of-habit/issues) on GitHub.
