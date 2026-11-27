import type { Role } from './types'

// Combat, driving and spotting tunables. Units: metres, seconds, millimetres of armour, hit points.

export const COMBAT = {
	penRng: 0.25, // ±25 % on penetration
	dmgRng: 0.25, // ±25 % on damage
	overmatch: 3, // caliber ≥ 3 × plate thickness: no ricochet, no slope bonus
	heNonPenFactor: 0.5, // HE that fails to penetrate: dmg × 0.5 − armour × heArmorFactor
	heArmorFactor: 1.1, // each mm of armour takes this much off a blast (non-penetrating HE and splash)
	minSlopeCos: 0.2, // cap on the slope multiplier of effective armour (1 / 0.2 = 5×)
	overmatchNormalization: 1.4, // × the shell's normalisation when its caliber overmatches the plate
	splashDamage: 0.6, // HE splash: share of the shell's damage at the centre of the blast, falling to 0 at its edge
	splashRng: 0.5, // ± half of this on splash damage
	splashTrackChance: 0.3, // × closeness: a blast knocks a track off
	splashHullShare: 0.5, // share of a tank's radius taken off its distance to the blast
	splashPerCaliber: 1 / 40, // default blast radius, m per mm of caliber…
	splashMin: 1.5, // …but at least this, m
	trackHitChance: 0.6, // side/low hit on the running gear breaks a track
	trackRepair: 45, // s to put a track back on without a repair kit
	trackAbsorb: 0.5, // hull damage multiplier when the running gear is struck
	engineFireChance: 0.25, // penetrating hit on the engine compartment
	engineHitChance: 0.4, // …otherwise the engine may be damaged: top speed and acceleration × engineSpeed
	engineSpeed: 0.5,
	engineTime: 15, // s, unless repaired
	engineShare: 0.3, // rear share of the hull length over the engine (side hits there reach it)
	fireDps: 25, // hp/s while burning
	fireTime: 8, // s, unless extinguished
	gunDamageChance: 0.15, // penetrating hit on the turret front: dispersion × gunDamageDispersion for a while
	gunDamageDispersion: 1.5,
	mantletGunChance: 0.5, // …through the mantlet itself
	gunDamageTime: 12,
	ringChance: 0.35, // penetrating hit low on the turret: traverse × ringTurn
	ringTurn: 0.4,
	ringTime: 15,
	ringShare: 0.3, // lower share of the turret height around the ring
	ammoRackChance: 0.045, // penetrating side hit on the hull or a turret hit from the side or rear: the rack detonates
	rackDamageChance: 0.18, // …otherwise it may only be damaged: reload ×rackReload for rackDamageTime
	rackReload: 1.35,
	rackDamageTime: 15,
	ramDamageMult: 1.4, // × relative speed × mass ratio (wrecks stay as cover until the round ends)
	shellLife: 6, // s, max flight
	howitzerShellLife: 12, // s, howitzer shells fly longer arcs
	tracerLen: 10, // m
	maxShells: 128,
	groundStep: 2.5, // m between ground samples along a shell's step
	outOfWorld: 2000, // m from the centre: a shell this far out is dropped
	longShot: 250, // m: a penetration from this far counts toward the sniper medal
	swapReloadMax: 2.5, // s: changing shells costs at most this much reload
	salvoInterval: 0.1, // s between the rockets of a salvo (unless the launcher sets its own)
	aimPast: 2, // m the aim ray runs on past the reticle point, to be sure to enter the box
}

/**
 * Howitzers do not use a fixed muzzle velocity: as in World of Tanks the shell is lobbed on an arc that arrives in a
 * few seconds, so the time of flight is a law of the distance and the launch velocity is derived from it. The
 * stronger "gravity" keeps the arc high enough to clear any hill while staying quick.
 */
