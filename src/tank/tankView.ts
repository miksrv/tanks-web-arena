import * as THREE from 'three'
import { GRAVITY, TANK_PAINT, TANK_VIEW, type Nation, type PaintSeason, type TankDef } from '../config'
import { AXIS_X, AXIS_Y } from '../core/math'
import { C, TankBuilder, hullDims, weatherPainter } from './model/builder'
import { buildGun } from './model/gun'
import { buildHull } from './model/hull'
import { addMarkings } from './model/markings'
import { maskPaint, paintTexture, scrollTracks, surfaceTexture, trackTexture } from './model/textures'
import { buildTracks } from './model/tracks'
import { buildCasemate, buildTurret, turretLook } from './model/turret'
import { wheelGeometry, wheelLayout, type Wheel } from './model/wheels'

const { wreckColor, blownUp, blownOut, recoilPerMm, recoilLimits, recoilTime } = TANK_VIEW

/**
 * Procedural WW2 tank: hull from a side profile, turret or casemate, gun, running gear, nation paint and markings.
 * Scene graph: group (hull, casemate) → turret (yaws; on a casemate only the gun's pivot) → gun (pitches).
 * One material per tank (hit flash, wreck paint) over the shared paint texture of its nation and the season, and
 * one for its tracks, whose link texture runs with each track.
 */
export class TankView {
	readonly group = new THREE.Group()
	readonly turret = new THREE.Group()
	readonly gun = new THREE.Group()
	/** Muzzle point in the gun frame. */
	readonly muzzleLocal: THREE.Vector3
	readonly hullTop: number
	readonly turretY: number
	private readonly material: THREE.MeshStandardMaterial
	private trackMaterial: THREE.MeshStandardMaterial | null = null
	/** Distance run by the left (x) and the right (y) track, in tiles of the link texture. */
	private readonly trackScroll = { value: new THREE.Vector2() }
	private trackTiles = 0
	private readonly wheels: THREE.InstancedMesh
	private readonly wheelList: Wheel[]
	private readonly owned: THREE.BufferGeometry[] = []
	private readonly tmpM = new THREE.Matrix4()
	private readonly tmpQ = new THREE.Quaternion()
	private readonly tmpV = new THREE.Vector3()
	private readonly tmpS = new THREE.Vector3()
	private readonly flipQ = new THREE.Quaternion().setFromAxisAngle(AXIS_Y, Math.PI)
	/** Metres run by the left and the right track. */
	private readonly travelled = [0, 0]
	private flashTimer = 0
	/** The gun's own mesh: it slides along the barrel on recoil, the pivot (and the muzzle point) stay put. */
	private readonly barrel: THREE.Mesh
	private readonly recoilLength: number
	/** 1 right after a shot, running down to 0 as the barrel returns. */
	private recoilLeft = 0
	private spun = false
	/** Where the turret sits on the hull. */
	private readonly turretHome = new THREE.Vector3()
	/** A turret in the air after the ammunition went up (velocity and spin in the hull frame). */
	private flight: { v: THREE.Vector3; w: THREE.Vector3 } | null = null

