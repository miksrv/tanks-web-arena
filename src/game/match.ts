import { BOT_NAMES, MATCH, TANKS, tanksOf, type BattleMode, type Nation, type Role, type TankDef } from '../config'
import { Tank } from '../tank/tank'
import type { Terrain } from '../world/terrain'

import { Capture, type CaptureZone } from './capture'

export type Phase = 'garage' | 'countdown' | 'battle' | 'result'
/** Why the battle ended. */
export type Outcome = 'destroyed' | 'capture' | 'time' | 'defended'

const nationOfTeam: Nation[] = ['ussr', 'germany']

/** A shuffled copy (Fisher–Yates: sorting by a random comparator is biased). */
function shuffled<T>(list: readonly T[]): T[] {
	const out = [...list]
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[out[i], out[j]] = [out[j], out[i]]
	}
	return out
}

/** Vehicles of a role for one nation rated within the spread of `rating`, or the nearest-rated ones if none is. */
function candidates(nation: Nation, role: Role, rating: number): string[] {
	const pool = tanksOf(nation).filter((id) => TANKS[id].role === role)
	if (!pool.length) return tanksOf(nation).slice(0, 1)
	const off = (id: string) => Math.abs(TANKS[id].rating - rating)
	const near = pool.filter((id) => off(id) <= MATCH.ratingSpread)
	if (near.length) return near
	const best = Math.min(...pool.map(off))
	return pool.filter((id) => off(id) === best)
}

const ratingOf = (ids: string[]) => ids.reduce((sum, id) => sum + TANKS[id].rating, 0)

/**
 * Vehicle ids for both teams (the player's own vehicle first on its side). Both sides get the same roles; every bot
 * vehicle is rated near the player's, picked at random, then single swaps bring the two rating sums together.
 */
export function pickRosters(playerDef: TankDef, playerTeam: 0 | 1): string[][] {
	const roles: Role[] = []
	;(Object.keys(MATCH.composition) as Role[]).forEach((r) => {
		for (let i = 0; i < MATCH.composition[r]; i++) roles.push(r)
	})
	while (roles.length < MATCH.teamSize) roles.push(Math.random() < 0.5 ? 'medium' : 'heavy')
	const pick = (ids: string[]) => ids[Math.floor(Math.random() * ids.length)]
	const options = ([0, 1] as const).map((team) => {
		const list = roles.slice(0, MATCH.teamSize)
		// The player's side: the player's slot is taken out of its role and put first
		if (team === playerTeam) list.splice(Math.max(0, list.indexOf(playerDef.role)), 1)
		const slots = list.map((role) => candidates(nationOfTeam[team], role, playerDef.rating))
		return team === playerTeam ? [[playerDef.id], ...slots] : slots
	})
	const rosters = options.map((slots) => slots.map(pick))
	for (let pass = 0; pass < MATCH.balancePasses; pass++) {
		const diff = ratingOf(rosters[0]) - ratingOf(rosters[1])
		if (Math.abs(diff) <= MATCH.ratingTolerance) break
		// The single swap (any bot slot, any vehicle allowed there) that brings the sums closest
		let best = Math.abs(diff)
		let swap: [team: number, slot: number, id: string] | null = null
		for (const [team, slots] of options.entries()) {
			for (const [slot, ids] of slots.entries()) {
				for (const id of ids) {
					const change = TANKS[id].rating - TANKS[rosters[team][slot]].rating
					const next = Math.abs(diff + (team === 0 ? change : -change))
					// Equal improvements are picked at random, so the same player vehicle does not always meet the same team
					if (next < best - 1e-6 || (swap && next === best && Math.random() < 0.5)) {
						best = next
						swap = [team, slot, id]
					}
				}
			}
		}
		if (!swap) break
		const [team, slot, id] = swap
		rosters[team][slot] = id
	}
	return rosters
}

/** Team composition and round flow. The player's team gets the player's tank plus bots that fill the composition. */
export class Match {
	phase: Phase = 'garage'
	timer = 0
	roundLeft = MATCH.roundTime
	winner: 0 | 1 | -1 | null = null
	outcome: Outcome = 'destroyed'
	round = 0
	mode: BattleMode = 'standard'
	/** Assault: the side holding its base. */
	defender: 0 | 1 = 0
	capture = new Capture([])
	/** Most enemies alive while the player was the last of their team (the Kolobanov medal). */
	lastStand = 0

