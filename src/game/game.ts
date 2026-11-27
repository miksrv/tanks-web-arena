import * as THREE from 'three'
import { BotBrain } from '../ai/bot'
import { TeamTactics } from '../ai/team'
import { CameraRig } from '../camera'
import { Shells } from '../combat/shells'
import { MATCH, MODE_LABEL, RENDER, TANKS, WEATHER } from '../config'
import { ArtyView } from '../fx/artyView'
import { Audio } from '../fx/audio'
import { Particles } from '../fx/particles'
import { Precipitation } from '../fx/precipitation'
import { emitTankFx } from '../fx/tankFx'
import { Hud } from '../hud'
import { Input } from '../input'
import { AdaptiveResolution } from '../render/adaptiveResolution'
import { Environment } from '../render/environment'
import { FpsCounter, FramePacer } from '../render/framePacer'
import { Plane } from '../plane/plane'
import { createRenderer, freezeShadows, onPixelRatioChange } from '../render/renderer'
import { resupplyAll } from '../tank/ammo'
import { type Tank, type WorldRefs } from '../tank/tank'
import { ZoneMarkers, zonesFor } from './capture'
import { CombatFeedback } from './combatFeedback'
import { Match } from './match'
import { BattleReport } from './battleReport'
import { awardMedals } from './medals'
import { COLOR, countdownHtml, mapTitle, resultHtml } from './messages'
import { playEngines } from './engineAudio'
import { PlayerController } from './playerController'
import { TankRecords } from './records'
import { Spotting } from './spotting'
import { TeamSignals, type Squad } from './teamSignals'
import { exposeOnWindow, type TestOptions } from './testHooks'
import { afterPaint, disposeMap, generateMap, mapKey, mapRequest, type GeneratedMap, type MapRequest } from './world'

/** Owns the renderer, the systems and the round lifecycle; `start()` runs the frame loop. */
export class Game {
	private readonly renderer: THREE.WebGLRenderer
	private readonly env = new Environment()
	private readonly rig = new CameraRig()
	private readonly input: Input
	private readonly audio = new Audio()
	private readonly hud = new Hud()
	private readonly particles = new Particles()
	private readonly precip = new Precipitation()
	private readonly artyView = new ArtyView()
	private readonly shells = new Shells()
	private readonly plane = new Plane()
	private readonly spotting = new Spotting()
	private readonly match = new Match()
	private readonly resolution: AdaptiveResolution
	private readonly controller: PlayerController
	private readonly feedback: CombatFeedback
	private readonly signals: TeamSignals
	private readonly worldGroup = new THREE.Group()
	private readonly report = new BattleReport()
	private readonly records = new TankRecords()

	private map!: GeneratedMap
	/** The next map, generated while the result screen is up. */
	private nextMap: GeneratedMap | null = null
	/** The garage backdrop is a fresh map: the first round plays it instead of generating another. */
	private mapPlayed = false
	private tanks: Tank[] = []
	private readonly zoneMarkers = new ZoneMarkers(this.worldGroup)
	private bots: BotBrain[] = []
	/** Each side's shared tactical picture, and its bots. */
	private tactics: TeamTactics[] = []
	private teamBots: BotBrain[][] = [[], []]
	private player!: Tank
	private world!: WorldRefs

	private last = performance.now()
	private readonly pacer = new FramePacer()
	private time = 0
	private timeScale: number
	private readonly fps = new FpsCounter()
	private debugAt = 0
	/** The player's tank is being topped up at the base this frame. */
	private resupplying = false
	private seed: number | null