	constructor(
		readonly def: TankDef,
		nation: Nation,
		seed: number,
		season: PaintSeason = 'summer',
	) {
		const s = def.shape
		const base = C.paint
		const dims = hullDims(s)
		const layout = wheelLayout(dims)
		this.hullTop = dims.top
		this.turretY = dims.top
		const relief = surfaceTexture()
		this.material = new THREE.MeshStandardMaterial({
			vertexColors: true,
			roughness: 0.95,
			metalness: 0.15,
			map: paintTexture(nation, season),
			bumpMap: relief,
			bumpScale: TANK_PAINT.bumpScale,
			roughnessMap: relief,
		})
		this.material.onBeforeCompile = maskPaint

		const body = new TankBuilder(weatherPainter(season, seed))
		const turret = new TankBuilder(weatherPainter(season, seed + 3, dims.top))
		const gun = new TankBuilder(weatherPainter(season, seed + 5, dims.top + s.tH / 2))
		buildHull(body, dims, base, layout, nation)
		this.muzzleLocal = buildGun(gun, def, base)
		addMarkings(body, turret, dims, nation)

		// A turret carries the gun round; a casemate is part of the hull and only the gun traverses, about its mount.
		if (s.turret || s.launcher) {
			const mount = buildTurret(turret, s, base)
			this.turret.position.set(s.turret ? (turretLook(s).x ?? 0) : 0, dims.top, s.tZ)
			this.gun.position.set(0, mount.y, mount.z)
			this.turret.add(this.mesh(turret))
		} else {
			const mount = buildCasemate(body, s, dims.top, base)
			this.turret.position.set(0, dims.top, mount.z)
			this.gun.position.set(0, mount.y - dims.top, 0)
		}
		this.turretHome.copy(this.turret.position)
		this.turret.add(this.gun)
		this.barrel = this.mesh(gun)
		this.gun.add(this.barrel)
		this.recoilLength = THREE.MathUtils.clamp(def.gun.caliber * recoilPerMm, ...recoilLimits)
		this.group.add(this.mesh(body, true), this.turret)

		if (layout.track) this.group.add(this.buildTracks(layout.track, s.hullW / 2 - dims.trackW / 2, dims.trackW))
		this.wheelList = layout.wheels
		const wheel = wheelGeometry(new THREE.Color(TANK_PAINT.schemes[nation][season].base))
		this.owned.push(wheel)
		this.wheels = new THREE.InstancedMesh(wheel, this.material, this.wheelList.length)
		this.wheels.castShadow = true
		this.group.add(this.wheels)
		this.spin(0)
	}

	/** Both track bands: one mesh whose link texture is shifted per side as the tracks run. */
	private buildTracks(run: NonNullable<ReturnType<typeof wheelLayout>['track']>, x: number, w: number): THREE.Mesh {
		const { geometry, tilesPerMetre } = buildTracks(run, x, w)
		this.trackTiles = tilesPerMetre
		const links = trackTexture()
		const material = new THREE.MeshStandardMaterial({
			map: links,
			bumpMap: links,
			bumpScale: 2,
			roughness: 0.85,
			metalness: 0.3,
		})
		material.onBeforeCompile = (shader) => scrollTracks(shader, this.trackScroll)
		this.trackMaterial = material
		this.owned.push(geometry)
		const mesh = new THREE.Mesh(geometry, material)
		mesh.castShadow = true
		mesh.receiveShadow = true
		return mesh
	}

	private mesh(b: TankBuilder, receiveShadow = false): THREE.Mesh {
		const m = new THREE.Mesh(b.build(), this.material)
		m.castShadow = true
		m.receiveShadow = receiveShadow
		this.owned.push(m.geometry)
		return m
	}

	/**
	 * Advance the left and the right track by so many metres (one number: both alike): the road wheels turn and the
	 * links run. A standing tank costs nothing: the buffers are rewritten only when the tracks move.
	 */
	spin(left: number, right = left) {
		if (left === 0 && right === 0 && this.spun) return
		this.spun = true
		const run = this.travelled
		run[0] += left
		run[1] += right
		this.trackScroll.value.set((run[0] * this.trackTiles) % 1, (run[1] * this.trackTiles) % 1)
		this.wheelList.forEach((w, i) => {
			this.tmpQ.setFromAxisAngle(AXIS_X, run[w.side > 0 ? 0 : 1] / w.r)
			if (w.side < 0) this.tmpQ.premultiply(this.flipQ)
			this.tmpM.compose(this.tmpV.set(w.x, w.y, w.z), this.tmpQ, this.tmpS.set(w.w, w.r, w.r))
			this.wheels.setMatrixAt(i, this.tmpM)
		})
		this.wheels.instanceMatrix.needsUpdate = true
	}

	setTurret(yaw: number, pitch: number) {
		this.turret.rotation.y = yaw
		this.gun.rotation.x = -pitch
	}

