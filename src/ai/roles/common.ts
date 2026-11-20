import { BOTS } from '../../config'
import { planRetreat } from '../routes'
import type { Bot, Frame } from './types'

/**
 * Low health: fall back toward our base, behind cover on the way; stop once out of danger (not while hunting, nor
 * from a base circle it is taking or defending: the capture is worth more than the tank). It drives the whole route
 * to its cover (stopping halfway left it parked in the open with a route it never finished), falls back once and
 * holds the spot it reached; only another hit sends it further back.
 */
export function fallBackWhenHurt(bot: Bot, f: Frame) {
	const me = bot.tank
	const low = me.hpFrac < BOTS.retreatHp && (!bot.fellBack || f.hurt)
	if (low && bot.mode !== 'retreat' && !bot.hunting && !bot.holdingCircle) {
		const r = planRetreat(f.w, me)
		bot.setPath(r.path, r.holdSpot)
		bot.mode = 'retreat'
		bot.fellBack = true
	}
	if (bot.mode === 'retreat' && bot.pathDone) bot.mode = 'hold'
}

/**
 * Contact while moving up (or, with `fromHold`, while holding): close enough → fight. Not on the way to a base to
 * take or defend, nor in its circle: it shoots on the move and from there.
 */
export function joinFight(bot: Bot, range: number, fromHold = false) {
	if (bot.onObjective) return
	const m = bot.mode
	const moving = m === 'advance' || m === 'regroup' || (fromHold && m === 'hold')
	if (moving && bot.target && bot.dist(bot.target) < range) bot.mode = 'engage'
}

/** Counts the seconds a bot stands at the end of its route with nobody in reach. */
export class IdleClock {
	private t = 0

	tick(bot: Bot, dt: number): number {
		const idle = bot.mode === 'hold' && bot.pathDone && !bot.target
		this.t = idle ? this.t + dt : 0
		return this.t
	}

	reset() {
		this.t = 0
	}
}
