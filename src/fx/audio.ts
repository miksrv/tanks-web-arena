import { AUDIO_FX, GUN_SOUND, type EngineId } from '../config'
import { makeImpulse, makeNoise } from './audioBuffers'
import { EngineMix, type EngineSource } from './engineMix'
import type { EngineState, NoiseKind } from './engineSound'

/** Where a sound comes from on the map; `null` is the listener's own tank (centred, full volume). */
export type SoundAt = { x: number; z: number } | null

const { panWidth, panNear, airFar, silent, plate } = AUDIO_FX
const MUTE_KEY = 'tanks-web-arena.muted'

/** The mute choice of the last visit (false when the storage is empty or blocked). */
function storedMute(): boolean {
	try {
		return localStorage.getItem(MUTE_KEY) === '1'
	} catch {
		return false
	}
}

/** What a gun sounds like: its size, how fast the shell leaves it, and what is on the muzzle. */
export interface GunVoice {
	caliber: number // mm
	velocity: number // m/s
	brake: boolean // a muzzle brake throws the blast sideways: louder and harsher
	howitzer: boolean // a short barrel and a small charge: a boom with little crack
}

/**
 * A one-shot's entry point: gain-adjusted volume `v`, how far toward the edge of its reach it is (0…1), and how
 * late it arrives (s): every layer of the sound starts that much later.
 */
interface Voice {
	node: AudioNode
	v: number
	far: number
	lag: number
}

/** Where a layer of sound goes: a world voice, or straight into a node (the mix, a cockpit filter). */
type Out = Voice | AudioNode

// Procedural sound: engines and tracks (each vehicle in the voice of its own engine, see `ENGINES`), layered
// gunfire voiced by the gun, armour hits, ricochets, explosions. No assets.
// One-shots are built from noise layers (crack, blast, rumble) and sine partials (sub thump, metal ring),
// fade and darken with distance, are panned by their bearing from the camera and feed a shared outdoor reverb;
// gunfire and explosions far away arrive late, at the speed of sound.
export class Audio {
	private ctx: AudioContext | null = null
	private buffers: Record<NoiseKind, AudioBuffer> | null = null
	private master: GainNode | null = null
	private mix: GainNode | null = null
	private reverb: ConvolverNode | null = null
	private engines: EngineMix | null = null
	/** The looping rain hiss and the level it should be at (kept even before the context exists). */
	private rainGain: GainNode | null = null
	private rainLevel = 0
	/** Remembered between visits (per browser). */
	muted = storedMute()
	/** Simulation paused: the context is suspended and stays so until `setPaused(false)`. */
	private paused = false
	private readonly ear = { x: 0, z: 0, yaw: 0 }

	constructor() {
		// Every key or click tries to start the sound until the context really runs: a first key that is not an
		// activating gesture (Esc) leaves it suspended
		const stop = () => {
			window.removeEventListener('keydown', start)
			window.removeEventListener('mousedown', start)
		}
		const start = () => {
			this.ensure()
			const ctx = this.ctx
			if (!ctx) return
			if (ctx.state === 'running') stop()
			else ctx.onstatechange = () => ctx.state === 'running' && stop()
		}
		window.addEventListener('keydown', start)
		window.addEventListener('mousedown', start)
		// Silent while the tab is hidden (engines and rain would play on in the background); back when the player returns
		document.addEventListener('visibilitychange', () => {
			if (!this.ctx) return
			if (document.hidden) this.ctx.suspend().catch(() => undefined)
			// Whatever the state says: a suspend still under way after a quick switch would otherwise win
			else if (!this.paused) this.ctx.resume().catch(() => undefined)
		})
	}

	private ensure() {
		if (this.ctx) {
			if (this.ctx.state === 'suspended' && !this.paused) this.ctx.resume().catch(() => undefined)
			return
		}
		const ctx = (this.ctx = new AudioContext())
		this.buffers = { white: makeNoise(ctx, 'white'), brown: makeNoise(ctx, 'brown') }
		// mix → compressor (several booms at once must not clip) → master (mute) → speakers
		this.master = ctx.createGain()
		this.master.gain.value = this.muted ? 0 : 1
		this.master.connect(ctx.destination)
		const comp = ctx.createDynamicsCompressor()
		comp.threshold.value = -14
		comp.knee.value = 10
		comp.ratio.value = 4
		comp.attack.value = 0.003
		comp.release.value = 0.25
		comp.connect(this.master)
		this.mix = ctx.createGain()
		this.mix.gain.value = 0.8
		this.mix.connect(comp)
		this.reverb = ctx.createConvolver()
		this.reverb.buffer = makeImpulse(ctx, 2.6)
		const wet = ctx.createGain()
		wet.gain.value = 0.55
		this.reverb.connect(wet).connect(this.mix)
		this.engines = new EngineMix(ctx, this.mix, this.buffers, (at, reach) => this.place(at, reach))
		this.startRain(ctx, this.mix, this.buffers.white)
	}

