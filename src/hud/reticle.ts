import * as THREE from 'three'
import type { CameraRig, CamMode } from '../camera'
import { aimedArmor, estimateArmor, plateClass, reticleClass } from '../combat/armor'
import { HOWITZER, howitzerSolve } from '../combat/ballistics'
import { traceShot } from '../combat/trace'
import { ARMOR_ZONE_LABEL, GRAVITY, HUD } from '../config'
import type { Tank, WorldRefs } from '../tank/tank'
import { $, ndcToScreen, setAttr, setClass, setStyle, setText, show } from './dom'

const R = HUD.reticle

/**
 * Aiming aids. The reticle is a plain ring at the screen centre, as wide as the converged dispersion: where the player points, coloured by the
 * armour under it, with the reload ring running along it. The dispersion circle rides the gun: where the barrel really
 * points, as wide as the shot may stray, coloured by the convergence.
 */
export class Reticle {
	private ringReady = 0 // s left of the green "loaded" flash on the reload ring
	private readonly gunO = new THREE.Vector3()
	private readonly gunB = new THREE.Vector3()
	private readonly gunD = new THREE.Vector3()
	private readonly gunP = new THREE.Vector3()
	private readonly tmp = new THREE.Vector3()

	update(
		dt: number,
		player: Tank,
		rig: CameraRig,
		world: WorldRefs,
		locked: boolean,
		mode: CamMode,
		artyBlocked: boolean,
	) {
		const aiming = player.alive && locked
		// The reticle is as wide as the dispersion circle once fully converged: the circle closes onto it
		const sizePx = Math.max(R.minPx, this.circlePx(player.reticle / (1 + player.bloom), rig))
		setStyle($('cross'), 'width', `${sizePx.toFixed(0)}px`)
		setStyle($('cross'), 'height', `${sizePx.toFixed(0)}px`)
		this.updateReloadRing(player, mode === 'arty' ? R.artyRingPx : sizePx, dt, aiming)
		this.updateInfo(player, rig, artyBlocked)
		// In the artillery view both are drawn on the ground (ArtyView), not on the screen
		const onScreen = aiming && mode !== 'arty'
		show($('cross'), onScreen)
		show($('aimInfo'), aiming)
		this.updateGunCircle(player, rig, world, onScreen, sizePx)
		show($('vignette'), mode === 'sniper')
	}

	/** Diameter in px of a dispersion of `reticle` m at 100 m, as an angle through the camera. */
	private circlePx(reticle: number, rig: CameraRig): number {
		return (Math.tan(reticle / 100) / Math.tan((rig.camera.fov * Math.PI) / 360)) * window.innerHeight
	}

	/**
	 * Distance, the target and its armour (colouring the reticle and the readout; the gun's circle shows convergence),
	 * and for artillery the shell's flight time (or what stops it) and the convergence.
	 */
	private updateInfo(player: Tank, rig: CameraRig, blocked: boolean) {
		const dist = Math.hypot(rig.aimPoint.x - player.pos.x, rig.aimPoint.z - player.pos.z)
		let cls = ''
		let info = `${Math.round(dist)} м`
		const at = rig.aimedTank
		if (at?.alive && at.team !== player.team) {
			// The plate right under the reticle (lower plate, mantlet, cupola…), seen from the muzzle
			player.view.muzzle(this.tmp)
			const plate = player.def.gun.howitzer ? null : aimedArmor(player, at, this.tmp, rig.aimPoint)
			cls = plate ? plateClass(player, plate) : reticleClass(player, at)
			const mm = plate ? (plate.ricochet ? 'рикошет' : `${Math.round(plate.effective)} мм`) : null
			const spot = plate?.zone ? ` (${ARMOR_ZONE_LABEL[plate.zone]})` : ''
			info += ` · ${at.def.name} · броня ${mm ?? `≈${Math.round(estimateArmor(player, at))} мм`}${spot}`
		}
		if (player.def.gun.howitzer) {
			// Time of flight on the high arc, or a warning when the point is beyond the gun's reach
			const muzzleY = player.pos.y + player.view.hullTop + player.view.gun.position.y
			const sol = howitzerSolve(dist, rig.aimPoint.y - muzzleY)
			info += !sol ? ' · ВНЕ ДОСЯГАЕМОСТИ' : blocked ? ' · ПРЕПЯТСТВИЕ' : ` · полёт ${sol.time.toFixed(1)} с`
			info += ` · сведение ${Math.round(100 / (1 + player.bloom))}%`
		}
		if (player.def.gun.mortar) {
			// A slow rocket: the flight time matters for the lead; and the round is loaded only at a halt
			info += ` · полёт ≈${(dist / (player.def.gun.shellSpeed * player.ammoDef.speedMult)).toFixed(1)} с`
			if (player.loadingStalled) info += ' · ЗАРЯЖАНИЕ ТОЛЬКО НА МЕСТЕ'
		}
		setClass($('cross'), cls)
		setClass($('aimInfo'), cls)
		setText($('aimInfo'), info)
	}

