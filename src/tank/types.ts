import type * as THREE from 'three'
import type { AmmoDef } from '../config'
import type { CaptureZone } from '../game/capture'
import type { Buildings } from '../world/buildings'
import type { Props } from '../world/props'
import type { Terrain } from '../world/terrain'
import type { Tank } from './tank'

/** The world as the simulation sees it. */
export interface WorldRefs {
	terrain: Terrain
	props: Props
	buildings: Buildings
	tanks: Tank[]
	/** Base circles of the battle (empty outside it). */
	zones: CaptureZone[]
}

/** One projectile leaving the muzzle. */
export interface ShotParams {
	origin: THREE.Vector3
	/** The gun's pivot: the first step of the shell is swept from here, so a target closer than the barrel is hit. */
	breech: THREE.Vector3
	dir: THREE.Vector3
	speed: number
	ammo: AmmoDef
	pen: number
	dmg: number
	caliber: number
	splash: number
	howitzer: boolean
	rocket: boolean
	/** Rocket mortar round: a smoke trail in flight and a shock-wave blast. */
	shock: boolean
}
