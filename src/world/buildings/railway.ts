import * as THREE from 'three'
import { RAIL, STRUCTURES } from '../../config'
import type { Terrain } from '../terrain'
import type { Railway } from '../terrain/railway'
import { C, type BuildContext } from './builder'

const { sleeperStep: SLEEPER_STEP, railSegment: RAIL_SEGMENT, gauge: GAUGE, wagon: WAGON } = STRUCTURES
const wagonPaint = STRUCTURES.wagonPaint.map((c) => new THREE.Color(c))
const steel = new THREE.Color(STRUCTURES.steel)

const nearBase = (t: Terrain, x: number, z: number) =>
	[...t.bases, ...(t.neutral ? [t.neutral] : [])].some(
		(b) => Math.hypot(b.x - x, b.z - z) < STRUCTURES.wagonBaseClear,
	)

/** Sleepers and rails along the track, and one or two goods trains standing on it (solid cover). */
export function railway(ctx: BuildContext, rw: Railway) {
	const { t, b } = ctx
	const rot = Math.atan2(-rw.dz, rw.dx) // builder's local x along the track
	const y = (s: number) => {
		const p = rw.at(s)
		return t.height(p.x, p.z)
	}
	for (let s = rw.s0 + 20; s < rw.s1 - 20; s += SLEEPER_STEP) {
		const p = rw.at(s)
		b.box(0.26, 0.16, 2.6, C.timber, p.x, y(s) + 0.05, p.z, rot)
	}
	for (let s = rw.s0 + 20; s < rw.s1 - 20; s += RAIL_SEGMENT) {
		const mid = s + RAIL_SEGMENT / 2
		const p = rw.at(mid)
		for (const side of [-1, 1]) {
			const x = p.x - rw.dz * side * (GAUGE / 2)
			const z = p.z + rw.dx * side * (GAUGE / 2)
			b.box(RAIL_SEGMENT + 0.05, 0.14, 0.1, steel, x, y(mid) + 0.2, z, rot)
		}
	}
	trains(ctx, rw, rot)
}

/** Goods wagons in a row at a random stretch of the track, clear of the crossings and of each other. */
function trains(ctx: BuildContext, rw: Railway, rot: number) {
	const { t, rnd } = ctx
	const [lo, hi] = RAIL.trains
	const n = lo + Math.floor(rnd() * (hi - lo + 1))
	const taken: [number, number][] = []
	for (let k = 0; k < n; k++) {
		for (let tries = 0; tries < 30; tries++) {
			const count = RAIL.wagons[0] + Math.floor(rnd() * (RAIL.wagons[1] - RAIL.wagons[0] + 1))
			const len = count * (WAGON.length + WAGON.gap)
			const s = rw.s0 + 60 + rnd() * (rw.s1 - rw.s0 - 120 - len)
			if (taken.some(([a, b]) => s < b + 30 && s + len > a - 30)) continue
			const clear = Array.from({ length: count + 1 }, (_, i) => rw.at(s + i * (WAGON.length + WAGON.gap)))
			if (clear.some((p) => t.roads.dist(p.x, p.z) < STRUCTURES.wagonRoadClear || nearBase(t, p.x, p.z))) continue
			taken.push([s, s + len])
			for (let i = 0; i < count; i++) wagon(ctx, rw, s + i * (WAGON.length + WAGON.gap) + WAGON.length / 2, rot)
			break
		}
	}
}

/** One boxcar: body, roof, a door, two bogies; a solid collider. */
function wagon(ctx: BuildContext, rw: Railway, s: number, rot: number) {
	const { t, b, rnd } = ctx
	const p = rw.at(s)
	const y0 = t.height(p.x, p.z) + 0.2
	const paint = wagonPaint[Math.floor(rnd() * wagonPaint.length)]
	const { length: L, width: W, height: H, wheels: Wh } = WAGON
	b.box(L, H, W, paint, p.x, y0 + Wh + H / 2, p.z, rot)
	b.box(L + 0.3, 0.25, W + 0.3, C.roofGrey, p.x, y0 + Wh + H + 0.1, p.z, rot)
	for (const side of [-1, 1]) {
		const dx = -rw.dz * side * (W / 2 + 0.02)
		const dz = rw.dx * side * (W / 2 + 0.02)
		b.box(2.2, H - 0.6, 0.06, C.timber, p.x + dx, y0 + Wh + H / 2 - 0.1, p.z + dz, rot)
	}
	for (const end of [-1, 1]) {
		const q = rw.at(s + end * (L / 2 - 2))
		b.box(2.6, Wh, W - 0.4, steel, q.x, y0 + Wh / 2, q.z, rot)
	}
	ctx.place('wagon', p.x, p.z, L, W, rot, y0, Wh + H + 0.2)
}
