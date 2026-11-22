import * as THREE from 'three'
import {
	AMMO,
	COMBAT,
	DRIVE,
	MORTAR,
	SPOTTING,
	SUSPENSION,
	type AmmoId,
	type PaintSeason,
	type TankDef,
} from '../config'
import { wrapAngle } from '../core/math'
import { type OBB } from '../world/obb'
import type { Props } from '../world/props'
import type { Terrain } from '../world/terrain'
import { AmmoRack } from './ammo'
import { createBoxes, placeBoxes } from './hitBoxes'
import { resolveCollisions } from './collisions'
import { Crew, freshStats } from './crew'
import { drive } from './drive'
import { launch, layGun, updateBloom } from './gunnery'
import { hullPose } from './suspension'
import { TankView } from './tankView'
import type { ShotParams, WorldRefs } from './types'

export type { ShotParams, WorldRefs } from './types'

const { clamp } = THREE.MathUtils

let nextUid = 0

/**
 * A vehicle: its state, modules and consumables, ammunition and firing. Driving is in `drive.ts`, laying the gun,
 * the reticle bloom and the shot itself in `gunnery.ts`, collisions in `collisions.ts`.
 */
export class Tank {
	/** Creation order; pairwise effects (ramming) are resolved once, by the lower uid. */
	readonly uid = nextUid++
	pos = new THREE.Vector3()
	/** Hull heading; forward = (sin yaw, 0, cos yaw). */
	yaw = 0
	/** Cached forward vector. */
	fx = 0
	fz = 1
	/** m/s along forward (negative = reverse). */
	speed = 0
	yawRate = 0
	/** Relative to the hull. */
	turretYaw = 0
	gunPitch = 0
	/** Gun pitch (turret frame) the aim point needs, before the mount's limits; `gunPitch` chases its clamped value. */
	pitchWant = 0
	/** s the hull has stood still (artillery picks such targets). */
	stillTime = 0
	/** World point the gun is laid on. */
	aimTarget = new THREE.Vector3()
	aimDist = 100
	/** Driver inputs, −1..1. */
	throttle = 0
	steer = 0
	hp: number
	alive = true
	reload = 0
	/** Length of the reload in progress (the HUD ring's full circle). */
	reloadFull = 1
	/** Bloom of the dispersion circle, 0 = fully aimed. */
	bloom = 0
	ammo: AmmoId
	readonly rack: AmmoRack
	/** s until the track is back on. */
	tracked = 0
	/** s of fire left. */
	burning = 0
	gunDamaged = 0
	/** s of a damaged engine (slower) and a jammed turret ring (slow traverse). */
	engineDamaged = 0
	ringDamaged = 0
	/** s of a damaged ammunition rack (slower reload). */
	rackDamaged = 0
	readonly crew = new Crew()
	/** The ammunition rack went up: the turret is blown off the wreck. */
	detonated = false
	repairKit = true
	extinguisher = true
	/** s of concealment penalty after firing. */
	camoFire = 0
	/** Rockets still to leave the rails in the current salvo. */
	salvoLeft = 0
	spottedBy: [boolean, boolean] = [false, false]
	/** Game time each team last saw us. */
	lastSeen: [number, number] = [-99, -99]
	/** The map's weather multiplier on the view range. */
	viewMult = 1
	kills = 0
	damageDealt = 0
	spots = 0
	/** Battle stats behind the ribbons and medals. */
	readonly stats = freshStats()
	/** Per team: the tank that last spotted us for it (gets the assist for damage done to us). */
	spotter: [Tank | null, Tank | null] = [null, null]
	/** Count of hits taken (the HUD flashes on change; fire ticks do not count). */
	hits = 0
	lastHitBy: Tank | null = null
	readonly view: TankView
	readonly hullBox: OBB
	readonly turretBox: OBB
	/** The commander's cupola on the roof (a weak spot), if the vehicle has one. */
	readonly cupolaBox: OBB | null
	private salvoTimer = 0
	/** s spent at the base restocking used consumables. */
	kitTimer = 0
	/** Hull roll and pitch on the ground (eased toward the suspension's pose). */
	roll = 0
	pitch = 0
	/** rad/s of turret traverse, and of laying for range (the gun's pitch, or a howitzer's range change as an angle). */
	turretRate = 0
	elevRate = 0

	static onDestroyed: ((t: Tank, by: Tank | null) => void) | null = null

