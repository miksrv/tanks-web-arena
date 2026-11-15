import * as THREE from 'three'

/** Full-window WebGL renderer with shadows and filmic tone mapping, attached to the page. */
export function createRenderer(pixelRatio: number): THREE.WebGLRenderer {
	const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
	renderer.setPixelRatio(pixelRatio)
	renderer.setSize(window.innerWidth, window.innerHeight)
	renderer.shadowMap.enabled = true
	renderer.shadowMap.type = THREE.PCFShadowMap // PCFSoft costs ~2× the shadow taps for a barely visible difference
	renderer.toneMapping = THREE.ACESFilmicToneMapping
	renderer.toneMappingExposure = 1.0
	document.body.prepend(renderer.domElement)
	return renderer
}

/**
 * Nothing moves (the garage backdrop, a paused battle): render the shadow map once more and keep it, instead of
 * redrawing every caster each frame.
 */
export function freezeShadows(renderer: THREE.WebGLRenderer, still: boolean) {
	const { shadowMap } = renderer
	if (still && shadowMap.autoUpdate) shadowMap.needsUpdate = true
	shadowMap.autoUpdate = !still
}