	/** Rain on the hull and the field around: band-limited noise, always running, faded in by `rain()`. */
	private startRain(ctx: AudioContext, out: AudioNode, white: AudioBuffer) {
		const src = ctx.createBufferSource()
		src.buffer = white
		src.loop = true
		const hp = ctx.createBiquadFilter()
		hp.type = 'highpass'
		hp.frequency.value = 900
		const lp = ctx.createBiquadFilter()
		lp.type = 'lowpass'
		lp.frequency.value = 5200
		this.rainGain = ctx.createGain()
		this.rainGain.gain.value = this.rainLevel
		src.connect(hp).connect(lp).connect(this.rainGain).connect(out)
		src.start()
	}

	/** Rain hiss on (0…1 level) or off for this map. */
	rain(level: number) {
		this.rainLevel = level
		if (this.ctx && this.rainGain) this.rainGain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.5)
	}

	/** The node a sound connects to: through a stereo panner when off-centre. */
	private panned(ctx: AudioContext, out: AudioNode, pan: number): AudioNode {
		if (Math.abs(pan) < 0.01) return out
		const p = ctx.createStereoPanner()
		p.pan.value = pan
		p.connect(out)
		return p
	}

	/**
	 * Entry chain for a world sound at `at` heard up to `reach` metres: air absorption (distant sounds lose
	 * their crack), panning, and a reverb send that grows with distance. `null` when it is too far to hear.
	 */
	private voice(at: SoundAt, reach: number, travels = false): Voice | null {
		if (!this.ctx || !this.mix || !this.reverb) return null
		const ctx = this.ctx
		const [v, pan, d] = this.place(at, reach)
		if (v <= 0.01) return null
		const far = Math.min(1, d / reach)
		const air = ctx.createBiquadFilter()
		air.type = 'lowpass'
		air.frequency.value = 16000 * Math.pow(airFar, Math.sqrt(far))
		air.connect(this.panned(ctx, this.mix, pan))
		const send = ctx.createGain()
		send.gain.value = 0.15 + 0.6 * far
		air.connect(send).connect(this.reverb)
		// Sound takes its time over the field: the flash comes first, the report after it
		const lag = travels ? Math.min(GUN_SOUND.maxLag, d / GUN_SOUND.sound) : 0
		return { node: air, v, far, lag: lag < 0.05 ? 0 : lag }
	}

	/** The node a layer connects to and the time it starts at, `delay` seconds after the sound's own lag. */
	private static at(ctx: AudioContext, out: Out, delay: number): [AudioNode, number] {
		return out instanceof AudioNode ? [out, ctx.currentTime + delay] : [out.node, ctx.currentTime + out.lag + delay]
	}

	/** Filtered noise with a fast attack and exponential decay; the filter can sweep to `freqEnd`. */
	private noise(
		out: Out,
		kind: NoiseKind,
		delay: number,
		gain: number,
		dur: number,
		type: BiquadFilterType,
		freq: number,
		freqEnd = freq,
		q = 0.7,
		attack = 0.002,
	) {
		if (!this.ctx || !this.buffers || gain <= 0) return
		const [node, t] = Audio.at(this.ctx, out, delay)
		const src = this.ctx.createBufferSource()
		src.buffer = this.buffers[kind]
		src.loop = true
		src.playbackRate.value = 0.9 + Math.random() * 0.2
		const f = this.ctx.createBiquadFilter()
		f.type = type
		f.Q.value = q
		f.frequency.setValueAtTime(freq, t)
		if (freqEnd !== freq) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur)
		const g = this.ctx.createGain()
		g.gain.setValueAtTime(silent, t)
		g.gain.linearRampToValueAtTime(gain, t + attack)
		g.gain.exponentialRampToValueAtTime(silent, t + dur)
		src.connect(f).connect(g).connect(node)
		src.start(t, Math.random() * 1.5)
		src.stop(t + dur + 0.05)
	}

	/** One oscillator partial; `slide` is the pitch ratio reached at the end. */
	private partial(
		out: Out,
		delay: number,
		freq: number,
		gain: number,
		dur: number,
		slide = 1,
		type: OscillatorType = 'sine',
		attack = 0.002,
	) {
		if (!this.ctx || gain <= 0) return
		const [node, t] = Audio.at(this.ctx, out, delay)
		const o = this.ctx.createOscillator()
		o.type = type
		o.frequency.setValueAtTime(freq, t)
		if (slide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(15, freq * slide), t + dur)
		const g = this.ctx.createGain()
		g.gain.setValueAtTime(silent, t)
		g.gain.linearRampToValueAtTime(gain, t + attack)
		g.gain.exponentialRampToValueAtTime(silent, t + dur)
		o.connect(g).connect(node)
		o.start(t)
		o.stop(t + dur + 0.05)
	}

	/** A struck steel plate: inharmonic partials, the higher ones dying first. */
	private ring(out: Out, delay: number, base: number, gain: number, dur: number) {
		plate.forEach((r, i) => {
			const f = base * r * (0.98 + Math.random() * 0.04)
			this.partial(out, delay, f, gain / (1 + i * 0.8), dur / (1 + i * 0.7))
		})
	}

	/** The listener: the followed tank's position and the camera heading (forward = (sin yaw, cos yaw)). */
	listen(x: number, z: number, yaw: number) {
		this.ear.x = x
		this.ear.z = z
		this.ear.yaw = yaw
	}

	/** Volume (1 at the listener, 0 at `reach` metres), stereo pan (−1 left … 1 right) and distance of `at`. */
	private place(at: SoundAt, reach: number): [number, number, number] {
		if (!at) return [1, 0, 0]
		const dx = at.x - this.ear.x
		const dz = at.z - this.ear.z
		const d = Math.hypot(dx, dz)
		if (d < 1e-3) return [1, 0, 0]
		// Screen right is (−cos yaw, sin yaw)
		const side = (-dx * Math.cos(this.ear.yaw) + dz * Math.sin(this.ear.yaw)) / d
		const v = Math.max(0, 1 - d / reach)
		return [v * v * 0.6 + v * 0.4, side * panWidth * Math.min(1, d / panNear), d]
	}

	/**
	 * Cannon. Layers: the supersonic crack (sharp on long high-velocity guns, almost none on howitzers), the muzzle
	 * blast and a sub-bass thump (lower and longer with the calibre), the bark of a muzzle brake, the echo rolling
	 * back from the country around. Inside the player's own tank: the breech, the barrel ringing, the spent case.
	 */
	shot(gun: GunVoice, at: SoundAt) {
		const s = this.voice(at, 1000, true)
		if (!s) return
		const G = GUN_SOUND
		const k = Math.min(1.9, Math.max(0.3, gun.caliber / G.refCaliber))
		const auto = gun.caliber < G.autoCaliber
		const crack = Math.min(1, Math.max(0, (gun.velocity - G.crackFrom) / (G.crackFull - G.crackFrom)))
		const boom = gun.howitzer ? 1 : 0
		const brake = gun.brake ? 1 : 0
		const vary = 0.95 + Math.random() * 0.1
		const v = s.v * Math.min(1.3, 0.5 + 0.42 * k + 0.1 * brake)
		const near = 1 - s.far
		const long = auto ? 0.5 : 1 + 0.25 * boom
		this.noise(
			s,
			'white',
			0,
			(0.2 + 0.55 * crack) * v * near,
			0.035 + 0.035 * k,
			'highpass',
			1400 + 1100 * crack,
			1400,
			0.5,
			0.001,
		)
		const top = ((2500 - 900 * boom + 700 * crack) / Math.pow(k, 0.8)) * vary
		this.noise(s, 'brown', 0, 1.1 * v, (0.3 + 0.38 * k) * long, 'lowpass', top, 105, 0.6, 0.002)
		if (brake)
			this.noise(s, 'white', 0.004, 0.32 * v, 0.08 + 0.05 * k, 'bandpass', 950 / Math.sqrt(k), 420, 0.9, 0.001)
		const thump = ((95 - 22 * boom) / Math.sqrt(k)) * vary
		this.partial(s, 0, thump, (0.85 + 0.2 * boom) * v, (0.24 + 0.22 * k) * long, 0.35)
		if (k > 1.2) this.partial(s, 0.01, thump * 0.52, 0.45 * v, 0.5 + 0.25 * k, 0.5)
		if (auto) return
		this.noise(s, 'brown', 0.12, 0.35 * v, 1.0 + 0.7 * k, 'lowpass', 380, 90, 0.5, 0.15)
		// The report coming back off the hills and the tree lines
		this.noise(s, 'brown', 0.3 + Math.random() * 0.15, 0.16 * v, 0.5 + 0.3 * k, 'lowpass', 650 / k, 140, 0.6, 0.03)
		if (at) return
		const steel = 1 / Math.sqrt(k)
		this.ring(s, 0.04, 170 * steel, 0.07, 0.35)
		this.ring(s, 0.02, 520 * steel * vary, 0.035 * (0.5 + 0.5 * crack), 0.5)
		this.noise(s, 'white', 0.05, 0.12, 0.05, 'bandpass', 2600, 2600, 2)
		this.noise(s, 'brown', 0.09, 0.3, 0.12, 'lowpass', 500 * steel, 160, 0.8, 0.002)
		// The spent case drops out of the breech and rolls on the floor
		const drop = 0.5 + 0.12 * k
		for (const [dt, g] of [
			[0, 1],
			[0.13, 0.55],
			[0.22, 0.3],
		] as const) {
			this.ring(s, drop + dt, 1250 * steel * (0.96 + Math.random() * 0.08), 0.045 * g, 0.22)
			this.noise(s, 'white', drop + dt, 0.05 * g, 0.03, 'bandpass', 3400, 3400, 2, 0.001)
		}
	}

	/** Rocket leaving the rails: a sharp ignition and a roaring hiss that tears away. */
	rocket(at: SoundAt) {
		const s = this.voice(at, 800, true)
		if (!s) return
		const v = s.v
		this.noise(s, 'white', 0, 0.35 * v * (1 - s.far), 0.05, 'highpass', 2000, 2000, 0.5, 0.001)
		this.noise(s, 'white', 0, 0.45 * v, 1.0, 'bandpass', 2600, 600, 1.1, 0.03)
		this.noise(s, 'brown', 0, 0.6 * v, 0.9, 'lowpass', 500, 120, 0.6, 0.02)
	}

	hit(at: SoundAt, penetrated: boolean, ricochet: boolean) {
		const s = this.voice(at, 600)
		if (!s) return
		const v = s.v
		if (ricochet) {
			// A glancing ping and the shell whirring off
			this.noise(s, 'white', 0, 0.3 * v, 0.04, 'bandpass', 3500, 3500, 1.5, 0.001)
			this.ring(s, 0, 760, 0.16 * v, 0.4)
			this.noise(s, 'white', 0.02, 0.25 * v, 0.45, 'bandpass', 3800, 900, 7, 0.03)
			return
		}
		if (penetrated) {
			// Dull, heavy crunch of a shell going through
			this.noise(s, 'brown', 0, 1.0 * v, 0.45, 'lowpass', 1400, 140, 0.8, 0.002)
			this.partial(s, 0, 80, 0.7 * v, 0.3, 0.45)
			this.noise(s, 'white', 0, 0.35 * v, 0.22, 'bandpass', 1300, 500, 0.8, 0.002)
			this.ring(s, 0.01, 130, 0.22 * v, 0.5)
			return
		}
		// Bounced off the armour: a hard clang that rings on
		this.noise(s, 'white', 0, 0.45 * v, 0.05, 'bandpass', 2800, 2800, 1, 0.001)
		this.noise(s, 'brown', 0, 0.6 * v, 0.18, 'lowpass', 900, 200, 0.7, 0.002)
		this.ring(s, 0, 240, 0.32 * v, 0.8)
	}

	/** A shell striking the ground: a thud, and for big HE a blast with dirt raining down. */
	impact(at: SoundAt, big: boolean) {
		const s = this.voice(at, big ? 900 : 500, big)
		if (!s) return
		const v = s.v
		if (!big) {
			this.noise(s, 'brown', 0, 0.5 * v, 0.3, 'lowpass', 800, 150, 0.7, 0.002)
			this.noise(s, 'white', 0, 0.15 * v, 0.06, 'bandpass', 1800, 1800, 1, 0.001)
			return
		}
		this.noise(s, 'white', 0, 0.4 * v * (1 - s.far), 0.08, 'highpass', 1200, 1200, 0.5, 0.001)
		this.noise(s, 'brown', 0, 1.1 * v, 1.0, 'lowpass', 1600, 90, 0.6, 0.002)
		this.partial(s, 0, 65, 0.8 * v, 0.6, 0.4)
		this.noise(s, 'white', 0.1, 0.1 * v, 0.7, 'highpass', 1500, 3000, 0.5, 0.15)
	}

	/** A tank brewing up: blast, the ammunition going a beat later, scattering debris. */
	explosion(at: SoundAt) {
		const s = this.voice(at, 1400, true)
		if (!s) return
		const v = s.v
		this.noise(s, 'white', 0, 0.5 * v * (1 - s.far), 0.12, 'highpass', 1000, 1000, 0.5, 0.001)
		this.noise(s, 'brown', 0, 1.3 * v, 2.2, 'lowpass', 1800, 70, 0.6, 0.003)
		this.partial(s, 0, 60, 1.0 * v, 1.4, 0.35)
		this.noise(s, 'brown', 0.2, 0.8 * v, 1.6, 'lowpass', 900, 60, 0.6, 0.01)
		this.partial(s, 0.2, 48, 0.6 * v, 1.0, 0.4)
		this.ring(s, 0.35, 160, 0.12 * v, 0.9)
		for (let i = 0; i < 6; i++) {
			const d = 0.3 + Math.random() * 1.2
			const f = 1500 + Math.random() * 2000
			this.noise(s, 'white', d, 0.12 * v * Math.random(), 0.04, 'bandpass', f, f, 2)
		}
	}

	/** The gun is loaded again: the breech block slams shut. */
	reloaded() {
		const out = this.mix
		if (!out) return
		this.noise(out, 'white', 0, 0.2, 0.03, 'bandpass', 3200, 3200, 2, 0.001)
		this.noise(out, 'brown', 0.03, 0.45, 0.1, 'lowpass', 700, 200, 0.8, 0.001)
		this.ring(out, 0.03, 420, 0.06, 0.22)
	}
	/** The reticle has converged: a soft, high double tick. */
	aimed() {
		const out = this.mix
		if (!out) return
		this.partial(out, 0, 1480, 0.035, 0.05)
		this.partial(out, 0.06, 1980, 0.03, 0.07)
	}
	/** A dry mechanical tick: ammo switch, gun not ready. */
	click() {
		const out = this.mix
		if (!out) return
		this.noise(out, 'white', 0, 0.16, 0.025, 'bandpass', 2400, 2400, 3, 0.001)
		this.noise(out, 'brown', 0, 0.2, 0.04, 'lowpass', 500, 500, 0.7, 0.001)
	}
	/** "Sixth sense": the enemy has just spotted the player. A low, soft bell. */
	spotted() {
		const out = this.mix
		if (!out) return
		this.partial(out, 0, 392, 0.1, 0.9, 1, 'sine', 0.01)
		this.partial(out, 0, 392 * 2.01, 0.035, 0.5, 1, 'sine', 0.01)
		this.partial(out, 0.12, 587, 0.07, 0.8, 1, 'sine', 0.01)
	}
	/** The player's tank is on fire: two pulses of a muffled buzzer. */
	alarm() {
		if (!this.ctx || !this.mix) return
		const lp = this.ctx.createBiquadFilter()
		lp.type = 'lowpass'
		lp.frequency.value = 900
		lp.connect(this.mix)
		for (const d of [0, 0.2]) {
			this.partial(lp, d, 220, 0.12, 0.15, 1, 'square', 0.01)
			this.partial(lp, d, 277, 0.08, 0.15, 1, 'square', 0.01)
		}
	}

	/** Per frame: the listener's own engine, in the voice of `id`. */
	engine(id: EngineId, state: EngineState) {
		this.engines?.own(id, state)
	}

	/** Per frame: the other vehicles whose engines may be heard around the listener. */
	traffic(sources: readonly EngineSource[]) {
		this.engines?.traffic(sources, this.ear)
	}

	/** Pause: everything falls silent (engine included) and resumes where it stopped. */
	setPaused(on: boolean) {
		if (this.paused === on) return
		this.paused = on
		if (!this.ctx) return
		const r = on ? this.ctx.suspend() : this.ctx.resume()
		r.catch(() => undefined)
	}
	toggleMute(): boolean {
		this.muted = !this.muted
		try {
			localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0')
		} catch {
			/* storage blocked: the choice lasts for the session */
		}
		if (this.master) this.master.gain.value = this.muted ? 0 : 1
		return this.muted
	}
}
