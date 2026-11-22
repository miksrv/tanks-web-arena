import { AMMO, AMMO_IDS, AMMO_LOAD, CREW_ROLES, HUD, ROLE_LABEL, type AmmoId } from '../config'
import type { Tank } from '../tank/tank'
import { $, createEl, setClass, setStyle, setText, show } from './dom'
import { TankSchema, type HitZone } from './tankSchema'

/**
 * A shell lying nose to the right (drawn nose up, then turned): pointed armour-piercing, the slim core of the
 * sub-calibre one, blunt high explosive.
 */
const shell = (body: string, mark: string) =>
	`<svg viewBox="0 0 26 10" aria-hidden="true"><g transform="rotate(90) translate(0 -26)">` +
	`<path class="body" d="${body}"/><path class="mark" d="${mark}"/></g></svg>`
const SHELL_ART: Record<AmmoId, string> = {
	ap: shell('M5,0 C7.6,4 9,8 9,12 V26 H1 V12 C1,8 2.4,4 5,0 Z', 'M1,20 H9'),
	apcr: shell('M5,0 L6.4,9 L9,13 V26 H1 V13 L3.6,9 Z', 'M5,1 L5,9'),
	he: shell('M5,3 C7.8,3 9,6 9,10 V26 H1 V10 C1,6 2.2,3 5,3 Z', 'M1,11 H9'),
}

