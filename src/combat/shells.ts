import * as THREE from 'three'
import { COMBAT, CREW, CREW_ROLES, GRAVITY, MORTAR } from '../config'
import type { ShotParams, Tank, WorldRefs } from '../tank/tank'
import { testShell, type HitResult, type ShellSpec } from './armor'
import { HOWITZER } from './ballistics'

interface Shell {
	x: number
	y: number
	z: number
	vx: number
	vy: number
	vz: number
	owner: Tank
	spec: ShellSpec
	he: boolean
	splash: number
	howitzer: boolean
	gravity: number
	life: number
	/** Distance flown, for the tracer length. */
	dist: number
	/** Rocket mortar round: leaves a smoke trail and bursts with a shock wave. */
	shock: boolean
	/** s until the next puff of its trail. */
	trail: number
	/** Where the first step is swept from (the gun's pivot), so a tank inside the barrel's reach is not passed through. */
	from: THREE.Vector3 | null
}

export interface Impact {
	x: number
	y: number
	z: number
	he: boolean
	splash: number
	/** The burst of a rocket mortar round. */
	shock: boolean
}

type ContactKind = 'tank' | 'wreck' | 'building' | 'ground'

/** The earliest thing a shell meets on this frame's step. */
interface Contact {
	t: number
	kind: ContactKind
	tank: Tank | null
	hit: HitResult | null
}

/** Shells in flight: segment-swept each frame against tanks (alive or wrecked), buildings, rocks and the ground. */
export class Shells {
	readonly lines: THREE.LineSegments
	readonly list: Shell[] = []
	private readonly pos = new Float32Array(COMBAT.maxShells * 6)
	/** Every shot, right after it is added (muzzle flash, sound, shake). */
	onFire?: (owner: Tank, shot: ShotParams) => void
	onTankHit?: (target: Tank, by: Tank, hit: HitResult, shell: ShellSpec) => void
	onImpact?: (imp: Impact, by: Tank) => void
	onSplashDamage?: (target: Tank, by: Tank, dmg: number) => void
	/** A puff of the smoke trail behind a rocket mortar round. */
	onTrail?: (x: number, y: number, z: number) => void
	/** Debug counters for balancing. */
	stats = { fired: 0, tank: 0, wreck: 0, building: 0, ground: 0, pen: 0, nonpen: 0, ricochet: 0, expired: 0 }

