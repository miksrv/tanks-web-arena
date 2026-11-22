import * as THREE from 'three'
import { TANK_PAINT, type Nation, type PaintScheme, type PaintSeason } from '../../config'
import { mulberry32 } from '../../core/noise'

// Procedural textures of the vehicles, built once and shared by every tank (and by both renderers): the paint of a
// nation in a season, the surface relief and the track links. All of them tile.

type RGB = [number, number, number]

const smooth = (t: number) => t * t * (3 - 2 * t)
const step = (lo: number, hi: number, v: number) => smooth(Math.min(1, Math.max(0, (v - lo) / (hi - lo))))

/**
 * Tiling value noise, 0..1: `octaves` layers of a random lattice that starts at `cx` × `cy` cells per tile and
 * doubles; unequal cell counts stretch the noise into streaks.
 */
function noiseField(size: number, cx: number, cy: number, octaves: number, rnd: () => number): Float32Array {
	const out = new Float32Array(size * size)
	let amp = 1
	let total = 0
	for (let o = 0; o < octaves; o++, cx *= 2, cy *= 2, amp /= 2) {
		const lattice = Float32Array.from({ length: cx * cy }, rnd)
		total += amp
		for (let y = 0; y < size; y++) {
			const fy = (y / size) * cy
			const y0 = Math.floor(fy)
			const ty = smooth(fy - y0)
			const r0 = (y0 % cy) * cx
			const r1 = ((y0 + 1) % cy) * cx
			for (let x = 0; x < size; x++) {
				const fx = (x / size) * cx
				const x0 = Math.floor(fx)
				const tx = smooth(fx - x0)
				const a = x0 % cx
				const b = (x0 + 1) % cx
				const top = lattice[r0 + a] + (lattice[r0 + b] - lattice[r0 + a]) * tx
				const bot = lattice[r1 + a] + (lattice[r1 + b] - lattice[r1 + a]) * tx
				out[y * size + x] += (top + (bot - top) * ty) * amp
			}
		}
	}
	for (let i = 0; i < out.length; i++) out[i] /= total
	return out
}

/** The value `share` of the field lies above. */
function levelAbove(field: Float32Array, share: number): number {
	const sample: number[] = []
	for (let i = 0; i < field.length; i += 7) sample.push(field[i])
	sample.sort((a, b) => a - b)
	return sample[Math.min(sample.length - 1, Math.floor(sample.length * (1 - share)))]
}

function rgb(hex: string): RGB {
	const c = new THREE.Color(hex).convertLinearToSRGB()
	return [c.r * 255, c.g * 255, c.b * 255]
}

function tiling(data: Uint8Array, w: number, h: number, srgb: boolean): THREE.DataTexture {
	const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat)
	t.wrapS = t.wrapT = THREE.RepeatWrapping
	t.magFilter = THREE.LinearFilter
	t.minFilter = THREE.LinearMipmapLinearFilter
	t.generateMipmaps = true
	t.anisotropy = 4
	if (srgb) t.colorSpace = THREE.SRGBColorSpace
	t.needsUpdate = true
	return t
}

/** Base coat, sprayed camouflage, worn whitewash, then fading, rain streaks, grain and chips down to the primer. */
function paintPixels(scheme: PaintScheme, seed: number): Uint8Array<ArrayBuffer> {
	const size = TANK_PAINT.textureSize
	const rnd = mulberry32(seed)
	const base = rgb(scheme.base)
	const spots = (scheme.spots ?? []).map((s) => {
		const field = noiseField(size, 3, 3, 4, rnd)
		return { color: rgb(s.color), field, level: levelAbove(field, s.cover) }
	})
	const wash = scheme.whitewash ? noiseField(size, 4, 4, 4, rnd) : null
	const washLevel = wash && scheme.whitewash ? levelAbove(wash, scheme.whitewash) : 0
	const white = rgb(TANK_PAINT.whitewashColor)
	const chip = rgb(TANK_PAINT.chipColor)
	const fade = noiseField(size, 6, 6, 3, rnd)
	const streak = noiseField(size, 64, 4, 3, rnd)
	const grain = noiseField(size, 96, 96, 2, rnd)
	const chips = noiseField(size, 80, 80, 2, rnd)
	const chipLevel = levelAbove(chips, 0.006)

	const data = new Uint8Array(size * size * 4)
	const c: RGB = [0, 0, 0]
	const mix = (to: RGB, k: number) => {
		for (let j = 0; j < 3; j++) c[j] += (to[j] - c[j]) * k
	}
	for (let i = 0; i < size * size; i++) {
		c[0] = base[0]
		c[1] = base[1]
		c[2] = base[2]
		for (const s of spots) mix(s.color, step(s.level - 0.015, s.level + 0.015, s.field[i]))
		// Whitewash wears off in patches and washes down in streaks
		if (wash) mix(white, 0.94 * step(washLevel - 0.03, washLevel + 0.03, wash[i] + (streak[i] - 0.5) * 0.1))
		const light =
			(0.9 + 0.2 * fade[i]) * (0.965 + 0.07 * grain[i]) * (1 - 0.1 * step(0.62, 0.95, streak[i]) * fade[i])
		mix(chip, 0.55 * step(chipLevel, chipLevel + 0.04, chips[i]))
		data[i * 4] = Math.min(255, c[0] * light)
		data[i * 4 + 1] = Math.min(255, c[1] * light)
		data[i * 4 + 2] = Math.min(255, c[2] * light)
		data[i * 4 + 3] = 255
	}
	return data
}

