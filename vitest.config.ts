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
		}
	})
);