	/** World muzzle position and forward direction (the gun's world matrix must be current). */
	/** The gun's pivot in the world (the breech end of the barrel). */
	breech(out: THREE.Vector3) {
		return out.setFromMatrixPosition(this.gun.matrixWorld)
	}

	muzzle(out: THREE.Vector3, dir?: THREE.Vector3) {
		out.copy(this.muzzleLocal).applyMatrix4(this.gun.matrixWorld)
		if (dir) dir.set(0, 0, 1).transformDirection(this.gun.matrixWorld)
		return out
	}

	hitFlash() {
		this.flashTimer = TANK_VIEW.hitFlash
		this.material.emissive.set('#ff9955')
		this.material.emissiveIntensity = 0.6
	}

	/** A shot: the barrel jumps back and runs out again (looks only: the muzzle point does not move). */
	recoil() {
		this.recoilLeft = 1
	}

	update(dt: number) {
		if (this.flight) this.fly(dt)
		if (this.recoilLeft > 0) {
			this.recoilLeft = Math.max(0, this.recoilLeft - dt / recoilTime)
			this.barrel.position.z = -this.recoilLength * this.recoilLeft * this.recoilLeft
		}
		if (this.flashTimer <= 0) return
		this.flashTimer -= dt
		if (this.flashTimer <= 0) this.material.emissiveIntensity = 0
	}

	/** Burnt-out wreck: dark paint, turret knocked askew. */
	setWreck(on: boolean) {
		this.material.color.set(on ? wreckColor : '#ffffff')
		this.trackMaterial?.color.set(on ? wreckColor : '#ffffff')
		this.flight = null
		if (this.def.shape.turret) {
			this.turret.position.copy(this.turretHome)
			this.turret.rotation.set(0, this.turret.rotation.y, on ? 0.12 : 0)
			this.turret.position.y = this.turretY + (on ? 0.25 : 0)
		}
		if (on) this.gun.rotation.x = 0.25
	}

	/** The ammunition rack went up: the turret flies off, tumbling (a casemate has nothing to throw). */
	blowTurret() {
		if (!this.def.shape.turret) return
		const a = Math.random() * Math.PI * 2
		const out = blownOut[0] + Math.random() * (blownOut[1] - blownOut[0])
		const up = blownUp[0] + Math.random() * (blownUp[1] - blownUp[0])
		const spin = () => (Math.random() - 0.5) * 7
		this.flight = {
			v: new THREE.Vector3(Math.cos(a) * out, up, Math.sin(a) * out),
			w: new THREE.Vector3(spin(), spin(), spin()),
		}
	}

	/** Ballistic tumble until the turret comes down on the hull roof or on the ground beside it. */
	private fly(dt: number) {
		const f = this.flight
		if (!f) return
		const t = this.turret
		const s = this.def.shape
		f.v.y -= GRAVITY * dt
		t.position.addScaledVector(f.v, dt)
		t.rotation.x += f.w.x * dt
		t.rotation.y += f.w.y * dt
		t.rotation.z += f.w.z * dt
		const overHull = Math.abs(t.position.x) < s.hullW / 2 && Math.abs(t.position.z) < s.hullL / 2
		const floor = overHull ? this.hullTop : 0
		if (f.v.y > 0 || t.position.y > floor + s.tH) return
		// Down: settle on its roof or on its ring, whichever way up it landed
		const flipped = Math.cos(t.rotation.x) * Math.cos(t.rotation.z) < 0
		t.rotation.x = (flipped ? Math.PI : 0) + 0.15 * Math.sign(Math.sin(t.rotation.x))
		t.rotation.z = 0.2 * Math.sign(Math.sin(t.rotation.z))
		t.position.y = floor + (flipped ? s.tH : 0)
		this.flight = null
	}

	dispose() {
		for (const g of this.owned) g.dispose()
		this.material.dispose()
		this.trackMaterial?.dispose()
		this.wheels.dispose()
	}
}