	constructor(private readonly opts: TestOptions) {
		const maxScale = Math.min(window.devicePixelRatio, RENDER.maxScale)
		this.renderer = createRenderer(maxScale)
		this.resolution = new AdaptiveResolution(this.renderer, maxScale, RENDER.minScale, () =>
			this.env.lowerShadowQuality(this.renderer),
		)
		this.input = new Input(this.renderer.domElement)
		this.controller = new PlayerController(this.input, this.rig, this.hud, this.audio, this.shells, this.plane)
		this.feedback = new CombatFeedback({
			hud: this.hud,
			particles: this.particles,
			audio: this.audio,
			rig: this.rig,
			shells: this.shells,
			report: this.report,
			player: () => this.player,
		})
		this.controller.onLeave = this.hud.onLeave = () => this.leave()
		this.controller.onSignal = (sig) => this.signals.send(sig, this.squad(), this.time)
		this.signals = new TeamSignals(this.hud, this.rig)
		this.hud.setRecords(this.records.all)
		this.timeScale = opts.timeScale
		this.seed = opts.seed
		if (opts.tankId) {
			this.hud.garage.tankId = opts.tankId
			this.hud.garage.nation = TANKS[opts.tankId].nation
		}
		const { scene } = this.env
		scene.add(this.particles.points, this.particles.marks.rings, this.precip.points)
		scene.add(this.artyView.group)
		scene.add(this.shells.lines)
		scene.add(this.plane.view.group)
		scene.add(this.worldGroup)
	}

	start() {
		if (this.opts.autostart) this.autostartSoon()
		this.hud.garage.onGo = () => this.go()
		this.loadMap()
		this.hud.showGarage(true)
		this.input.overlay = true
		this.composeTeams()
		this.rig.yaw = this.player.yaw
		this.renderer.compile(this.env.scene, this.rig.camera) // every shader program now, not on the first battle frame
		this.exposeDebugHandles()
		window.addEventListener('resize', () => {
			this.renderer.setSize(window.innerWidth, window.innerHeight)
			this.rig.resize(window.innerWidth, window.innerHeight)
		})
		onPixelRatioChange(() => this.resolution.setMax(Math.min(window.devicePixelRatio, RENDER.maxScale)))
		requestAnimationFrame(this.frame)
	}

	// ---------------------------------------------------------------- world and rounds

	/** What the next map must be: the garage choice, with the test hooks' forced values on top (the seed once). */
	private request(): MapRequest {
		const seed = this.seed
		this.seed = null
		return mapRequest(this.hud.garage.choice, this.opts, seed)
	}

	private loadMap() {
		if (this.map) disposeMap(this.map)
		this.worldGroup.clear()
		this.map = this.nextMap ?? generateMap(this.hud, this.request())
		this.nextMap = null
		const { terrain, props, buildings } = this.map
		this.env.applyMap(terrain.season, terrain.weather)
		this.precip.setWeather(terrain.weather)
		this.audio.rain(terrain.weather === 'rain' ? 0.1 : 0)
		this.hud.setMap(this.map.minimap)
		this.worldGroup.add(terrain.mesh, terrain.water, props.group, buildings.group)
		this.particles.clear()
		this.shells.list.length = 0
		this.mapPlayed = false
	}

	/** New tanks for both teams on the current map (the player is first). */
	private composeTeams() {
		const { terrain, props, buildings } = this.map
		this.tanks = this.match.compose(TANKS[this.hud.garage.tankId], terrain)
		this.player = this.tanks[0]
		for (const t of this.tanks) t.viewMult = WEATHER[terrain.weather].view
		this.world = { terrain, props, buildings, tanks: this.tanks, zones: [] }
		for (const t of this.tanks) this.env.scene.add(t.view.group)
		exposeOnWindow('__tanks', this.tanks)
	}

	private go() {
		// Only from the garage: a stray Enter or the autostart timer must not restart a round
		if (this.match.phase !== 'garage') return
		this.startRound()
		this.input.lock()
	}

