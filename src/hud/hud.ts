import type * as THREE from 'three'
import type { CameraRig, CamMode } from '../camera'
import { HUD, PLANE } from '../config'
import type { Records } from '../game/records'
import type { Plane } from '../plane/plane'
import type { Tank, WorldRefs } from '../tank/tank'
import type { Terrain } from '../world/terrain'
import { CaptureBar } from './captureBar'
import { ControlsHelp } from './controlsHelp'
import { $, setHtml, setText, show } from './dom'
import { Garage } from './garage'
import { Minimap, bakeMinimap } from './minimap'
import { Notifications } from './notifications'
import { Reticle } from './reticle'
import { Ribbons } from './ribbons'
import { Scoreboard } from './scoreboard'
import { RadialMenu } from './radialMenu'
import { StatsDialog } from './statsDialog'
import { StatusPanel } from './statusPanel'
import type { HitZone } from './tankSchema'
import { TankLabels } from './tankLabels'

export interface HudStats {
	fps: number
	calls: number
	shells: number
	particles: number
	scale: number
}

/** Everything the HUD reads in one frame. */
export interface HudFrame {
	dt: number
	time: number
	player: Tank
	tanks: Tank[]
	rig: CameraRig
	world: WorldRefs
	roundLeft: number
	showScores: boolean
	locked: boolean
	mode: CamMode
	/** The gun is held while the player looks around. */
	freeLook: boolean
	/** The battle is paused (the mouse was released). */
	paused: boolean
	/** The pause shows the «Завершить бой» (Leave the battle) button. */
	canLeave: boolean
	/** The player's tank is taking on shells at its base. */
	resupplying: boolean
	/** The player's plane while it flies. */
	plane: Plane | null
	/** Artillery view: the planned arc is blocked short of the aim point. */
	artyBlocked: boolean
	stats: HudStats
}

/** The DOM overlay: garage, panels, reticle, minimap, labels and messages. */
export class Hud {
	readonly garage = new Garage()
	/** Team signals on a hold-to-open wheel (Q). */
	readonly radial = new RadialMenu()
	private readonly help = new ControlsHelp()
	private readonly stats = new StatsDialog()
	private readonly status = new StatusPanel()
	private readonly reticle = new Reticle()
	private readonly minimap = new Minimap($('minimap') as HTMLCanvasElement)
	private readonly notifications = new Notifications()
	private readonly labels = new TankLabels()
	private readonly scoreboard = new Scoreboard()
	private readonly ribbons = new Ribbons()
	private readonly captureBar = new CaptureBar()
	showFps = false
	private sixthTimer = 0
	private centerTimer = 0
	private centerLater = ''
	/** The «Завершить бой» (Leave the battle) button was clicked. */
	onLeave: (() => void) | null = null
	/** A battle has just ended: its report is shown on the return to the garage. */
	private reportFresh = false

	constructor() {
		$('leaveBtn').addEventListener('click', () => this.onLeave?.())
		$('statsBtn').onclick = () => this.stats.open(this.garage.tankId)
		this.garage.onStats = (id) => this.stats.open(id)
		const report = $('report')
		$('reportBtn').onclick = () => report.classList.add('on')
		$('reportClose').onclick = () => report.classList.remove('on')
		// A click on the dimmed backdrop, or Esc
		report.addEventListener('click', (e) => e.target === report && report.classList.remove('on'))
		window.addEventListener('keydown', (e) => e.code === 'Escape' && report.classList.remove('on'))
	}

	// ---------------------------------------------------------------- overlays
	/** Back in the garage after a battle, its breakdown opens by itself (once). */
	showGarage(on: boolean) {
		this.garage.show(on)
		$('report').classList.toggle('on', on && this.reportFresh)
		this.reportFresh = false
	}
	showResult(html: string) {
		this.overlay('result', html)
	}
	/** The player's battle history, updated in place: the garage cards and the statistics dialog read it. */
	setRecords(records: Records) {
		this.garage.records = this.stats.records = records
	}
	/**
	 * The last battle's breakdown: a dialog that opens on the return to the garage and from the garage's
	 * «Разбор последнего боя» (Last battle report) button, which is hidden while there is nothing to show.
	 */
	setReport(html: string) {
		$('reportBody').innerHTML = html
		show($('reportBtn'), html !== '', 'flex')
		this.reportFresh = html !== ''
	}
	/** Big message in the middle. With `later` it is replaced by that slim line after `HUD.messages.centerBigTime`. */
	center(html: string, later = '') {
		this.overlay('center', html)
		$('center').classList.remove('slim')
		this.centerLater = later
		this.centerTimer = later ? HUD.messages.centerBigTime : 0
	}
	/** One slim line low on the screen, in place of the big message. */
	centerSlim(html: string) {
		this.center(html)
		$('center').classList.add('slim')
	}
	hint(html: string) {
		this.overlay('hint', html)
	}
	toggleHelp() {
		this.help.toggle()
	}
	private overlay(id: string, html: string) {
		const el = $(id)
		show(el, !!html)
		setHtml(el, html)
	}

