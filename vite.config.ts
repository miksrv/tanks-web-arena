import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
	server: { port: 5181 },
	// The game version, shown in the garage's copyright line.
	define: { __APP_VERSION__: JSON.stringify(pkg.version) },
	build: {
		// three.js alone is ~580 kB minified and cannot be split further; the game's own chunk is ~320 kB
		chunkSizeWarningLimit: 600,
		rolldownOptions: {
			output: {
				// three.js in a chunk of its own: it changes only with the library, so a release of the game leaves it in
				// the browser's cache.
				codeSplitting: { groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }] },
			},
		},
	},
})
