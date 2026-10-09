import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5175,
		strictPort: true
	},
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		setupFiles: ['./src/tests/setup.ts'],
		env: {
			RESEND_API_KEY: 'test-api-key',
			// Test isolation: block the live Turso credentials from `.env` so tests
			// can never reach production. `dotenv` does not override existing keys,
			// so defining these here keeps the real values out of the test run.
			// Point TURSO at a throwaway file too: Vitest runs with `dev === false`,
			// so the local fallback branch in db/index.ts is not taken.
			TURSO_DATABASE_URL: 'file:./local-test.db',
			TURSO_AUTH_TOKEN: '',
			DATABASE_URL: '',
			LOCAL_DATABASE_URL: 'file:./local-test.db',
			TRUST_PROXY: 'false'
		},
		deps: {
		  inline: [/bits-ui/, /lucide-svelte/]
		}
	}
});
