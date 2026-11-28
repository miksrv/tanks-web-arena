import * as THREE from 'three'
import { SUSPENSION } from '../config'
import type { Crossing, Terrain } from '../world/terrain'

export interface HullPose {
	pitch: number
	roll: number
	/** Height of the hull origin. */
	y: number
}

const { maxRoll, trackSamples, trackInset, sink } = SUSPENSION

/**
 * Suspension: each track is sampled at five points along its length and a straight line is fitted through them,
 * so a bump under one road wheel tilts the hull a little instead of throwing it onto one track. The hull rides on
 * the two track lines: pitch from their mean slope, roll from the difference of their centre heights. A bridge
 * deck counts only while the hull centre is on it (then it is flat), so approaching a bridge never lifts one side.
 */
export function hullPose(
	t: Terrain,
	x: number,
	z: number,
	fx: number,
	fz: number,
	L: number,
	W: number,
	out: HullPose = { pitch: 0, roll: 0, y: 0 },
): HullPose {
	const deck = t.deckAt(x, z)
	const lx = fz
	const lz = -fx // left vector (+x of the model is the hull's left side)
	let cL = 0
	let cR = 0
	let slope = 0
	for (const side of SIDES) {
		const sx = x + lx * side * W * trackInset
		const sz = z + lz * side * W * trackInset
		fitLine(t, deck, sx, sz, fx, fz, L)
		if (side > 0) cL = line.c
		else cR = line.c
		slope += line.s / 2
	}
	out.pitch = Math.atan(slope)
	// Positive roll (rotation about the forward axis) lifts the left side
	out.roll = THREE.MathUtils.clamp(Math.atan2(cL - cR, W * trackInset * 2), -maxRoll, maxRoll)
	out.y = Math.max(groundAt(t, deck, x, z) - sink, (cL + cR) / 2)
	return out
}

const SIDES = [-1, 1] as const

/** What the tracks ride on at (x, z): the ground, or the bridge deck the hull centre is on where it is higher. */
function groundAt(t: Terrain, deck: Crossing | null, x: number, z: number): number {
	const g = t.ground(x, z)
	return deck && deck.h > g ? deck.h : g
}

/** The last fitted track line (reused: the suspension runs for every tank every frame). */
const line = { s: 0, c: 0 }

/** Least-squares line h = c + s·u through samples at u = −0.4L … 0.4L along the track, into `line`. */
function fitLine(t: Terrain, deck: Crossing | null, sx: number, sz: number, fx: number, fz: number, L: number) {
	let su = 0
	let sh = 0
	let suu = 0
	let suh = 0
	// trackSamples points spread evenly over −0.4L … 0.4L
	const n = trackSamples
	for (let i = 0; i < n; i++) {
		const u = (i / (n - 1) - 0.5) * L * 0.8
		const v = groundAt(t, deck, sx + fx * u, sz + fz * u)
		su += u
		sh += v
		suu += u * u
		suh += u * v
	}
	line.s = (n * suh - su * sh) / (n * suu - su * su)
	line.c = (sh - line.s * su) / n
}
