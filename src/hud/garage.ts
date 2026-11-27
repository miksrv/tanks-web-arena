import {
	ARCHETYPES,
	HUD,
	MAP_PRESETS,
	MODE_LABEL,
	MODE_NOTE,
	RENDER,
	ROLE_LABEL,
	SEASON_LABEL,
	TANKS,
	tanksOf,
	DEFAULT_TANK,
	WEATHER,
	WEATHER_CHOICES,
	type BattleMode,
	type Nation,
	type TankDef,
	type WeatherChoice,
} from '../config'
import type { Records } from '../game/records'
import type { MapChoice } from '../game/world'
import { FramePacer } from '../render/framePacer'
import { ChoiceDialog, type ChoiceItem } from './choiceDialog'
import { $, show } from './dom'
import { recordBadge } from './statsDialog'
import { TankPreview } from './tankPreview'

function statBar(label: string, v: number, max: number, text: string): string {
	const width = Math.min(100, (v / max) * 100).toFixed(0)
	return `<div class="stat"><span>${label}</span><div class="sbar"><div style="width:${width}%"></div></div><b>${text}</b></div>`
}

function vehicleCardHtml(d: TankDef): string {
	const dmg = d.gun.dmg * (d.gun.salvo ?? 1)
	return (
		`<span class="role">${ROLE_LABEL[d.role]}</span><b>${d.name}</b>` +
		statBar('прочность', d.hp, HUD.garage.statMax.hp, String(d.hp)) +
		statBar('скорость', d.speed, HUD.garage.statMax.speed, `${Math.round(d.speed * 3.6)}`) +
		statBar('пробитие', d.gun.pen, HUD.garage.statMax.pen, String(d.gun.pen)) +
		statBar('урон', dmg, HUD.garage.statMax.dmg, String(dmg)) +
		statBar('броня', d.armor.front, HUD.garage.statMax.armor, `${d.armor.front}`)
	)
}

/** "13 машин": Russian plural of the vehicle count. */
function vehicleCount(n: number): string {
	const d = n % 10
	const teen = n % 100 >= 11 && n % 100 <= 14
	const word = teen || d === 0 || d >= 5 ? 'машин' : d === 1 ? 'машина' : 'машины'
	return `${n} ${word}`
}

const DIALOGS = ['help', 'stats', 'choice', 'report']

/** A dark tile with a question mark: the picture of a random pick. */
const RANDOM_ART = '<svg viewBox="0 0 100 75"><text x="50" y="54" text-anchor="middle" class="q">?</text></svg>'

/** Battle mode diagrams: bases as rings in team colours (neutral in khaki), dashed arrows for the push. */
const base = (x: number, y: number, team: string) => `<circle cx="${x}" cy="${y}" r="9" class="base ${team}"/>`
const arrow = (x1: number, y1: number, x2: number, y2: number, team: string) =>
	`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="push ${team}"/>` +
	`<circle cx="${x2}" cy="${y2}" r="2.6" class="tip ${team}"/>`
const diagram = (body: string) => `<svg viewBox="0 0 100 75">${body}</svg>`
const MODE_ART: Record<BattleMode, string> = {
	standard: diagram(base(18, 37, 'a') + base(82, 37, 'b') + arrow(32, 30, 64, 30, 'a') + arrow(68, 45, 36, 45, 'b')),
	encounter: diagram(base(50, 37, 'n') + arrow(10, 37, 36, 37, 'a') + arrow(90, 37, 64, 37, 'b')),
	assault: diagram(
		base(78, 37, 'b') +
			'<path d="M62,17 A26,26 0 0 0 62,57" class="wall"/>' +
			[15, 37, 59].map((y) => arrow(10, y, 50, 37 + (y - 37) * 0.5, 'a')).join(''),
	),
}

/** Aerial shots of the named maps, by file path (made by `scripts/map-previews.mjs`). */
const MAP_SHOTS = import.meta.glob<string>('../assets/maps/*.webp', { eager: true, query: '?url', import: 'default' })

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const MAP_ITEMS: ChoiceItem[] = [
	{
		id: 'random',
		name: 'Случайная',
		meta: 'любая местность',
		note: 'Каждый бой на новой карте: местность и время года выпадают случайно.',
		art: RANDOM_ART,
	},
	...MAP_PRESETS.map((p) => ({
		id: p.id,
		name: p.name,
		meta: `${ARCHETYPES[p.archetype].label} · ${SEASON_LABEL[p.season]}`,
		note: p.note,
		art: `<img src="${MAP_SHOTS[`../assets/maps/${p.id}.webp`] ?? ''}" alt="" loading="lazy" />`,
	})),
]

