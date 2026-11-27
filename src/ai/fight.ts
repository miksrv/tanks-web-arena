import { BOT_AI } from '../config'
import * as THREE from 'three'
import { wrapAngle } from '../core/math'
import type { Tank, WorldRefs } from '../tank/tank'
import type { BotGunner } from './gunner'
import { coverFrom, vantage } from './positions'
import { driveToSpot, faceToward, friendSpots, reverseTo, steerTo } from './steering'
import type { DriveCommand, Pt } from './types'

const { clamp } = THREE.MathUtils

/**
 * A bot's gunfight: take a firing position (high ground with a view of the target) at about the ideal range, angle
 * the hull and shoot, then back into cover to reload and come out again ("shoot and scoot").
 */
export class Fighter {
	/** Which way the hull is angled to the current threat. */
	private angleSign = 1
	/** Chosen firing position and s until it is reconsidered. */
	private firePos: Pt | null = null
	private firePosTimer = 0
	/** Cover to reload in after the shot `coverShot`, the spot to come back to, and when to give up on that. */
	private cover: Pt | null = null
	private coverReturn: Pt | null = null
	private coverShot = 0
	private coverUntil = 0

	constructor(
		private readonly me: Tank,
		private readonly gunner: BotGunner,
	) {}

	reset() {
		this.firePos = this.cover = this.coverReturn = null
		this.coverShot = 0
	}

	tick(dt: number) {
		this.firePosTimer -= dt
	}

	/** A new target: a fresh hull angle and firing position. */
	retarget() {
		this.angleSign = Math.random() < 0.5 ? 1 : -1
		this.firePos = null
	}

	/** s the target has been out of our gun's reach from here (hidden, or below the gun's depression). */
	get blind() {
		return Math.max(this.gunner.noLosTimer, this.gunner.elevTimer)
	}

	/**
	 * Fight `t`; `holdBack`: the team needs us to come no further forward; `closeIn`: late in the battle, fight from
	 * nearer so the round does not drag on.
	 */
	engage(w: WorldRefs, cmd: DriveCommand, t: Tank, time: number, holdBack: boolean, closeIn: boolean) {
		const me = this.me
		if (this.duck(w, cmd, t, time)) return
		const d = this.dist(t.pos)
		const ideal = BOT_AI.fight.idealRange[me.def.role] * (closeIn ? BOT_AI.fight.closeIn : 1)
		if (me.def.role === 'light') {
			// Lights keep moving: straight in to range, then circle
			if (d > ideal + 40 || (this.gunner.noLosTimer > 1.5 && d > 70)) steerTo(me, cmd, t.pos, 0.9)
			else this.fight(cmd, t, d, ideal)
			return
		}
		const there = !this.firePos || this.dist(this.firePos) < 8
		const moveUp = there && !holdBack && d > ideal + 40
		if (!this.firePos || this.firePosTimer <= 0 || (there && this.blind > BOT_AI.fight.firePosBlind) || moveUp) {
			this.pickFirePos(w, t, d, ideal, holdBack)
		}
		if (driveToSpot(w, me, cmd, this.firePos, 5, 0.85)) return
		this.fight(cmd, t, d, ideal)
	}

	/**
	 * The best ground near where we want to be: toward the target when it is out of range or hidden (unless the
	 * team needs us to hold back), else around us; it should see the target.
	 */
	private pickFirePos(w: WorldRefs, t: Tank, d: number, ideal: number, holdBack: boolean) {
		const me = this.me
		const dx = (t.pos.x - me.pos.x) / (d || 1)
		const dz = (t.pos.z - me.pos.z) / (d || 1)
		let step = 0
		if (!holdBack) {
			if (d > ideal + 40) step = Math.min(d - ideal, 70)
			else if (this.blind > BOT_AI.fight.firePosBlind) step = Math.min(25, d * 0.3)
		}
		const around = { x: me.pos.x + dx * step, z: me.pos.z + dz * step }
		this.firePos = vantage(w, around, step > 40 ? 40 : 28, {
			watch: { x: t.pos.x, y: t.pos.y + t.view.hullTop * 0.7, z: t.pos.z },
			bushes: me.def.role === 'td',
			height: me.def.role === 'td' ? BOT_AI.positions.tdHeight : 1,
			avoid: friendSpots(w, me),
		})
		this.firePosTimer = BOT_AI.fight.firePosInterval
		this.gunner.noLosTimer = this.gunner.elevTimer = 0
	}

	/**
	 * On the firing spot: keep the range, angle the hull ~35° to the threat and shoot; lights and mediums roll while
	 * loading but stop for the aim time before the gun is ready, so the shot is an aimed one.
	 */
	private fight(cmd: DriveCommand, t: Tank, d: number, ideal: number) {
		const me = this.me
		const toT = Math.atan2(t.pos.x - me.pos.x, t.pos.z - me.pos.z)
		if (d < ideal - 50 && me.def.role !== 'heavy') {
			cmd.steer = clamp(wrapAngle(toT + Math.PI - me.yaw) * 2, -1, 1)
			cmd.throttle = -0.6
			return
		}
		// Casemates must keep the gun arc on it
		const offset = me.def.shape.turret ? this.angleSign * 0.6 : this.angleSign * Math.min(0.3, me.def.gun.arc * 0.5)
		const angled = wrapAngle(toT + offset - me.yaw)
		cmd.steer = Math.abs(angled) > 0.12 ? clamp(angled * 1.5, -1, 1) : 0
		const rolls = me.def.role === 'light' || (me.def.role === 'medium' && !this.cover)
		cmd.throttle = rolls && me.reload > Math.max(1.5, me.def.gun.aimTime) ? 0.6 : 0
	}

	/**
	 * Shoot and scoot: after each shot back into the nearest cover from the target (behind a house or down the back
	 * of the rise) and come out to the firing spot again just before the gun is loaded. Lights keep rolling instead,
	 * quick-firing guns keep shooting, artillery is too far away to care. Returns true when it drove this frame.
	 */
	duck(w: WorldRefs, cmd: DriveCommand, t: Tank, time: number): boolean {
		const me = this.me
		if (me.def.role === 'light' || me.def.role === 'spg' || me.def.gun.reload < BOT_AI.fight.duckMinReload)
			return false
		if (this.gunner.shots !== this.coverShot) {
			this.coverShot = this.gunner.shots
			this.coverReturn = this.gunner.fireSpot
			this.cover = me.reload > 1.5 ? coverFrom(w, me, t) : null
			this.coverUntil = time + me.reload + 6
		}
		const cover = this.cover
		const back = this.coverReturn
		if (!cover || !back || time > this.coverUntil) {
			this.cover = null
			return false
		}
		// Back on the spot early enough for the reticle to settle before the gun is loaded
		const wayBack =
			Math.hypot(back.x - cover.x, back.z - cover.z) / BOT_AI.fight.reverseSpeed + 0.5 + me.def.gun.aimTime * 0.7
		// Out of sight on purpose: no reason to look for another firing spot once back on this one
		this.gunner.noLosTimer = 0
		if (me.reload > wayBack) {
			if (this.dist(cover) > 3) reverseTo(me, cmd, cover)
			else faceToward(me, cmd, t.pos)
			return true
		}
		if (this.dist(back) > 3) {
			steerTo(me, cmd, back, 0.8)
			return true
		}
		this.cover = null
		return false
	}

	private dist(p: Pt) {
		return Math.hypot(p.x - this.me.pos.x, p.z - this.me.pos.z)
	}
}