export const HOWITZER = {
	gravity: 40, // m/s², for howitzer shells only
	minTime: 2.0, // s of flight at point blank
	timePerMetre: 1 / 150, // + s per metre of range (300 m → 4 s, 900 m → 8 s)
	maxRange: 1150, // m, enough to reach across the whole map
}

/**
 * Rocket mortar (`gun.mortar`, the Sturmtiger): the 350 kg round is hoisted by a crane, so it is loaded at a halt,
 * and its blast is a shock wave that works on what the splash damage alone would spare.
 */
export const MORTAR = {
	standSpeed: 1, // m/s: slower than this the crew loads at full speed
	movingReload: 0.4, // × loading speed while the vehicle moves faster
	trackChance: 0.9, // × closeness: the shock wave knocks a track off (instead of COMBAT.splashTrackChance)
	crewChance: 0.6, // × closeness: a crew member is concussed (open-topped ×CREW.openTopSplash, at most 1)
	fellRadius: 1.3, // × the blast radius: trees, haystacks and fences inside go down
	trailStep: 0.03, // s between the smoke puffs behind the rocket
	shake: 0.9, // camera shake of the shot for the player
	shellLife: 12, // s of flight: the slow round (153 m/s) still crosses the whole map
}

/** Hulls against walls, props and each other. */
export const COLLISION = {
	hullPad: 0.15, // m added to half the hull width for the three collision circles
	wallDamping: 4, // 1/s: how fast speed into an obstacle bleeds off (× how head-on the contact is)
	crushRate: 4, // 1/s: how fast a crushed prop's slowdown sets in
	ramMinSpeed: 3, // m/s closing speed for a ram
	ramSpeedKept: 0.3, // share of its speed each tank keeps after a ram
	rammerBonus: 2, // × damage to the rammed vehicle
	nudgeSlide: 1.5, // m/s sideways slide around a hull in the way
	nudgeDrag: 0.92, // speed kept per 1/60 s while nudging another hull
}

/** Weak and strong spots inside the hull and turret boxes, and how a struck face is classified. */
export const ZONES = {
	lowerFront: 0.75, // lower front plate × the front armour (unless the vehicle sets `armor.lowerFront`)
	lowerShare: 0.45, // lower share of the hull box height that is the lower plate
	mantlet: 1.3, // × the turret front
	mantletW: 0.35, // default mantlet width as a share of the turret width
	mantletBand: 0.3, // share of the turret height above and below the trunnions
	cupola: 0.7, // × the turret side
	cupolaR: 0.3, // m, half-size of the cupola box
	cupolaH: 0.3, // m above the roof
	cupolaWound: 0.6, // chance a penetrated cupola wounds the commander
	topNormalY: 0.7, // a struck face whose normal points up more than this is the roof
	frontDot: 0.6, // |cos| to the hull axis beyond which a vertical face counts as front / rear
	trackMargin: 0.1, // m above the running gear still counted as a track hit
	screen: 8, // mm a Schürzen plate adds against AP
	screenHe: 0.35, // HE damage × when it bursts on the screen
}

/** Rounds carried: enough for `fireTime` seconds of steady fire, within limits; topped up at the team's own base. */
export const AMMO_LOAD = {
	fireTime: 240, // s
	min: 8,
	max: 250,
	apcrShare: 0.2, // of the load, at most AMMO.apcr.count (howitzers carry none)
	altShare: 0.25, // the other common shell (HE for guns, AP for howitzers)
	resupplyRadius: 35, // m around the base centre
	resupplyMaxSpeed: 2, // m/s
	resupplyStep: 0.5, // s between top-ups
	resupplyShare: 0.05, // of each shell type's full load per top-up
	kitTime: 5, // s at the base to get used consumables (repair kit, medkit, extinguisher) back
	lowShare: 0.15, // the player is warned (and bots go back) below this share of the whole load
}

export type CrewRole = 'commander' | 'gunner' | 'driver' | 'loader'
export const CREW_ROLES: CrewRole[] = ['commander', 'gunner', 'driver', 'loader']

