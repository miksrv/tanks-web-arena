import * as THREE from 'three'
import type { Nation } from '../../config'
import { C, outlineEdgeAt, plateAt, roofRun, type HullDims, type TankBuilder } from './builder'
import type { TrackRun, WheelLayout } from './wheels'

/** Lorry (ZiS-6): ladder frame, long bonnet with the radiator, the cab behind it and mudguards over every axle. */
function truckHull(b: TankBuilder, d: HullDims, base: THREE.Color, w: WheelLayout) {
	const s = d.shape
	const L = s.hullL
	const W = s.hullW
	const r = s.running.wheelR
	const frameY = r + 0.12
	const nose = L / 2
	const bonnetL = 1.45
	const cabL = 1.35
	const cabZ = nose - bonnetL - cabL / 2
	b.box(W * 0.45, 0.22, L * 0.97, C.steel, 0, frameY, -0.05)
	// Bonnet narrowing to the radiator, the grille in front and the bumper below.
	b.prism(
		[
			[nose - bonnetL, frameY],
			[nose - 0.05, frameY],
			[nose - 0.05, frameY + 0.85],
			[nose - bonnetL, frameY + 0.95],
		],
		W * 0.5,
		W * 0.42,
		base,
	)
	b.box(W * 0.4, 0.7, 0.05, C.window, 0, frameY + 0.45, nose - 0.03)
	b.box(W * 0.85, 0.12, 0.12, C.steel, 0, frameY - 0.05, nose + 0.05)
	// Cab: sloped windscreen, roof, side windows.
	b.prism(
		[
			[cabZ - cabL / 2, frameY],
			[cabZ + cabL / 2, frameY],
			[cabZ + cabL / 2, frameY + 1.05],
			[cabZ + cabL / 2 - 0.2, frameY + 1.6],
			[cabZ - cabL / 2, frameY + 1.6],
		],
		W * 0.88,
		W * 0.84,
		base,
	)
	b.box(W * 0.7, 0.45, 0.04, C.window, 0, frameY + 1.32, cabZ + cabL / 2 - 0.08, false, 0, -0.38)
	for (const side of [1, -1]) b.box(0.04, 0.4, cabL * 0.45, C.window, side * W * 0.43, frameY + 1.3, cabZ + 0.1)
	b.cyl(0.11, 0.11, 0.1, 8, C.white, W * 0.32, frameY + 0.85, nose - bonnetL * 0.25, false, Math.PI / 2)
	// Mudguards: a curved one over the front wheel, flat plates over the rear bogie; a running board under the cab.
	for (const side of [1, -1]) {
		const x = side * (W / 2 - 0.2)
		const front = w.wheels.find((wh) => wh.side === side)
		if (front) {
			b.prism(
				[
					[front.z - r * 1.3, r * 1.25],
					[front.z - r * 0.6, r * 2.1],
					[front.z + r * 0.6, r * 2.1],
					[front.z + r * 1.3, r * 1.4],
					[front.z + r * 1.3, r * 1.55],
					[front.z + r * 0.65, r * 2.2],
					[front.z - r * 0.65, r * 2.2],
					[front.z - r * 1.4, r * 1.35],
				],
				0.42,
				0.42,
				base,
				x,
			)
		}
		b.box(0.36, 0.05, cabL, C.steel, x, r * 1.25, cabZ)
		b.box(0.5, 0.05, L * 0.3, C.steel, side * (W / 2 - 0.22), r * 2.15, -L * 0.3)
	}
	b.box(W * 0.8, 0.1, L * 0.42, C.wood, 0, frameY + 0.15, -L * 0.24)
}

/** Engine deck between `z0` and `z1` of a roof `w` wide: air grilles with their slats and the engine hatch. */
function engineDeck(b: TankBuilder, nation: Nation, base: THREE.Color, top: number, w: number, z0: number, z1: number) {
	const len = z1 - z0
	const zc = (z0 + z1) / 2
	const slats = (x: number, z: number, gw: number, gl: number) => {
		b.box(gw, 0.025, gl, C.grille, x, top + 0.012, z)
		const n = Math.max(2, Math.round(gl / 0.15))
		for (let i = 0; i < n; i++) b.box(gw, 0.035, 0.035, base, x, top + 0.03, z + ((i + 0.5) / n - 0.5) * gl, true)
	}
	if (nation === 'germany') {
		// Intake and outlet grilles along both sides, the engine hatch between them
		const gl = Math.min(len * 0.42, 0.9)
		const rows = len > 1.5 ? [-0.25, 0.25] : [0]
		for (const side of [1, -1]) for (const r of rows) slats(side * w * 0.33, zc + r * len, w * 0.24, gl)
		b.box(w * 0.32, 0.045, Math.min(len * 0.82, 1.5), base, 0, top + 0.022, zc, true)
		for (const dz of [-0.2, 0.2]) b.box(0.08, 0.03, 0.05, C.steel, w * 0.17, top + 0.05, zc + dz * len)
	} else {
		// Louvres over the transmission at the rear, the engine hatch ahead of them, intakes down the sides
		slats(0, z0 + len * 0.2, w * 0.74, len * 0.32)
		b.box(w * 0.44, 0.06, len * 0.46, base, 0, top + 0.03, z0 + len * 0.68, true)
		b.box(0.2, 0.03, 0.04, C.steel, 0, top + 0.075, z0 + len * 0.55)
		for (const side of [1, -1])
			b.box(w * 0.13, 0.03, len * 0.46, C.grille, side * w * 0.38, top + 0.015, z0 + len * 0.68)
	}
}

