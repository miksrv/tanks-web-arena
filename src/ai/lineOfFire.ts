import * as THREE from 'three'
import type { Tank, WorldRefs } from '../tank/tank'

const from = new THREE.Vector3()
const to = new THREE.Vector3()

/** The part of a target a gun can be laid on: the hull, or — with the hull behind a crest or a wall — the turret. */
export type GunSight = 'hull' | 'turret'

/** Middle of `t`'s turret (or casemate) in the world. */
export function turretPoint(t: Tank, out: THREE.Vector3): THREE.Vector3 {
	return out.set(t.turretBox.x, t.pos.y + t.view.hullTop + t.def.shape.tH * 0.5, t.turretBox.z)
}

/** Is the segment `from` → `to` clear of terrain, buildings and wrecks (other than `t` itself)? */
function clearTo(w: WorldRefs, t: Tank): boolean {
	if (!w.terrain.lineOfSight(from.x, from.y, from.z, to.x, to.y, to.z)) return false
	if (w.buildings.blocksLos(from.x, from.y, from.z, to.x, to.y, to.z)) return false
	// Wrecks stop shells too: a burnt-out hull between us and the target is not a shot
	for (const o of w.tanks) {
		if (o.alive || o === t || !o.nearSegment(from.x, from.z, to.x, to.z)) continue
		if (o.hullBox.raySegment(from.x, from.y, from.z, to.x, to.y, to.z) >= 0) return false
		if (o.turretBox.raySegment(from.x, from.y, from.z, to.x, to.y, to.z) >= 0) return false
	}
	return true
}

/**
 * What `me`'s gun can see of `t` (from the gun, not the cupola): its hull, else — hull-down behind a crest, a wall
 * or a wreck — its turret; null when neither.
 */
export function gunSight(w: WorldRefs, me: Tank, t: Tank): GunSight | null {
	from.set(me.pos.x, me.pos.y + me.view.hullTop + me.view.gun.position.y, me.pos.z)
	to.set(t.pos.x, t.pos.y + t.view.hullTop * 0.7, t.pos.z)
	if (clearTo(w, t)) return 'hull'
	turretPoint(t, to)
	return clearTo(w, t) ? 'turret' : null
}

/** Can `me`'s gun see `t` — terrain, buildings and wrecks in the way? */
export function gunHasLos(w: WorldRefs, me: Tank, t: Tank): boolean {
	return gunSight(w, me, t) !== null
}

/** Why there is no line of fire, for the debug readout (call after `gunHasLos` returned false). */
export function losBlocker(w: WorldRefs, me: Tank, t: Tank): 'los-bldg' | 'los-terrain' {
	from.set(me.pos.x, me.pos.y + me.view.hullTop + me.view.gun.position.y, me.pos.z)
	to.set(t.pos.x, t.pos.y + t.view.hullTop * 0.7, t.pos.z)
	return w.buildings.blocksLos(from.x, from.y, from.z, to.x, to.y, to.z) ? 'los-bldg' : 'los-terrain'
}

/** A living teammate of `me` on the line to `t`, nearer than `t`. */
export function friendInLine(w: WorldRefs, me: Tank, t: Tank, dist: number): boolean {
	from.set(me.pos.x, me.pos.y + me.view.hullTop + me.view.gun.position.y, me.pos.z)
	to.set(t.pos.x, t.pos.y + t.view.hullTop * 0.7, t.pos.z)
	for (const f of w.tanks) {
		if (f === me || f.team !== me.team || !f.alive) continue
		if (f.nearSegment(from.x, from.z, to.x, to.z) && Math.hypot(f.pos.x - me.pos.x, f.pos.z - me.pos.z) < dist) {
			return true
		}
	}
	return false
}
