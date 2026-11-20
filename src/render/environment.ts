import * as THREE from 'three'
import type { CamMode } from '../camera'
import { ENVIRONMENT, SKY, WEATHER, WEATHER_LOOK, type Weather } from '../config'
import type { Season } from '../world/terrain'

const tint = new THREE.Color()

/** Scene root with the sky light, the shadow-casting sun and the fog of the season and the weather. */
export class Environment {
	readonly scene = new THREE.Scene()
	readonly hemi = new THREE.HemisphereLight('#cfe0f0', '#4a5a3a', 0.7)
	readonly sun = new THREE.DirectionalLight('#fff1dc', 1.9)
	private readonly fog = new THREE.Fog('#aac4d8', 250, 1100)
	private readonly background = new THREE.Color('#9fbdd6')
	private fogBase = { near: 250, far: 1100 }
	private artyFog = ENVIRONMENT.artyFog
	private sunOffset = ENVIRONMENT.sunOffset

	constructor() {
		this.scene.background = this.background
		this.scene.fog = this.fog
		this.scene.add(this.hemi)
		this.configureSun()
		this.scene.add(this.sun, this.sun.target)
	}

	private configureSun() {
		const { sun } = this
		sun.castShadow = true
		sun.shadow.mapSize.set(2048, 2048)
		sun.shadow.camera.near = 20
		sun.shadow.camera.far = 500
		sun.shadow.camera.left = sun.shadow.camera.bottom = -ENVIRONMENT.shadowHalfSize
		sun.shadow.camera.right = sun.shadow.camera.top = ENVIRONMENT.shadowHalfSize
		sun.shadow.bias = -0.0008
	}

	/** The season's sky, then the weather and the hour on top of it. */
	applyMap(season: Season, weather: Weather) {
		const k = SKY[season]
		const look = WEATHER_LOOK[weather]
		const w = WEATHER[weather]
		const mixed = (c: THREE.Color, hex: string) => {
			c.set(hex)
			if (look.tint) c.lerp(tint.set(look.tint), look.k ?? 0)
			return c
		}
		mixed(this.background, k.bg)
		mixed(this.fog.color, k.fog)
		if (look.fogToBg) this.fog.color.copy(this.background)
		this.fogBase = { near: k.fogNear * w.fog * (look.fogToBg ? 0.3 : 1), far: k.fogFar * w.fog }
		this.fog.near = this.fogBase.near
		this.fog.far = this.fogBase.far
		this.artyFog = { near: ENVIRONMENT.artyFog.near * w.artyFog, far: ENVIRONMENT.artyFog.far * w.artyFog }
		mixed(this.hemi.color, k.sky)
		this.hemi.groundColor.set(k.ground)
		this.hemi.intensity = 0.7 * look.hemiI
		this.sun.color.set(look.sun ?? k.sun)
		this.sun.intensity = k.sunI * look.sunI
		this.sunOffset = look.sunOffset ?? ENVIRONMENT.sunOffset
	}

	/** Weak GPUs: a smaller shadow map for the rest of the session. */
	lowerShadowQuality(renderer: THREE.WebGLRenderer) {
		this.sun.shadow.mapSize.set(1024, 1024)
		this.sun.shadow.map?.dispose()
		this.sun.shadow.map = null
		renderer.shadowMap.needsUpdate = true // redrawn even while the shadows are frozen (garage, pause)
	}

	/** Per frame: ease the fog toward the camera mode's range and keep the sun over the camera target. */
	update(dt: number, mode: CamMode, target: THREE.Vector3) {
		const want = mode === 'arty' ? this.artyFog : this.fogBase
		const k = Math.min(1, 4 * dt)
		this.fog.near += (want.near - this.fog.near) * k
		this.fog.far += (want.far - this.fog.far) * k
		const o = this.sunOffset
		this.sun.position.set(target.x + o.x, o.y, target.z + o.z)
		this.sun.target.position.set(target.x, 0, target.z)
		this.sun.target.updateMatrixWorld()
	}
}
