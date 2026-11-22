// The voices of the vehicles: what each engine with its running gear sounds like. Guns need no table: a shot is
// voiced from the gun's calibre, muzzle velocity and muzzle brake.

/** An engine and the running gear it drives, as the synthesiser hears them. */
export interface EngineVoice {
	cylinders: number
	/** Firing frequency, Hz (rpm / 60 × cylinders / 2; a two-stroke fires every turn), at idle and at full revs. */
	idle: number
	max: number
	/** 0…1: the knock of a diesel on every firing stroke (petrol engines run smooth). */
	diesel: number
	/** 0…1: how unevenly the cylinders fire (the lumpy beat under the note). */
	lope: number
	/** Hz: resonances of the exhaust and the hull the note rings in. */
	body: readonly [number, number]
	/** Hz: how bright the note gets under full load. */
	bright: number
	/** Loudness against the other engines (displacement). */
	level: number
	/** Gear whine: its level and its pitch as a multiple of the firing frequency. */
	whine: number
	whineRatio: number
	/** Petrol-electric drive (Ferdinand): the whine follows the speed, the engines hold their revs. */
	electric?: boolean
	/** Gears the revs climb through on the way to top speed. */
	gears: number
	/** Tracks: loudness of the clatter, its pitch (Hz), links per second at top speed, squeal in a turn. */
	tracks: { level: number; tone: number; rate: number; squeal: number }
}

const WIDE_TRACKS = { level: 1.3, tone: 1050, rate: 24, squeal: 0.45 } // T-34: loud pin clatter
const HEAVY_TRACKS = { level: 1.15, tone: 780, rate: 16, squeal: 0.6 }
const LIGHT_TRACKS = { level: 0.7, tone: 1400, rate: 28, squeal: 0.3 }
const GERMAN_TRACKS = { level: 0.85, tone: 900, rate: 22, squeal: 0.8 }
const GERMAN_HEAVY_TRACKS = { level: 1.0, tone: 640, rate: 15, squeal: 1.0 } // interleaved wheels squeal
const WHEELS = { level: 0, tone: 600, rate: 0, squeal: 0 }

