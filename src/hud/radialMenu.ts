import { HUD } from '../config'
import type { Signal } from '../game/playerController'
import { $, createEl, setClass, setStyle, show } from './dom'

/** The menu's choices, clockwise from the top: screen angle (rad, y down), label and the matching hotkey. */
const OPTIONS: { sig: Signal; angle: number; label: string; key: string }[] = [
	{ sig: 'attack', angle: -Math.PI / 2, label: 'Атакую!', key: 'T' },
	{ sig: 'defend', angle: Math.PI / 6, label: 'Защищайте базу!', key: 'B' },
	{ sig: 'help', angle: (Math.PI * 5) / 6, label: 'Нужна помощь!', key: 'G' },
]
const R = HUD.radial

/**
 * Hold-to-open radial menu of team signals (WoT-style): the mouse moves a pointer from the centre, the option in its
 * direction lights up, releasing the key sends it. The camera stands still meanwhile.
 */
export class RadialMenu {
	private readonly items: HTMLElement[]
	private readonly pointer: HTMLElement
	private x = 0
	private y = 0
	private picked: Signal | null = null
	isOpen = false

	constructor() {
		const root = $('radial')
		this.items = OPTIONS.map((o) => {
			const el = createEl('div', 'opt', root)
			el.innerHTML = `${o.label}<kbd>${o.key}</kbd>`
			setStyle(el, 'transform', `translate(${Math.cos(o.angle) * R.itemR}px, ${Math.sin(o.angle) * R.itemR}px)`)
			return el
		})
		this.pointer = createEl('div', 'pointer', root)
	}

	open() {
		this.isOpen = true
		this.x = this.y = 0
		this.picked = null
		show($('radial'), true)
		this.draw()
	}

	/** Mouse deltas move the pointer; the option nearest its direction is picked once it leaves the dead zone. */
	move(dx: number, dy: number) {
		this.x += dx
		this.y += dy
		const d = Math.hypot(this.x, this.y)
		if (d > R.pointerMax) {
			this.x *= R.pointerMax / d
			this.y *= R.pointerMax / d
		}
		this.picked = null
		if (d >= R.deadZone) {
			const a = Math.atan2(this.y, this.x)
			let best = Infinity
			for (const o of OPTIONS) {
				const off = Math.abs(Math.atan2(Math.sin(a - o.angle), Math.cos(a - o.angle)))
				if (off < best) {
					best = off
					this.picked = o.sig
				}
			}
		}
		this.draw()
	}

	/** Hide the menu; returns the option picked (null: released in the centre, or cancelled). */
	close(): Signal | null {
		const sig = this.isOpen ? this.picked : null
		this.isOpen = false
		this.picked = null
		show($('radial'), false)
		return sig
	}

	private draw() {
		OPTIONS.forEach((o, i) => setClass(this.items[i], o.sig === this.picked ? 'opt on' : 'opt'))
		setStyle(this.pointer, 'transform', `translate(${Math.round(this.x)}px, ${Math.round(this.y)}px)`)
	}
}
