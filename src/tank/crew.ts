import { CREW, CREW_ROLES, type CrewRole } from '../config'

/** The crew: who is wounded and the medkit (E) that treats them all; the multipliers their wounds put on the tank. */
export class Crew {
	wounded: Record<CrewRole, boolean> = Crew.healthy()
	medkit = true
	/**
	 * People aboard (`TankDef.crew`). With three the commander also lays the gun, with two he loads it as well: his
	 * wound then costs everything he does.
	 */
	size: 2 | 3 | 4 = 4

	private static healthy(): Record<CrewRole, boolean> {
		return { commander: false, gunner: false, driver: false, loader: false }
	}

	get any() {
		return CREW_ROLES.some((r) => this.wounded[r])
	}
	/** View range × (commander). */
	get view() {
		return this.wounded.commander ? CREW.view : 1
	}
	/** Dispersion and aim time × (gunner). */
	get aim() {
		return this.wounded.gunner ? CREW.dispersion : 1
	}
	/** Reload × (loader). */
	get reload() {
		return this.wounded.loader ? CREW.reload : 1
	}
	/** Top speed, acceleration and hull traverse × (driver). */
	get drive() {
		return this.wounded.driver ? CREW.speed : 1
	}

	/** The roles of the man who does `r`, his own title first. */
	private duties(r: CrewRole): CrewRole[] {
		if (r === 'driver' || this.size === 4) return [r]
		if (this.size === 3) return r === 'loader' ? [r] : ['commander', 'gunner']
		return ['commander', 'gunner', 'loader']
	}
	/** The man who does `r`, by his title: the commander for the gunner's work in a small crew. */
	seatOf(r: CrewRole): CrewRole {
		return this.duties(r)[0]
	}
	/** One role per man aboard. */
	get seats(): CrewRole[] {
		return CREW_ROLES.filter((r) => this.seatOf(r) === r)
	}

	/** Wound the man who does `r`. */
	wound(r: CrewRole) {
		for (const duty of this.duties(r)) this.wounded[duty] = true
	}

	/** Use the medkit on everyone wounded; false when there is nothing to treat or no kit left. */
	treat(): boolean {
		if (!this.medkit || !this.any) return false
		this.medkit = false
		this.wounded = Crew.healthy()
		return true
	}

	reset() {
		this.wounded = Crew.healthy()
		this.medkit = true
	}
}

/** Battle stats behind the ribbons and medals: counts of events, and sums where a value is wanted. */
export function freshStats() {
	return {
		pens: 0,
		/** Penetrations from COMBAT.longShot metres or more. */
		longPens: 0,
		crits: 0,
		tracks: 0,
		fires: 0,
		/** Damage allies did to enemies while this tank was the one spotting them. */
		assist: 0,
		assistHits: 0,
		/** Shell damage the armour stopped. */
		blocked: 0,
		blockedHits: 0,
		rams: 0,
		/** Base capture points earned, and capture points taken off the enemy (hits on capturers). */
		capture: 0,
		defense: 0,
	}
}
export type BattleStats = ReturnType<typeof freshStats>
