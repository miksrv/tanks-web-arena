import type { Archetype, TreeSpecies } from './world'

// Map generation tunables: relief, terrain shaping, structures and props. Units: metres, seconds; colours are hex.
// The per-archetype layout numbers (forest and village counts, flora odds, the railway bank) are in world.ts.

/** Base relief of the heightmap, per relief style. */
export const RELIEF = {
	erosionPasses: 40, // thermal erosion passes over the heightmap (~30 reach a fixed point)
	// Steppe gullies (balki): depth, and how thin the noise's zero lines are cut (closer to 1 = narrower)
	gullyDepth: 6.5, // m
	gullyEdge: [0.9, 0.985] as const,
	// Pass: the ridge across the middle of the map, and the saddles where the three lanes go over it
	ridgeHeight: 24, // m
	ridgeSpan: [55, 210] as const, // m from the middle line: full height inside, gone outside
	saddles: [-200, 0, 200], // m across the axis (the lane anchors on a dry map)
	saddleWidth: [28, 85] as const, // m
}

/** Terrain shaping, the layout's placement tries, the railway profile and the water. */
export const TERRAIN_GEN = {
	waterLevel: -1.5, // m, height of the water plane
	// Ground speed multiplier per surface (deep water is a wall: DRIVE.deepWater)
	biomeSpeed: {
		field: 1,
		meadow: 1,
		forest: 0.85,
		mountain: 0.7,
		road: 1.15,
		water: 0.35,
		mud: 0.6,
		village: 1,
		town: 0.75,
		base: 1,
		sand: 0.85,
		rail: 1,
	},
	baseFlatRadius: 70, // m of levelled ground around each base
	baseBiomeRadius: 45, // m of the base biome around each base
	floodplain: 2.5, // m above the water level: the land beside the river, just above the water
	riverBank: 22, // m: from the water's edge up to the floodplain
	maxPassableGradient: 0.95, // rise/run: steeper ground is impassable
	outsideHeight: 120, // m: the ground "outside the world" is a wall
	townRadius: 95, // m, the central town
	placeTries: 80, // tries to place one village, farmstead, forest or bog
	lakeTries: 250, // tries to place one lake
	windmillCandidates: 60, // spots tried for the windmill
	railStep: 8, // m between profile samples of the railway
	railSmooth: 10, // samples each side in the box filter (±80 m), applied three times
	railEndFade: 40, // m over which the bank runs out at each end
	roadCell: 48, // m, cell of the road distance grid
	roadReach: 24, // m: the grid answers exactly within this distance of a road
	waterStyle: {
		summer: { color: '#2f6a8a', roughness: 0.25 },
		autumn: { color: '#3f6478', roughness: 0.25 },
		winter: { color: '#4a5f70', roughness: 0.6 },
	},
	bogWater: { color: '#3b5238', roughness: 0.5 }, // marsh water: dark and green, whatever the season
	waterPlane: 6, // × WORLD_HALF: the water plane reaches well past the map edge, so a coast map's sea runs to the horizon
}

/** Ground and minimap colours per season (hex). */
export const GROUND_PALETTE = {
	summer: {
		field: '#9a8a4a',
		fieldDark: '#6e5a30',
		meadow: '#5f9a3c',
		meadowLight: '#8fb84c',
		forest: '#3f6b2c',
		mountain: '#7b7368',
		snow: '#e8ecf0',
		road: '#7a6a4e',
		water: '#3a5a4a',
		mud: '#6b5a3c',
		village: '#8c9a52',
		town: '#8a8580',
		base: '#7f9a4e',
		sand: '#cdbb8a',
		rail: '#6e665c',
	},
	autumn: {
		field: '#8c7a44',
		fieldDark: '#5c4a2a',
		meadow: '#8d9a3c',
		meadowLight: '#c2b452',
		forest: '#5a5e2a',
		mountain: '#7c746a',
		snow: '#e8ecf0',
		road: '#7a6a4e',
		water: '#3a5048',
		mud: '#6b5a3c',
		village: '#9a9a52',
		town: '#8a8580',
		base: '#8c9a4e',
		sand: '#bfae80',
		rail: '#6a6258',
	},
	winter: {
		field: '#e4e7ec',
		fieldDark: '#cfd4db',
		meadow: '#e8ebf0',
		meadowLight: '#f3f5f8',
		forest: '#d6dbe0',
		mountain: '#c6cad0',
		snow: '#f4f6f8',
		road: '#9a9088',
		water: '#2c3e4c',
		mud: '#8c8478',
		village: '#dde1e6',
		town: '#b8b8ba',
		base: '#dde2e6',
		sand: '#d8d6cf',
		rail: '#8a847c',
	},
}

