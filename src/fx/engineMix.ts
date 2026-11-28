import { AUDIO_FX, ENGINE_MIX, type EngineId } from '../config'
import { EngineSound, type EngineState, type NoiseKind } from './engineSound'

/** A vehicle near the listener whose engine may be heard. `key` tells the vehicles apart from frame to frame. */
export interface EngineSource extends EngineState {
	key: object
	engine: EngineId
	x: number
	z: number
}

/** Volume, stereo pan and distance of a point on the map, as the listener hears it within `reach` metres. */
type Place = (at: { x: number; z: number }, reach: number) => [number, number, number]

/** A neighbour's engine with its place in the stereo field. */
interface Neighbour {
	sound: EngineSound
	gain: GainNode
	air: BiquadFilterNode
	pan: StereoPannerNode
	/** Volume and pan last handed to the audio thread (a still pair is not re-sent every frame). */
	v: number
	side: number
}

/**
 * The engines in the mix: the listener's own at full level, and the nearest few running around, each fading and
 * darkening with distance and panned by its bearing. The rest of the battlefield is silent.
 */
export class EngineMix {
	private mine: EngineSound | null = null
	private readonly neighbours = new Map<object, Neighbour>()
	private readonly nearest: (EngineSource & { d: number })[] = []

	constructor(
		private readonly ctx: AudioContext,
		private readonly out: AudioNode,
		private readonly noise: Record<NoiseKind, AudioBuffer>,
		private readonly place: Place,
	) {}

	/** The listener's own engine, in the voice of `id` (a new vehicle gets a new voice). */
	own(id: EngineId, state: EngineState) {
		if (this.mine?.id !== id) {
			this.mine?.stop(this.ctx)
			this.mine = new EngineSound(this.ctx, this.out, this.noise, id)
		}
		this.mine.update(this.ctx.currentTime, state)
	}

	/** The vehicles that may be heard this frame, and where the listener is. */
	traffic(sources: readonly EngineSource[], ear: { x: number; z: number }) {
		const { voices, reach, level } = ENGINE_MIX
		const near = this.nearest
		near.length = 0
		for (const s of sources) {
			const d = Math.hypot(s.x - ear.x, s.z - ear.z)
			// A vehicle that already has a voice keeps it a little longer: no flicker at the edge of the reach
			if (s.alive && d < reach * (this.neighbours.has(s.key) ? 1.1 : 1)) near.push({ ...s, d })
		}
		near.sort((a, b) => a.d - b.d)
		near.length = Math.min(near.length, voices)
		for (const [key, n] of this.neighbours) {
			if (near.some((c) => c.key === key && c.engine === n.sound.id)) continue
			n.sound.stop(this.ctx)
			setTimeout(() => n.pan.disconnect(), 600)
			this.neighbours.delete(key)
		}
		const t = this.ctx.currentTime
		for (const s of near) {
			const n = this.neighbours.get(s.key) ?? this.join(s)
			const [v, pan] = this.place(s, reach * 1.1)
			if (v !== n.v || pan !== n.side) {
				n.v = v
				n.side = pan
				const far = Math.sqrt(Math.min(1, s.d / reach))
				n.gain.gain.setTargetAtTime(v * level, t, 0.15)
				n.pan.pan.setTargetAtTime(pan, t, 0.1)
				n.air.frequency.setTargetAtTime(9000 * Math.pow(AUDIO_FX.airFar * 2, far), t, 0.15)
			}
			n.sound.update(t, s)
		}
	}

	/** A voice for a vehicle that has come within earshot: engine → distance gain → air → panner. */
	private join(s: EngineSource): Neighbour {
		const { ctx } = this
		const pan = ctx.createStereoPanner()
		pan.connect(this.out)
		const air = ctx.createBiquadFilter()
		air.type = 'lowpass'
		air.connect(pan)
		const gain = ctx.createGain()
		gain.gain.value = 0
		gain.connect(air)
		const n = { sound: new EngineSound(ctx, gain, this.noise, s.engine), gain, air, pan, v: -1, side: 0 }
		this.neighbours.set(s.key, n)
		return n
	}
}