const hpColor = (frac: number) => (frac > 0.5 ? '#8fd36b' : frac > 0.25 ? '#e0a04a' : '#ff5a5a')
/** Shows a damage tag while its condition holds; returns the condition. */
const tag = (el: HTMLElement, on: boolean) => {
	show(el, on, 'inline-block')
	return on
}
const formatClock = (t: number) => {
	const s = Math.max(0, t)
	return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

/**
 * The player's vehicle panel (the vehicle's diagram or the health bar, by `HUD.status.style`; modules, consumables,
 * ammo), team pips, the round clock and the hit flash.
 */
export class StatusPanel {
	private readonly ammoEls: HTMLElement[] = []
	private readonly ammoCounts: HTMLElement[] = []
	private readonly crewEls = CREW_ROLES.map(
		(r) => $('crew').querySelector<HTMLElement>(`[data-crew="${r}"]`) ?? createEl('span', '', $('crew')),
	)
	private readonly schema = HUD.status.style === 'schema' ? new TankSchema() : null
	private hitFlash = 0
	private lastHits = 0
	private lastHp = 0
	private hpShown = 0 // s the health number stays on (schema style)

	constructor() {
		if (this.schema) $('status').classList.add('schema')
		for (const id of AMMO_IDS) {
			const el = createEl('div', 'chip', $('ammo'))
			el.innerHTML = `<kbd>${AMMO[id].key}</kbd>${SHELL_ART[id]}<span>${AMMO[id].label}</span><b></b>`
			this.ammoEls.push(el)
			this.ammoCounts.push(el.querySelector('b') ?? el)
		}
	}

	reset() {
		this.lastHits = 0
		this.hpShown = 0
		this.schema?.reset()
	}

	/** A hit on the player from `angle` (rad from the hull's nose, + = to the left): the diagram lights that side. */
	hitSide(angle: number) {
		this.schema?.hitFrom(angle)
	}

	/** A shell struck that part of the player's vehicle: the diagram lights it. */
	hitZone(zone: HitZone) {
		this.schema?.hitAt(zone)
	}

	update(dt: number, player: Tank, tanks: Tank[], roundLeft: number, resupplying: boolean) {
		this.updateVehicle(dt, player)
		this.updateAmmo(player, resupplying)
		this.updateHitFlash(dt, player)
		this.updateTeams(tanks)
		setText($('timer'), formatClock(roundLeft))
	}

	private updateVehicle(dt: number, player: Tank) {
		const d = player.def
		setText($('tankName'), d.name)
		setText($('tankRole'), ROLE_LABEL[d.role])
		setText($('hpText'), `${Math.ceil(player.hp)} / ${d.hp}`)
		setStyle($('hpBar'), 'width', `${(player.hpFrac * 100).toFixed(1)}%`)
		setStyle($('hpBar'), 'background', hpColor(player.hpFrac))
		if (this.schema) {
			// The bar carries the health; the exact number shows up only for a moment after it drops
			this.hpShown = player.hp < this.lastHp ? HUD.status.hpShow : Math.max(0, this.hpShown - dt)
			this.lastHp = player.hp
			setStyle($('hpText'), 'opacity', this.hpShown > 0 ? '1' : '0')
			this.schema.update(dt, player)
		}
		// Only what is broken or wounded is listed: a healthy tank shows neither row
		setText($('mTrack'), `гусеница ${player.tracked.toFixed(0)}с`)
		const broken = [
			tag($('mTrack'), player.tracked > 0),
			tag($('mEngine'), player.engineDamaged > 0),
			tag($('mFire'), player.burning > 0),
			tag($('mGun'), player.gunDamaged > 0),
			tag($('mRing'), d.shape.turret && player.ringDamaged > 0),
			tag($('mRack'), player.rackDamaged > 0),
		]
		show($('modules'), broken.includes(true))
		let wounded = false
		// One line per man: in a small crew the commander's wound is not repeated under the roles he also does
		CREW_ROLES.forEach((r, i) => {
			const on = player.crew.wounded[r] && player.crew.seatOf(r) === r
			wounded = tag(this.crewEls[i], on) || wounded
		})
		show($('crew'), wounded)
		setClass($('cRepair'), player.repairKit ? '' : 'used')
		setClass($('cExt'), player.extinguisher ? '' : 'used')
		setClass($('cMed'), player.crew.medkit ? '' : 'used')
	}

	/**
	 * One tile per shell type: its key, a drawing of the shell, its name and the rounds left; the loaded type is
	 * lit. A type the vehicle does not carry is hidden. Under them, the base top-up line.
	 */
	private updateAmmo(player: Tank, resupplying: boolean) {
		this.ammoEls.forEach((el, i) => {
			const id = AMMO_IDS[i]
			const cnt = player.ammoCount[id]
			show(el, player.ammoFull[id] > 0, 'flex')
			setText(this.ammoCounts[i], String(cnt))
			setClass(el, `chip ${id}${id === player.ammo ? ' on' : ''}${cnt <= 0 ? ' empty' : ''}`)
		})
		const low = player.alive && player.ammoShare < AMMO_LOAD.lowShare
		const line = $('resupply')
		show(line, resupplying || low)
		setText(
			line,
			resupplying ? 'пополнение: снаряды и расходники' : 'боекомплект на исходе — пополнение на своей базе',
		)
		setClass(line, resupplying ? 'on' : 'low')
	}

	/** Red flash on a hit (fire ticks do not count: `hits` only advances on impacts). */
	private updateHitFlash(dt: number, player: Tank) {
		if (player.hits !== this.lastHits) {
			this.hitFlash = HUD.status.hitFlash
			this.lastHits = player.hits
		}
		this.hitFlash = Math.max(0, this.hitFlash - dt)
		const bg = this.hitFlash > 0 ? `rgba(255,40,20,${(this.hitFlash * 0.5).toFixed(3)})` : 'transparent'
		setStyle($('hit'), 'background', bg)
	}

	/** One pip per tank in each team, dimmed when it is destroyed. */
	private updateTeams(tanks: Tank[]) {
		for (const [id, team] of [
			['teamA', 0],
			['teamB', 1],
		] as const) {
			const el = $(id)
			const members = tanks.filter((t) => t.team === team)
			if (el.childElementCount !== members.length) el.innerHTML = '<div class="pip"></div>'.repeat(members.length)
			members.forEach((t, i) => setClass(el.children[i] as HTMLElement, t.alive ? 'pip' : 'pip dead'))
		}
	}
}
