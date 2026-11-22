// Renders the map pictures of the garage's map dialog from the running game: src/assets/maps/<id>.webp, an aerial
// shot of every named map in clear weather. Run it again after a change to map generation, to the look of the world
// or to the list of maps.
//
// Usage: `npm run dev` in one terminal, then `CHROME_PATH=<a Chrome or Chromium binary> node scripts/map-previews.mjs`.
// Needs `playwright-core` (not a dependency of the game: `npm i --no-save playwright-core`).
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

const URL = 'http://localhost:5181/'
// Ids of MAP_PRESETS (src/config/maps.ts)
const MAPS = ['prokhorovka', 'kursk', 'polesie', 'pass', 'kerch', 'karelia', 'rzhev', 'orel', 'malinovka']

const browser = await chromium.launch({
	executablePath: process.env.CHROME_PATH,
	args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

/** Open the garage with that choice (its backdrop is the chosen map) and return what `shoot` draws, as WebP. */
async function shot(choice, shoot) {
	const page = await browser.newPage({ viewport: { width: 960, height: 720 }, deviceScaleFactor: 1 })
	await page.addInitScript((c) => localStorage.setItem('tanks-web-arena.battle', JSON.stringify(c)), choice)
	await page.goto(URL)
	await page.waitForSelector('#goBtn', { state: 'visible' })
	await page.waitForTimeout(1500)
	const url = await page.evaluate(shoot)
	await page.close()
	return Buffer.from(url.split(',')[1], 'base64')
}

/** In the page: the centre 4:3 crop of the frame just rendered, 400 × 300. */
const GRAB = `(src) => {
	const c = document.createElement('canvas')
	c.width = 400
	c.height = 300
	const sw = Math.min(src.width, (src.height * 4) / 3)
	const sh = (sw * 3) / 4
	c.getContext('2d').drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, 400, 300)
	return c.toDataURL('image/webp', 0.8)
}`

/** From 110 m up at the side of the map (the sea side of a coast), looking at its middle. */
const aerial = `(() => {
	const g = window.__game
	const t = g.world.terrain
	const { px, pz } = t.axis
	const side = t.coastSign || 1
	const cam = g.rig.camera.clone()
	cam.aspect = 4 / 3
	cam.fov = 50
	cam.updateProjectionMatrix()
	const x = px * 300 * side
	const z = pz * 300 * side
	cam.position.set(x, Math.max(t.height(x, z), 0) + 110, z)
	cam.lookAt(-px * 60 * side, t.height(0, 0), -pz * 60 * side)
	cam.updateMatrixWorld()
	// Sun and shadows over the middle of the map instead of the player's base
	g.scene.traverse((o) => {
		if (!o.isDirectionalLight) return
		o.position.x -= o.target.position.x
		o.position.z -= o.target.position.z
		o.target.position.set(0, 0, 0)
		o.target.updateMatrixWorld()
	})
	for (const tank of g.tanks) tank.view.group.visible = true
	g.renderer.shadowMap.needsUpdate = true
	g.renderer.render(g.scene, cam)
	return (${GRAB})(g.renderer.domElement)
})()`

mkdirSync('src/assets/maps', { recursive: true })
for (const id of MAPS) {
	writeFileSync(`src/assets/maps/${id}.webp`, await shot({ map: id, mode: 'standard', weather: 'clear' }, aerial))
	console.log('map', id)
}
await browser.close()
