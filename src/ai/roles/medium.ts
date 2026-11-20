import { BOT_AI } from '../../config'
import { fallBackWhenHurt } from './common'
import { StrikeAi } from './strike'
import type { Bot, Frame } from './types'

const cfg = BOT_AI.roles.medium

/**
 * Medium tank — the assault: leads its strike group up the lane and into the fight for the centre, but never more
 * than `leadMax` ahead of the rest of the group; falls back when badly hurt. In a fight it takes the high ground and
 * reloads in cover, or keeps rolling when there is none (`fight.ts`).
 */
export class MediumAi extends StrikeAi {
	protected limit(bot: Bot): number | null {
		const g = bot.tactics.groupFrontWithout(bot.tank)
		return g === null ? null : g + cfg.leadMax
	}

	protected survive(bot: Bot, f: Frame) {
		fallBackWhenHurt(bot, f)
	}
}
