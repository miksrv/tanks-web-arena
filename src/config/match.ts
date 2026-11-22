import type { Nation, Role } from './types'

/** Standard: both bases can be captured; encounter: one neutral base in the middle; assault: one side defends. */
export type BattleMode = 'standard' | 'encounter' | 'assault'

export const MATCH = {
	teamSize: 7,
	roundTime: 360, // s
	countdown: 4, // s before tanks may move
	resultTime: 11, // s showing the result before the next round
	wreckView: 4, // s the camera stays on the player's own wreck before it goes to a teammate
	composition: { light: 1, medium: 2, heavy: 2, td: 1, spg: 1 } as Record<Role, number>,
	ratingSpread: 1.5, // bots' vehicles are rated within this of the player's (the nearest when none is)
	ratingTolerance: 0.5, // team rating sums may differ by this much
	modeOdds: { standard: 0.6, encounter: 0.25, assault: 0.15 } as Record<BattleMode, number>,
	/** Spawn formation at a base: rows of `cols` tanks facing the enemy, artillery in the back row. */
	spawn: { cols: 4, colGap: 11, rowGap: 12 }, // m
	departRow: 3.5, // s each row waits for the one ahead before leaving the base…
	departJitter: 2, // …plus up to this much, at random
	balancePasses: 20, // attempts at swapping vehicles to bring the team rating sums within the tolerance
	autostartDelayMs: 500, // ms before `?autostart` presses the battle button
	debugLogMs: 5000, // ms between two lines of the `?debug` log
}

/** Bot names per nation (the roster is shuffled every round). */
export const BOT_NAMES: Record<Nation, string[]> = {
	ussr: [
		'Лавриненко',
		'Колобанов',
		'Бурда',
		'Самохин',
		'Оськин',
		'Любушкин',
		'Фадин',
		'Коновалов',
		'Архипов',
		'Катуков',
		'Бочковский',
		'Зиновий',
	],
	germany: [
		'Wittmann',
		'Carius',
		'Knispel',
		'Bölter',
		'Kerscher',
		'Barkmann',
		'Staudegger',
		'Rondorf',
		'Bix',
		'Strippel',
		'Fehrmann',
		'Loewe',
	],
}

/** Team signals (T / G / B and the Q wheel). */
export const SIGNALS = {
	cooldown: 2, // s between two signals
	focusTime: 25, // s the team prefers the called-out target
	orderHold: 40, // s bots sent by a signal stay where they were sent
}

export const MODE_LABEL: Record<BattleMode, string> = {
	standard: 'стандартный бой',
	encounter: 'встречный бой',
	assault: 'штурм',
}

/** Base capture. Units: metres, capture points (100 = captured), seconds. */
export const CAPTURE = {
	radius: 30,
	points: 100,
	rate: 1.25, // points per second per tank in the circle: alone, a base takes 80 s
	maxTanks: 3, // more than this many capturers do not speed it up
	/** Neutral base: flat ground and the base biome around it. */
	flatRadius: 60,
	biomeRadius: 36,
	teamFlag: ['#b8312a', '#4a6d8c'] as const, // flag colour of a base by its owner: USSR, Germany
	neutralFlag: '#e8e2cc',
	poleHeight: 9, // m
	stakes: 28, // stakes around a base circle
}