	constructor() {
		const geo = new THREE.BufferGeometry()
		geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3))
		geo.setDrawRange(0, 0)
		const mat = new THREE.LineBasicMaterial({ color: '#ffd080', transparent: true, opacity: 0.9 })
		this.lines = new THREE.LineSegments(geo, mat)
		this.lines.frustumCulled = false
	}

	fire(owner: Tank, p: ShotParams) {
		if (this.list.length >= COMBAT.maxShells) this.list.shift()
		this.stats.fired++
		this.list.push({
			x: p.origin.x,
			y: p.origin.y,
			z: p.origin.z,
			vx: p.dir.x * p.speed,
			vy: p.dir.y * p.speed,
			vz: p.dir.z * p.speed,
			owner,
			spec: { pen: p.pen, dmg: p.dmg, caliber: p.caliber, ammo: p.ammo },
			he: p.ammo.he,
			splash: p.splash,
			howitzer: p.howitzer,
			gravity: p.howitzer ? HOWITZER.gravity : GRAVITY,
			life: p.howitzer ? COMBAT.howitzerShellLife : p.shock ? MORTAR.shellLife : COMBAT.shellLife,
			dist: 0,
			shock: p.shock,
			trail: 0,
			from: p.breech,
		})
		this.onFire?.(owner, p)
	}

	update(dt: number, w: WorldRefs) {
		for (let i = this.list.length - 1; i >= 0; i--) {
			const s = this.list[i]
			// The barrel may already reach into a tank alongside: tanks only (a barrel poking through a wall or over
			// a rock is not a hit on it) from the gun's pivot to the muzzle, before the first step
			const from = s.from
			s.from = null
			if (from) {
				const c0 = this.sweepTanks(s, w, from.x, from.y, from.z, s.x, s.y, s.z, null)
				if (c0) {
					this.resolve(s, w, c0, from.x, from.y, from.z, s.x, s.y, s.z)
					this.list.splice(i, 1)
					continue
				}
			}
			const ax = s.x
			const ay = s.y
			const az = s.z
			// The exact parabola over the step, so the fall of shot does not depend on the frame rate
			const bx = s.x + s.vx * dt
			const by = s.y + s.vy * dt - 0.5 * s.gravity * dt * dt
			const bz = s.z + s.vz * dt
			s.vy -= s.gravity * dt
			s.life -= dt
			s.dist += Math.hypot(bx - s.x, by - s.y, bz - s.z)
			const c = this.sweep(s, w, ax, ay, az, bx, by, bz)
			if (!c) {
				s.x = bx
				s.y = by
				s.z = bz
				if (s.shock && (s.trail -= dt) <= 0) {
					s.trail = MORTAR.trailStep
					this.onTrail?.(s.x, s.y, s.z)
				}
				if (s.life <= 0 || Math.abs(s.x) > COMBAT.outOfWorld || Math.abs(s.z) > COMBAT.outOfWorld) {
					this.list.splice(i, 1)
					this.stats.expired++
				}
				continue
			}
			this.resolve(s, w, c, ax, ay, az, bx, by, bz)
			this.list.splice(i, 1)
		}
		this.writeTracers()
	}

	/** The shell meets `c` on the step a → b: the hit, the impact and the splash. */
	private resolve(
		s: Shell,
		w: WorldRefs,
		c: Contact,
		ax: number,
		ay: number,
		az: number,
		bx: number,
		by: number,
		bz: number,
	) {
		this.count(c)
		if (c.kind === 'tank' && c.tank && c.hit) this.applyHit(s, c.tank, c.hit)
		const imp: Impact = {
			x: ax + (bx - ax) * c.t,
			y: ay + (by - ay) * c.t,
			z: az + (bz - az) * c.t,
			he: s.he,
			splash: s.splash,
			shock: s.shock,
		}
		this.onImpact?.(imp, s.owner)
		if (s.he && s.splash > 0) this.splash(imp, s, w, c.tank)
	}

	/** The earliest tank or wreck on the step a → b (earlier than `best`, if given). */
	private sweepTanks(
		s: Shell,
		w: WorldRefs,
		ax: number,
		ay: number,
		az: number,
		bx: number,
		by: number,
		bz: number,
		best: Contact | null,
	): Contact | null {
		for (const t of w.tanks) {
			if (t === s.owner || !t.nearSegment(ax, az, bx, bz)) continue
			const h = testShell(t, ax, ay, az, bx, by, bz, s.spec)
			if (h && h.t < (best?.t ?? 2)) best = { t: h.t, kind: t.alive ? 'tank' : 'wreck', tank: t, hit: h }
		}
		return best
	}

	/** The earliest contact on the step a → b: tanks and wrecks, buildings, the ground, then rocks. */
	private sweep(
		s: Shell,
		w: WorldRefs,
		ax: number,
		ay: number,
		az: number,
		bx: number,
		by: number,
		bz: number,
	): Contact | null {
		let best = this.sweepTanks(s, w, ax, ay, az, bx, by, bz, null)
		const tb = w.buildings.raySegment(ax, ay, az, bx, by, bz)
		// A wall or the ground in front of a tank: the tank behind it is not the one hit (and takes the blast)
		if (tb >= 0 && tb < (best?.t ?? 2)) best = { t: tb, kind: 'building', tank: null, hit: null }
		const tg = this.groundContact(w, ax, ay, az, bx, by, bz)
		if (tg >= 0 && tg < (best?.t ?? 2)) best = { t: tg, kind: 'ground', tank: null, hit: null }
		// Rocks: on the way to whatever the shell reaches this step, not only on a step that reaches nothing
		const k = best?.t ?? 1
		const ex = ax + (bx - ax) * k
		const ey = ay + (by - ay) * k
		const ez = az + (bz - az) * k
		const tr = k > 0 ? w.props.rockContact(ax, ay, az, ex, ey, ez) : -1
		if (tr >= 0) best = { t: k * tr, kind: 'building', tank: null, hit: null }
		return best
	}

	/**
	 * Where the step first goes under the ground (parameter 0..1), or −1: sampled every `groundStep`, then the
	 * crossing is narrowed down between the last sample above and the first below, so the burst is on the surface.
	 */
	private groundContact(w: WorldRefs, ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
		const below = (tt: number) => ay + (by - ay) * tt < w.terrain.height(ax + (bx - ax) * tt, az + (bz - az) * tt)
		const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / COMBAT.groundStep))
		for (let k = 1; k <= steps; k++) {
			if (!below(k / steps)) continue
			let lo = (k - 1) / steps
			let hi = k / steps
			for (let i = 0; i < COMBAT.groundRefine; i++) {
				const mid = (lo + hi) / 2
				if (below(mid)) hi = mid
				else lo = mid
			}
			return hi
		}
		return -1
	}

	private count(c: Contact) {
		this.stats[c.kind]++
		if (c.kind !== 'tank' || !c.hit) return
		if (c.hit.ricochet) this.stats.ricochet++
		else if (c.hit.penetrated) this.stats.pen++
		else this.stats.nonpen++
	}

	/** Damage and module effects of a direct hit on a live tank. */
	private applyHit(s: Shell, target: Tank, hit: HitResult) {
		this.tally(s, target, hit)
		if (hit.damage > 0) {
			if (hit.tracked && target.tracked <= 0) target.tracked = COMBAT.trackRepair
			if (hit.fire && target.burning <= 0) target.burning = COMBAT.fireTime
			if (hit.gunHit) target.gunDamaged = COMBAT.gunDamageTime
			if (hit.engine) target.engineDamaged = COMBAT.engineTime
			if (hit.ring) target.ringDamaged = COMBAT.ringTime
			if (hit.crew) target.crew.wound(hit.crew)
			if (hit.ammoRack === 'damaged') target.rackDamaged = COMBAT.rackDamageTime
			// A detonation takes whatever is left of the tank
			if (hit.ammoRack === 'boom') {
				target.detonated = true
				hit.damage = Math.max(hit.damage, target.hp)
			}
			target.damage(hit.damage, s.owner)
		} else if (hit.tracked && target.tracked <= 0 && hit.part === 'tracks') {
			target.tracked = COMBAT.trackRepair
		}
		this.onTankHit?.(target, s.owner, hit, s.spec)
	}

	/** The shooter's and the target's battle stats for a direct hit. */
	private tally(s: Shell, target: Tank, hit: HitResult) {
		const by = s.owner.stats
		const enemy = s.owner.team !== target.team
		if (enemy && hit.penetrated) {
			by.pens++
			if (Math.hypot(target.pos.x - s.owner.pos.x, target.pos.z - s.owner.pos.z) >= COMBAT.longShot) by.longPens++
			if (hit.crew || hit.ammoRack || hit.gunHit || hit.engine || hit.ring) by.crits++
			if (hit.fire && target.burning <= 0) by.fires++
		}
		if (enemy && hit.tracked && target.tracked <= 0) by.tracks++
		if (enemy && !hit.penetrated && hit.part !== 'tracks' && hit.damage < s.spec.dmg) {
			target.stats.blocked += s.spec.dmg - hit.damage
			target.stats.blockedHits++
		}
	}

	/**
	 * HE blast: every tank within the radius takes falling damage through its roof armour. A rocket mortar round adds
	 * a shock wave: tracks and crews suffer far more often, even where the armour took all the damage, and the trees
	 * around go down.
	 */
	private splash(imp: Impact, s: Shell, w: WorldRefs, direct: Tank | null) {
		if (s.shock) w.props.blast(imp.x, imp.z, s.splash * MORTAR.fellRadius)
		const trackChance = s.shock ? MORTAR.trackChance : COMBAT.splashTrackChance
		const crewChance = s.shock ? MORTAR.crewChance : CREW.splashChance
		for (const t of w.tanks) {
			if (!t.alive || t === direct) continue
			// Height counts too: a burst on a roof or a cliff top is far from a tank below it
			const top = t.pos.y + t.view.hullTop + t.def.shape.tH
			const dy = imp.y < t.pos.y ? t.pos.y - imp.y : imp.y > top ? imp.y - top : 0
			const d = Math.hypot(t.pos.x - imp.x, dy, t.pos.z - imp.z) - t.radius * COMBAT.splashHullShare
			if (d > s.splash) continue
			const k = 1 - Math.max(0, d) / s.splash
			const raw = s.spec.dmg * COMBAT.splashDamage * k * (1 + (Math.random() - 0.5) * COMBAT.splashRng)
			const dmg = Math.max(0, raw - t.def.armor.top * COMBAT.heArmorFactor)
			if (dmg <= 0 && !s.shock) continue
			if (Math.random() < trackChance * k && t.tracked <= 0) t.tracked = COMBAT.trackRepair
			const crewK = crewChance * k * (t.def.shape.openTop ? CREW.openTopSplash : 1)
			if (Math.random() < crewK) t.crew.wound(CREW_ROLES[Math.floor(Math.random() * CREW_ROLES.length)])
			if (dmg <= 0) continue
			t.damage(dmg, s.owner)
			this.onSplashDamage?.(t, s.owner, dmg)
		}
	}

	/** Tracer streaks behind every shell in flight. */
	private writeTracers() {
		const arr = this.pos
		let k = 0
		for (const s of this.list) {
			if (k >= COMBAT.maxShells) break
			const v = Math.hypot(s.vx, s.vy, s.vz) || 1
			const tl = Math.min(COMBAT.tracerLen, s.dist)
			const o = k * 6
			arr[o] = s.x
			arr[o + 1] = s.y
			arr[o + 2] = s.z
			arr[o + 3] = s.x - (s.vx / v) * tl
			arr[o + 4] = s.y - (s.vy / v) * tl
			arr[o + 5] = s.z - (s.vz / v) * tl
			k++
		}
		const g = this.lines.geometry
		g.setDrawRange(0, k * 2)
		;(g.attributes.position as THREE.BufferAttribute).needsUpdate = true
	}
}