/** Crew injuries: a penetrating hit may wound one member in the struck compartment; a medkit (E) treats them all. */
export const CREW = {
	hitChance: 0.3,
	splashChance: 0.12, // HE splash through the roof (× 2.5 on open-topped vehicles)
	openTopSplash: 2.5,
	view: 0.85, // commander wounded: view range ×
	dispersion: 1.25, // gunner: dispersion and aim time ×
	speed: 0.85, // driver: top speed, acceleration and hull traverse ×
	reload: 1.25, // loader: reload ×
	label: {
		commander: 'командир',
		gunner: 'наводчик',
		driver: 'мехвод',
		loader: 'заряжающий',
	} as Record<CrewRole, string>,
}

// Movement feel
export const DRIVE = {
	/**
	 * How far a class opens its dispersion circle: the bloom at top speed (the circle is `1 + bloom` times the aimed
	 * one). Light tanks fire on the move, tank destroyers and artillery have to stop. A vehicle may set its own
	 * (`TankDef.aimSpread`).
	 */
	aimSpread: { light: 4, medium: 9, heavy: 10, td: 12, spg: 14 } as Record<Role, number>,
	bloomTurn: 0.33, // share of the spread per rad/s of hull turn
	bloomTurret: 0.14, // share of the spread per rad/s of turret traverse, and of laying the gun for range
	bloomShot: 2.5, // after firing
	aimedBloom: 0.12, // at or under this the reticle counts as converged (green, the "aimed" cue)
	looseBloom: 0.9, // over this it is wide open (red); yellow in between
	slopeSpeed: 0.045, // speed loss per degree of uphill slope (fraction)
	maxSlope: 0.6, // rise per metre (≈ 31°); steeper terrain is a wall
	minSlopeSpeed: 0.15, // share of the top speed left on the steepest climb
	deepWater: 1.3, // m: deeper water is a wall
	edgeMargin: 8, // m from the world edge: the wall there
	wallBounce: 0.1, // share of its speed a tank bounces back with off a terrain wall
	brakeAccel: 2.2, // × acceleration when braking or reversing the throttle
	softGroundAccel: 0.6, // share of the acceleration left on the slowest ground
	speedTurnLoss: 0.35, // share of the hull turn rate lost at top speed
	yawResponse: 6, // 1/s: how fast the hull turn rate follows the steering
	casemateTurnAt: 0.85, // share of the gun arc beyond which a casemate turns its hull toward the aim point…
	casemateSteer: 0.7, // …with at most this much steering
	gunPitchRate: 1.5, // rad/s of gun elevation
	poseSmoothing: 14, // 1/s: how fast the hull settles onto the ground's pitch and roll
	maxBloom: 16, // the dispersion circle never opens wider than this
	spawnBloom: 2, // reticle bloom at the start of a round
	bloomSettle: 3, // the bloom shrinks by this share per aim time
	treeKnock: 2.5, // m/s needed to push a tree over; slower than that a trunk just stops the hull
	treeSlow: 0.7, // speed multiplier while flattening trees
}
// Ground speed per surface lives in TERRAIN_GEN.biomeSpeed (worldgen.ts).

export const SPOTTING = {
	interval: 0.3, // s between spotting checks
	minRange: 50, // always seen inside this; a tank in a bush is seen only inside this or after its own shot
	bushCamo: 0.35, // concealment bonus standing in a bush
	forestCamo: 0.18,
	movingPenalty: { light: 0, medium: 0.05, heavy: 0.08, td: 0.08, spg: 0.05 } as Record<Role, number>,
	firePenalty: 0.85, // concealment lost for firePenaltyTime after a shot
	firePenaltyTime: 5, // also how long a shot gives away a tank in a bush
	losStep: 6, // m, line-of-sight sampling step over the heightmap
	memory: 2.0, // s a spotted tank stays drawn after it is lost (fades)
}