	private startRound() {
		this.zoneMarkers.clear()
		for (const t of this.tanks) {
			this.env.scene.remove(t.view.group)
			t.dispose()
		}
		this.hud.reset()
		// A played map, or one made for another garage choice, is replaced (so is a prepared one)
		const key = mapKey(this.hud.garage.choice)
		if (this.nextMap && this.nextMap.key !== key) {
			disposeMap(this.nextMap)
			this.nextMap = null
		}
		if (this.mapPlayed || this.map.key !== key) this.loadMap()
		this.mapPlayed = true
		this.composeTeams()
		const { terrain } = this.map
		this.match.start(terrain.mode, terrain.defender, zonesFor(terrain, terrain.mode))
		this.world.zones = this.match.capture.zones
		this.signals.reset(this.match.capture, this.player)
		this.zoneMarkers.show(this.world.zones, terrain)
		this.bots = this.tanks.filter((t) => !t.isPlayer).map((t) => new BotBrain(t))
		this.teamBots = [0, 1].map((team) => this.bots.filter((b) => b.tank.team === team))
		this.tactics = ([0, 1] as const).map(
			(team) =>
				new TeamTactics(
					team,
					this.world,
					this.teamBots[team].map((b) => b.tank),
				),
		)
		// Rows leave the base one after another (front row first) so the formation does not jam at the gate;
		// the row is read from where the tank actually stands behind the base centre
		const { bases } = this.world.terrain
		for (const b of this.bots) {
			const t = b.tank
			const base = bases[t.team]
			const enemy = bases[1 - t.team]
			const l = Math.hypot(enemy.x - base.x, enemy.z - base.z) || 1
			const behind = -((t.pos.x - base.x) * (enemy.x - base.x) + (t.pos.z - base.z) * (enemy.z - base.z)) / l
			const row = Math.max(0, Math.round(behind / MATCH.spawn.rowGap))
			const mates = this.teamBots[t.team]
			b.plan(
				this.world,
				this.tactics[t.team],
				mates.indexOf(b),
				mates.length,
				row * MATCH.departRow + Math.random() * MATCH.departJitter,
				this.time,
			)
		}
		this.controller.resetRound()
		this.resupplying = false
		this.report.reset()
		this.rig.setMode('chase', this.player)
		this.rig.snap(this.player.yaw, 0.3)
		this.hud.showGarage(false)
		this.hud.showResult('')
		this.hud.center('')
		this.input.overlay = false
		this.hud.announce(`Бой ${this.match.round}: ${MODE_LABEL[terrain.mode]} · ${mapTitle(terrain)}`)
	}

	private autostartSoon() {
		setTimeout(() => this.hud.garage.onGo?.(), MATCH.autostartDelayMs)
	}

	// ---------------------------------------------------------------- frame loop

	private readonly frame = (now: number) => {
		requestAnimationFrame(this.frame)
		// Frame cap: 60 fps in battle on any refresh rate; the garage backdrop runs at half rate
		const targetFps = this.match.phase === 'garage' ? RENDER.garageFps : RENDER.maxFps
		if (!this.pacer.shouldRender(now, targetFps)) return
		if (this.opts.debug) this.debugLog(now)
		// rAF stamps can trail performance.now(): never step backwards
		const raw = Math.max(0, Math.min(RENDER.maxRawFrame, (now - this.last) / 1000))
		const paused = this.paused
		const dt = paused ? 0 : Math.min(RENDER.maxStep, raw) * this.timeScale
		this.last = now
		this.time += dt
		this.resolution.update(raw, Math.min(targetFps, this.pacer.refreshRate))
		this.fps.count(raw)
		this.audio.setPaused(paused)

		if (!paused) this.updatePhase(dt)
		const inBattle = this.match.phase !== 'garage'
		if (inBattle) this.controller.update(this.player, this.tanks, this.match.phase, this.time, dt)
		if (inBattle && !paused) this.simulate(dt)
		this.render(dt, paused)
		this.input.endFrame()
	}

