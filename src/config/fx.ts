// Effects and vehicle visuals: sound, particles, precipitation, ground decals, the artillery view, the tank model.
// Units: metres, seconds, radians; colours are hex strings.

/** Procedural sound: stereo placement and envelopes. */
export const AUDIO_FX = {
	panWidth: 0.8, // a sound straight to the side is not fully in one ear
	panNear: 12, // m: closer sounds are pulled toward the centre (they come from all around the hull)
	airFar: 0.08, // air absorption: lowpass at the edge of a sound's reach, as a fraction of the near cutoff
	silent: 0.0001, // floor for exponential envelopes (they cannot reach zero)
	plate: [1, 2.32, 4.25, 6.63], // inharmonic partials of a struck steel plate: armour clangs, breech, debris
}

/** CPU-simulated point particles. */
export const PARTICLES = {
	max: 4000, // particles alive at once
	maxScreenShare: 0.45, // largest sprite on screen, as a share of the drawing buffer's height
	/** Field values of a fresh particle; `emit` overrides what it is given. */
	defaults: {
		vx: 0,
		vy: 0,
		vz: 0,
		life: 1,
		size: 1,
		grow: 0,
		r: 1,
		g: 1,
		b: 1,
		gravity: 0,
		drag: 0,
		alpha: 1,
	},
}

/** Rain and snow around the camera. */
export const PRECIPITATION = {
	/** Drops live in a box that travels with the camera; the shader wraps them around it, so the CPU never moves one. */
	box: [70, 34, 70] as const, // m: x, y, z
	style: {
		rain: { count: 2600, fall: 16, sway: 0, size: 0.7, color: '#c7d3dc', alpha: 0.42, streak: 1 },
		snow: { count: 2200, fall: 1.6, sway: 0.9, size: 0.12, color: '#f6f8fb', alpha: 0.9, streak: 0 },
	},
	maxPointPx: 48, // px: the largest drop sprite
}

/** Decals on the ground: expanding HE splash rings. */
export const GROUND_MARKS = {
	maxRings: 32,
	ringLife: 0.9, // s
}

/** Artillery (satellite) view overlay. */
export const ARTY_VIEW = {
	ringSegments: 64, // line segments of the reticle, converged and splash rings
	arcSegments: 48, // …of the planned trajectory
	gunSegments: 32, // …of the gun marker ring
	markers: 16, // the player's shells in flight that carry a marker
	/** m: the planned arc counts as blocked when it comes down further than this (or the splash) from the aim point. */
	blockSlack: 5,
	colors: {
		white: '#f4f1e8',
		green: '#7fe07f',
		yellow: '#f2d65a',
		orange: '#f0b040',
		red: '#ff5a5a',
	},
	arcColor: '#ffd080',
}

/** The tank model: hit flash, wreck, thrown turret, wheels and gun recoil. */
export const TANK_VIEW = {
	hitFlash: 0.12, // s
	wreckColor: '#2e2a26',
	blownUp: [9, 13] as const, // m/s: launch speed of a turret thrown by its ammunition
	blownOut: [1.5, 4] as const, // m/s sideways
	wheelSegments: 10,
	/** The barrel slides back by caliber × this (within the limits, m) on a shot and runs out again in `recoilTime` s. */
	recoilPerMm: 1 / 260,
	recoilLimits: [0.12, 0.5] as const,
	recoilTime: 0.45,
	wheelOutset: 0.03, // m: wheels stand proud of the track side so their faces show
}

/** How the hull rides on its two tracks. */
export const SUSPENSION = {
	maxRoll: 0.6, // rad
	trackSamples: 5, // points sampled along each track
	trackInset: 0.42, // track centre-line, fraction of the hull width from the axis
	sink: 0.15, // m: the hull may settle this far below the ground under its centre
}