	constructor(
		readonly def: TankDef,
		readonly team: 0 | 1,
		readonly name: string,
		readonly isPlayer: boolean,
		season: PaintSeason = 'summer',
	) {
		this.hp = def.hp
		this.crew.size = def.crew ?? 4
		this.ammo = this.stockAmmo
		this.rack = new AmmoRack(def)
		this.view = new TankView(def, def.nation, Math.random() * 100, season)
		const boxes = createBoxes(def, this.view.hullTop)
		this.hullBox = boxes.hull
		this.turretBox = boxes.turret
		this.cupolaBox = boxes.cupola
	}

	// ---------------------------------------------------------------- derived values

	get hpFrac() {
		return this.hp / this.def.hp
	}
	get radius() {
		return Math.max(this.def.shape.hullW, this.def.shape.hullL * 0.6) / 2
	}
	get mass() {
		return this.def.hp
	}
	get ammoDef() {
		return AMMO[this.ammo]
	}
	/** Current shell's pen/damage after the ammo multipliers. */
	get shellPen() {
		return this.def.gun.pen * this.ammoDef.penMult
	}
	get shellDmg() {
		return this.def.gun.dmg * this.ammoDef.dmgMult
	}
	/** View range now: the vehicle's, the weather's share of it, less with the commander wounded. */
	get viewRange() {
		return this.def.viewRange * this.viewMult * this.crew.view
	}
	/** Bloom at top speed: how wide this vehicle's dispersion circle opens on the move. */
	get aimSpread() {
		return this.def.aimSpread ?? DRIVE.aimSpread[this.def.role]
	}
	/** Radius of the dispersion circle in metres at 100 m. */
	get reticle() {
		return (
			this.def.gun.dispersion *
			(1 + this.bloom) *
			(this.gunDamaged > 0 ? COMBAT.gunDamageDispersion : 1) *
			this.crew.aim
		)
	}
	/** Convergence for the dispersion circle's colour: green once aimed, yellow while settling, red wide open. */
	get aimClass(): 'green' | 'yellow' | 'red' {
		return this.bloom <= DRIVE.aimedBloom ? 'green' : this.bloom <= DRIVE.looseBloom ? 'yellow' : 'red'
	}
	/** Turret (or casemate gun) traverse, rad/s: a jammed ring slows it. */
	get traverse() {
		return this.def.turretTurn * (this.ringDamaged > 0 ? COMBAT.ringTurn : 1)
	}
	/** Top speed and acceleration × (damaged engine). */
	get engine() {
		return this.engineDamaged > 0 ? COMBAT.engineSpeed : 1
	}
	/** Rounds left of each shell, the full load, and the share left of the whole load. */
	get ammoCount() {
		return this.rack.count
	}
	get ammoFull() {
		return this.rack.full
	}
	get ammoShare() {
		return this.rack.share
	}
	/** Any module that a repair kit puts right. */
	get damagedModules() {
		return this.tracked > 0 || this.engineDamaged > 0 || this.ringDamaged > 0 || this.gunDamaged > 0
	}
	/** Reload of the next shot: a wounded loader and a damaged rack slow it. */
	get reloadTime() {
		const rack = this.rackDamaged > 0 ? COMBAT.rackReload : 1
		return this.def.gun.reload * this.crew.reload * rack
	}

	get worldTurretYaw() {
		return this.yaw + this.turretYaw
	}
	/** The stock shell for this gun: HE for howitzers, derp guns and the rocket mortar, AP otherwise. */
	get stockAmmo(): AmmoId {
		const g = this.def.gun
		return g.howitzer || g.derp || g.mortar ? 'he' : 'ap'
	}
	/** Rocket mortar: the round is loaded at a halt; true while driving holds the loading back. */
	get loadingStalled(): boolean {
		return !!this.def.gun.mortar && this.reload > 0 && Math.abs(this.speed) > MORTAR.standSpeed
	}
	turretForward() {
		const a = this.worldTurretYaw
		return { x: Math.sin(a), z: Math.cos(a) }
	}
	/** Eye point for spotting checks (commander's cupola). */
	eye(out: THREE.Vector3) {
		return out.set(this.pos.x, this.pos.y + this.view.hullTop + this.def.shape.tH * 0.6, this.pos.z)
	}

