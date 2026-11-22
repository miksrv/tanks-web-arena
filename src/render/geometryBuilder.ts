import * as THREE from 'three'
import { AXIS_Y, IDENTITY, UNIT_SCALE } from '../core/math'

/** Recolours a vertex at world-space (x, y, z): camouflage noise on top of the part's base colour. */
export type Painter = (x: number, y: number, z: number, base: THREE.Color, out: THREE.Color) => void

/** Placement matrix: translation plus a rotation about the vertical axis. */
export function placeY(x: number, y: number, z: number, rotY = 0): THREE.Matrix4 {
	return new THREE.Matrix4().compose(
		new THREE.Vector3(x, y, z),
		new THREE.Quaternion().setFromAxisAngle(AXIS_Y, rotY),
		UNIT_SCALE,
	)
}

/** Placement matrix: translation plus Euler rotation. */
export function placeEuler(x: number, y: number, z: number, rx: number, ry: number, rz: number): THREE.Matrix4 {
	return new THREE.Matrix4().compose(
		new THREE.Vector3(x, y, z),
		new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
		UNIT_SCALE,
	)
}

/** Extra vertex data for textured models. */
export interface SurfaceOptions {
	/**
	 * Texture coordinates by box projection, in metres: each triangle is projected along the axis its face looks
	 * down most, so a tiling texture lies on every plate without stretching (the texture's `repeat` sets its size).
	 */
	boxUv?: boolean
	/** Colours get a fourth component: 1 on painted parts, 0 elsewhere (the material's paint mask). */
	paintMask?: boolean
}

/**
 * Bakes many small primitives into one non-indexed geometry with per-vertex colour, so a whole village or a whole
 * tank part is a single draw call. Parts are transformed on the CPU when they are added.
 */
export class MergedGeometryBuilder {
	private readonly pos: number[] = []
	private readonly nrm: number[] = []
	private readonly col: number[] = []
	private readonly uv: number[] = []
	private readonly v = new THREE.Vector3()
	private readonly nm = new THREE.Matrix3()
	private readonly c = new THREE.Color()

	constructor(
		private readonly paint?: Painter,
		private readonly surface: SurfaceOptions = {},
	) {}

	/** Append `geo` (not consumed) transformed by `m`; `painted` runs the painter over every vertex. */
	add(geo: THREE.BufferGeometry, color: THREE.Color, m: THREE.Matrix4 = IDENTITY, painted = false) {
		const g = geo.index ? geo.toNonIndexed() : geo
		if (!g.attributes.normal) g.computeVertexNormals()
		const p = g.attributes.position
		const n = g.attributes.normal
		this.nm.getNormalMatrix(m)
		for (let i = 0; i < p.count; i++) {
			this.v.fromBufferAttribute(p, i).applyMatrix4(m)
			this.pos.push(this.v.x, this.v.y, this.v.z)
			if (painted && this.paint) this.paint(this.v.x, this.v.y, this.v.z, color, this.c)
			else this.c.copy(color)
			this.col.push(this.c.r, this.c.g, this.c.b)
			if (this.surface.paintMask) this.col.push(painted ? 1 : 0)
			this.v.fromBufferAttribute(n, i).applyMatrix3(this.nm).normalize()
			this.nrm.push(this.v.x, this.v.y, this.v.z)
			if (this.surface.boxUv && i % 3 === 2) this.projectTriangle()
		}
		if (g !== geo) g.dispose()
	}

	/** Box-projected texture coordinates of the triangle just added (its last nine position numbers). */
	private projectTriangle() {
		const p = this.pos
		const o = p.length - 9
		const ux = p[o + 3] - p[o]
		const uy = p[o + 4] - p[o + 1]
		const uz = p[o + 5] - p[o + 2]
		const vx = p[o + 6] - p[o]
		const vy = p[o + 7] - p[o + 1]
		const vz = p[o + 8] - p[o + 2]
		const nx = Math.abs(uy * vz - uz * vy)
		const ny = Math.abs(uz * vx - ux * vz)
		const nz = Math.abs(ux * vy - uy * vx)
		// Side plates take (z, y), the roof and the belly (x, z), front and rear plates (x, y)
		const [a, b] = nx >= ny && nx >= nz ? [2, 1] : ny >= nz ? [0, 2] : [0, 1]
		for (let k = 0; k < 9; k += 3) this.uv.push(p[o + k + a], p[o + k + b])
	}

	/** Append and dispose a temporary geometry. */
	protected addTemp(geo: THREE.BufferGeometry, color: THREE.Color, m: THREE.Matrix4, painted = false) {
		this.add(geo, color, m, painted)
		geo.dispose()
	}

	build(): THREE.BufferGeometry {
		const geo = new THREE.BufferGeometry()
		geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3))
		geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3))
		geo.setAttribute('color', new THREE.Float32BufferAttribute(this.col, this.surface.paintMask ? 4 : 3))
		if (this.surface.boxUv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2))
		return geo
	}
}

/** THREE colours built from a table of hex strings (config holds plain data). */
export function colorTable<K extends string>(hex: Record<K, string>): Record<K, THREE.Color> {
	const out = {} as Record<K, THREE.Color>
	for (const k in hex) out[k] = new THREE.Color(hex[k])
	return out
}
