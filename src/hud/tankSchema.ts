import { CREW_ROLES, HUD, type CrewRole, type TankDef } from '../config'
import { RAD_TO_DEG } from '../core/math'
import type { Tank } from '../tank/tank'
import { $, setAttr, setStyle } from './dom'

const S = HUD.status

type Kind = 'light' | 'medium' | 'heavy' | 'td' | 'spg' | 'rockets'

/** What a shell may strike, as the diagram shows it: a plate of the hull, its roof, a track or the turret. */
export const HIT_ZONES = ['front', 'rear', 'left', 'right', 'top', 'trackL', 'trackR', 'turret'] as const
export type HitZone = (typeof HIT_ZONES)[number]

/**
 * One standard picture per kind of vehicle, seen from above with the nose up. Units are metres in a shared frame
 * (x: − = the left side, y: − = the nose), so a light tank is drawn smaller than a heavy one. The pictures are
 * wider than the real vehicles: a true 2:1 hull reads as a thin strip at this size.
 */
interface Plan {
	hull: readonly [w: number, l: number]
	/** Turret, casemate or cab: width, length, centre y, corner radius. */
	tower: readonly [w: number, l: number, y: number, r: number]
	/** Muzzle y; rocket launchers draw rails instead. */
	muzzle: number
	/** Engine compartment: centre y. */
	engine: number
	/** Driver's seat. */
	driver: readonly [x: number, y: number]
	/** The rest of the crew sits around this point, this far apart. */
	fighting: readonly [x: number, y: number, dx: number, dy: number]
}

// prettier-ignore
const PLANS: Record<Kind, Plan> = {
	light: { hull: [3, 4.8], tower: [1.9, 1.8, -0.2, 0.8], muzzle: -3, engine: 1.6, driver: [-0.55, -1.75], fighting: [0, -0.2, 0.42, 0.4] },
	medium: { hull: [3.8, 6], tower: [2.5, 2.4, -0.5, 1], muzzle: -3.8, engine: 2.1, driver: [-0.65, -2.3], fighting: [0, -0.5, 0.58, 0.52] },
	heavy: { hull: [4.4, 6.8], tower: [3, 2.9, -0.4, 1.1], muzzle: -4.1, engine: 2.4, driver: [-0.7, -2.7], fighting: [0, -0.4, 0.7, 0.62] },
	td: { hull: [3.9, 6.2], tower: [3.2, 3, -0.9, 0.15], muzzle: -4.1, engine: 2.1, driver: [-0.95, -2], fighting: [0.2, -0.5, 0.75, 0.6] },
	spg: { hull: [3.7, 6], tower: [3.2, 2.7, 1.5, 0.15], muzzle: -3, engine: -1.2, driver: [-0.65, -2.4], fighting: [0, 1.6, 0.75, 0.55] },
	rockets: { hull: [3, 6.4], tower: [2.6, 1.5, -1.5, 0.2], muzzle: 0, engine: -2.7, driver: [-0.7, -1.7], fighting: [0.3, -1.4, 0.38, 0.3] },
}

/** Half the height of the picture, m: the same for every kind. */
const VIEW = 4.1

const kindOf = (d: TankDef): Kind =>
	d.shape.launcher !== undefined ? 'rockets' : d.role === 'spg' ? 'spg' : d.shape.turret ? d.role : 'td'

const n = (v: number) => v.toFixed(2)
const rect = (cls: string, x: number, y: number, w: number, h: number, r = 0) =>
	`<rect class="${cls}" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(r)}"/>`
const seat = (role: CrewRole, x: number, y: number) =>
	`<circle class="crew" data-part="${role}" cx="${n(x)}" cy="${n(y)}" r="0.28"/>`

/** Seats of the people aboard: a role without its own man (a two- or three-man crew) has no seat. */
function seats(p: Plan, roles: readonly CrewRole[]): string {
	const [x, y, dx, dy] = p.fighting
	const at: Partial<Record<CrewRole, [number, number]>> = { driver: [p.driver[0], p.driver[1]] }
	if (roles.includes('gunner')) {
		at.gunner = [x - dx, y - dy]
		at.commander = [x - dx, y + dy]
		at.loader = [x + dx, y]
	} else if (roles.includes('loader')) {
		at.commander = [x - dx, y]
		at.loader = [x + dx, y]
	} else at.commander = [x, y]
	return roles.map((r) => seat(r, ...(at[r] ?? [0, 0]))).join('')
}

