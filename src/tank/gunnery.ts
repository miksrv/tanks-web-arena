import * as THREE from 'three'
import { DRIVE } from '../config'
import { howitzerSolve, howitzerSpeed, solveElevation } from '../combat/ballistics'
import { AXIS_Y, wrapAngle } from '../core/math'
import { disperse, scatter } from './dispersion'
import type { Tank } from './tank'
import type { ShotParams } from './types'

// Gunnery of a tank: laying the turret and the gun on the aim point, the dispersion bloom, and the shot itself.

const { clamp } = THREE.MathUtils
const tmpDir = new THREE.Vector3()
const tmpQ = new THREE.Quaternion()
const tmpQ2 = new THREE.Quaternion()
const tmpE = new THREE.Euler()

/** One projectile along the barrel as it points right now, somewhere inside the dispersion circle. */
export function launch(me: Tank): ShotParams {
	const g = me.def.gun
	const am = me.ammoDef
	me.view.group.updateMatrixWorld(true)
	const origin = new THREE.Vector3()
	const dir = new THREE.Vector3()
	me.view.muzzle(origin, dir)
	const breech = me.view.breech(new THREE.Vector3())
	if (!g.salvo) me.view.recoil()
	const sigma = me.reticle / 100 / 2 // the circle's radius is 2σ at 100 m
	let speed = g.shellSpeed * am.speedMult
	if (g.howitzer) {
		// A lobbed shell scatters on the ground in a circle: across by the azimuth, along by the charge
		// The range is from the muzzle, where the shell starts, not from the hull centre
		const dy = me.aimTarget.y - origin.y
		const range = Math.max(5, Math.hypot(me.aimTarget.x - origin.x, me.aimTarget.z - origin.z))
		const s = scatter(sigma * range)
		dir.applyAxisAngle(AXIS_Y, s.across / range)
		speed = howitzerSpeed(me.pitchWant > g.elevMax, Math.asin(dir.y), dy, range, range + s.along)
	} else disperse(dir, sigma)
	me.bloom += g.bloomShot ?? DRIVE.bloomShot
	return {
		origin,
		breech,
		dir,
		speed,
		ammo: am,
		pen: me.shellPen,
		dmg: me.shellDmg,
		caliber: g.caliber,
		splash: me.splashRadius,
		howitzer: !!g.howitzer,
		rocket: !!g.salvo,
		shock: !!g.mortar,
	}
}

/** Turret traverse toward the aim point (within the arc for casemates) and the gun elevation for the range. */
export function layGun(me: Tank, dt: number) {
	const def = me.def
	const s = def.shape
	const want = wrapAngle(Math.atan2(me.aimTarget.x - me.pos.x, me.aimTarget.z - me.pos.z) - me.yaw)
	const arc = def.gun.arc
	const goal = s.turret ? want : clamp(want, -arc, arc)
	const d = wrapAngle(goal - me.turretYaw)
	const step = Math.sign(d) * Math.min(Math.abs(d), me.traverse * dt)
	me.turretRate = step / Math.max(dt, 1e-4)
	me.turretYaw = s.turret ? wrapAngle(me.turretYaw + step) : clamp(me.turretYaw + step, -arc, arc)
	const lastDist = me.aimDist
	me.pitchWant = elevationInTurretFrame(me)
	const wantPitch = clamp(me.pitchWant, def.gun.elevMin, def.gun.elevMax)
	const pitchStep = clamp(wantPitch - me.gunPitch, -DRIVE.gunPitchRate * dt, DRIVE.gunPitchRate * dt)
	me.gunPitch += pitchStep
	// A howitzer's barrel barely moves over hundreds of metres, so for it the range change itself is the angle
	const laid = def.gun.howitzer ? Math.abs(me.aimDist - lastDist) / Math.max(me.aimDist, 50) : Math.abs(pitchStep)
	me.elevRate = laid / Math.max(dt, 1e-4)
}

/**
 * Gun pitch that puts the shell on the aim point (and the range to it, into `aimDist`). The ballistic solution is a
 * world elevation; the gun pitches inside a turret that itself rides the hull's pitch and roll, so express that
 * direction in the turret frame.
 */
function elevationInTurretFrame(me: Tank): number {
	const def = me.def
	const dx = me.aimTarget.x - me.pos.x
	const dz = me.aimTarget.z - me.pos.z
	me.aimDist = Math.hypot(dx, dz)
	const muzzleY = me.pos.y + me.view.hullTop + me.view.gun.position.y
	const dy = me.aimTarget.y - muzzleY
	const solved = def.gun.howitzer
		? howitzerSolve(me.aimDist, dy)?.elev
		: solveElevation(Math.max(5, me.aimDist), dy, def.gun.shellSpeed * me.ammoDef.speedMult)
	const elev = solved ?? Math.atan2(dy, me.aimDist)
	const ty = me.worldTurretYaw
	const ce = Math.cos(elev)
	tmpDir.set(Math.sin(ty) * ce, Math.sin(elev), Math.cos(ty) * ce)
	tmpQ.setFromEuler(tmpE.set(-me.pitch, me.yaw, me.roll, 'YXZ'))
		.multiply(tmpQ2.setFromAxisAngle(AXIS_Y, me.turretYaw))
		.invert()
	tmpDir.applyQuaternion(tmpQ)
	return Math.atan2(tmpDir.y, Math.hypot(tmpDir.x, tmpDir.z))
}

/**
 * Bloom of the dispersion circle: grows with hull speed (the vehicle's whole spread at top speed), hull and turret
 * rotation and laying for range; shrinks back over the aim time.
 */
export function updateBloom(me: Tank, dt: number) {
	const moveBloom =
		me.aimSpread *
		(Math.abs(me.speed) / me.def.speed +
			DRIVE.bloomTurn * Math.abs(me.yawRate) +
			DRIVE.bloomTurret * (Math.abs(me.turretRate) + me.elevRate))
	const settle = Math.min(1, (DRIVE.bloomSettle / (me.def.gun.aimTime * me.crew.aim)) * dt)
	me.bloom = Math.min(DRIVE.maxBloom, Math.max(moveBloom, me.bloom - me.bloom * settle))
}