/** Building palette (hex). */
export const BUILDING_PALETTE = {
	wall: '#c9b89a',
	wallDark: '#9a8a6c',
	log: '#7a5a3a',
	roof: '#7a3a2a',
	roofGrey: '#5a5a5a',
	brick: '#8a5a48',
	brickDark: '#5a3a30',
	rubble: '#6d6760',
	plaster: '#b8aa98',
	window: '#2a2a30',
	church: '#e0dcd0',
	dome: '#2a6a9a',
	concrete: '#9a9890',
	stone: '#6c6760',
	plank: '#8a6a44',
	timber: '#5e4228',
	logDark: '#4e3a28',
	whitewash: '#e4dccb',
	thatch: '#b09a5e',
	tile: '#a8502f',
	slate: '#4a4e56',
}

export type BuildingColor = keyof typeof BUILDING_PALETTE
type HouseStyle = readonly [
	walls: BuildingColor,
	roof: BuildingColor,
	barnWalls: BuildingColor,
	barnRoof: BuildingColor,
]
/** How a country builds its houses: [walls, roof, barn walls, barn roof]. Colours only, the shape is shared. */
const houseStyle: Record<Archetype, HouseStyle> = {
	classic: ['log', 'roof', 'wallDark', 'roofGrey'],
	steppe: ['whitewash', 'thatch', 'wall', 'thatch'], // whitewashed khata under thatch
	swamp: ['logDark', 'thatch', 'timber', 'roofGrey'],
	pass: ['stone', 'slate', 'wallDark', 'slate'], // stone huts under slate
	coast: ['plaster', 'tile', 'wall', 'tile'],
	lakes: ['logDark', 'plank', 'log', 'plank'], // northern log houses with plank roofs
}

/** Buildings: house styles, the railway track and its rolling stock, tank revetments and the collider grid. */
export const STRUCTURES = {
	houseStyle,
	railClear: 6, // m kept clear of houses and walls on each side of the track centre
	sleeperStep: 1.6, // m
	railSegment: 6, // m: rails follow the ground in pieces this long
	gauge: 1.52, // m (Russian broad gauge)
	wagon: { length: 12, gap: 1.4, width: 2.9, height: 3, wheels: 1.1 }, // m
	wagonPaint: ['#6b3a2a', '#4a5038', '#5a5650'], // one is rolled per wagon
	steel: '#4a4844', // rails and bogies
	wagonRoadClear: 26, // m: no wagon stands on a level crossing
	wagonBaseClear: 70, // m: nor in or by a base circle
	revetment: {
		front: 8.5, // m, the front berm (the tank's nose goes up to it)
		side: 6, // m, side berms
		thick: 1.4, // m
		height: 1.25, // m: hull-down for most hulls, the turret free to shoot
		routeClear: 30, // m from roads and lane waypoints
		earth: '#6a5a40',
		sandbag: '#a8976c',
		// Biomes no revetment stands on
		badGround: [
			'water',
			'mud',
			'road',
			'rail',
			'town',
			'village',
			'forest',
			'mountain',
			'sand',
		] as readonly string[],
	},
	gridCell: 32, // m, cell of the building collider grid
	gridPad: 1, // m added around every footprint, so rounding at a cell edge never drops a box
	gridMargin: 80, // m: the grid reaches this far past the playable edge (bunkers and bridges sit near it)
}