/** Weather pictures: a tinted sky with a drawn sign (sun, cloud, horizon, fog bands, rain and snow). */
const cloud = (x: number, y: number, k = 1) =>
	`<path transform="translate(${x},${y}) scale(${k})" d="M-18,8 a9,9 0 0 1 1,-18 a13,13 0 0 1 25,-3 a10.5,10.5 0 0 1 8,21 z" class="cloud"/>`
const rays = (x: number, y: number, from: number, to: number, half = false) =>
	Array.from({ length: half ? 5 : 8 }, (_, i) => {
		const a = half ? Math.PI + (i * Math.PI) / 4 : (i * Math.PI) / 4
		const p = (r: number) => `${(x + Math.cos(a) * r).toFixed(1)},${(y + Math.sin(a) * r).toFixed(1)}`
		return `<path d="M${p(from)} L${p(to)}" class="ray"/>`
	}).join('')
/** The sun half over the horizon, with an arrow for where it is going. */
const horizon = (arrow: string) =>
	`<path d="M38,50 a12,12 0 0 1 24,0 z" class="sun"/>${rays(50, 50, 17, 24, true)}` +
	`<path d="M16,50 H84" class="ray"/><path d="${arrow}" class="ray"/>`
const sky = (color: string, body: string) =>
	`<svg viewBox="0 0 100 75" class="wx"><rect width="100" height="75" fill="${color}"/>${body}</svg>`
const WEATHER_ART: Record<WeatherChoice, string> = {
	clear: sky('#2f4a5c', `<circle cx="50" cy="37" r="12" class="sun"/>${rays(50, 37, 18, 26)}`),
	overcast: sky('#363d40', cloud(40, 34, 1.15) + cloud(62, 44, 0.9)),
	dawn: sky('#4a4048', horizon('M50,68 V58 M45,62 L50,57 L55,62')),
	dusk: sky('#4d3229', horizon('M50,57 V67 M45,63 L50,68 L55,63')),
	fog: sky(
		'#3d423f',
		[22, 32, 42, 52]
			.map((y, i) => `<path d="M${i % 2 ? 26 : 18},${y} H${i % 2 ? 82 : 74}" class="band"/>`)
			.join(''),
	),
	precip: sky(
		'#2e3840',
		cloud(50, 26, 1.1) +
			[36, 46].map((x) => `<path d="M${x},46 l-4,10" class="ray"/>`).join('') +
			[58, 68]
				.map(
					(x) => `<path d="M${x - 4},52 h8 M${x},48 v8 M${x - 3},49 l6,6 M${x + 3},49 l-6,6" class="flake"/>`,
				)
				.join(''),
	),
}

/** The weather a card stands for, for its numbers («Осадки» (Precipitation): rain and snowfall share them). */
const weatherOf = (c: WeatherChoice) => WEATHER[c === 'precip' ? 'rain' : c]

const WEATHER_ITEMS: ChoiceItem[] = [
	{
		id: 'random',
		name: 'Случайная',
		meta: 'по времени года',
		note: 'Погода и время суток выпадают перед боем: чаще ясно, реже туман или осадки.',
		art: RANDOM_ART,
	},
	...(Object.keys(WEATHER_CHOICES) as WeatherChoice[]).map((w) => ({
		id: w,
		name: WEATHER_CHOICES[w].name,
		meta: `обзор ${Math.round(weatherOf(w).view * 100)} %`,
		note: WEATHER_CHOICES[w].note,
		art: WEATHER_ART[w],
	})),
]

const MODE_ITEMS: ChoiceItem[] = [
	{
		id: 'random',
		name: 'Случайный',
		note: 'Режим выпадает перед боем: стандартный, встречный или штурм.',
		art: RANDOM_ART,
	},
	...(Object.keys(MODE_LABEL) as BattleMode[]).map((m) => ({
		id: m,
		name: cap(MODE_LABEL[m]),
		note: MODE_NOTE[m],
		art: MODE_ART[m],
	})),
]

