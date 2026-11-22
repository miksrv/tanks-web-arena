import type { BattleMode } from './match'
import type { Nation, Role } from './types'

export const NATION_LABEL: Record<Nation, string> = { ussr: 'СССР', germany: 'Германия' }
export const ROLE_LABEL: Record<Role, string> = {
	light: 'лёгкий',
	medium: 'средний',
	heavy: 'тяжёлый',
	td: 'ПТ-САУ',
	spg: 'САУ',
}

/** Armour zone names in the aim readout. */
export const ARMOR_ZONE_LABEL = { lower: 'нижний лист', mantlet: 'маска', cupola: 'башенка', screen: 'экран' } as const
/** Battle mode descriptions on the mode cards of the garage. */
export const MODE_NOTE: Record<BattleMode, string> = {
	standard: 'У каждой команды своя база: уничтожить всех или захватить базу противника.',
	encounter: 'Одна нейтральная база в центре: её может захватить любая команда.',
	assault: 'Одна команда обороняет базу, другая её штурмует. Время на стороне обороны.',
}
/** Where a hit landed, for the battle log and the report: the struck part, or the special zone on it. */
export const HIT_PART_LABEL = { hull: 'корпус', turret: 'башня', tracks: 'гусеница' }
export const HIT_ZONE_LABEL = {
	lower: 'нижний лист',
	mantlet: 'маска орудия',
	cupola: 'командирская башенка',
	screen: 'экран',
}
export const SEASON_LABEL = { summer: 'лето', autumn: 'осень', winter: 'зима' } as const
export const SCOREBOARD_HEADER = [
	'Команда',
	'Танкист',
	'Машина',
	'Урон',
	'По засвету',
	'Броня',
	'Уничтожил',
	'Обнаружил',
]
