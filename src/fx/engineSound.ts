import { ENGINE_MIX, ENGINES, type EngineId, type EngineVoice } from '../config'
import { mulberry32 } from '../core/noise'

export type NoiseKind = 'white' | 'brown'

/** What the driver and the vehicle are doing this frame. */
export interface EngineState {
	throttle: number
	speed: number
	maxSpeed: number
	/** Hull turn rate, rad/s: the tracks squeal in a turn. */
	turn: number
	/** Turret traverse as a share of its top speed (the traverse drive hums). */
	traverse: number
	alive: boolean
}

/** Engine cycles in the loop: enough that the ear does not catch it repeating. */
const CYCLES = 4
const cycles = new WeakMap<BaseAudioContext, Map<EngineId, AudioBuffer>>()

/**
 * The exhaust note of an engine at idle, a few engine cycles long: one pressure pulse per firing stroke, each
 * cylinder a little stronger or weaker than its neighbours (the lumpy beat), with a burst of combustion noise on
 * top (the diesel knock). Played faster, it is the same engine at higher revs.
 */
function engineCycles(ctx: BaseAudioContext, id: EngineId): AudioBuffer {
	let made = cycles.get(ctx)
	if (!made) {
		made = new Map<EngineId, AudioBuffer>()
		cycles.set(ctx, made)
	}
	const cached = made.get(id)
	if (cached) return cached
	const e: EngineVoice = ENGINES[id]
	const rnd = mulberry32(id.length * 977 + e.idle * 31 + e.max)
	const stroke = ctx.sampleRate / e.idle
	const firings = e.cylinders * CYCLES
	const n = Math.round(stroke * firings)
	const buf = ctx.createBuffer(1, n, ctx.sampleRate)
	const d = buf.getChannelData(0)
	const strength = Array.from({ length: e.cylinders }, () => 1 + e.lope * (rnd() * 2 - 1))
	const decay = stroke * 0.3
	const burst = stroke * 0.14
	const span = Math.ceil(decay * 6)
	for (let f = 0; f < firings; f++) {
		const a = strength[f % e.cylinders] * (1 + 0.3 * e.lope * (rnd() * 2 - 1))
		const start = Math.round((f + 0.04 * (rnd() * 2 - 1)) * stroke) + n
		for (let i = 0; i < span; i++) {
			d[(start + i) % n] += a * (Math.exp(-i / decay) + e.diesel * (rnd() * 2 - 1) * Math.exp(-i / burst))
		}
	}
	let mean = 0
	for (let i = 0; i < n; i++) mean += d[i] / n
	let peak = 0
	for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs((d[i] -= mean)))
	for (let i = 0; i < n; i++) d[i] /= peak
	made.set(id, buf)
	return buf
}

function loop(ctx: BaseAudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
	const src = ctx.createBufferSource()
	src.buffer = buffer
	src.loop = true
	return src
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, freq: number, q = 0.7, gain = 0): BiquadFilterNode {
	const f = ctx.createBiquadFilter()
	f.type = type
	f.frequency.value = freq
	f.Q.value = q
	f.gain.value = gain
	return f
}

function silentGain(ctx: BaseAudioContext, out: AudioNode): GainNode {
	const g = ctx.createGain()
	g.gain.value = 0
	g.connect(out)
	return g
}

/**
 * One vehicle's engine and running gear. The exhaust loop of its engine (`ENGINES`) is played at the revs the
 * driver asks for, climbing through the gears, and rings in the fixed resonances of the exhaust and the hull; over
 * it the diesel knock, a low rumble, the gear whine, track clatter at the link rate, track squeal in a turn and the
 * hum of the turret traverse. `update` steers it every frame; `stop` fades it out for good.
 */
export class EngineSound {
	private readonly voice: EngineVoice
	private readonly sources: AudioScheduledSourceNode[] = []
	private readonly exhaust: AudioBufferSourceNode
	private readonly tone: BiquadFilterNode
	private readonly drone: GainNode
	private readonly knock: GainNode
	private readonly rumble: GainNode
	private readonly whineOsc: OscillatorNode
	private readonly whine: GainNode
	private readonly clank: OscillatorNode
	private readonly tracks: GainNode
	private readonly squeal: GainNode
	private readonly traverse: GainNode
	private gear = 0
	/** The state last handed to the audio thread: an unchanged one (idle, the garage, a wreck) is not re-sent. */
	private readonly last: EngineState = {
		throttle: NaN,
		speed: NaN,
		maxSpeed: NaN,
		turn: NaN,
		traverse: NaN,
		alive: false,
	}