const STORE_KEY = 'tanks-web-arena.battle'

/** The last map and mode choice (per browser; an empty or blocked storage gives the defaults). */
function loadChoice(): MapChoice {
	try {
		const c = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') as Partial<MapChoice>
		const map = typeof c.map === 'string' && MAP_PRESETS.some((p) => p.id === c.map) ? c.map : 'random'
		const mode = c.mode && (c.mode === 'random' || c.mode in MODE_LABEL) ? c.mode : 'random'
		const weather = c.weather && c.weather in WEATHER_CHOICES ? c.weather : 'random'
		return { map, mode, weather }
	} catch {
		return { map: 'random', mode: 'random', weather: 'random' }
	}
}

function saveChoice(c: MapChoice) {
	try {
		localStorage.setItem(STORE_KEY, JSON.stringify(c))
	} catch {
		/* storage blocked: the choice lasts for the session */
	}
}

/** Vehicle selection screen: nation tabs, a carousel of vehicle cards with 3D portraits and the "to battle" button. */
export class Garage {
	nation: Nation = 'ussr'
	tankId = DEFAULT_TANK.ussr
	/** Map and battle mode for the next battles. */
	readonly choice: MapChoice = loadChoice()
	onGo: (() => void) | null = null
	/** The player's battle history; a card shows its numbers only for a vehicle that has fought. */
	records: Records = {}
	/** The battle numbers of a card were clicked. */
	onStats: ((tankId: string) => void) | null = null
	private readonly preview = new TankPreview()
	private readonly picker = new ChoiceDialog()
	private readonly pacer = new FramePacer()
	private cards = new Map<string, { el: HTMLElement; canvas: HTMLCanvasElement }>()
	/** Nation the cards were built for. */
	private builtFor: Nation | null = null
	private yaw = 0
	private lastFrame = 0
	private spinning = false

	constructor() {
		for (const n of this.nationTabs()) {
			n.onclick = () => {
				if (this.nation === n.dataset.n) return
				this.nation = n.dataset.n as Nation
				this.tankId = DEFAULT_TANK[this.nation]
				this.render()
			}
		}
		$('goBtn').onclick = () => this.onGo?.()
		$('copyYear').textContent = String(new Date().getFullYear())
		$('appVersion').textContent = __APP_VERSION__
		for (const c of Array.from($('garage').querySelectorAll<HTMLElement>('[data-count]')))
			c.textContent = vehicleCount(tanksOf(c.dataset.count as Nation).length)
		this.buildChoices()
		$('carPrev').onclick = () => this.step(-1)
		$('carNext').onclick = () => this.step(1)
		// A vertical wheel scrolls the row sideways
		$('tankList').addEventListener(
			'wheel',
			(e) => {
				if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
				e.preventDefault()
				$('tankList').scrollBy({ left: e.deltaY })
			},
			{ passive: false },
		)
		window.addEventListener('keydown', (e) => {
			// A dialog on top (controls, statistics, a picker) takes the keys
			if (!this.isOpen || DIALOGS.some((id) => $(id).classList.contains('on'))) return
			if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.step(-1)
			else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.step(1)
			// Enter on a focused button is that button's click, not «В бой» (To battle)
			else if (e.code === 'Enter' && !(e.target instanceof HTMLButtonElement)) this.onGo?.()
		})
		// Dragging the window edge fires a stream of resizes: redraw the cards (a WebGL render each) once it settles
		let resizeTimer = 0
		window.addEventListener('resize', () => {
			clearTimeout(resizeTimer)
			resizeTimer = window.setTimeout(() => {
				if (this.isOpen) this.drawAll()
			}, HUD.garage.resizeDelay * 1000)
		})
	}

	get isOpen() {
		return $('garage').style.display === 'block'
	}

	show(on: boolean) {
		show($('garage'), on)
		if (on) {
			this.builtFor = null // the window may have changed size while the battle ran
			this.render()
		}
		if (on && !this.spinning) {
			this.spinning = true
			this.lastFrame = performance.now()
			requestAnimationFrame(this.spin)
		}
	}

