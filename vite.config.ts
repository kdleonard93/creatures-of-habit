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
			RESEND_API_KEY: 'test-api-key'
		},
		deps: {
		  inline: [/bits-ui/, /lucide-svelte/]
		}
	}
});