/** Crew hatches on the roof ahead of the turret, each with its periscope. */
function roofHatches(b: TankBuilder, base: THREE.Color, top: number, w: number, z0: number, z1: number) {
	const len = z1 - z0
	const hl = Math.min(0.5, len * 0.85)
	for (const side of [1, -1]) {
		const x = side * w * 0.27
		b.box(Math.min(0.55, w * 0.27), 0.035, hl, base, x, top + 0.017, z0 + hl / 2 + 0.03, true)
		if (len < 0.75) continue
		b.box(0.17, 0.08, 0.1, base, x, top + 0.04, z1 - 0.08, true)
		b.box(0.13, 0.04, 0.02, C.window, x, top + 0.05, z1 - 0.025)
	}
}

/** What the fitting builders of a tracked hull share. */
interface HullParts {
	b: TankBuilder
	d: HullDims
	base: THREE.Color
	nation: Nation
	/** Roof width, m. */
	roofW: number
	/** How far the side plates lean in, rad. */
	sideLean: number
	/** Half the hull width at height y. */
	halfAt: (y: number) => number
}

/** Fenders with mud flaps at both ends, Schürzen in separate plates, return rollers, a tool box. */
function fenders({ b, d, base }: HullParts, w: WheelLayout, t: TrackRun) {
	const { hullL: L, hullW: W, trackH: TH, hullLook: look } = d.shape
	const { y0, sideH, trackW } = d
	const z0 = t.rear.z - t.rear.r
	const z1 = t.front.z + t.front.r
	const flap = 0.3
	for (const side of [1, -1]) {
		const x = side * (W / 2 - trackW / 2)
		const fx = x + side * 0.03
		const fy = t.top + 0.03
		b.box(trackW + 0.1, 0.05, z1 - z0 + 0.1, base, fx, fy, (z0 + z1) / 2, true)
		for (const end of [1, -1]) {
			const z = (end > 0 ? z1 : z0) + end * (0.05 + (flap / 2) * Math.cos(0.7))
			b.box(trackW + 0.1, 0.04, flap, base, fx, fy - (flap / 2) * Math.sin(0.7), z, true, 0, end * 0.7)
		}
		if (look.skirts) {
			const sy0 = TH * 0.42
			const sy1 = y0 + sideH * 0.5
			const plates = 5
			const pl = (L * 0.84) / plates
			for (let i = 0; i < plates; i++) {
				const z = -L * 0.03 + (i - (plates - 1) / 2) * pl
				b.box(0.04, sy1 - sy0, pl - 0.035, base, side * (W / 2 + 0.1), (sy0 + sy1) / 2, z, true)
			}
			b.box(0.05, 0.05, L * 0.84, base, side * (W / 2 + 0.06), sy1 - 0.06, -L * 0.03, true) // hanger rail
		}
		for (const r of w.rollers) {
			b.cyl(r.r, r.r, 0.1, 8, base, x + side * (trackW / 2 - 0.02), r.y, r.z, true, 0, Math.PI / 2)
		}
	}
	if (d.shape.running.kind === 'halftrack') {
		const fw = w.wheels[0]
		for (const side of [1, -1]) {
			const x = side * Math.abs(fw.x)
			b.box(0.42, 0.05, fw.r * 2.6, base, x, fw.r * 2.05, fw.z, true)
			b.box(0.42, 0.05, 0.5, base, x, fw.r * 1.75, fw.z + fw.r * 1.45, true, 0, -0.6)
		}
	}
	if (!look.skirts) b.box(0.3, 0.2, 1.0, base, W / 2 - trackW / 2, t.top + 0.13, -L * 0.18, true)
}

