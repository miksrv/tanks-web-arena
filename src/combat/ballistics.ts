import { GRAVITY, HOWITZER } from '../config'

// The howitzer arc law lives in config; re-exported for the modules that import it with the solver.
export { HOWITZER }

/**
 * Elevation (rad) to hit a point `dist` metres away and `dy` metres higher with muzzle speed v.
 * Returns the low arc (direct fire) or the high arc (howitzers); null when out of reach.
 */
export function solveElevation(dist: number, dy: number, v: number, high = false): number | null {
	const g = GRAVITY
	const v2 = v * v
	const disc = v2 * v2 - g * (g * dist * dist + 2 * dy * v2)
	if (disc < 0) return null
	const root = Math.sqrt(disc)
	return Math.atan((v2 + (high ? root : -root)) / (g * dist))
}

export function flightTime(dist: number, elev: number, v: number): number {
	return dist / (v * Math.cos(elev))
}

/** Max horizontal reach on flat ground. */
export function maxRange(v: number): number {
	return (v * v) / GRAVITY
}

/**
 * Muzzle-speed factor that carries a shell fired at elevation `elev` to `to` metres instead of `from` (the same
 * height `dy` above the muzzle): v² = g·R² / (2·cos²e·(R·tan e − dy)). 1 when either range is out of reach.
 */
export function rangeSpeedScale(elev: number, dy: number, from: number, to: number): number {
	const t = Math.tan(elev)
	const a = from * t - dy
	const b = to * t - dy
	if (a <= 0 || b <= 0 || to <= 0) return 1
	return (to / from) * Math.sqrt(a / b)
}
export interface HowitzerSolution {
	elev: number
	speed: number
	time: number
	vx: number
	vy: number
}
export function howitzerSolve(dist: number, dy: number): HowitzerSolution | null {
	if (dist > HOWITZER.maxRange) return null
	const d = Math.max(5, dist)
	const T = HOWITZER.minTime + d * HOWITZER.timePerMetre
	const vx = d / T
	const vy = (dy + 0.5 * HOWITZER.gravity * T * T) / T
	return { elev: Math.atan2(vy, vx), speed: Math.hypot(vx, vy), time: T, vx, vy }
}
