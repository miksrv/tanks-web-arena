import { TANKS } from '../config'
import type { Tank } from '../tank/tank'
import type { Match } from './match'
import type { Medal } from './medals'

/** The player's career totals on one vehicle. */
export interface TankRecord {
	battles: number
	wins: number
	draws: number
	/** Battles the vehicle was still alive at the end of. */
	survived: number
	kills: number
	damage: number
	/** Damage taken. */
	taken: number
	/** Damage allies did to enemies this vehicle was spotting. */
	assist: number
	/** Shell damage the armour stopped. */
	blocked: number
	spots: number
	shots: number
	hits: number
	pens: number
	/** The best single battle. */
	bestDamage: number
	bestKills: number
	/** Medal name → times awarded. */
	medals: Record<string, number>
	/** `Date.now()` of the last battle. */
	lastPlayed: number
}

/** Vehicle id → its record; a vehicle that has not fought has no entry. */
export type Records = Record<string, TankRecord>

/** The player's shooting in one battle. */
export interface ShotTotals {
	shots: number
	hits: number
	pens: number
}

const STORE_KEY = 'tanks-web-arena.records'
/** Bumped when the stored shape changes in a way old data cannot be read as. */
const VERSION = 1

function fresh(): TankRecord {
	return {
		battles: 0,
		wins: 0,
		draws: 0,
		survived: 0,
		kills: 0,
		damage: 0,
		taken: 0,
		assist: 0,
		blocked: 0,
		spots: 0,
		shots: 0,
		hits: 0,
		pens: 0,
		bestDamage: 0,
		bestKills: 0,
		medals: {},
		lastPlayed: 0,
	}
}

const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)

/** A stored record made safe to use: every number present and sane (hand-edited or older data). */
function restore(raw: unknown): TankRecord | null {
	if (typeof raw !== 'object' || raw === null) return null
	const src = raw as Record<string, unknown>
	const rec = fresh()
	for (const key of Object.keys(rec) as (keyof TankRecord)[]) {
		if (key !== 'medals') rec[key] = count(src[key])
	}
	if (typeof src.medals === 'object' && src.medals !== null) {
		for (const [name, n] of Object.entries(src.medals)) if (count(n)) rec.medals[name] = count(n)
	}
	return rec.battles ? rec : null
}

function load(): Records {
	const out: Records = {}
	try {
		const data = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null') as { v?: number; tanks?: unknown } | null
		if (data?.v !== VERSION || typeof data.tanks !== 'object' || data.tanks === null) return out
		for (const [id, raw] of Object.entries(data.tanks)) {
			const rec = id in TANKS ? restore(raw) : null // a vehicle since removed from the game is dropped
			if (rec) out[id] = rec
		}
	} catch {
		/* storage blocked or the entry is broken: start empty */
	}
	return out
}

/** The player's battle history per vehicle, kept in `localStorage` (per browser). */
export class TankRecords {
	readonly all: Records = load()

	/** Add the battle that has just ended to the player's vehicle. */
	add(player: Tank, match: Match, medals: readonly Medal[], shooting: ShotTotals) {
		const rec = (this.all[player.def.id] ??= fresh())
		const damage = Math.round(player.damageDealt)
		rec.battles++
		if (match.winner === player.team) rec.wins++
		else if (match.winner === -1) rec.draws++
		// Leaving the battle is a loss, not a survival
		if (player.alive && match.outcome !== 'left') rec.survived++
		rec.kills += player.kills
		rec.damage += damage
		rec.taken += Math.round(player.def.hp - Math.max(0, player.hp))
		rec.assist += Math.round(player.stats.assist)
		rec.blocked += Math.round(player.stats.blocked)
		rec.spots += player.spots
		rec.shots += shooting.shots
		rec.hits += shooting.hits
		rec.pens += shooting.pens
		rec.bestDamage = Math.max(rec.bestDamage, damage)
		rec.bestKills = Math.max(rec.bestKills, player.kills)
		for (const m of medals) rec.medals[m.name] = (rec.medals[m.name] ?? 0) + 1
		rec.lastPlayed = Date.now()
		this.save()
	}

	private save() {
		try {
			localStorage.setItem(STORE_KEY, JSON.stringify({ v: VERSION, tanks: this.all }))
		} catch {
			/* storage blocked or full: the history lasts for the session */
		}
	}
}
