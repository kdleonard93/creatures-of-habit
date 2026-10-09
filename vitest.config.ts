import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vite.config';

// Vitest resolves the bare `svelte` specifier against Svelte's SSR build, so
// `mount()` throws ("lifecycle_function_unavailable") and real component
// rendering is impossible. Alias only the bare specifier to Svelte's client
// entry. Subpath imports (`svelte/internal/client`, used by compiled
// components) and every other package are untouched, so the browser condition
// never leaks into Node-only deps such as `ws` and `@libsql/client`.
const svelteClientEntry = fileURLToPath(
	new URL('./node_modules/svelte/src/index-client.js', import.meta.url)
);

export default mergeConfig(
	baseConfig,
	defineConfig({
		resolve: {
			alias: [{ find: /^svelte$/, replacement: svelteClientEntry }]
		},
		test: {
			coverage: {
				provider: 'v8',
				reporter: ['text', 'html'],
				reportsDirectory: './.test-artifacts/coverage',
				include: ['src/lib/**/*.{ts,svelte}', 'src/routes/**/*.server.ts', 'src/routes/api/**/*.ts'],
				exclude: [
					'src/**/*.test.ts',
					'src/**/*.spec.ts',
					'src/tests/**',
					'src/lib/data/components/ui/**',
					'src/routes/**/+page.svelte',
					'src/routes/**/+layout.svelte'
				],
				// Baseline recorded 2026-10-09: 63.9 stmts / 74.66 branch /
				// 62.33 funcs / 63.9 lines. Floors are set just below so coverage
				// cannot regress; ratchet upward as gaps close.
				thresholds: {
					statements: 60,
					branches: 70,
					functions: 55,
					lines: 60
				}
			}
		}
	})
);
