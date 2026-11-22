import { casemateGun } from '../../guns'
import type { TankDef } from '../../types'

/**
 * SU-57 (Lend-Lease T48, 1943): an M3 half-track with a long 57 mm gun behind a shield in the open body, firing
 * over the bonnet. Fast, with a quick hard-hitting gun for its size and armour that stops only rifle fire.
 */
export const su57: TankDef = {
	id: 'su57',
	nation: 'ussr',
	role: 'td',
	engine: 'white',
	name: 'СУ-57',
	hp: 300,
	rating: 3.5,
	speed: 16,
	reverse: 5,
	accel: 5,
	hullTurn: 1.0,
	turretTurn: 0.6,
	gun: casemateGun(57, 112, 90, 2.9, 0.34, 1.7, 850, 0.45),
	armor: { front: 13, side: 7, rear: 7, top: 5, tFront: 16, tSide: 7, tRear: 7 },
	viewRange: 370,
	camo: 0.3,
	shape: {
		hullL: 6.0,
		hullW: 2.2,
		hullH: 0.95,
		trackH: 0.7,
		turret: false,
		tW: 2.05,
		tL: 2.5,
		tH: 0.45,
		tZ: -1.1,
		gunLen: 3.0,
		gunR: 0.04,
		openTop: true,
		hullLook: {
			outline: [
				[0.02, 0],
				[0.97, 0],
				[1, 0.25],
				[0.97, 0.5],
				[0.68, 0.58],
				[0.63, 1],
				[0.02, 1],
				[0, 0.5],
			],
			roofW: 0.94,
		},
		turretLook: {
			kind: 'welded',
			outline: [
				[0, 0],
				[1, 0],
				[1, 1],
				[0, 1],
			],
			roofW: 0.98,
			mountY: 1.25,
		},
		gunLook: {
			mantlet: 'shield',
			mantletW: 0.7,
			brake: 'none',
		},
		running: {
			kind: 'halftrack',
			wheels: 4,
			wheelR: 0.22,
			frontAxle: 0.33,
			sprocket: 'front',
		},
	},
}
