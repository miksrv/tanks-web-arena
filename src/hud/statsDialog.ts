import { ROLE_LABEL, TANKS } from '../config'
import type { Records, TankRecord } from '../game/records'
import { $ } from './dom'

const num = (v: number) => Math.round(v).toLocaleString('ru-RU')
const per = (a: number, b: number) => (b ? a / b : 0)
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : '—')

/** The numbers over a vehicle's portrait on its card: battles, win rate and kills. */
export function recordBadge(r: TankRecord): string {
	const row = (label: string, value: string) => `<span>${label} <b>${value}</b></span>`
	return row('боёв', num(r.battles)) + row('побед', pct(r.wins, r.battles)) + row('подбито', num(r.kills))
}

const tile = (value: string, label: string) => `<div class="tile"><b>${value}</b><span>${label}</span></div>`
const cell = (label: string, value: string, note = '') =>
	`<div class="cell"><span>${label}</span><b>${value}</b>${note ? `<small>${note}</small>` : ''}</div>`

/** The totals over every vehicle played. */
function summaryHtml(list: TankRecord[]): string {
	const sum = (pick: (r: TankRecord) => number) => list.reduce((s, r) => s + pick(r), 0)
	const battles = sum((r) => r.battles)
	return (
		`<div class="tiles">` +
		tile(num(battles), 'боёв') +
		tile(
			pct(
				sum((r) => r.wins),
				battles,
			),
			'побед',
		) +
		tile(
			pct(
				sum((r) => r.survived),
				battles,
			),
			'выжил',
		) +
		tile(
			num(
				per(
					sum((r) => r.damage),
					battles,
				),
			),
			'средний урон',
		) +
		tile(num(sum((r) => r.kills)), 'уничтожено') +
		tile(String(list.length), 'машин в бою') +
		`</div>`
	)
}

function tableHtml(ids: string[], records: Records, selected: string): string {
	const rows = ids.map((id) => {
		const r = records[id]
		const d = TANKS[id]
		return (
			`<tr data-id="${id}" class="${d.nation}${id === selected ? ' on' : ''}">` +
			`<td>${d.name} <small>${ROLE_LABEL[d.role]}</small></td><td>${num(r.battles)}</td>` +
			`<td>${pct(r.wins, r.battles)}</td><td>${pct(r.survived, r.battles)}</td>` +
			`<td>${num(per(r.damage, r.battles))}</td><td>${per(r.kills, r.battles).toFixed(1)}</td>` +
			`<td>${pct(r.hits, r.shots)}</td><td>${num(r.bestDamage)}</td></tr>`
		)
	})
	return (
		`<table><tr><th>Машина</th><th>Боёв</th><th>Побед</th><th>Выжил</th><th>Ср. урон</th>` +
		`<th>Уничт. за бой</th><th>Точность</th><th>Рекорд урона</th></tr>${rows.join('')}</table>`
	)
}

/** Everything kept about one vehicle. */
function detailHtml(id: string, r: TankRecord): string {
	const d = TANKS[id]
	const n = r.battles
	const losses = n - r.wins - r.draws
	const medals = Object.entries(r.medals)
		.sort((a, b) => b[1] - a[1])
		.map(([name, count]) => `<span class="won">${name}${count > 1 ? ` <b>×${count}</b>` : ''}</span>`)
	const last = r.lastPlayed ? new Date(r.lastPlayed).toLocaleDateString('ru-RU') : '—'
	return (
		`<h3>${d.name} <small>${ROLE_LABEL[d.role]} · последний бой ${last}</small></h3><div class="grid">` +
		cell('Бои', num(n), `побед ${r.wins} · поражений ${losses} · ничьих ${r.draws}`) +
		cell('Победы', pct(r.wins, n), `выжил в ${pct(r.survived, n)} боёв`) +
		cell('Урон за бой', num(per(r.damage, n)), `рекорд ${num(r.bestDamage)} · всего ${num(r.damage)}`) +
		cell('Уничтожено', num(r.kills), `за бой ${per(r.kills, n).toFixed(1)} · рекорд ${r.bestKills}`) +
		cell('Получено за бой', num(per(r.taken, n)), `заблокировано ${num(per(r.blocked, n))}`) +
		cell('Обнаружено за бой', per(r.spots, n).toFixed(1), `урон по засвету ${num(per(r.assist, n))}`) +
		cell('Точность', pct(r.hits, r.shots), `выстрелов ${num(r.shots)} · попаданий ${num(r.hits)}`) +
		cell('Пробития', pct(r.pens, r.hits), `пробитий ${num(r.pens)}`) +
		`</div>` +
		(medals.length ? `<div class="medals">${medals.join('')}</div>` : '')
	)
}

/**
 * The battle history dialog of the garage: totals, a table of the vehicles the player has fought on (most played
 * first) and the full record of the selected one. Vehicles without battles are not listed.
 */
export class StatsDialog {
	records: Records = {}
	private readonly el = $('stats')
	private selected = ''

	constructor() {
		$('statsClose').onclick = () => this.close()
		// A click on the dimmed backdrop, outside the sheet
		this.el.addEventListener('click', (e) => {
			if (e.target === this.el) this.close()
		})
		$('statsBody').addEventListener('click', (e) => {
			const id = (e.target as HTMLElement).closest<HTMLElement>('tr[data-id]')?.dataset.id
			if (id && id !== this.selected) {
				this.selected = id
				this.render()
			}
		})
		window.addEventListener('keydown', (e) => {
			if (e.code === 'Escape') this.close()
		})
	}

	/** Open on `tankId` if it has battles, otherwise on the most played vehicle. */
	open(tankId: string) {
		this.selected = tankId
		this.render()
		this.el.classList.add('on')
	}

	close() {
		this.el.classList.remove('on')
	}

	private render() {
		const ids = Object.keys(this.records).sort((a, b) => this.records[b].battles - this.records[a].battles)
		if (!ids.length) {
			$('statsBody').innerHTML = '<p class="none">Боёв пока не было: статистика появится после первого боя.</p>'
			return
		}
		if (!this.records[this.selected]) this.selected = ids[0]
		$('statsBody').innerHTML =
			summaryHtml(ids.map((id) => this.records[id])) +
			tableHtml(ids, this.records, this.selected) +
			detailHtml(this.selected, this.records[this.selected])
	}
}