	// ---------------------------------------------------------------- minimap
	/** Paint the minimap backdrop for a terrain; install it with `setMap`. */
	bakeMap(terrain: Terrain): HTMLCanvasElement {
		return bakeMinimap(terrain)
	}
	setMap(c: HTMLCanvasElement) {
		this.minimap.setBackdrop(c)
	}

	// ---------------------------------------------------------------- messages
	popup(text: string, pos: THREE.Vector3, color: string) {
		this.notifications.popup(text, pos, color)
	}
	announce(html: string) {
		this.notifications.announce(html)
	}
	log(text: string, color?: string) {
		this.notifications.log(text, color)
	}
	hitFrom(angleFromCamera: number) {
		this.notifications.hitFrom(angleFromCamera)
	}
	/** The side of the player's hull a hit came from (rad from the nose, + = to the left). */
	hitSide(angleFromHull: number) {
		this.status.hitSide(angleFromHull)
	}
	/** The part of the player's vehicle a shell struck, lit on its diagram. */
	hitZone(zone: HitZone) {
		this.status.hitZone(zone)
	}
	/** A team signal's ping on the minimap. */
	ping(x: number, z: number, color: string) {
		this.minimap.ping(x, z, color)
	}
	/** Light the "you are spotted" lamp. */
	sixthSense() {
		this.sixthTimer = HUD.messages.sixthSenseTime
	}

	// ---------------------------------------------------------------- per frame
	update(f: HudFrame) {
		this.status.update(f.dt, f.player, f.tanks, f.roundLeft, f.resupplying)
		this.ribbons.update(f.dt, f.player)
		this.captureBar.update(f.world.zones, f.player)
		this.reticle.update(f.dt, f.player, f.rig, f.world, f.locked && !f.plane, f.mode, f.artyBlocked)
		this.updatePlane(f.plane, f.locked)
		show($('freeLook'), f.freeLook)
		if (this.centerTimer > 0 && (this.centerTimer -= f.dt) <= 0) {
			this.overlay('center', this.centerLater)
			$('center').classList.add('slim')
		}
		this.sixthTimer = f.player.alive ? Math.max(0, this.sixthTimer - f.dt) : 0
		show($('sixth'), this.sixthTimer > 0)
		const askForLock = !f.locked && !this.garage.isOpen
		show($('hint'), askForLock)
		if (askForLock)
			setHtml(
				$('hint'),
				f.paused ? 'Пауза · кликните по экрану, чтобы продолжить' : 'Кликните по экрану, чтобы захватить мышь',
			)
		show($('leaveBtn'), askForLock && f.canLeave)
		this.labels.update(f.player, f.tanks, f.rig.camera, f.time)
		this.notifications.update(f.dt, f.rig.camera)
		this.minimap.update(f.dt, f.player, f.tanks, f.world.zones, f.rig.yaw, f.time)
		this.scoreboard.update(f.dt, f.showScores, f.tanks, f.player)
		this.updateFps(f.stats)
	}

	/** Flight readout and the course cross while the plane flies. */
	private updatePlane(plane: Plane | null, locked: boolean) {
		show($('planeHud'), !!plane)
		show($('planeCross'), !!plane && locked)
		if (!plane) return
		const bombs = '●'.repeat(plane.bombs) + '○'.repeat(PLANE.bomb.max - plane.bombs)
		setHtml(
			$('planeHud'),
			`<b>Самолёт</b> высота ${Math.round(plane.altitude)} м · ${Math.round(plane.speed * 3.6)} км/ч · газ ${Math.round(plane.throttle * 100)} %` +
				`<br>бомбы <span class="bombs">${bombs}</span>`,
		)
	}

	private updateFps(s: HudStats) {
		const el = $('fps')
		show(el, this.showFps)
		if (!this.showFps) return
		const parts = [`${s.fps} fps`, `${s.calls} draw`, `масштаб ${s.scale.toFixed(3)}`]
		setText(el, [...parts, `снарядов ${s.shells}`, `частиц ${s.particles}`].join(' · '))
	}

	reset() {
		this.sixthTimer = 0
		this.labels.reset()
		this.status.reset()
		this.ribbons.reset()
		this.captureBar.reset()
	}
}
