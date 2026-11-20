import { BOT_AI } from '../../config'
import type { WorldRefs } from '../../tank/tank'
import { StrikeAi } from './strike'
import type { Bot } from './types'

const cfg = BOT_AI.roles.heavy

/**
 * Heavy tank — the support: follows its group's mediums `supportGap` behind and comes up level with them once the
 * shooting starts; prefers enemies that are shooting at our tanks (`targeting.ts`); never falls back — the armour is
 * the answer (and an unseen attacker only makes it turn to face the blow).
 */
export class HeavyAi extends StrikeAi {
	protected limit(bot: Bot, _w: WorldRefs, engaged: boolean): number | null {
		const assault = bot.tactics.assaultFront(bot.tank)
		if (assault !== null) return assault + (engaged ? cfg.engagedLead : -cfg.supportGap)
		const g = bot.tactics.groupFrontWithout(bot.tank)
		return g === null ? null : g + cfg.leadMax
	}

	protected survive() {
		// Heavies hold their ground
	}
}
