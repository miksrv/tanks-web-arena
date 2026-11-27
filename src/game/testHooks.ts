import { ARCHETYPES, MATCH, MODE_LABEL, TANKS, WEATHER, type Archetype, type BattleMode, type Weather } from '../config'

/**
 * Test hooks read from the URL:
 * - `?autostart` skips the garage (and restarts after each result)
 * - `&seed=N` fixes the first map, `&tank=id` picks the player's vehicle
 * - `&round=N` shortens the round, `&speed=K` scales game time
 * - `&weather=fog` forces the weather of every map, `&mode=encounter` the battle mode, `&map=steppe` the archetype
 * - `&view=top` puts the satellite camera over the map centre (screenshots of the whole map)
 * - `&debug` logs the match state every 5 s to the console
 *
 * A round or speed override makes the run a test: its battles stay out of the history.
 */
export interface TestOptions {
	autostart: boolean
	/** Nobody at the controls (`?autostart`) or changed rules (`?round`, `?speed`): battles are not recorded. */
	unrecorded: boolean
	seed: number | null
	tankId: string | null
	timeScale: number
	overviewTop: boolean
	debug: boolean
	weather: Weather | null
	mode: BattleMode | null
	archetype: Archetype | null
}

export function readTestOptions(search = location.search): TestOptions {
	const params = new URLSearchParams(search)
	// A positive finite number, or null (drops `?speed=abc`, `?round=-1`, `?round=Infinity`)
	const positive = (name: string) => {
		const v = params.has(name) ? Number(params.get(name)) : NaN
		return Number.isFinite(v) && v > 0 ? v : null
	}
	// Own keys only: `?tank=constructor` must not pass for a vehicle
	const key = <T extends string>(name: string, table: object) => {
		const v = params.get(name)
		return v !== null && Object.hasOwn(table, v) ? (v as T) : null
	}
	const seed = params.has('seed') ? Number(params.get('seed')) : NaN
	const round = positive('round')
	const speed = positive('speed')
	if (round !== null) MATCH.roundTime = round
	return {
		autostart: params.has('autostart'),
		unrecorded: params.has('autostart') || round !== null || speed !== null,
		seed: Number.isFinite(seed) ? seed : null,
		tankId: key<string>('tank', TANKS),
		timeScale: speed ?? 1,
		overviewTop: params.get('view') === 'top',
		debug: params.has('debug'),
		weather: key<Weather>('weather', WEATHER),
		mode: key<BattleMode>('mode', MODE_LABEL),
		archetype: key<Archetype>('map', ARCHETYPES),
	}
}

/** Puts a debugging handle on `window` (for the browser console and automated tests). */
export function exposeOnWindow(name: string, value: unknown) {
	;(window as unknown as Record<string, unknown>)[name] = value
}
