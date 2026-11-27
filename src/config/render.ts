import type { Weather } from './weather'

export const RENDER = {
	maxFps: 60, // frame-rate cap on any refresh rate (high-refresh displays would otherwise multiply the GPU load and heat)
	garageFps: 30, // nothing moves in the garage backdrop
	maxScale: 1.25, // render scale ceiling (× devicePixelRatio capped here); the adaptive scaler works below it
	minScale: 0.75,
	earlySlack: 2, // ms: a frame may come this early and still count as on time (rAF stamps jitter)
	nearRate: 0.1, // a panel at most this much faster than the target renders every refresh (60.5 Hz: no skipped frame)
	maxStep: 0.05, // s: longer frames are simulated slower rather than in one big step
	maxRawFrame: 0.25, // s: a longer gap between frames (hidden tab, hitch) is counted as this much
}

/** Dynamic resolution: the render scale follows the average frame time of fixed windows of frames. */
export const ADAPTIVE_RESOLUTION = {
	windowFrames: 60, // frames per measuring window
	step: 0.125, // render scale change per notch
	slowRatio: 1.3, // frames this much longer than the target on average (≈ 30 % missed vsyncs at 60 Hz) lower the scale
	cleanRatio: 1.05, // within 5 % of the target on average: room to raise the scale again
	cooldownAfterDrop: 1.5, // s without another change after the scale was lowered
	maxRetry: 90, // s: ceiling of the back-off before the scale is raised again
}

/** Sky, haze and light of one season. */
export interface SkyDef {
	bg: string
	fog: string
	fogNear: number
	fogFar: number
	sky: string
	ground: string
	sun: string
	sunI: number
}

/** Sky, haze and light per season. */
export const SKY: Record<'summer' | 'autumn' | 'winter', SkyDef> = {
	summer: {
		bg: '#9fbdd6',
		fog: '#aac4d8',
		fogNear: 250,
		fogFar: 1100,
		sky: '#cfe0f0',
		ground: '#4a5a3a',
		sun: '#fff1dc',
		sunI: 1.9,
	},
	autumn: {
		bg: '#b6c0ca',
		fog: '#c2c9d0',
		fogNear: 220,
		fogFar: 1000,
		sky: '#d8dde3',
		ground: '#5a4a2a',
		sun: '#ffe2bc',
		sunI: 1.6,
	},
	winter: {
		bg: '#c8d1d9',
		fog: '#d5dce3',
		fogNear: 180,
		fogFar: 850,
		sky: '#e2e7ee',
		ground: '#8a8f96',
		sun: '#eef2fa',
		sunI: 1.45,
	},
}

/**
 * How the weather and the hour change the season's sky: a tint mixed into the sky colours (`k` = share), light
 * multipliers and, for dawn and dusk, a low sun on its own bearing.
 */
export interface WeatherLook {
	tint?: string
	k?: number
	sun?: string
	sunI: number
	hemiI: number
	sunOffset?: { x: number; y: number; z: number }
	/** Fog colour pulled toward the background (fog banks look solid). */
	fogToBg?: boolean
}
export const WEATHER_LOOK: Record<Weather, WeatherLook> = {
	clear: { sunI: 1, hemiI: 1 },
	overcast: { tint: '#9aa3aa', k: 0.55, sunI: 0.45, hemiI: 1.25 },
	dawn: { tint: '#e9b79a', k: 0.4, sun: '#ffc49a', sunI: 1, hemiI: 1.05, sunOffset: { x: 170, y: 62, z: 50 } },
	dusk: { tint: '#c98663', k: 0.45, sun: '#ff9a5a', sunI: 1, hemiI: 1, sunOffset: { x: -165, y: 52, z: -60 } },
	fog: { tint: '#b9c0c5', k: 0.75, sunI: 0.5, hemiI: 1.2, fogToBg: true },
	rain: { tint: '#7f8a92', k: 0.7, sunI: 0.3, hemiI: 1.05 },
	snow: { tint: '#c4cbd2', k: 0.6, sunI: 0.4, hemiI: 1.2, fogToBg: true },
}

/** Scene light and fog that do not depend on the season. */
export const ENVIRONMENT = {
	/** The satellite view looks down from a few hundred metres: haze that suits the ground view would wash it out. */
	artyFog: { near: 900, far: 2400 }, // m
	/** Sun offset from the camera target; the shadow box travels with it. */
	sunOffset: { x: 90, y: 180, z: 60 }, // m
	shadowHalfSize: 110, // m: half the side of the sun's shadow box
}

export const CAMERA = {
	distance: 14, // m behind the tank
	minDistance: 7,
	maxDistance: 32,
	height: 5,
	sniperFov: [16, 8, 4], // deg zoom steps
	fov: 55,
	artyHeight: [90, 520, 260] as const, // satellite view height above the aim point: min, max, default (wheel zooms)
	artyFov: 45,
	sensitivity: 0.0022, // rad per mouse pixel
	sniperSensitivity: [0.35, 0.18, 0.09], // × per sniper zoom step
	aimRange: 900, // m the reticle ray reaches…
	sniperAimRange: 1500, // …and in the sniper view
	wheelNotch: 90, // wheel pixels per notch (a mouse click is ~100; see `Input`)
	wheelQuietMs: 120, // a burst of small wheel deltas ends after this long without wheel input
	wheelModeLockMs: 350, // after the wheel switched the camera mode, it does not switch again for this long
}

/** Player controls. */
export const CONTROLS = {
	shotBuffer: 0.3, // s: a click this close to the end of the reload fires the moment the gun is loaded
	reloadCueMin: 2, // s: guns that reload faster than this (autocannons) give no "loaded" cue
}
