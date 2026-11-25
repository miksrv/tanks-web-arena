import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
	server: { port: 5181 },
	// The game version, shown in the garage's copyright line.
	define: { __APP_VERSION__: JSON.stringify(pkg.version) },
})
