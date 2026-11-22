import { $ } from './dom'

/** One line of the help: the keys as key caps, then what they do. */
interface HelpRow {
	keys: string[]
	text: string
}

const GROUPS: { title: string; rows: HelpRow[] }[] = [
	{
		title: 'Движение и огонь',
		rows: [
			{ keys: ['W', 'S'], text: 'Газ и задний ход' },
			{ keys: ['A', 'D'], text: 'Поворот корпуса' },
			{ keys: ['Мышь'], text: 'Прицел: башня идёт за камерой' },
			{ keys: ['ЛКМ'], text: 'Огонь' },
			{ keys: ['ПКМ'], text: 'Удерживать: осмотреться, не сбивая наводку' },
			{ keys: ['Shift'], text: 'Снайперский или артиллерийский режим (или колесо до упора)' },
			{ keys: ['Колесо'], text: 'Зум, в артиллерийском режиме высота' },
		],
	},
	{
		title: 'Снаряды и расходники',
		rows: [
			{ keys: ['1', '2', '3'], text: 'Бронебойный, подкалиберный, фугас' },
			{ keys: ['R'], text: 'Ремкомплект: гусеница, двигатель, погон, орудие' },
			{ keys: ['E'], text: 'Аптечка: экипаж' },
			{ keys: ['F'], text: 'Огнетушитель' },
		],
	},
	{
		title: 'Команды союзникам',
		rows: [
			{ keys: ['Q'], text: 'Удерживать: меню команд, выбрать мышью и отпустить' },
			{ keys: ['T'], text: '«Атакую!»: цель под прицелом или точка' },
			{ keys: ['G'], text: '«Нужна помощь!»' },
			{ keys: ['B'], text: '«Защищайте базу!»' },
		],
	},
	{
		title: 'Интерфейс',
		rows: [
			{ keys: ['Tab'], text: 'Таблица команд' },
			{ keys: ['H'], text: 'Эта подсказка' },
			{ keys: ['M'], text: 'Звук' },
			{ keys: ['P'], text: 'Счётчик кадров' },
			{ keys: ['Пробел'], text: 'После гибели: следующий союзник' },
			{ keys: ['Esc'], text: 'Пауза, там же «Завершить бой»' },
		],
	},
]

const TIP =
	'Жёлтый кружок показывает, куда орудие смотрит прямо сейчас: башня догоняет прицел. Цвет прицела: зелёный — ' +
	'пробьёт, оранжевый — как повезёт, красный — не пробить. Бейте в борт и корму, прячьтесь в кустах, за домами и ' +
	'в складках местности.'

function rowHtml(r: HelpRow): string {
	const keys = r.keys.map((k) => `<kbd>${k}</kbd>`).join('')
	return `<div class="row"><span class="keys">${keys}</span><span>${r.text}</span></div>`
}

/**
 * The controls dialog: groups of rows, key caps on the left and the action on the right. Opened by the «?» button of
 * the garage and by H in battle; closed by its cross, a click beside it, Esc or H.
 */
export class ControlsHelp {
	private readonly el = $('help')

	constructor() {
		const groups = GROUPS.map((g) => `<section><h3>${g.title}</h3>${g.rows.map(rowHtml).join('')}</section>`)
		$('helpBody').innerHTML = `<div class="groups">${groups.join('')}</div><p class="tip">${TIP}</p>`
		$('helpBtn').onclick = () => this.toggle()
		$('helpClose').onclick = () => this.close()
		// A click on the dimmed backdrop, outside the sheet
		this.el.addEventListener('click', (e) => {
			if (e.target === this.el) this.close()
		})
		window.addEventListener('keydown', (e) => {
			if (e.code === 'Escape') this.close()
		})
	}

	get isOpen() {
		return this.el.classList.contains('on')
	}
	toggle() {
		this.el.classList.toggle('on')
	}
	close() {
		this.el.classList.remove('on')
	}
}
