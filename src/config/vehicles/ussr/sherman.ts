import { turretGun } from '../../guns'
import type { TankDef } from '../../types'

/**
 * M4A2 Sherman (Lend-Lease, 1943): tall hull with a rounded nose and a sloped glacis, three two-wheel bogies a side
 * with return rollers, cast turret with a bustle, 75 mm M3. Twin two-stroke GM diesels and rubber-block tracks.
 */
export const sherman: TankDef = {
	id: 'sherman',
	nation: 'ussr',
	role: 'medium',
	engine: 'gm6046',
	name: 'М4А2 «Шерман»',
	hp: 720,
	rating: 4.5,
	speed: 12.5,
	reverse: 4.5,
	accel: 4.2,
	hullTurn: 0.95,
	turretTurn: 1.15,
	gun: turretGun(75, 90, 115, 3.6, 0.39, 1.8, 620, -0.17, 0.3),
	armor: { front: 90, side: 38, rear: 38, top: 20, tFront: 88, tSide: 51, tRear: 51 },
	viewRange: 380,
	camo: 0.12,
	shape: {
		hullL: 5.9,
		hullW: 2.7,
		hullH: 1.3,
		trackH: 0.95,
		turret: true,
		tW: 2.0,
		tL: 2.3,
		tH: 0.78,
		tZ: 0.3,
		gunLen: 2.7,
		gunR: 0.055,
		openTop: false,
		hullLook: {
			bowMg: true,
			outline: [
				[0.02, 0],
				[0.93, 0],
				[1, 0.1],
				[0.99, 0.3],
				[0.73, 1],
				[0.12, 1],
				[0, 0.78],
			],
			roofW: 0.94,
			lowerNose: 0.3,
		},
		turretLook: {
			kind: 'round',
			facets: 12,
			roofW: 0.84,
			bustle: 0.45,
			mountY: 0.5,
		},
		gunLook: {
			mantlet: 'round',
			mantletW: 0.5,
			brake: 'none',
		},
		running: {
			kind: 'tracks',
			wheels: 6,
			wheelR: 0.25,
			span: 0.7,
			layout: 'paired',
			rollers: 3,
			sprocket: 'front',
		},
	},
}
