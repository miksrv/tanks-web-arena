import { casemateGun } from '../../guns'
import type { TankDef } from '../../types'

/**
 * ISU-152 (1943): IS chassis with a tall, thick-walled casemate at the front, 152 mm ML-20S in a massive cast mantlet
 * with a slotted muzzle brake. The Soviet heavy assault gun: armour and hit points over the SU-152's.
 */
export const isu152: TankDef = {
	id: 'isu152',
	nation: 'ussr',
	role: 'td',
	name: 'ИСУ-152',
	hp: 1300,
	rating: 7,
	speed: 9.7,
	reverse: 4,
	accel: 2.6,
	hullTurn: 0.6,
	turretTurn: 0.4,
	gun: { ...casemateGun(152, 135, 700, 14.5, 0.5, 3.2, 600, 0.17), splash: 5 },
	armor: { front: 120, side: 90, rear: 60, top: 30, tFront: 120, tSide: 90, tRear: 60 },
	viewRange: 340,
	camo: 0.12,
	shape: {
		hullL: 6.8,
		hullW: 3.1,
		hullH: 1.0,
		trackH: 1.0,
		turret: false,
		tW: 3.0,
		tL: 3.5,
		tH: 1.05,
		tZ: 0.95,
		gunLen: 4.6,
		gunR: 0.1,
		openTop: false,
		hullLook: {
			outline: [
				[0.03, 0],
				[0.93, 0],
				[1, 0.35],
				[0.9, 1],
				[0.03, 1],
				[0, 0.6],
			],
			lowerNose: 0.6,
			drums: 2,
		},
		turretLook: {
			kind: 'welded',
			outline: [
				[0, 0],
				[1, 0],
				[0.84, 1],
				[0.06, 1],
				[0, 0.55],
			],
			roofW: 0.82,
			cupola: [-0.28, -0.2],
			mountY: 0.42,
		},
		gunLook: {
			mantlet: 'box',
			mantletW: 0.42,
			brake: 'multi',
			sleeve: 0.9,
		},
		running: {
			kind: 'tracks',
			wheels: 6,
			wheelR: 0.28,
			span: 0.76,
			rollers: 3,
			sprocket: 'rear',
		},
	},
}
