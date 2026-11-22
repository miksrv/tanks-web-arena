import type { Nation, Role, TankDef } from '../types'
import { GERMANY_TANKS } from './germany'
import { USSR_TANKS } from './ussr'

// One file per vehicle (`ussr/t34_85.ts`, `germany/tiger.ts`, …) holds its numbers and its silhouette. To add a
// vehicle, copy the closest one, give it a new id and list it in its nation's `index.ts`.

export const TANKS: Record<string, TankDef> = Object.fromEntries(
	[...USSR_TANKS, ...GERMANY_TANKS].map((d) => [d.id, d]),
)

/** Classes in garage order: tanks from light to heavy, then tank destroyers, then artillery. */
export const ROLE_ORDER: Role[] = ['light', 'medium', 'heavy', 'td', 'spg']

/** Every vehicle id by class and, within a class, from the weakest to the strongest. */
export const TANK_IDS = Object.values(TANKS)
	.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.rating - b.rating || a.hp - b.hp)
	.map((d) => d.id)
/** A nation's vehicles in garage order. */
export const tanksOf = (n: Nation) => TANK_IDS.filter((id) => TANKS[id].nation === n)

/** The vehicle the garage opens on for each nation. */
export const DEFAULT_TANK: Record<Nation, string> = { ussr: 't34_85', germany: 'pz4h' }
