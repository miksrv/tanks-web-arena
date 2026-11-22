import * as THREE from 'three'
import { TANK_VIEW } from '../../config'
import type { Outline } from './builder'
import { TRACK_BELT_U, TRACK_TILE_LINKS } from './textures'
import type { TrackEnd, TrackRun } from './wheels'

/** Both track bands of a vehicle, and how the belt texture runs along them. */
export interface TrackMesh {
	geometry: THREE.BufferGeometry
	/** Texture tiles per metre of belt: a whole number of links goes round the band. */
	tilesPerMetre: number
}

/** Points of the band round one end wheel, from the ground side up to the top run (`dir` 1 = the front end). */
function endArc(e: TrackEnd, top: number, dir: 1 | -1): Outline {
	const n = TANK_VIEW.trackArc
	const r = e.r + 0.03
	const out: Outline = []
	for (let i = 0; i <= n; i++) {
		const a = (-1 + (2 * i) / n) * (Math.PI / 3)
		out.push([e.z + dir * r * Math.cos(a), Math.min(top, e.y + r * Math.sin(a))])
	}
	out.push([e.z + dir * r * 0.2, top])
	return out
}

/** Track band in the side view, counter-clockwise from the rear of the ground run. */
export function trackOutline(t: TrackRun): Outline {
	return [[t.groundRear, 0], [t.groundFront, 0], ...endArc(t.front, t.top, 1), ...endArc(t.rear, t.top, -1).reverse()]
}

/**
 * The two track bands as one textured mesh: the belt carries the link texture along its length (so it can run),
 * the sides of the band are its dark edge. `x` is the centre line of a track, `w` its width.
 */
export function buildTracks(run: TrackRun, x: number, w: number): TrackMesh {
	const o = trackOutline(run)
	const n = o.length
	let perimeter = 0
	for (let i = 0; i < n; i++) perimeter += Math.hypot(o[(i + 1) % n][0] - o[i][0], o[(i + 1) % n][1] - o[i][1])
	const tileLen = TANK_VIEW.trackPitch * TRACK_TILE_LINKS
	const tilesPerMetre = Math.max(1, Math.round(perimeter / tileLen)) / perimeter

	const pos: number[] = []
	const nrm: number[] = []
	const uv: number[] = []
	const a = new THREE.Vector3()
	const b = new THREE.Vector3()
	const c = new THREE.Vector3()
	const face = new THREE.Vector3()
	type P = [x: number, y: number, z: number, u: number, v: number]
	/** A triangle facing along `normal`, whatever order its corners come in. */
	const tri = (p: P, q: P, r: P, normal: THREE.Vector3) => {
		a.set(p[0], p[1], p[2])
		b.set(q[0], q[1], q[2])
		c.set(r[0], r[1], r[2])
		face.subVectors(b, a).cross(c.sub(a))
		for (const v of face.dot(normal) >= 0 ? [p, q, r] : [p, r, q]) {
			pos.push(v[0], v[1], v[2])
			nrm.push(normal.x, normal.y, normal.z)
			uv.push(v[3], v[4])
		}
	}
	const normal = new THREE.Vector3()
	const flat = THREE.ShapeUtils.triangulateShape(
		o.map(([z, y]) => new THREE.Vector2(z, y)),
		[],
	)
	const edgeU = (1 + TRACK_BELT_U) / 2
	for (const side of [1, -1]) {
		const x0 = side * x - w / 2
		const x1 = side * x + w / 2
		let s = 0
		for (let i = 0; i < n; i++) {
			const [z0, y0] = o[i]
			const [z1, y1] = o[(i + 1) % n]
			const len = Math.hypot(z1 - z0, y1 - y0)
			// The outline runs counter-clockwise in (z, y): its outside is to the right of the way it goes
			normal.set(0, -(z1 - z0) / len, (y1 - y0) / len)
			const v0 = s * tilesPerMetre
			const v1 = (s + len) * tilesPerMetre
			tri([x0, y0, z0, 0, v0], [x1, y0, z0, TRACK_BELT_U, v0], [x1, y1, z1, TRACK_BELT_U, v1], normal)
			tri([x0, y0, z0, 0, v0], [x1, y1, z1, TRACK_BELT_U, v1], [x0, y1, z1, 0, v1], normal)
			s += len
		}
		for (const cap of [x0, x1]) {
			normal.set(cap === x0 ? -1 : 1, 0, 0)
			for (const t of flat) {
				const [p, q, r] = t.map((i): P => [cap, o[i][1], o[i][0], edgeU, 0.5])
				tri(p, q, r, normal)
			}
		}
	}
	const geometry = new THREE.BufferGeometry()
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
	geometry.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
	geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
	return { geometry, tilesPerMetre }
}
