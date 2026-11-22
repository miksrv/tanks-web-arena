import * as THREE from 'three'
import type { OutlinePoint, ShapeDef, TurretLook } from '../../config'
import { C, outlineEdgeAt, roofRun, scaleOutline, type TankBuilder } from './builder'

/** Where the gun pivots, in the frame of the part that carries it. */
export interface GunMount {
	y: number
	z: number
}

const DEFAULT_OUTLINE: OutlinePoint[] = [
	[0, 0],
	[1, 0],
	[0.9, 1],
	[0.05, 1],
]
const DEFAULT_LOOK: TurretLook = { kind: 'welded', outline: DEFAULT_OUTLINE }

export const turretLook = (s: ShapeDef): TurretLook => s.turretLook ?? DEFAULT_LOOK

/** Rocket launcher: a pedestal the rails or tubes pivot on; on a lorry it stands on the bed below the hull roof. */
function launcherPedestal(tb: TankBuilder, s: ShapeDef): GunMount {
	const bed = s.running.kind === 'truck' ? s.running.wheelR + 0.32 - (s.trackH * 0.72 + s.hullH) : 0
	const h = 0.3 - bed
	tb.box(s.tW * 0.5, h, 0.6, C.steel, 0, bed + h / 2, 0)
	return { y: 0.35, z: 0 }
}

/**
 * Roof fittings at height `roof`: the commander's cupola with its vision slits and lid, or a plain hatch (or the
 * T-34's twin hatches); periscopes and a ventilator toward the front edge `zFront` of a roof `rw` wide.
 */
function roofFittings(
	tb: TankBuilder,
	look: TurretLook,
	w: number,
	l: number,
	roof: number,
	z0: number,
	base: THREE.Color,
	rw: number,
	zFront: number,
) {
	if (look.twinHatches) {
		for (const x of [w * 0.2, -w * 0.2]) {
			tb.cyl(0.26, 0.28, 0.1, 8, base, x, roof + 0.05, z0 - l * 0.12, true)
			tb.box(0.16, 0.03, 0.04, C.steel, x, roof + 0.115, z0 - l * 0.12)
		}
	} else if (look.cupola) {
		const [cx, cz] = look.cupola
		const x = cx * w
		const z = z0 + cz * l
		tb.cyl(0.27, 0.31, 0.28, 8, base, x, roof + 0.12, z, true)
		tb.cyl(0.295, 0.305, 0.05, 8, C.window, x, roof + 0.17, z)
		tb.cyl(0.21, 0.23, 0.04, 8, base, x, roof + 0.28, z, true)
	} else {
		const x = w * 0.15
		const z = z0 - l * 0.15
		tb.cyl(0.25, 0.25, 0.07, 8, base, x, roof + 0.03, z, true)
		tb.box(0.16, 0.03, 0.04, C.steel, x, roof + 0.08, z)
		tb.box(0.22, 0.05, 0.06, C.steel, x, roof + 0.04, z - 0.25)
	}
	// Periscopes either side near the front edge, a ventilator between them, lifting eyes on the roof edges.
	const pz = zFront - 0.28
	for (const side of [1, -1]) {
		const px = side * rw * 0.27
		tb.box(0.16, 0.09, 0.12, base, px, roof + 0.045, pz, true)
		tb.box(0.12, 0.04, 0.02, C.window, px, roof + 0.06, pz + 0.065)
		tb.box(0.05, 0.07, 0.14, C.steel, side * (rw / 2 - 0.1), roof + 0.03, z0 - l * 0.02)
	}
	if (rw > 1.2) tb.cyl(0.13, 0.16, 0.05, 8, base, 0, roof + 0.025, pz - 0.12, true)
}

