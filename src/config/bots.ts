export const BOTS = {
	skillMin: 0.2,
	skillMax: 0.85,
	aimErrorMax: 1.6, // m at skill 0 (×(1 − skill))
	/** Reticle bloom a bot fires at: aimBloomMax − aimBloomSkill × skill (skill 0.2 → 0.65, 0.85 → 0.33). */
	aimBloomMax: 0.75,
	aimBloomSkill: 0.5,
	reactionMin: 0.4, // s before a bot fires once the reticle has settled
	reactionMax: 1.8,
	/** s before a bot reacts to a broken track / an engine fire with its consumable, × (1.3 − skill). */
	repairDelay: [1.5, 4] as const,
	extinguishDelay: [1, 3] as const,
	medkitDelay: [3, 8] as const,
	engageRange: 330,
	retreatHp: 0.28,
	/** A target with no more health than our shot's damage × margin is worth ×score of its distance: finish it. */
	oneShotMargin: 0.9,
	oneShotScore: 0.7,
}

/** Bot behaviour tunables, one group per module of `src/ai`. Units: metres, seconds, radians. */
export const BOT_AI = {
	/** Obstacle avoidance, traffic and unsticking. */
	avoidance: {
		stuckTime: 2.5, // s of no progress before backing out
		reverseTime: 1.8, // s of backing out (or pivoting) after getting stuck
		stuckEventsToReroute: 3, // times stuck in a row before the route is redirected
		tankCone: 0.9, // rad: half-angle of the cone ahead in which another tank counts as being in the way
		yieldMax: 3, // s: longest a bot gives way to the same traffic before it drives around it instead
		yieldCooldown: 2.5, // s before it gives way again
		sideHold: 1.5, // s a chosen side for swerving around a building or a rock is kept (no left–right dithering)
	},
	/** The bot's core: targets, waypoints, reacting to hits, resupply. */
	core: {
		retarget: 1.2, // s between target re-evaluations
		retargetAfterHit: 1.5, // s
		waypointRadius: 10, // m
		evadeTime: 2.2, // s
		holdBlindShift: 6, // s the target may stay hidden from a holding bot's gun before it shifts toward it
		resupplyDone: 0.9, // share of the load at which a bot topping up at the base goes back to the fight
		resupplySpot: 10, // m around the base centre: well inside the radius where shells are loaded
	},
	/** Team tactics: defence, captures, the late game. */
	team: {
		updateInterval: 0.4, // s
		leadFresh: 45, // s: a last sighting older than this is no lead any more, the hunt sweeps the map instead
		/**
		 * Bots sent back to break up a capture, by battle mode (at least one more than the capturers in the circle).
		 * An assault's defence has one base and loses with it; a neutral circle is half the map's worth.
		 */
		defenders: { standard: 2, encounter: 3, assault: 4 },
		defendUrgent: 50, // capture points past which bots already in a fight are pulled back to the circle too
		/** Share of idle bots that go and take a base instead of looking for the enemy, by battle mode. */
		captureChance: { standard: 0.3, encounter: 0.5, assault: 0.7 },
		captureChanceLate: { standard: 0.55, encounter: 0.8, assault: 1 },
		/** s before the end: a side that can only win by a capture (the assault's attack, both sides of an encounter) rushes the base. */
		hurryTime: 110,
		/** The enemy is "thinned out" (scouts raid, everyone closes in) at this share of its starting strength or less. */
		fewEnemies: 0.6,
		lateTime: 120, // s into the battle after which everyone closes in anyway, so the round does not drag on
		assaultLateTime: 80, // s, the same in an assault
		twoGroupsChance: 0.55, // chance of splitting the strike group in two (two lanes and enough tanks)
	},
	/** The gunfight: firing positions and cover. */
	fight: {
		idealRange: { light: 150, medium: 170, td: 230, heavy: 120, spg: 120 }, // m, preferred engagement distance by class
		closeIn: 0.7, // late in the battle the preferred range shrinks to this share
		firePosInterval: 9, // s between re-picks of a firing position…
		firePosBlind: 2.5, // …sooner when the target stays hidden from it this long, s
		duckMinReload: 3, // s: guns that reload faster keep shooting from the spot instead of ducking into cover
		reverseSpeed: 3, // m/s, rough, to time the way back out of cover
	},
	/** Scoring of spots to stand on. */
	positions: {
		slopeWeight: 120, // how much a spot on a slope is worth losing per unit of gradient (m of the score)
		heightWeight: 2.5, // vantage scoring: metres of score per metre of height gained over the start point
		/** Tank destroyers snipe: height counts this many times more for them (a long view, a hull-down aimed shot). */
		tdHeight: 2.2,
		losBonus: 60, // m of the score for a view of the watched point
		bushBonus: 25, // m of the score for a bush to hide in
		crowdDist: 12, // m: closer than this to a friend's spot is taken
		maxCandidates: 32, // each costs a line-of-sight probe
		eye: 2.4, // m above the ground for vantage line-of-sight probes
	},
	/** Gunnery. */
	gunner: {
		aimErrorReroll: 1.5, // s
		minReaction: 0.3, // s after a target appears
		artyMinRange: 60, // m
		artyMaxMovingSpeed: 2.5, // m/s: faster targets are not worth a slow shell
		mortarMinRange: 0.6, // × the blast radius: closer than this a rocket mortar holds its fire
		hopelessPenChance: 0.12,
		/** rad: a long arc magnifies elevation errors, so a howitzer waits until the barrel is right on. */
		artyPitchTolerance: 0.006,
		scoutFinishHp: 0.25, // scouts give their position away for a target this weak: it may die
		sideOn: 0.75, // |cos| of our bearing off the target's heading below which its side (and running gear) faces us
	},
	roles: {
		common: {
			seekIdle: 10, // s at the end of the route with nobody in reach before going to look for the enemy
			/** Late in the battle (enemy thinned out, or two minutes gone) the idle waits shrink to this share. */
			lateIdle: 0.35,
		},
		/** Strike group tanks: mediums and heavies. */
		strike: {
			contactRange: 180, // m: contact closer than this while moving up turns into a fight
			regroupMinProgress: 80, // m: nobody waits for the group while still leaving the base
			regroupHysteresis: 12, // m: resume once this far back inside the allowed lead (no stop-go at the limit)
			regroupMax: 25, // s waiting for the group before going on anyway
			regroupCooldown: 15, // s
			centreIdle: 12, // s a strike group holds the centre with nobody in reach before pushing on along its lane
		},
		medium: {
			leadMax: 45, // m a medium may run ahead of the rest of its strike group before it stops to wait
		},
		heavy: {
			supportGap: 20, // m behind the mediums the heavies keep while moving up…
			engagedLead: 10, // …in a fight they may come up level (+ this), m
			leadMax: 45, // m, with no mediums left in the group: as far ahead of the rest as a medium may go
		},
		light: {
			danger: 110, // m: an enemy this close is reason enough to move off
			raidArrived: 30, // m from the artillery's last sighting: the raid is there
			contactRange: 230, // m: a scout only fights (when it fights at all) closer than this
			slipCooldown: 5, // s between two slips away from danger (a shot always moves it at once)
			pause: [2, 5] as const, // s a scout stops at a lookout before driving on
			raidReplan: 10, // s between re-plans of a raid route (the enemy artillery may have moved)
			flank: 150, // m off the straight line a raid swings round a flank
		},
		td: {
			/** Contact closer than this (m) while moving up turns into a fight; from an ambush spot it shoots from there. */
			contactRange: 230,
			relocateCooldown: 12, // s between two moves after being flushed out of a hiding spot
			followCheck: 6, // s between checks on its group
			followBehind: 80, // m behind the group it sits
			followSlack: 50, // m the group may get away before it follows
		},
		spg: {
			danger: 90, // m: an enemy this close sends the artillery back toward the base
			tiltRelocate: 3, // s the gun may be stuck at its elevation stop before moving to level ground
		},
	},
}