export const ENGINES = {
	/** GAZ-202 petrol six (T-60). */
	gaz: {
		cylinders: 6,
		idle: 32,
		max: 165,
		diesel: 0.2,
		lope: 0.22,
		body: [150, 520],
		bright: 1700,
		level: 0.55,
		whine: 0.5,
		whineRatio: 5.2,
		gears: 4,
		tracks: LIGHT_TRACKS,
	},
	/** Two GAZ sixes in line (T-70, SU-76M). */
	gazTwin: {
		cylinders: 12,
		idle: 62,
		max: 320,
		diesel: 0.2,
		lope: 0.3,
		body: [140, 480],
		bright: 1800,
		level: 0.8,
		whine: 0.5,
		whineRatio: 2.7,
		gears: 4,
		tracks: LIGHT_TRACKS,
	},
	/** ZiS-5 lorry six (BM-13). */
	zis: {
		cylinders: 6,
		idle: 28,
		max: 115,
		diesel: 0.3,
		lope: 0.3,
		body: [130, 430],
		bright: 1400,
		level: 0.6,
		whine: 0.7,
		whineRatio: 6.3,
		gears: 4,
		tracks: WHEELS,
	},
	/** V-2-34 diesel V12, 500 hp (T-34 and the guns on its chassis). */
	v2: {
		cylinders: 12,
		idle: 60,
		max: 180,
		diesel: 0.85,
		lope: 0.32,
		body: [95, 310],
		bright: 1100,
		level: 1.2,
		whine: 0.25,
		whineRatio: 3.4,
		gears: 4,
		tracks: WIDE_TRACKS,
	},
	/** V-2K / V-2-IS, 600 hp, pulling 45 tonnes (KV, IS and their guns). */
	v2Heavy: {
		cylinders: 12,
		idle: 55,
		max: 200,
		diesel: 0.95,
		lope: 0.38,
		body: [78, 250],
		bright: 950,
		level: 1.35,
		whine: 0.35,
		whineRatio: 2.9,
		gears: 5,
		tracks: HEAVY_TRACKS,
	},
	/** Maybach HL 62 / HL 66 petrol six (Pz. II, Luchs, Wespe). */
	maybachSix: {
		cylinders: 6,
		idle: 40,
		max: 150,
		diesel: 0.12,
		lope: 0.18,
		body: [160, 560],
		bright: 1900,
		level: 0.55,
		whine: 0.7,
		whineRatio: 5.6,
		gears: 5,
		tracks: LIGHT_TRACKS,
	},
	/** Praga EPA six (Marder III on the 38(t) chassis). */
	praga: {
		cylinders: 6,
		idle: 36,
		max: 130,
		diesel: 0.2,
		lope: 0.28,
		body: [135, 470],
		bright: 1600,
		level: 0.58,
		whine: 0.6,
		whineRatio: 6,
		gears: 5,
		tracks: LIGHT_TRACKS,
	},
	/** Opel lorry six on a half-track (Panzerwerfer 42). */
	opel: {
		cylinders: 6,
		idle: 34,
		max: 150,
		diesel: 0.2,
		lope: 0.25,
		body: [145, 500],
		bright: 1500,
		level: 0.55,
		whine: 0.6,
		whineRatio: 5.8,
		gears: 5,
		tracks: { level: 0.5, tone: 1300, rate: 26, squeal: 0.2 },
	},
	/** White 160AX petrol six of the M3 half-track (SU-57). */
	white: {
		cylinders: 6,
		idle: 33,
		max: 150,
		diesel: 0.22,
		lope: 0.24,
		body: [140, 460],
		bright: 1550,
		level: 0.6,
		whine: 0.65,
		whineRatio: 5.5,
		gears: 4,
		tracks: { level: 0.45, tone: 900, rate: 24, squeal: 0.15 }, // rubber band tracks
	},
	/** GM 6046: two two-stroke diesel sixes with blowers (M4A2 Sherman), a high even howl over a diesel rattle. */
	gm6046: {
		cylinders: 12,
		idle: 85,
		max: 400,
		diesel: 0.6,
		lope: 0.2,
		body: [125, 430],
		bright: 1800,
		level: 0.8,
		whine: 0.7,
		whineRatio: 2.2,
		gears: 5,
		tracks: { level: 0.75, tone: 700, rate: 20, squeal: 0.3 }, // rubber-block tracks
	},
	/** Maybach HL 120 petrol V12, 300 hp (Pz. III, Pz. IV and everything built on them). */
	hl120: {
		cylinders: 12,
		idle: 80,
		max: 260,
		diesel: 0.14,
		lope: 0.16,
		body: [125, 420],
		bright: 1700,
		level: 0.9,
		whine: 0.75,
		whineRatio: 3.1,
		gears: 6,
		tracks: GERMAN_TRACKS,
	},
	/** Maybach HL 210 / HL 230 petrol V12, 650–700 hp (Tiger, Panther, Sturmtiger): a smooth howl. */
	hl230: {
		cylinders: 12,
		idle: 80,
		max: 300,
		diesel: 0.1,
		lope: 0.12,
		body: [105, 360],
		bright: 1900,
		level: 0.95,
		whine: 1,
		whineRatio: 2.6,
		gears: 7,
		tracks: GERMAN_HEAVY_TRACKS,
	},
	/** Two HL 120 driving generators and electric motors (Ferdinand). */
	porsche: {
		cylinders: 12,
		idle: 110,
		max: 215,
		diesel: 0.14,
		lope: 0.22,
		body: [115, 400],
		bright: 1500,
		level: 0.95,
		whine: 1.6,
		whineRatio: 0,
		electric: true,
		gears: 1,
		tracks: GERMAN_HEAVY_TRACKS,
	},
	/** Aircraft radial (the strike plane). */
	aero: {
		cylinders: 14,
		idle: 110,
		max: 270,
		diesel: 0.25,
		lope: 0.3,
		body: [170, 600],
		bright: 2600,
		level: 1,
		whine: 0,
		whineRatio: 1,
		gears: 1,
		tracks: WHEELS,
	},
} satisfies Record<string, EngineVoice>

export type EngineId = keyof typeof ENGINES

/** How the engines of the tanks around the listener are mixed. */
export const ENGINE_MIX = {
	voices: 3, // nearest running engines heard besides the listener's own
	reach: 140, // m
	level: 0.9, // against the listener's own engine
	revTime: 0.16, // s: how fast the revs follow the driver
	shaftPerLoad: 0.5, // revs a floored throttle adds over what the gear gives (standing start, climbing)
}

/** A cannon shot. */
export const GUN_SOUND = {
	refCaliber: 85, // mm: the gun every size factor is measured against
	sound: 340, // m/s: distant shots and explosions are heard this late…
	maxLag: 1.6, // …but never later than this, s
	crackFrom: 250, // m/s: muzzle velocity with no supersonic crack; a full crack at `crackFull`
	crackFull: 900,
	autoCaliber: 30, // mm: smaller guns are automatic cannons (a short dry bark, no case clatter)
}
