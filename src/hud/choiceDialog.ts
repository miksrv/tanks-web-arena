import { $, createEl } from './dom'

/** One card of the picker. */
export interface ChoiceItem {
	id: string
	name: string
	/** A short line under the name (country, season, weather). */
	meta?: string
	note: string
	/** The picture: markup (an image or an inline SVG). */
	art: string
}

/**
 * The garage's picker dialog (map, battle mode): a grid of cards with a picture, a name and a description. A click
 * on a card picks it and closes the dialog; the cross, a click beside the sheet or Esc close it without a change.
 */
export class ChoiceDialog {
	private readonly el = $('choice')

	constructor() {
		$('choiceClose').onclick = () => this.close()
		this.el.addEventListener('click', (e) => {
			if (e.target === this.el) this.close()
		})
		window.addEventListener('keydown', (e) => {
			if (e.code === 'Escape') this.close()
		})
	}

	open(title: string, items: ChoiceItem[], current: string, onPick: (id: string) => void) {
		$('choiceTitle').textContent = title
		const body = $('choiceBody')
		body.innerHTML = ''
		// One row up to five cards, otherwise two even rows
		const n = items.length
		body.style.setProperty('--cols', String(n <= 5 ? n : Math.min(5, Math.ceil(n / 2))))
		for (const item of items) {
			const card = createEl('button', item.id === current ? 'card on' : 'card', body)
			createEl('div', 'art', card).innerHTML = item.art
			createEl('b', '', card).textContent = item.name
			if (item.meta) createEl('span', 'meta', card).textContent = item.meta
			createEl('small', '', card).textContent = item.note
			card.onclick = () => {
				onPick(item.id)
				this.close()
			}
		}
		this.el.classList.add('on')
	}

	close() {
		this.el.classList.remove('on')
	}
}