	/**
	 * The dispersion circle: centred where a shell fired this instant would go, traced along the real barrel (the
	 * turret and the gun lag behind the reticle), and as wide as the dispersion is right now. The shell lands
	 * somewhere inside it; it closes in on the reticle once the turret has caught up and the gunner has settled.
	 */
	private updateGunCircle(player: Tank, rig: CameraRig, w: WorldRefs, on: boolean, minPx: number) {
		const el = $('gunCircle')
		if (!on) {
			show(el, false)
			return
		}
		player.view.muzzle(this.gunO, this.gunD)
		player.view.breech(this.gunB)
		const g = player.def.gun
		const speed = g.howitzer
			? (howitzerSolve(player.aimDist, player.aimTarget.y - this.gunO.y)?.speed ?? 100)
			: g.shellSpeed * player.ammoDef.speedMult
		const gravity = g.howitzer ? HOWITZER.gravity : GRAVITY
		const maxTime = g.howitzer ? R.traceTime.howitzer : g.mortar ? R.traceTime.mortar : R.traceTime.direct
		traceShot(w, this.gunO, this.gunD, speed, gravity, maxTime, player, this.gunP, this.gunB)
		const p = this.tmp.copy(this.gunP).project(rig.camera)
		if (p.z > 1) {
			show(el, false)
			return
		}
		// Never smaller than the reticle: converged, the two rings are one
		const px = Math.min(window.innerHeight * R.maxShare, this.circlePx(player.reticle, rig))
		const size = `${Math.max(minPx, px).toFixed(0)}px`
		const s = ndcToScreen(THREE.MathUtils.clamp(p.x, -0.97, 0.97), THREE.MathUtils.clamp(p.y, -0.95, 0.95))
		show(el, true)
		setStyle(el, 'width', size)
		setStyle(el, 'height', size)
		setClass(el, player.aimClass)
		setStyle(el, 'transform', `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px) translate(-50%, -50%)`)
	}

	/**
	 * Reload ring drawn along the reticle's own circle (both camera modes share the reticle): fills clockwise from the top while
	 * loading, flashes green for a moment when the gun is ready, then disappears so the sight stays clean.
	 */
	private updateReloadRing(player: Tank, reticlePx: number, dt: number, aiming: boolean) {
		const ring = $('ring')
		const [track, arc] = Array.from(ring.children)
		const loading = player.reload > 0
		this.ringReady = loading ? R.readyFlash : Math.max(0, this.ringReady - dt)
		const visible = aiming && (loading || this.ringReady > 0)
		show(ring, visible)
		if (!visible) return
		const r = (reticlePx - R.linePx) / 2
		const circ = 2 * Math.PI * r
		const progress = loading ? 1 - player.reload / player.reloadFull : 1
		setAttr(track, 'r', r.toFixed(1))
		setAttr(arc, 'r', r.toFixed(1))
		setAttr(arc, 'stroke-dasharray', circ.toFixed(1))
		setAttr(arc, 'stroke-dashoffset', (circ * (1 - progress)).toFixed(1))
		setAttr(ring, 'class', !loading ? 'ready' : player.loadingStalled ? 'stalled' : '') // SVG: className is read-only, so the attribute is set directly
		setStyle(ring, 'opacity', loading ? '1' : (this.ringReady / R.readyFlash).toFixed(2))
	}
}