	/**
	 * The round stands still while the mouse is released (Esc, focus lost). Automated runs (`?autostart`) never get
	 * the pointer lock, so they are never paused.
	 */
	private get paused(): boolean {
		const { phase } = this.match
		return (phase === 'countdown' || phase === 'battle') && !this.input.locked && !this.opts.autostart
	}

	/** Round clock and the screens that go with each phase change. */
	private updatePhase(dt: number) {
		const { match, hud } = this
		const changed = match.update(dt, this.tanks)
		if (changed && match.phase === 'result') this.showResult()
		if (changed && match.phase === 'garage') {
			hud.showResult('')
			hud.showGarage(true)
			this.input.overlay = true
			this.input.unlock()
			if (this.opts.autostart) this.autostartSoon()
		}
		if (changed && match.phase === 'battle') hud.center('')
		if (this.opts.overviewTop && this.rig.mode !== 'arty' && match.phase !== 'garage') {
			this.rig.setMode('arty', this.player)
			this.rig.artyPoint.set(0, 0, 0)
			this.rig.distance = 520
		}
		if (match.phase === 'countdown') hud.center(countdownHtml(match.timer, !!this.player.def.gun.howitzer))
	}

	/** The battle is over: the result screen, the report for the garage and the next map. */
	private showResult() {
		const { match, hud } = this
		// The bots stop thinking now: let them roll to a halt instead of driving on blind for the whole result screen
		for (const b of this.bots) b.tank.throttle = b.tank.steer = 0
		const medals = match.outcome === 'left' ? [] : awardMedals(this.player, this.tanks, match)
		hud.showResult(resultHtml(match.winner, match.outcome, this.player, medals))
		// Automated runs (`?autostart`) and changed rules (`?round`, `?speed`) leave the history alone
		if (!this.opts.unrecorded) this.records.add(this.player, match, medals, this.report.totals())
		hud.center('')
		hud.setReport(this.report.html())
		// The next map is built once the result screen is up, not in the frame that shows it
		afterPaint(() => match.phase === 'result' && (this.nextMap ??= generateMap(hud, this.request())))
	}

	/** «Завершить бой» (Leave the battle): the player's side loses and the result screen comes up at once. */
	private leave() {
		if (this.match.forfeit(this.player.team)) this.showResult()
	}

	/** One simulation step: bots, tanks, shells, spotting and effects (the round result keeps the world moving). */
	private simulate(dt: number) {
		const { tanks, world, shells } = this
		if (this.match.phase === 'battle') {
			for (const tac of this.tactics) tac.update(world, this.teamBots[tac.team], this.time, dt)
			for (const b of this.bots) b.update(dt, world, shells, this.time)
		}
		for (const t of tanks) t.update(dt, world)
		// Tanks standing at their own base take on shells; the player hears when the rack is full again
		const topUp = this.match.phase === 'battle' && resupplyAll(tanks, this.map.terrain.bases, dt)
		if (this.resupplying && !topUp && this.player.ammoShare >= 1) this.hud.log('Пополнение завершено', COLOR.good)
		this.resupplying = topUp
		if (this.plane.update(dt, world)) this.planeCrashed()
		for (const t of tanks) t.view.group.updateMatrixWorld()
		for (const t of tanks) {
			const s = t.salvoTick(dt)
			if (s) shells.fire(t, s)
		}
		shells.update(dt, world)
		this.feedback.flushMissMarker()
		this.signals.watchCapture(this.player, this.world.zones)
		this.spotting.update(dt, world, this.time)
		this.plane.spot(tanks, this.player.team, this.time)
		this.map.props.update(dt)
		// Visibility: enemies are drawn only while the team sees them, and so are their dust, exhaust and fire
		for (const t of tanks) t.view.group.visible = Spotting.visibleTo(this.player.team, t, this.time)
		for (const t of tanks) if (t.view.group.visible) emitTankFx(this.particles, t, dt)
		this.particles.update(dt)
	}