	/** Build both teams. Returns the list with the player first. */
	compose(playerDef: TankDef, terrain: Terrain): Tank[] {
		const playerTeam: 0 | 1 = playerDef.nation === 'ussr' ? 0 : 1
		const rosters = pickRosters(playerDef, playerTeam)
		const tanks: Tank[] = []
		for (const team of [0, 1] as const) {
			const names = shuffled(BOT_NAMES[nationOfTeam[team]])
			rosters[team].forEach((id, i) => {
				if (team === playerTeam && i === 0) tanks.unshift(new Tank(playerDef, team, 'Вы', true))
				else tanks.push(new Tank(TANKS[id], team, names[i % names.length], false))
			})
		}
		this.placeTeams(tanks, terrain)
		return tanks
	}

	/** Spawn in two rows at each base, facing the enemy base. */
	private placeTeams(tanks: Tank[], terrain: Terrain) {
		for (const team of [0, 1] as const) {
			const base = terrain.bases[team]
			const enemy = terrain.bases[1 - team]
			const yaw = Math.atan2(enemy.x - base.x, enemy.z - base.z)
			const rx = Math.cos(yaw)
			const rz = -Math.sin(yaw) // right of the facing direction
			// Places in the formation are dealt at random each battle (the player's too), artillery in the back row
			const { cols, colGap, rowGap } = MATCH.spawn
			const list = shuffled(tanks.filter((t) => t.team === team))
			list.sort((a, b) => (a.def.role === 'spg' ? 1 : 0) - (b.def.role === 'spg' ? 1 : 0))
			const taken: { x: number; z: number }[] = []
			list.forEach((t, i) => {
				const col = (i % cols) - (cols - 1) / 2
				const row = Math.floor(i / cols)
				const x = base.x + rx * col * colGap - Math.sin(yaw) * row * rowGap
				const z = base.z + rz * col * colGap - Math.cos(yaw) * row * rowGap
				// A blocked place in the rows: anywhere free near the base, clear of the tanks already placed
				const spot = terrain.passable(x, z) ? { x, z } : terrain.findSpot(base.x, base.z, 35, taken)
				taken.push(spot)
				t.spawn(spot.x, spot.z, yaw, terrain)
			})
		}
	}

	start(mode: BattleMode, defender: 0 | 1, zones: CaptureZone[]) {
		this.phase = 'countdown'
		this.timer = MATCH.countdown
		this.roundLeft = MATCH.roundTime
		this.winner = null
		this.outcome = 'destroyed'
		this.mode = mode
		this.defender = defender
		this.capture = new Capture(zones)
		this.lastStand = 0
		this.round++
	}

	/** Mode, base capture and outcome for the debug log. */
	debugText(): string {
		const caps = this.capture.zones.map((z) => `${z.owner}:${Math.round(z.points)}/${z.capturing}`)
		return `mode=${this.mode} capture=${caps.join(',')} outcome=${this.outcome}`
	}

	private finish(winner: 0 | 1 | -1, outcome: Outcome) {
		this.winner = winner
		this.outcome = outcome
		this.phase = 'result'
		this.timer = MATCH.resultTime
	}

	/** Advance the round clock; returns true when the phase changed this frame. */
	update(dt: number, tanks: Tank[]): boolean {
		if (this.phase === 'countdown') {
			this.timer -= dt
			if (this.timer <= 0) {
				this.phase = 'battle'
				return true
			}
			return false
		}
		if (this.phase === 'battle') {
			this.roundLeft -= dt
			const alive = [0, 1].map((team) => tanks.filter((t) => t.team === team && t.alive).length)
			const player = tanks[0]
			if (player.alive && alive[player.team] === 1)
				this.lastStand = Math.max(this.lastStand, alive[1 - player.team])
			const captured = this.capture.update(dt, tanks)
			if (alive[0] === 0 || alive[1] === 0) {
				// Both sides gone in the same instant (a ram, two fires) is a draw
				this.finish(alive[0] === alive[1] ? -1 : alive[0] === 0 ? 1 : 0, 'destroyed')
			} else if (captured !== null) this.finish(captured, 'capture')
			else if (this.roundLeft <= 0) {
				// Time: the defence holds in an assault; otherwise the side with more tanks left takes it
				if (this.mode === 'assault') this.finish(this.defender, 'defended')
				else this.finish(alive[0] === alive[1] ? -1 : alive[0] > alive[1] ? 0 : 1, 'time')
			}
			return this.phase !== 'battle'
		}
		if (this.phase === 'result') {
			this.timer -= dt
			if (this.timer <= 0) {
				this.phase = 'garage'
				return true
			}
		}
		return false
	}
}