	constructor(
		ctx: BaseAudioContext,
		out: AudioNode,
		noise: Record<NoiseKind, AudioBuffer>,
		readonly id: EngineId,
	) {
		const e: EngineVoice = (this.voice = ENGINES[id])
		const start = <T extends AudioScheduledSourceNode>(node: T): T => {
			this.sources.push(node)
			return node
		}
		const osc = (type: OscillatorType, freq: number) => {
			const o = start(ctx.createOscillator())
			o.type = type
			o.frequency.value = freq
			return o
		}

		// Exhaust: loop → brightness → the two body resonances → a little overdrive
		this.exhaust = start(loop(ctx, engineCycles(ctx, id)))
		this.tone = filter(ctx, 'lowpass', 220, 0.8)
		const shaper = ctx.createWaveShaper()
		const curve = new Float32Array(512)
		for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(1.8 * ((i / (curve.length - 1)) * 2 - 1))
		shaper.curve = curve
		this.drone = silentGain(ctx, out)
		this.exhaust
			.connect(this.tone)
			.connect(filter(ctx, 'peaking', e.body[0], 2.2, 9))
			.connect(filter(ctx, 'peaking', e.body[1], 2.5, 6))
			.connect(shaper)
			.connect(this.drone)
		// Knock: the combustion bursts of the same loop, heard through the engine deck
		this.knock = silentGain(ctx, out)
		this.exhaust.connect(filter(ctx, 'bandpass', 1500 + 900 * e.diesel, 0.7)).connect(this.knock)

		const brown = start(loop(ctx, noise.brown))
		const white = start(loop(ctx, noise.white))
		this.rumble = silentGain(ctx, out)
		brown.connect(filter(ctx, 'lowpass', 1.6 * e.body[0])).connect(this.rumble)

		this.whineOsc = osc('triangle', 300)
		this.whine = silentGain(ctx, out)
		this.whineOsc.connect(filter(ctx, 'lowpass', 2400)).connect(this.whine)

		// Tracks: the links slap the sprocket and the road wheels one after another
		const links = ctx.createGain()
		links.gain.value = 0.5
		this.clank = osc('square', 4)
		const depth = ctx.createGain()
		depth.gain.value = 0.45
		this.clank.connect(depth).connect(links.gain)
		this.tracks = silentGain(ctx, out)
		white
			.connect(filter(ctx, 'bandpass', e.tracks.tone, 1.2))
			.connect(links)
			.connect(this.tracks)
		this.squeal = silentGain(ctx, out)
		white.connect(filter(ctx, 'bandpass', 2300 + 600 * e.tracks.squeal, 22)).connect(this.squeal)

		this.traverse = silentGain(ctx, out)
		osc('sawtooth', 118)
			.connect(filter(ctx, 'bandpass', 520, 1.5))
			.connect(this.traverse)
		white.connect(filter(ctx, 'bandpass', 1900, 3)).connect(this.traverse)

		for (const s of this.sources) s.start()
	}

	/** Share of the rev range the engine turns at: it climbs through each gear and drops back on the shift. */
	private revs(throttle: number, move: number): number {
		const e = this.voice
		const pos = move * e.gears
		if (pos > this.gear + 1) this.gear = Math.min(e.gears - 1, Math.floor(pos))
		else if (pos < this.gear - 0.25) this.gear = Math.max(0, Math.floor(pos))
		const inGear = Math.min(1, Math.max(0, pos - this.gear))
		const rolling = move > 0.03 ? 0.22 + 0.78 * inGear : 0
		return Math.min(1, Math.max(rolling, Math.abs(throttle) * ENGINE_MIX.shaftPerLoad))
	}

	/** Targets are handed to the audio thread as exponential approaches (no zipper noise). */
	update(t: number, s: EngineState) {
		const l = this.last
		if (
			l.throttle === s.throttle &&
			l.speed === s.speed &&
			l.maxSpeed === s.maxSpeed &&
			l.turn === s.turn &&
			l.traverse === s.traverse &&
			l.alive === s.alive
		)
			return
		l.throttle = s.throttle
		l.speed = s.speed
		l.maxSpeed = s.maxSpeed
		l.turn = s.turn
		l.traverse = s.traverse
		l.alive = s.alive
		const e = this.voice
		const on = s.alive ? 1 : 0
		const move = Math.min(1, Math.abs(s.speed) / s.maxSpeed)
		const load = Math.min(1, Math.abs(s.throttle) * 0.7 + 0.3 * move)
		const rev = e.electric ? 0.3 + 0.7 * load : this.revs(s.throttle, move)
		const firing = e.idle + (e.max - e.idle) * rev * on
		const tau = ENGINE_MIX.revTime
		this.exhaust.playbackRate.setTargetAtTime(firing / e.idle, t, tau)
		this.tone.frequency.setTargetAtTime(220 + (e.bright - 220) * (0.2 + 0.8 * load) * (0.45 + 0.55 * rev), t, tau)
		this.drone.gain.setTargetAtTime(on * e.level * (0.07 + 0.1 * load), t, tau)
		this.knock.gain.setTargetAtTime(on * e.level * e.diesel * (0.035 + 0.05 * load), t, tau)
		this.rumble.gain.setTargetAtTime(on * e.level * (0.04 + 0.08 * load), t, 0.3)
		this.whineOsc.frequency.setTargetAtTime(e.electric ? 190 + 1150 * move : firing * e.whineRatio, t, tau)
		const strain = e.electric ? move * (0.5 + 0.5 * load) : move * (0.35 + 0.65 * load)
		this.whine.gain.setTargetAtTime(on * e.whine * 0.022 * strain, t, 0.2)
		this.clank.frequency.setTargetAtTime(2 + e.tracks.rate * move * (s.maxSpeed / 13), t, 0.1)
		this.tracks.gain.setTargetAtTime(on * e.tracks.level * 0.065 * move, t, 0.15)
		const turning = Math.min(1, Math.abs(s.turn) / 0.5) * (0.35 + 0.65 * move)
		this.squeal.gain.setTargetAtTime(on * e.tracks.squeal * 0.05 * turning, t, 0.12)
		this.traverse.gain.setTargetAtTime(on * 0.03 * Math.min(1, Math.abs(s.traverse)), t, 0.06)
	}

	/** Fade out and stop for good (the vehicle is no longer heard). */
	stop(ctx: BaseAudioContext, fade = 0.25) {
		const t = ctx.currentTime
		for (const g of [this.drone, this.knock, this.rumble, this.whine, this.tracks, this.squeal, this.traverse])
			g.gain.setTargetAtTime(0, t, fade / 4)
		for (const s of this.sources) s.stop(t + fade * 1.5)
	}
}
