import type { Archetype } from './world'

/** A named map: a fixed seed with its country and season (the layout is the seed's every time; the weather is not its part). */
export interface MapPreset {
	id: string
	name: string
	seed: number
	archetype: Archetype
	season: 'summer' | 'autumn' | 'winter'
	/** What the map is like, for its card in the garage. */
	note: string
}

export const MAP_PRESETS: MapPreset[] = [
	{
		id: 'prokhorovka',
		name: 'Прохоровка',
		seed: 1948,
		archetype: 'steppe',
		season: 'summer',
		note: 'Открытая степь: поля, стога и редкие рощи. Простор для дальнего огня, укрытий мало.',
	},
	{
		id: 'kursk',
		name: 'Курская дуга',
		seed: 1947,
		archetype: 'steppe',
		season: 'summer',
		note: 'Степь с деревнями у железной дороги: дома и насыпь прикрывают посреди открытых полей.',
	},
	{
		id: 'polesie',
		name: 'Полесье',
		seed: 3103,
		archetype: 'swamp',
		season: 'autumn',
		note: 'Густые леса и топи. В болотах машины вязнут, бой идёт на короткой дистанции.',
	},
	{
		id: 'pass',
		name: 'Перевал',
		seed: 4201,
		archetype: 'pass',
		season: 'winter',
		note: 'Зимняя горная долина: склоны, камни и леса, обходных путей немного.',
	},
	{
		id: 'kerch',
		name: 'Керчь',
		seed: 5502,
		archetype: 'coast',
		season: 'summer',
		note: 'Побережье: один фланг спускается к морю, пляж простреливается сверху.',
	},
	{
		id: 'karelia',
		name: 'Карелия',
		seed: 7310,
		archetype: 'lakes',
		season: 'summer',
		note: 'Озёрный край: леса, валуны и озёра, между которыми приходится искать дорогу.',
	},
	{
		id: 'rzhev',
		name: 'Ржев',
		seed: 6604,
		archetype: 'classic',
		season: 'winter',
		note: 'Средняя полоса зимой: леса, поля и деревни под снегом.',
	},
	{
		id: 'orel',
		name: 'Орёл',
		seed: 6602,
		archetype: 'classic',
		season: 'autumn',
		note: 'Осенние леса, поля и деревни средней полосы.',
	},
	{
		id: 'malinovka',
		name: 'Малиновка',
		seed: 6601,
		archetype: 'classic',
		season: 'summer',
		note: 'Лето в средней полосе: поля, рощи и деревни.',
	},
]