/** Rear plate: a muffler drum across it (German) or two pipes either side of the transmission hatch (Soviet). */
function rearPlate({ b, d, base, nation }: HullParts) {
	const W = d.shape.hullW
	const y = d.y0 + d.sideH * 0.45
	const rear = plateAt(d.outline, y, -1)
	if (nation === 'germany') {
		b.cyl(0.15, 0.15, W * 0.36, 8, C.steel, 0, y, rear.z - 0.2, false, 0, Math.PI / 2)
		for (const x of [-W * 0.13, W * 0.13]) b.box(0.06, 0.08, 0.12, C.steel, x, y, rear.z - 0.05)
		return
	}
	for (const x of [-W * 0.22, W * 0.22]) b.cyl(0.09, 0.09, 0.45, 6, C.steel, x, y, rear.z - 0.15, false, Math.PI / 2)
	if (d.sideH <= 0.5) return
	const hatchY = y + rear.ny * 0.02
	b.cyl(0.27, 0.27, 0.05, 10, base, 0, hatchY, rear.z + rear.nz * 0.02, true, rear.lean - Math.PI / 2)
}

/**
 * Front plate: the driver's visor (a hatch in a sloped Soviet glacis) on the left, the bow machine gun on the right,
 * headlights and spare track links lower down.
 */
function frontPlate({ b, d, base, nation, halfAt }: HullParts) {
	const { y0, sideH, outline } = d
	const look = d.shape.hullLook
	const W = d.shape.hullW
	const y = y0 + sideH * (look.spareTracks ? 0.8 : 0.7)
	const front = plateAt(outline, y, 1)
	if (Math.abs(front.lean) < 1.2) {
		const hw = halfAt(y)
		const on = (bw: number, bh: number, bt: number, color: THREE.Color, x: number, painted: boolean, out = 0) => {
			const k = out + bt / 2
			b.box(bw, bh, bt, color, x, y + front.ny * k, front.z + front.nz * k, painted, 0, front.lean)
		}
		if (nation === 'ussr' && front.lean < -0.45) {
			on(Math.min(0.62, hw * 0.6), 0.5, 0.05, base, hw * 0.4, true)
			on(0.3, 0.05, 0.05, C.steel, hw * 0.4, false, 0.03)
		} else {
			on(Math.min(0.44, hw * 0.5), 0.17, 0.07, base, hw * 0.45, true)
			on(Math.min(0.3, hw * 0.36), 0.035, 0.02, C.window, hw * 0.45, false, 0.06)
		}
		if (look.bowMg) {
			const mz = front.z + front.nz * 0.02
			const my = y + front.ny * 0.02
			const ball = new THREE.Matrix4().makeTranslation(-hw * 0.48, my, mz)
			b.part(new THREE.SphereGeometry(0.14, 8, 6), base, ball, true)
			b.cyl(0.022, 0.022, 0.42, 5, C.steel, -hw * 0.48, my, mz + 0.26, false, Math.PI / 2)
		}
	}
	const hlY = y0 + sideH * 0.35
	const hlZ = outlineEdgeAt(outline, hlY, 1) + 0.04
	for (const x of nation === 'germany' ? [W * 0.32, -W * 0.32] : [W * 0.32]) {
		b.cyl(0.11, 0.11, 0.12, 8, C.white, x, hlY, hlZ, false, Math.PI / 2)
		b.cyl(0.13, 0.13, 0.1, 8, base, x, hlY, hlZ - 0.03, true, Math.PI / 2)
	}
	if (look.spareTracks) {
		const ly = y0 + sideH * 0.3
		const z = outlineEdgeAt(outline, ly, 1)
		const h = Math.min(0.5, sideH * 0.55)
		for (let i = 0; i < 4; i++) b.box(0.32, h, 0.08, C.track, (i - 1.5) * 0.36, ly, z + 0.03, false, 0, 0.25)
	}
}

