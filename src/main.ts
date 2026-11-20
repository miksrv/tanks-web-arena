import { Game } from './game/game'
import { readTestOptions } from './game/testHooks'

const loader = document.getElementById('loader')

/** Fades the loading screen out once the first frame is on screen. */
function hideLoader() {
	if (!loader) return
	loader.classList.add('done')
	loader.addEventListener('transitionend', () => loader.remove(), { once: true })
}

// Building the world blocks the main thread for a while: let the loading screen paint first
requestAnimationFrame(() =>
	setTimeout(() => {
		try {
			new Game(readTestOptions()).start()
		} catch (err) {
			loader?.classList.add('failed')
			const msg = document.getElementById('loaderMsg')
			if (msg) msg.textContent = 'Не удалось запустить игру. Проверьте, что браузер поддерживает WebGL.'
			throw err
		}
		// start() queues the first frame; two rAFs later it has been presented
		requestAnimationFrame(() => requestAnimationFrame(hideLoader))
	}),
)