/** Rotating turret: welded from plates or a cast / faceted round one; cupola, stowage bin, Schürzen. */
function turret(tb: TankBuilder, s: ShapeDef, base: THREE.Color): GunMount {
	const { tW: tw, tL: tl, tH: th } = s
	const look = turretLook(s)
	const roofW = look.roofW ?? 1
	const mountY = th * (look.mountY ?? 0.5)
	let front: number
	let roofFront: number
	if (look.kind === 'round') {
		// Cast body: a faceted cylinder stretched to the turret length (less the bustle), flat face forward.
		const bustle = look.bustle ?? 0
		const n = look.facets ?? 12
		const bodyL = tl - bustle
		const g = new THREE.CylinderGeometry((tw / 2) * roofW, tw / 2, th, n)
		g.rotateY(Math.PI / n)
		g.scale(1, 1, bodyL / tw / Math.cos(Math.PI / n))
		const zc = bustle / 2
		tb.part(g, base, new THREE.Matrix4().makeTranslation(0, th / 2, zc), true)
		if (bustle > 0) {
			tb.prism(
				[
					[-tl / 2, th * 0.3],
					[zc - bodyL * 0.2, th * 0.1],
					[zc - bodyL * 0.2, th * 0.92],
					[-tl / 2 + 0.05, th * 0.85],
				],
				tw * 0.62,
				tw * 0.56,
				base,
			)
		}
		front = zc + bodyL / 2 - 0.1
		roofFront = zc + (bodyL / 2) * roofW
	} else {
		const o = scaleOutline(look.outline ?? DEFAULT_OUTLINE, tl, th)
		tb.prism(o, tw, tw * roofW, base)
		front = outlineEdgeAt(o, mountY, 1)
		roofFront = roofRun(o)[1]
		// Vision slits in the side plates
		const lean = Math.atan2((tw / 2) * (1 - roofW), th)
		const y = th * 0.7
		const x = (tw * (1 + (roofW - 1) * 0.7)) / 2 + 0.006
		for (const side of [1, -1]) tb.box(0.02, 0.05, 0.24, C.window, side * x, y, tl * 0.2, false, 0, 0, side * lean)
	}
	roofFittings(tb, look, tw, tl, th, 0, base, tw * roofW, roofFront)
	if (look.stowage) {
		tb.box(tw * 0.72, th * 0.5, 0.45, base, 0, th * 0.5, -tl / 2 - 0.18, true)
		tb.box(tw * 0.75, 0.03, 0.48, base, 0, th * 0.75 + 0.015, -tl / 2 - 0.18, true)
	}
	if (look.skirts) {
		for (const side of [1, -1])
			tb.box(0.04, th * 0.85, tl * 0.9, base, side * (tw / 2 + 0.2), th * 0.45, -0.1, true)
		tb.box(tw + 0.44, th * 0.85, 0.04, base, 0, th * 0.45, -tl / 2 - 0.5, true)
	}
	if (look.sideTracks) {
		for (const side of [1, -1]) {
			for (const z of [0.15, -0.45]) tb.box(0.06, 0.32, 0.5, C.track, side * (tw / 2 + 0.03), th * 0.55, z)
		}
	}
	return { y: mountY, z: front - 0.05 }
}

/**
 * Casemate on the hull roof (`top`): the superstructure plates, closed or an open fighting compartment, built into the
 * hull since it does not turn. Returns the gun pivot in hull coordinates.
 */
export function buildCasemate(b: TankBuilder, s: ShapeDef, top: number, base: THREE.Color): GunMount {
	const { tW: tw, tL: tl, tH: th } = s
	const look = turretLook(s)
	const o = scaleOutline(look.outline ?? DEFAULT_OUTLINE, tl, th, s.tZ, top)
	b.prism(o, tw, tw * (look.roofW ?? 1), base, 0, s.openTop ? C.interior : undefined)
	if (!s.openTop) roofFittings(b, look, tw, tl, top + th, s.tZ, base, tw * (look.roofW ?? 1), roofRun(o)[1])
	const y = top + th * (look.mountY ?? 0.55)
	return { y, z: outlineEdgeAt(o, y, 1) - (s.openTop ? 0.25 : 0.05) }
}

/** The turret or launcher pedestal (in the turret frame); returns where the gun is mounted. */
export function buildTurret(tb: TankBuilder, s: ShapeDef, base: THREE.Color): GunMount {
	return s.launcher ? launcherPedestal(tb, s) : turret(tb, s, base)
}
