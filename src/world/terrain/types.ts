// Map data types shared by the terrain modules, the props and the buildings.

import { TERRAIN_GEN, type Archetype, type BattleMode, type TreeSpecies, type Weather } from '../../config'

export type Biome =
	| 'field'
	| 'meadow'
	| 'forest'
	| 'mountain'
	| 'road'
	| 'water'
	| 'mud'
	| 'village'
	| 'town'
	| 'base'
	| 'sand'
	| 'rail'
/** Ground speed multiplier per surface (the numbers are in the config). */
export const BIOME_SPEED: Record<Biome, number> = TERRAIN_GEN.biomeSpeed
/** Biome ↔ byte code of the baked biome grid. */
export const BIOME_ID: Biome[] = [
	'field',
	'meadow',
	'forest',
	'mountain',
	'road',
	'water',
	'mud',
	'village',
	'town',
	'base',
	'sand',
	'rail',
]

export interface Patch {
	x: number
	z: number
	r: number
}
/**
 * `rot`: village — angle of its street grid; town — direction of the main street (across the river).
 * `variant`: what stands there — ruined town or a factory district in the centre, a village or a lone farmstead.
 */
export interface Settlement extends Patch {
	kind: 'village' | 'town'
	rot: number
	variant: 'ruins' | 'factory' | 'village' | 'farm'
	church: boolean
	walls: boolean
	orchard: boolean
}
export type Season = 'summer' | 'autumn' | 'winter'
export type { Archetype, TreeSpecies, Weather }

/** What a map is asked to be; anything left out is rolled from the seed. */
export interface MapSpec {
	season?: Season
	weather?: Weather | 'precip'
	/** Rolls the weather when none is asked for (a named map has one seed but a new weather every battle). */
	weatherSeed?: number
	mode?: BattleMode
	archetype?: Archetype
}
export type Relief = 'rolling' | 'plains' | 'ridges' | 'valley' | 'steppe' | 'pass'
/** Map-wide extras: each map mixes a few so no two feel alike. */
export interface Features {
	alleys: boolean
	bunkers: boolean
	obstacles: 'none' | 'hedgehogs' | 'teeth'
	windmill: boolean
	farms: boolean
	/** Earth tank revetments (hull-down cover) in front of the bases and on high ground. */
	revetments: boolean
}
/** The few tree species a map plants, by role (see FLORA). */
export interface Flora {
	conifer: TreeSpecies
	leafy: TreeSpecies
	alley: TreeSpecies
	/** Willows on the banks of the river, lakes and bogs, or null. */
	waterside: TreeSpecies | null
	/** Share of conifers in the forests. */
	coniferShare: number
}
/** Building variants a map's villages use (see BUILDING_KIT). */
export interface BuildingKit {
	chapel: boolean
	/** Share of two-storey brick houses among the village houses. */
	brick: number
	warehouse: boolean
	waterTower: boolean
}
export interface Bunker {
	x: number
	z: number
	rot: number
}

/** Lane waypoint. `fixed` points sit on a crossing: bots must pass through them exactly. */
export interface LanePoint {
	x: number
	z: number
	fixed?: boolean
}
export interface Crossing {
	kind: 'bridge' | 'ford'
	x: number
	z: number // centre, on the river axis
	nx: number
	nz: number // unit normal across the river, pointing toward the bases[1] side
	half: number // bridge: deck half-length along the normal; ford: half-length of the shallow bed along the river
	hw: number // bridge: deck half-width
	h: number // bridge: deck height
	ramp: number // bridge: embankment length past each deck end
	style: 'stone' | 'wood'
}
/** Height of the water plane, m. */
export const WATER_LEVEL = TERRAIN_GEN.waterLevel

export type Rnd = () => number

export interface Point {
	x: number
	z: number
}

/** Unit vectors of the layout: `d` from bases[0] toward bases[1], `p` perpendicular to it. */
export interface LayoutAxis {
	dx: number
	dz: number
	px: number
	pz: number
}