function schemaSvg(kind: Kind, roles: readonly CrewRole[]): string {
	const p = PLANS[kind]
	const hw = p.hull[0] / 2
	const hl = p.hull[1] / 2
	const [tw, tl, ty, tr] = p.tower
	const track = p.hull[0] * 0.17
	// A lorry stands on wheels: a pair in front and two at the rear
	const side = (x: number) =>
		kind === 'rockets'
			? [-hl + 0.5, hl - 2.3, hl - 1.2].map((y) => rect('trk', x, y, track, 0.9, 0.2)).join('')
			: rect('trk', x, -hl, track, p.hull[1], 0.12)
	const running = side(-hw) + side(hw - track)
	// What a shell may strike, drawn over the picture and lit for a while by a hit: the four plates of the hull,
	// its roof, either track and the turret
	const x0 = -hw + track
	const plate = (zone: HitZone, d: string) => `<path class="struck" data-part="z-${zone}" d="${d}"/>`
	const zones =
		`<g class="struck" data-part="z-trackL">${side(-hw)}</g>` +
		`<g class="struck" data-part="z-trackR">${side(hw - track)}</g>` +
		`<g class="struck" data-part="z-top">${rect('', x0, -hl, -x0 * 2, p.hull[1], 0.25)}</g>` +
		plate('front', `M${n(x0)},${n(-hl)} H${n(-x0)}`) +
		plate('rear', `M${n(x0)},${n(hl)} H${n(-x0)}`) +
		plate('left', `M${n(x0)},${n(-hl)} V${n(hl)}`) +
		plate('right', `M${n(-x0)},${n(-hl)} V${n(hl)}`) +
		`<g class="struck" data-part="z-turret">${rect('', -tw / 2, ty - tl / 2, tw, tl, tr)}</g>`
	// A turret's barrel starts at its centre, a casemate's at its front plate
	const breech = kind === 'spg' || kind === 'td' ? ty - tl / 2 : ty
	const gun =
		kind === 'rockets'
			? [-0.95, -0.32, 0.32, 0.95]
					.map((x) => `<path class="gun" d="M${n(x)},${n(hl)} V${n(hl - 3.6)}"/>`)
					.join('')
			: `<path class="gun" d="M0,${n(breech)} V${n(p.muzzle)}"/>`
	// The ammunition lies behind the turret; an SPG's compartment is at the very rear, so there it lies in front
	const rackY = kind === 'spg' ? ty - tl / 2 - 0.7 : ty + tl / 2 + 0.1
	const arc = (a: number) => `${n(Math.sin(a) * VIEW * 0.97)},${n(-Math.cos(a) * VIEW * 0.97)}`
	return (
		`<svg viewBox="${n(-VIEW * 0.75)} ${n(-VIEW)} ${n(VIEW * 1.5)} ${n(VIEW * 2)}">` +
		`<g data-part="hit"><path class="hit" d="M${arc(-0.45)} A${n(VIEW * 0.97)},${n(VIEW * 0.97)} 0 0 1 ${arc(0.45)}"/></g>` +
		`<g data-part="tracks">${running}</g>` +
		rect('hull', -hw + track, -hl, p.hull[0] - track * 2, p.hull[1], 0.25) +
		`<g data-part="engine">${rect('mod', -hw * 0.5, p.engine - 0.6, hw, 1.2, 0.08)}</g>` +
		`<g data-part="rack">${rect('mod', hw * 0.12, rackY, hw * 0.4, 0.6, 0.05)}</g>` +
		`<g data-part="ring">${rect('tur', -tw / 2, ty - tl / 2, tw, tl, tr)}</g>` +
		`<g data-part="gun">${gun}</g>` +
		seats(p, roles) +
		zones +
		`</svg>`
	)
}

/**
 * The player's vehicle as a standard top-down diagram in the status panel: what is broken or burning and who is
 * wounded turns red, and a hit lights the struck part orange for a while (the whole plate, track or turret) and
 * the side it came from. The health is not
 * on it: that is the bar next to it.
 */
export class TankSchema {
	private def: TankDef | null = null
	private parts: Record<string, SVGElement | undefined> = {}
	private hitLeft = 0
	/** s each struck part stays lit. */
	private struck: Partial<Record<HitZone, number>> = {}

	/** A new round: nothing is lit. */
	reset() {
		this.struck = {}
		this.hitLeft = 0
	}

	/** A shell struck that part: it lights up and fades out. */
	hitAt(zone: HitZone) {
		this.struck[zone] = S.hitMarkLife
	}

	/** A hit from `angle` (rad from the hull's nose, + = to the left). */
	hitFrom(angle: number) {
		this.hitLeft = S.hitArc
		const hit = this.parts.hit
		if (hit) setAttr(hit, 'transform', `rotate(${(-angle * RAD_TO_DEG).toFixed(0)})`)
	}

	update(dt: number, player: Tank) {
		if (player.def !== this.def) this.build(player)
		const p = this.parts
		const state = (el: SVGElement | undefined, cls: string) => el && setAttr(el, 'class', cls)
		state(p.tracks, player.tracked > 0 ? 'bad' : '')
		state(p.engine, player.burning > 0 ? 'fire' : player.engineDamaged > 0 ? 'bad' : '')
		state(p.rack, player.rackDamaged > 0 ? 'bad' : '')
		const ringBad = player.def.shape.turret && player.ringDamaged > 0
		state(p.ring, ringBad ? 'bad' : '')
		state(p.gun, player.gunDamaged > 0 ? 'bad' : '')
		for (const r of CREW_ROLES) state(p[r], player.crew.wounded[r] ? 'crew hurt' : 'crew')
		for (const zone of HIT_ZONES) {
			const left = Math.max(0, (this.struck[zone] ?? 0) - dt)
			this.struck[zone] = left
			const el = p[`z-${zone}`]
			// Red wins: a broken track or a jammed turret ring is not painted over by the hit that broke it
			const broken = zone === 'turret' ? ringBad : (zone === 'trackL' || zone === 'trackR') && player.tracked > 0
			const shown = broken ? 0 : left / S.hitMarkLife
			if (el) setStyle(el as unknown as HTMLElement, 'opacity', shown.toFixed(2))
		}
		this.hitLeft = Math.max(0, this.hitLeft - dt)
		if (p.hit) setStyle(p.hit as unknown as HTMLElement, 'opacity', (this.hitLeft / S.hitArc).toFixed(2))
	}

	private build(player: Tank) {
		this.def = player.def
		const root = $('schema')
		root.innerHTML = schemaSvg(kindOf(player.def), player.crew.seats)
		this.parts = {}
		for (const el of Array.from(root.querySelectorAll<SVGElement>('[data-part]')))
			this.parts[el.dataset.part ?? ''] = el
		this.hitLeft = 0
	}
}