	/** The «Карта» (Map), «Режим» (Mode) and «Погода» (Weather) buttons: each opens a dialog of cards and shows what is picked. */
	private buildChoices() {
		$('mapPick').onclick = () =>
			this.picker.open('Карта', MAP_ITEMS, this.choice.map, (id) => this.pick({ ...this.choice, map: id }))
		$('modePick').onclick = () =>
			this.picker.open('Режим боя', MODE_ITEMS, this.choice.mode, (id) =>
				this.pick({ ...this.choice, mode: id as MapChoice['mode'] }),
			)
		$('weatherPick').onclick = () =>
			this.picker.open('Погода', WEATHER_ITEMS, this.choice.weather, (id) =>
				this.pick({ ...this.choice, weather: id as MapChoice['weather'] }),
			)
		this.pick(this.choice)
	}

	private pick(c: MapChoice) {
		Object.assign(this.choice, c)
		saveChoice(this.choice)
		$('mapPickName').textContent = MAP_ITEMS.find((m) => m.id === c.map)?.name ?? ''
		$('modePickName').textContent = MODE_ITEMS.find((m) => m.id === c.mode)?.name ?? ''
		$('weatherPickName').textContent = WEATHER_ITEMS.find((m) => m.id === c.weather)?.name ?? ''
	}

	private nationTabs(): HTMLElement[] {
		return Array.from($('garage').querySelectorAll<HTMLElement>('.nation'))
	}

	/** Move the selection by `dir` cards along the row. */
	private step(dir: number) {
		const ids = tanksOf(this.nation)
		const i = Math.max(0, Math.min(ids.length - 1, ids.indexOf(this.tankId) + dir))
		this.select(ids[i])
	}

	private select(id: string) {
		if (id === this.tankId) return
		this.tankId = id
		this.yaw = 0
		this.render()
	}

	private render() {
		for (const n of this.nationTabs()) n.classList.toggle('on', n.dataset.n === this.nation)
		if (this.builtFor !== this.nation) this.build()
		for (const [id, c] of this.cards) c.el.classList.toggle('on', id === this.tankId)
		const ids = tanksOf(this.nation)
		const i = ids.indexOf(this.tankId)
		;($('carPrev') as HTMLButtonElement).disabled = i <= 0
		;($('carNext') as HTMLButtonElement).disabled = i >= ids.length - 1
		this.cards.get(this.tankId)?.el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
	}

	/** Cards for the current nation, each with a still portrait; the selected one turns in `spin`. */
	private build() {
		const list = $('tankList')
		list.innerHTML = ''
		this.cards.clear()
		for (const id of tanksOf(this.nation)) {
			const el = document.createElement('div')
			el.className = 'tank'
			const canvas = document.createElement('canvas')
			canvas.className = 'model'
			el.appendChild(canvas)
			el.insertAdjacentHTML('beforeend', vehicleCardHtml(TANKS[id]))
			const record = this.records[id]
			if (record) {
				const line = document.createElement('button')
				line.className = 'rec'
				line.innerHTML = recordBadge(record)
				line.title = 'Статистика машины'
				line.onclick = (e) => {
					e.stopPropagation()
					this.onStats?.(id)
				}
				el.appendChild(line)
			}
			el.onclick = () => this.select(id)
			list.appendChild(el)
			this.cards.set(id, { el, canvas })
		}
		this.builtFor = this.nation
		this.drawAll()
	}

	/** Size every portrait canvas to its box in device pixels and draw it. */
	private drawAll() {
		const dpr = Math.min(window.devicePixelRatio, 2)
		for (const [id, { canvas }] of this.cards) {
			canvas.width = Math.round(canvas.clientWidth * dpr)
			canvas.height = Math.round(canvas.clientHeight * dpr)
			this.preview.draw(TANKS[id], canvas, id === this.tankId ? this.yaw : 0)
		}
	}

	private readonly spin = (now: number) => {
		if (!this.isOpen) {
			this.spinning = false
			return
		}
		requestAnimationFrame(this.spin)
		if (!this.pacer.shouldRender(now, RENDER.garageFps)) return
		this.yaw += TankPreview.spin((now - this.lastFrame) / 1000)
		this.lastFrame = now
		const card = this.cards.get(this.tankId)
		if (card) this.preview.draw(TANKS[this.tankId], card.canvas, this.yaw)
	}
}