	/** Concealment 0..1 at this moment. */
	camo(props: Props, terrain: Terrain): number {
		let c = this.def.camo
		if (props.bushAt(this.pos.x, this.pos.z)) c += SPOTTING.bushCamo
		else if (terrain.biome(this.pos.x, this.pos.z) === 'forest') c += SPOTTING.forestCamo
		if (Math.abs(this.speed) > 0.5 || Math.abs(this.yawRate) > 0.1) c -= SPOTTING.movingPenalty[this.def.role]
		if (this.camoFire > 0) c -= SPOTTING.firePenalty * Math.min(1, this.camoFire)
		return clamp(c, 0, 0.9)
	}

	// ---------------------------------------------------------------- lifecycle

	spawn(x: number, z: number, yaw: number, terrain: Terrain) {
		this.pos.set(x, terrain.height(x, z), z)
		this.yaw = yaw
		this.syncAxes()
		this.speed = this.yawRate = this.turretYaw = this.gunPitch = this.stillTime = 0
		this.throttle = this.steer = 0
		this.hp = this.def.hp
		this.alive = true
		this.reload = 0
		this.bloom = DRIVE.spawnBloom
		this.tracked = this.burning = this.gunDamaged = this.rackDamaged = this.camoFire = 0
		this.engineDamaged = this.ringDamaged = 0
		this.crew.reset()
		this.detonated = false
		this.ammo = this.stockAmmo
		this.rack.refill()
		this.repairKit = this.extinguisher = true
		this.kitTimer = 0
		this.spottedBy = [false, false]
		this.spotter = [null, null]
		this.lastSeen = [-99, -99]
		this.salvoLeft = 0
		this.lastHitBy = null
		this.aimTarget.set(x + this.fx * 100, this.pos.y + 1.5, z + this.fz * 100)
		this.view.setWreck(false)
		this.view.group.visible = true
		this.updatePose(terrain)
	}

	dispose() {
		this.view.dispose()
	}

	/** Wrap the heading and refresh the forward vector after it changed. */
	syncAxes() {
		this.yaw = wrapAngle(this.yaw)
		this.fx = Math.sin(this.yaw)
		this.fz = Math.cos(this.yaw)
	}

	// ---------------------------------------------------------------- damage and consumables

	/**
	 * Damage from any source; returns true when this destroyed the tank. `impact` = a hit (flash), not a fire tick.
	 * Friendly fire hurts but earns the shooter nothing: only damage and kills on the enemy count in the score.
	 */
	damage(amount: number, from: Tank | null, impact = true): boolean {
		if (!this.alive || amount <= 0) return false
		this.hp -= amount
		const enemy = from !== null && from.team !== this.team
		if (from) this.lastHitBy = from
		if (enemy) {
			const dealt = Math.min(amount, this.hp + amount)
			from.damageDealt += dealt
			const sp = this.spotter[from.team]
			if (sp && sp !== from && this.spottedBy[from.team]) {
				sp.stats.assist += dealt
				sp.stats.assistHits++
			}
		}
		if (impact) {
			this.hits++
			this.view.hitFlash()
		}
		if (this.hp > 0) return false
		this.hp = 0
		this.alive = false
		this.burning = this.tracked = 0
		this.throttle = this.steer = this.speed = 0
		this.view.setWreck(true)
		if (this.detonated) this.view.blowTurret()
		if (enemy) from.kills++
		Tank.onDestroyed?.(this, from)
		return true
	}

	/** The repair kit puts every damaged module right: track, engine, turret ring, gun. */
	useRepairKit(): boolean {
		if (!this.repairKit || !this.damagedModules) return false
		this.repairKit = false
		this.tracked = this.engineDamaged = this.ringDamaged = this.gunDamaged = 0
		return true
	}

	useExtinguisher(): boolean {
		if (!this.extinguisher || this.burning <= 0) return false
		this.extinguisher = false
		this.burning = 0
		return true
	}

	// ---------------------------------------------------------------- gun

	setAmmo(id: AmmoId): boolean {
		if (this.ammo === id || this.ammoCount[id] <= 0 || (this.def.gun.salvo && id !== 'he')) return false
		this.ammo = id
		// Swapping a loaded gun costs part of the reload
		const swap = Math.min(this.reloadTime, COMBAT.swapReloadMax)
		if (swap > this.reload) this.reload = this.reloadFull = swap
		return true
	}

