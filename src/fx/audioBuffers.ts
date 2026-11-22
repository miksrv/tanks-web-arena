import type { NoiseKind } from './engineSound'

/** Two seconds of looping noise: white for cracks and hiss, brown (integrated white) for blasts and rumble. */
export function makeNoise(ctx: AudioContext, kind: NoiseKind): AudioBuffer {
	const len = ctx.sampleRate * 2
	const buf = ctx.createBuffer(1, len, ctx.sampleRate)
	const d = buf.getChannelData(0)
	let last = 0
	for (let i = 0; i < len; i++) {
		const w = Math.random() * 2 - 1
		if (kind === 'white') d[i] = w
		else {
			last = (last + 0.02 * w) / 1.02
			d[i] = last * 3.5
		}
	}
	return buf
}

/** Open-field reverb: a short pre-delay, then decaying stereo noise that darkens as it fades. */
export function makeImpulse(ctx: AudioContext, seconds: number): AudioBuffer {
	const rate = ctx.sampleRate
	const len = Math.floor(rate * seconds)
	const pre = Math.floor(rate * 0.025)
	const buf = ctx.createBuffer(2, len, rate)
	for (let ch = 0; ch < 2; ch++) {
		const d = buf.getChannelData(ch)
		let lp = 0
		for (let i = pre; i < len; i++) {
			const t = (i - pre) / rate
			const k = 0.6 * Math.exp(-t * 1.5) + 0.03 // one-pole lowpass coefficient: the tail gets duller
			lp += k * (Math.random() * 2 - 1 - lp)
			d[i] = lp * Math.exp(-t * 2.4)
		}
	}
	return buf
}