const paints = new Map<string, THREE.DataTexture>()

/** The paint of a nation in a season. Autumn wears the summer coat (the mud is a tint, see `TANK_PAINT.dirt`). */
export function paintTexture(nation: Nation, season: PaintSeason): THREE.DataTexture {
	const coat = season === 'winter' ? 'winter' : 'summer'
	const key = `${nation}:${coat}`
	let t = paints.get(key)
	if (!t) {
		const size = TANK_PAINT.textureSize
		t = tiling(paintPixels(TANK_PAINT.schemes[nation][coat], nation === 'ussr' ? 41 : 43), size, size, true)
		t.repeat.setScalar(1 / TANK_PAINT.tile)
		paints.set(key, t)
	}
	return t
}

let surface: THREE.DataTexture | null = null

/** Rolled and cast steel: relief in the red channel (bump map), roughness in the green one. */
export function surfaceTexture(): THREE.DataTexture {
	if (surface) return surface
	const size = TANK_PAINT.surfaceSize
	const rnd = mulberry32(77)
	const pits = noiseField(size, 40, 40, 3, rnd)
	const patches = noiseField(size, 5, 5, 3, rnd)
	const data = new Uint8Array(size * size * 4)
	for (let i = 0; i < size * size; i++) {
		data[i * 4] = 255 * pits[i]
		data[i * 4 + 1] = 255 * (0.62 + 0.3 * patches[i] + 0.08 * pits[i])
		data[i * 4 + 2] = 255
		data[i * 4 + 3] = 255
	}
	surface = tiling(data, size, size, false)
	surface.repeat.setScalar(1 / TANK_PAINT.surfaceTile)
	return surface
}

/** Links one tile of the track texture holds along the belt. */
export const TRACK_TILE_LINKS = 4
/** The belt takes this share of the texture's width; the rest is the dark side of the band. */
export const TRACK_BELT_U = 0.875

let track: THREE.DataTexture | null = null

/** Track links seen from outside: plates with a raised grouser bar, sprocket windows and the gaps between links. */
export function trackTexture(): THREE.DataTexture {
	if (track) return track
	const w = 64
	const link = 32
	const h = link * TRACK_TILE_LINKS
	const rnd = mulberry32(5)
	const data = new Uint8Array(w * h * 4)
	for (let y = 0; y < h; y++) {
		const t = ((y % link) + 0.5) / link
		for (let x = 0; x < w; x++) {
			const u = (x + 0.5) / w / TRACK_BELT_U
			let v = 62
			if (u > 1) v = 20
			else {
				if (t > 0.36 && t < 0.64)
					v = t < 0.45 ? 118 : 92 // grouser, lit from above
				else if (t > 0.12 && t < 0.3 && Math.abs(Math.abs(u - 0.5) - 0.22) < 0.08) v = 22 // sprocket windows
				if (t < 0.07 || t > 0.94)
					v = 16 // gap to the next link
				else if (u < 0.07 || u > 0.93) v += 18 // edges polished by the road
				v += (rnd() - 0.5) * 16
			}
			const i = (y * w + x) * 4
			data[i] = v * 1.04
			data[i + 1] = v * 0.98
			data[i + 2] = v * 0.9
			data[i + 3] = 255
		}
	}
	track = tiling(data, w, h, true)
	track.wrapS = THREE.ClampToEdgeWrapping
	return track
}

/**
 * Material hook: the paint map colours only the painted parts (vertex colour alpha 1); tyres, tools, glass and
 * markings keep their plain vertex colour.
 */
export function maskPaint(shader: { fragmentShader: string }) {
	shader.fragmentShader = shader.fragmentShader.replace(
		'#include <map_fragment>',
		/* glsl */ `
		#ifdef USE_MAP
			diffuseColor.rgb *= mix( vec3( 1.0 ), texture2D( map, vMapUv ).rgb, vColor.a );
		#endif
		`,
	)
}

/** Uniform of `scrollTracks`: how far the left (x) and the right (y) track have run, in texture tiles. */
export type TrackScroll = THREE.IUniform<THREE.Vector2>

/** Material hook: the belt texture runs along each track by its own distance (the side is the sign of x). */
export function scrollTracks(
	shader: { vertexShader: string; uniforms: Record<string, THREE.IUniform> },
	scroll: TrackScroll,
) {
	shader.uniforms.trackScroll = scroll
	shader.vertexShader = shader.vertexShader
		.replace('#include <common>', '#include <common>\nuniform vec2 trackScroll;')
		.replace(
			'#include <uv_vertex>',
			'#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv.y += position.x > 0.0 ? trackScroll.x : trackScroll.y;\n#endif\n#ifdef USE_BUMPMAP\nvBumpMapUv.y += position.x > 0.0 ? trackScroll.x : trackScroll.y;\n#endif',
		)
}
