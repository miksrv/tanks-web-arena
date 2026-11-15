import * as THREE from 'three'
import { AXIS_Y, gaussian } from '../core/math'

const side = new THREE.Vector3()
const upv = new THREE.Vector3()

/**
 * Turn `dir` (unit, in place) by a random angle inside the reticle: Gaussian in both axes, σ = `sigma` radians,
 * clamped to 2σ (the reticle radius).
 */
export function disperse(dir: THREE.Vector3, sigma: number): THREE.Vector3 {
	let a1 = gaussian() * sigma
	let a2 = gaussian() * sigma
	// Inside the reticle's circle, not the square around it
	const k = Math.hypot(a1, a2) / (2 * sigma)
	if (k > 1) {
		a1 /= k
		a2 /= k
	}
	side.crossVectors(dir, AXIS_Y).normalize()
	upv.crossVectors(side, dir).normalize()
	return dir.addScaledVector(side, Math.tan(a1)).addScaledVector(upv, Math.tan(a2)).normalize()
}

/**
 * Fall of a lobbed shell around the aim point, in metres across and along the line of fire: Gaussian in both, σ =
 * `sigma` metres, inside a circle of 2σ (the reticle drawn on the ground).
 */
export function scatter(sigma: number): { across: number; along: number } {
	let across = gaussian() * sigma
	let along = gaussian() * sigma
	const k = Math.hypot(across, along) / (2 * sigma)
	if (k > 1) {
		across /= k
		along /= k
	}
	return { across, along }
}