	/** The player's side as the signals see it. */
	private squad(): Squad {
		const team = this.player.team
		return { player: this.player, world: this.world, tactics: this.tactics[team], bots: this.teamBots[team] }
	}

	private planeCrashed() {
		const { x, y, z } = this.plane.pos
		this.particles.explosion(x, y, z)
		this.audio.explosion(this.plane.pos)
		this.rig.addShake(0.8)
		this.hud.log('Самолёт разбит', COLOR.bad)
	}

	private render(dt: number, paused: boolean) {
		const { rig, player, world, plane } = this
		const camTarget = this.controller.cameraTarget(player)
		const flying = plane.active
		const focus = flying ? plane.pos : camTarget.pos
		this.audio.listen(focus.x, focus.z, rig.yaw)
		if (flying) rig.updatePlane(dt, plane.pos, world)
		else rig.update(dt, camTarget, world)
		this.artyView.update(rig.mode === 'arty' && player.alive, player, rig, world, this.shells)
		plane.view.drawBombs(this.shells.list)
		// The satellite view looks at the aim point, far from the tank: light and shadows belong there
		this.env.update(dt, rig.mode, rig.mode === 'arty' && !flying ? rig.artyPoint : focus)
		freezeShadows(this.renderer, paused || this.match.phase === 'garage')
		// Point sizes are in drawing-buffer pixels: scale by the render pixel ratio so particles keep their size
		const bufferHeight = window.innerHeight * this.renderer.getPixelRatio()
		this.particles.setScale(bufferHeight, rig.camera.fov)
		this.precip.setScale(bufferHeight, rig.camera.fov)
		this.precip.update(dt, rig.camera, rig.mode === 'arty')
		playEngines(this.audio, this.match.phase === 'garage', flying ? plane : null, player, this.tanks)
		this.renderer.render(this.env.scene, rig.camera)
		this.hud.update({
			dt,
			time: this.time,
			player,
			tanks: this.tanks,
			rig,
			world,
			roundLeft: this.match.roundLeft,
			showScores: this.input.down('Tab'),
			locked: this.input.locked,
			mode: rig.mode,
			freeLook: player.alive && !flying && this.controller.freeLook,
			plane: flying ? plane : null,
			artyBlocked: this.artyView.blocked,
			paused,
			canLeave: paused && this.match.phase === 'battle',
			resupplying: this.resupplying && this.match.phase === 'battle',
			stats: {
				fps: this.fps.value,
				calls: this.renderer.info.render.calls,
				shells: this.shells.list.length,
				particles: this.particles.count,
				scale: this.resolution.scale,
			},
		})
	}

	// ---------------------------------------------------------------- debugging

	private debugLog(now: number) {
		if (now <= this.debugAt) return
		this.debugAt = now + MATCH.debugLogMs
		const alive = [0, 1].map((team) => this.tanks.filter((t) => t.team === team && t.alive).length)
		const parts = [
			`t=${this.time.toFixed(0)}`,
			`phase=${this.match.phase}`,
			`fps=${this.fps.value}`,
			`scale=${this.resolution.scale}`,
			`alive=${alive.join('/')}`,
			`shells=${JSON.stringify(this.shells.stats)}`,
			`particles=${this.particles.count}`,
			`prepared=${!!this.nextMap}`,
			this.match.debugText(),
		]
		// eslint-disable-next-line no-console
		console.log(`[dbg] ${parts.join(' ')}`)
	}

	private exposeDebugHandles() {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const game = this
		exposeOnWindow('__game', {
			input: this.input,
			rig: this.rig,
			match: this.match,
			hud: this.hud,
			particles: this.particles,
			shells: this.shells,
			plane: this.plane,
			scene: this.env.scene,
			renderer: this.renderer,
			get bots() {
				return game.bots
			},
			get world() {
				return game.world
			},
			get tanks() {
				return game.tanks
			},
			setTimeScale: (k: number) => {
				game.timeScale = k
			},
		})
	}
}
