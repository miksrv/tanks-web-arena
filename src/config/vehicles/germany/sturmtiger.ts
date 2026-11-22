import { rocketMortar } from '../../guns'
import type { TankDef } from '../../types'

/**
 * Sturmtiger (1944): Tiger I chassis under a tall box casemate with a steeply sloped 150 mm front, a stubby 380 mm
 * RW 61 rocket mortar in a ball mount (centred here, off to the right on the real one). Ten rounds, loaded by crane.
 */
export const sturmtiger: TankDef = {
	id: 'sturmtiger',
	nation: 'germany',
	role: 'td',
	engine: 'hl230',
	name: 'Sturmtiger',
	hp: 1300,
	rating: 7,
	speed: 9,
	reverse: 3.5,
	accel: 2.2,
	hullTurn: 0.55,
	turretTurn: 0.3,
	gun: rocketMortar(380, 170, 1050, 20, 0.85, 4.2, 180, 8, 0.17, 10),
	armor: { front: 150, side: 82, rear: 82, top: 40, tFront: 200, tSide: 82, tRear: 82, lowerFront: 100 },
	viewRange: 330,
	camo: 0.04,
	shape: {
		hullL: 6.3,
		hullW: 3.5,
		hullH: 0.8,
		trackH: 1.0,
		turret: false,
		tW: 3.3,
		tL: 3.7,
		tH: 1.2,
		tZ: 0.75,
		gunLen: 1.9,
		gunR: 0.25,
		openTop: false,
		hullLook: {
			outline: [
				[0.01, 0],
				[0.97, 0],
				[1, 0.45],
				[0.95, 1],
				[0.01, 1],
				[0, 0.55],
			],
		},
		turretLook: {
			kind: 'welded',
			outline: [
				[0, 0],
				[1, 0],
				[0.66, 1],
				[0.05, 1],
				[0, 0.6],
			],
			roofW: 0.84,
			mountY: 0.48,
		},
		gunLook: {
			mantlet: 'ball',
			ballR: 0.52,
			brake: 'none',
			bore: true,
		},
		running: {
			kind: 'tracks',
			wheels: 8,
			wheelR: 0.4,
			span: 0.78,
			layout: 'interleaved',
			sprocket: 'front',
		},
	},
}