	/**
	 * Fire the gun if loaded; returns the shot or null. An empty rack swaps to the shell with the most rounds left
	 * instead of firing (nothing at all left: the gun stays silent until the base tops it up).
	 */
	fire(): ShotParams | null {
		if (!this.alive || this.reload > 0 || this.salvoLeft > 0) return null
		if (this.ammoCount[this.ammo] <= 0) {
			this.setAmmo(this.rack.fallback(this.stockAmmo))
			return null
		}
		const g = this.def.gun
		this.reload = this.reloadFull = this.reloadTime
		this.ammoCount[this.ammo]--
		this.camoFire = SPOTTING.firePenaltyTime
		if (g.salvo) {
			this.salvoLeft = g.salvo - 1
			this.salvoTimer = g.salvoInterval ?? COMBAT.salvoInterval
		}
		return launch(this)
	}

	/** Rocket launchers: the rest of the salvo leaves the rails on its own; polled every frame by the game loop. */
	salvoTick(dt: number): ShotParams | null {
		if (this.salvoLeft <= 0) return null
		if (!this.alive) {
			this.salvoLeft = 0
			return null
		}
		this.salvoTimer -= dt
		if (this.salvoTimer > 0) return null
		this.salvoTimer += this.def.gun.salvoInterval ?? COMBAT.salvoInterval
		this.salvoLeft--
		return launch(this)
	}

	/** Blast radius of the loaded shell, m (0 unless it is high explosive). */
	get splashRadius(): number {
		const g = this.def.gun
		return this.ammoDef.he ? (g.splash ?? Math.max(COMBAT.splashMin, g.caliber * COMBAT.splashPerCaliber)) : 0
	}

	// ---------------------------------------------------------------- simulation

	update(dt: number, w: WorldRefs) {
		this.view.update(dt)
		if (!this.alive) {
			placeBoxes(this)
			return
		}
		if (this.tickModules(dt)) return
		drive(this, dt, w.terrain)
		this.stillTime = Math.abs(this.speed) < 0.5 ? this.stillTime + dt : 0
		resolveCollisions(this, w, dt)
		// The outer track of a turn runs further than the inner one (+yaw turns left, +x is the left side)
		const swing = this.yawRate * dt * this.def.shape.hullW * SUSPENSION.trackInset
		this.view.spin(this.speed * dt - swing, this.speed * dt + swing)
		layGun(this, dt)
		updateBloom(this, dt)
		this.updatePose(w.terrain, dt)
		placeBoxes(this)
	}

	/** Reload, repairs and fire damage. Returns true when the fire destroyed the tank. */
	private tickModules(dt: number): boolean {
		this.reload = Math.max(0, this.reload - dt * (this.loadingStalled ? MORTAR.movingReload : 1))
		this.camoFire = Math.max(0, this.camoFire - dt)
		this.gunDamaged = Math.max(0, this.gunDamaged - dt)
		this.rackDamaged = Math.max(0, this.rackDamaged - dt)
		this.engineDamaged = Math.max(0, this.engineDamaged - dt)
		this.ringDamaged = Math.max(0, this.ringDamaged - dt)
		if (this.tracked > 0) this.tracked = Math.max(0, this.tracked - dt)
		if (this.burning <= 0) return false
		this.burning = Math.max(0, this.burning - dt)
		return this.damage(COMBAT.fireDps * dt, this.lastHitBy, false)
	}

	/** Hull pitch, roll and height on the terrain, eased in, and the model's transform. */
	private updatePose(t: Terrain, dt = 1 / 60) {
		const s = this.def.shape
		const pose = hullPose(t, this.pos.x, this.pos.z, this.fx, this.fz, s.hullL, s.hullW)
		const k = Math.min(1, DRIVE.poseSmoothing * dt)
		this.pitch += (pose.pitch - this.pitch) * k
		this.roll += (pose.roll - this.roll) * k
		this.pos.y = pose.y
		const g = this.view.group
		g.position.copy(this.pos)
		g.rotation.set(-this.pitch, this.yaw, this.roll, 'YXZ')
		this.view.setTurret(this.turretYaw, this.gunPitch)
	}

	/** Cheap pre-filter: does the ground-plane segment pass within reach of this tank? */
	nearSegment(ax: number, az: number, bx: number, bz: number): boolean {
		const r = this.def.shape.hullL * 0.7
		const dx = bx - ax
		const dz = bz - az
		const l2 = dx * dx + dz * dz || 1
		const tt = clamp(((this.pos.x - ax) * dx + (this.pos.z - az) * dz) / l2, 0, 1)
		return Math.hypot(this.pos.x - (ax + dx * tt), this.pos.z - (az + dz * tt)) < r
	}
}