/** Trees, bushes, rocks, haystacks and fences. */
export const PROPS = {
	gridCell: 24, // m, spatial hash cell
	fallSpeed: 0.9, // fallT per second: a knocked tree is flat after 1 / this
	haySlow: 0.85, // speed multiplier while crushing a haystack
	rockTopMax: 4, // m above the ground: nothing higher is checked against a rock's top
	minWillows: 15, // fewer waterside willows than this on a map are planted as its leafy species instead
	// Where no vegetation stands: water, mud, roads, bases, the town, the mountains, a beach or a railway
	bareGround: ['water', 'mud', 'road', 'base', 'town', 'mountain', 'sand', 'rail'] as readonly string[],
}

export interface TreeLook {
	conifer: boolean
	/** Scale of the shared 5 m trunk: [girth, height]. */
	trunk: readonly [number, number]
	bark: string
	/** Summer crown colour (evergreens: also autumn). */
	leaf: string
	/** Autumn leaves: hue range and lightness of the HSL colour (all zero for an evergreen). */
	autumn: readonly [h0: number, h1: number, l: number]
	/** Winter: the snow-dusted needles or the bare branches. */
	winter: string
}

/** Tree species: trunk proportions and colours (the crown meshes are in src/world/props/species.ts). */
export const TREES: Record<TreeSpecies, TreeLook> = {
	pine: { conifer: true, trunk: [1, 1], bark: '#6a4630', leaf: '#2d5a2a', autumn: [0, 0, 0], winter: '#4f6a52' },
	spruce: {
		conifer: true,
		trunk: [0.9, 0.8],
		bark: '#4a3a2e',
		leaf: '#22432a',
		autumn: [0, 0, 0],
		winter: '#4a6252',
	},
	// Larch turns gold in autumn and drops its needles for the winter
	larch: {
		conifer: true,
		trunk: [0.9, 1.1],
		bark: '#6e5442',
		leaf: '#5d8a3c',
		autumn: [0.11, 0.13, 0.48],
		winter: '#6a5a48',
	},
	cypress: {
		conifer: true,
		trunk: [0.8, 0.5],
		bark: '#5a4a3c',
		leaf: '#1f4a2c',
		autumn: [0, 0, 0],
		winter: '#3f5c48',
	},
	stonepine: {
		conifer: true,
		trunk: [1.1, 1.5],
		bark: '#7a5236',
		leaf: '#35602c',
		autumn: [0, 0, 0],
		winter: '#4f6a52',
	},
	linden: {
		conifer: false,
		trunk: [1, 1],
		bark: '#5a4030',
		leaf: '#4f8a33',
		autumn: [0.02, 0.14, 0.4],
		winter: '#5a4a3c',
	},
	birch: {
		conifer: false,
		trunk: [0.7, 1.1],
		bark: '#e4e0d6',
		leaf: '#76a03e',
		autumn: [0.11, 0.15, 0.5],
		winter: '#6a5654',
	},
	oak: {
		conifer: false,
		trunk: [1.5, 0.75],
		bark: '#4a3c30',
		leaf: '#3c6a2a',
		autumn: [0.05, 0.09, 0.32],
		winter: '#4e4034',
	},
	acacia: {
		conifer: false,
		trunk: [1.1, 0.85],
		bark: '#4e4034',
		leaf: '#6a9440',
		autumn: [0.12, 0.16, 0.46],
		winter: '#54463a',
	},
	alder: {
		conifer: false,
		trunk: [0.8, 1],
		bark: '#3e342c',
		leaf: '#2f5f2c',
		autumn: [0.2, 0.26, 0.3],
		winter: '#4a3e36',
	},
	poplar: {
		conifer: false,
		trunk: [0.9, 1.4],
		bark: '#6a6458',
		leaf: '#557f30',
		autumn: [0.12, 0.15, 0.45],
		winter: '#5e5040',
	},
	willow: {
		conifer: false,
		trunk: [1.4, 0.6],
		bark: '#5a5040',
		leaf: '#7f9a52',
		autumn: [0.13, 0.16, 0.45],
		winter: '#7a6a48',
	},
	apple: {
		conifer: false,
		trunk: [0.9, 0.45],
		bark: '#5a4636',
		leaf: '#5a8f36',
		autumn: [0.06, 0.2, 0.38],
		winter: '#5a4a3c',
	},
}
