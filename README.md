# Creatures of Habit

**Creatures of Habit** is a web application designed to help users track and develop habits, promoting personal growth and productivity.

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

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/kdleonard93/creatures-of-habit.git
   cd creatures-of-habit
   ```

2. **Install Dependencies**:

   ```bash
   pnpm install
   ```

3. **Set Up Environment Variables**:

   - Duplicate `.env.example` and rename it to `.env`.
   - Fill in the necessary environment variables.

4. **Database Setup**:

   - **Push Database Schema**:

     ```bash
     pnpm run db:push
     ```

   - **Generate Drizzle Client**:

     ```bash
     pnpm run db:generate
     ```

   - **Run Migrations**:

     ```bash
     pnpm run db:migrate
     ```

   - **Start Local Database** (Optional):

     ```bash
     pnpm run db:local
     ```

5. **Development Server**:

   Start the development server:

   ```bash
   pnpm run dev
   ```

   The application will be available at `http://localhost:5173`.

## Scripts

- **Development**:

  ```bash
  pnpm run dev
  ```

- **Build**:

  ```bash
  pnpm run build
  ```

- **Preview**:

  ```bash
  pnpm run preview
  ```

- **Type Check**:

  ```bash
  pnpm run check
  ```

- **Watch Type Check**:

  ```bash
  pnpm run check:watch
  ```

- **Unit Tests**:

  ```bash
  pnpm run test:unit
  ```

- **Run All Tests**:

  ```bash
  pnpm run test
  ```

- **Database Operations**:

  - **Push Schema**:

    ```bash
    pnpm run db:push
    ```

  - **Generate Client**:

    ```bash
    pnpm run db:generate
    ```

  - **Migrate**:

    ```bash
    pnpm run db:migrate
    ```

  - **Open Studio**:

    ```bash
    pnpm run db:studio
    ```

  - **Start Local DB**:

    ```bash
    pnpm run db:local
    ```

- **Format Code**:

  ```bash
  pnpm run format

