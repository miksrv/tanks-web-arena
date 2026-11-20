import * as THREE from 'three'
import { TREES, type TreeLook } from '../../config'
import type { Season, TreeSpecies } from '../terrain'

/** One geometry from several parts, positions only (normals recomputed). */
export function mergePositions(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
	const pos: number[] = []
	for (const g of parts) pos.push(...(g.toNonIndexed().attributes.position.array as Float32Array))
	const geo = new THREE.BufferGeometry()
	geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
	geo.computeVertexNormals()
	return geo
}

const ellipsoid = (r: number, seg: number, sy: number, y: number) =>
	new THREE.SphereGeometry(r, seg, seg - 1).scale(1, sy, 1).translate(0, y, 0)

interface SpeciesDef extends TreeLook {
	crown(): THREE.BufferGeometry
	/** Winter crown of a leafy species: smaller, branches only (conifers keep their needles). */
	bare?: () => THREE.BufferGeometry
}

/**
 * Tree species: the trunk is shared (scaled and tinted per instance), each species has its own crown mesh. Trunk
 * proportions and colours come from the config (TREES).
 */
export const SPECIES: Record<TreeSpecies, SpeciesDef> = {
	pine: {
		...TREES.pine,
		crown: () => new THREE.ConeGeometry(2.4, 7, 7).translate(0, 7.5, 0),
	},
	spruce: {
		...TREES.spruce,
		crown: spruce,
	},
	// Larch: an airy two-tier cone that turns gold in autumn and drops its needles for the winter
	larch: {
		...TREES.larch,
		crown: () => larch(1),
		bare: () => larch(0.7),
	},
	// Cypress: a dark, narrow column
	cypress: {
		...TREES.cypress,
		crown: () => ellipsoid(1.05, 6, 5.2, 6.4),
	},
	// Umbrella pine: a flat crown on a tall bare trunk
	stonepine: {
		...TREES.stonepine,
		crown: () => ellipsoid(3.3, 7, 0.42, 8.3),
	},
	linden: {
		...TREES.linden,
		crown: () => ellipsoid(2.8, 7, 1.15, 6.6),
		bare: () => ellipsoid(2.2, 6, 1.3, 6.4),
	},
	birch: {
		...TREES.birch,
		crown: () => ellipsoid(1.9, 7, 1.7, 7.4),
		bare: () => ellipsoid(1.5, 6, 1.8, 7.2),
	},
	oak: {
		...TREES.oak,
		crown: () => mergePositions([ellipsoid(3.4, 8, 0.75, 5.4), ellipsoid(2.2, 6, 0.8, 6.9)]),
		bare: () => ellipsoid(2.9, 6, 0.8, 5.3),
	},
	// White acacia: a wide, flat-topped crown on a short trunk
	acacia: {
		...TREES.acacia,
		crown: () => ellipsoid(3.4, 7, 0.45, 5.4),
		bare: () => ellipsoid(2.8, 6, 0.45, 5.2),
	},
	// Alder: a dark, narrow egg
	alder: {
		...TREES.alder,
		crown: () => ellipsoid(1.7, 6, 1.9, 6.6),
		bare: () => ellipsoid(1.3, 6, 2, 6.4),
	},
	poplar: {
		...TREES.poplar,
		crown: () => ellipsoid(1.4, 6, 4.2, 8.6),
		bare: () => ellipsoid(1.1, 6, 4.2, 8.6),
	},
	willow: {
		...TREES.willow,
		crown: () => willow(1),
		bare: () => willow(0.82),
	},
	apple: {
		...TREES.apple,
		crown: () => ellipsoid(2.6, 7, 0.8, 3.6),
		bare: () => ellipsoid(2.1, 6, 0.85, 3.5),
	},
}

/** Spruce: three stacked cones, narrow and dark. */
function spruce(): THREE.BufferGeometry {
	return mergePositions([
		new THREE.ConeGeometry(2.4, 5, 7).translate(0, 4.6, 0),
		new THREE.ConeGeometry(1.8, 4.4, 7).translate(0, 7.4, 0),
		new THREE.ConeGeometry(1.1, 3.6, 7).translate(0, 10, 0),
	])
}

/** Larch: two open cones, scaled `k` about the trunk top for the bare winter crown. */
function larch(k: number): THREE.BufferGeometry {
	return mergePositions([
		new THREE.ConeGeometry(2.1 * k, 6, 6).translate(0, 6, 0),
		new THREE.ConeGeometry(1.2 * k, 4.2, 6).translate(0, 9.6, 0),
	])
}

/** Willow: a drooping skirt of branches under a low dome, scaled `k`. */
function willow(k: number): THREE.BufferGeometry {
	return mergePositions([
		new THREE.CylinderGeometry(2.3, 3.5, 4.2, 8, 1, true).translate(0, 3.5, 0),
		ellipsoid(2.6, 8, 0.7, 5.4),
	]).scale(k, k, k)
}

/** The crown a species wears in a season. */
export function crownGeometry(sp: TreeSpecies, season: Season): THREE.BufferGeometry {
	const d = SPECIES[sp]
	return season === 'winter' && d.bare ? d.bare() : d.crown()
}

/** Crown colour of one tree: summer greens with a little spread, autumn yellow to red, winter needles or branches. */
export function crownColor(sp: TreeSpecies, season: Season, rnd: () => number, out: THREE.Color): THREE.Color {
	const d = SPECIES[sp]
	// Evergreens have no autumn colour (lightness 0); a larch is a conifer that does
	if (season === 'autumn' && d.autumn[2] > 0) {
		const [h0, h1, l] = d.autumn
		return out.setHSL(h0 + rnd() * (h1 - h0), 0.65, l + rnd() * 0.12)
	}
	if (season === 'winter') return out.set(d.winter).offsetHSL(0, 0, (rnd() - 0.5) * 0.1)
	return out.set(d.leaf).offsetHSL((rnd() - 0.5) * 0.04, 0, (rnd() - 0.5) * 0.1)
}