/** Side plates: a tow cable on the left, a shovel and a crowbar on the right, fuel drums at the rear. */
function sidePlates({ b, d, base, roofW, sideLean, halfAt }: HullParts) {
	const { y0, sideH, outline } = d
	const { hullL: L, hullW: W, hullLook: look } = d.shape
	if (sideH > 0.4) {
		const y = y0 + sideH * 0.84
		const len = Math.min(L * 0.3, 1.9)
		const zc = outlineEdgeAt(outline, y, 1) - 0.2 - len / 2
		const x = halfAt(y) + 0.025
		const dx = Math.sin(sideLean) * 0.1
		const dy = Math.cos(sideLean) * 0.1
		b.box(0.035, 0.035, len, C.steel, x, y, zc, false, 0, 0, sideLean)
		for (const end of [1, -1]) b.box(0.035, 0.11, 0.16, C.steel, x, y, zc + (end * len) / 2, false, 0, 0, sideLean)
		b.box(0.03, 0.03, len * 0.75, C.wood, -x, y, zc, false, 0, 0, -sideLean)
		b.box(0.03, 0.17, 0.24, C.steel, -x, y, zc + len * 0.45, false, 0, 0, -sideLean)
		b.box(0.025, 0.025, len, C.steel, -x - dx, y - dy, zc, false, 0, 0, -sideLean)
	}
	// Cylindrical fuel tanks lying along the sloped side plates at the rear, strapped down.
	const y = y0 + sideH * 0.45
	const x = (W + (roofW - W) * 0.45) / 2 + 0.12
	for (let i = 0; i < (look.drums ?? 0); i++) {
		const z = -L * 0.38 + i * 0.95
		for (const side of [1, -1]) {
			b.cyl(0.19, 0.19, 0.8, 8, base, side * x, y, z, true, Math.PI / 2)
			for (const dz of [-0.25, 0.25]) b.box(0.04, 0.4, 0.05, C.steel, side * (x + 0.01), y, z + dz)
		}
	}
}

/** Roof: the engine deck behind the turret or casemate (ahead of a rear casemate), crew hatches, the antenna. */
function roof({ b, d, base, nation, roofW }: HullParts) {
	const s = d.shape
	const [roofR, roofF] = roofRun(d.outline)
	const rearEnd = Math.min(roofF - 0.1, s.tZ - s.tL / 2 - 0.12)
	let frontStart = Math.max(roofR + 0.1, s.tZ + s.tL / 2 + 0.12)
	const frontEnd = roofF - 0.08
	if (rearEnd - roofR > 0.8) engineDeck(b, nation, base, d.top, roofW, roofR + 0.1, rearEnd)
	else if (frontEnd - frontStart > 2.2) {
		engineDeck(b, nation, base, d.top, roofW, frontStart, frontEnd - 0.8)
		frontStart = frontEnd - 0.7
	}
	if (frontEnd - frontStart > 0.45) roofHatches(b, base, d.top, roofW, frontStart, frontEnd)
	b.cyl(0.015, 0.015, 2.2, 3, C.steel, -roofW * 0.4, d.top + 1.1, -s.hullL * 0.32)
	b.cyl(0.04, 0.05, 0.12, 5, C.steel, -roofW * 0.4, d.top + 0.06, -s.hullL * 0.32)
}

/**
 * Upper hull from its side outline (sloped side plates narrow it toward the roof), the lower hull and nose plate
 * between the tracks, then the fittings. The track bands are a mesh of their own (`tracks.ts`).
 */
function trackedHull(b: TankBuilder, d: HullDims, base: THREE.Color, w: WheelLayout, nation: Nation) {
	const s = d.shape
	const W = s.hullW
	const { y0, sideH, trackW, outline } = d
	const roofW = W * (s.hullLook.roofW ?? 1)
	const t = w.track
	if (!t) return
	b.prism(outline, W, roofW, base)

	// Lower hull: the nose plate runs from the upper hull's nose down to the belly.
	const belly = s.trackH * 0.22
	const noseZ = outlineEdgeAt(outline, y0 + 0.01, 1)
	const tailZ = outlineEdgeAt(outline, y0 + 0.01, -1)
	b.prism(
		[
			[tailZ + 0.25, belly],
			[noseZ - (s.hullLook.lowerNose ?? 0.35), belly],
			[noseZ, y0 + 0.02],
			[tailZ, y0 + 0.02],
		],
		W - 2 * trackW + 0.02,
		W - 2 * trackW + 0.02,
		base,
	)
	// Towing eyes on the nose and the tail.
	for (const x of [-W * 0.3, W * 0.3]) {
		b.box(0.2, 0.16, 0.25, C.steel, x, y0 - 0.05, noseZ + 0.02)
		b.box(0.16, 0.14, 0.2, C.steel, x, y0 - 0.08, tailZ - 0.02)
	}

	const parts: HullParts = {
		b,
		d,
		base,
		nation,
		roofW,
		sideLean: Math.atan2((W - roofW) / 2, sideH),
		halfAt: (y) => (W + ((roofW - W) * (y - y0)) / sideH) / 2,
	}
	fenders(parts, w, t)
	rearPlate(parts)
	frontPlate(parts)
	sidePlates(parts)
	roof(parts)
}

export function buildHull(b: TankBuilder, d: HullDims, base: THREE.Color, w: WheelLayout, nation: Nation) {
	if (d.shape.running.kind === 'truck') truckHull(b, d, base, w)
	else trackedHull(b, d, base, w, nation)
}
