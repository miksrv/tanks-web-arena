import type * as THREE from 'three'
import { ADAPTIVE_RESOLUTION } from '../config'

const { windowFrames, step, slowRatio, cleanRatio, cooldownAfterDrop, maxRetry } = ADAPTIVE_RESOLUTION

/**
 * Dynamic resolution. Compares the average frame time of one-second windows with the frame-rate target; a slow
 * window lowers the render scale a notch, a clean one raises it again after a back-off, so the picture is as sharp
 * as the GPU allows without stutter. Averages work on any refresh rate: on a 144 Hz panel paced to 60 fps the gaps
 * alternate between two and three refreshes, which no per-frame threshold could tell from a missed vsync.
 * Still slow at the lowest scale → `onLowestScaleTooSlow` fires once (the game drops the shadow map size).
 */
export class AdaptiveResolution {
	private current: number
	private frames = 0
	private spent = 0
	private budget = 0
	private cooldown = 2
	private retry = 6
	private lowShadow = false

	constructor(
		private readonly renderer: THREE.WebGLRenderer,
		private readonly max: number,
		private readonly min: number,
		private readonly onLowestScaleTooSlow: () => void,
	) {
		this.current = max
	}

	get scale() {
		return this.current
	}

	/** Feed the raw (unscaled) time since the previous rendered frame and the frame-rate target, both per frame. */
	update(raw: number, targetFps: number) {
		this.frames++
		this.spent += raw
		this.budget += 1 / targetFps
		this.cooldown -= raw
		if (this.frames < windowFrames) return
		const ratio = this.spent / this.budget
		this.frames = this.spent = this.budget = 0
		if (this.cooldown > 0) return
		if (ratio > slowRatio && this.current > this.min) {
			this.setScale(Math.max(this.min, this.current - step))
			this.cooldown = cooldownAfterDrop
			this.retry = Math.min(maxRetry, this.retry * 2)
		} else if (ratio > slowRatio && !this.lowShadow) {
			this.lowShadow = true
			this.cooldown = cooldownAfterDrop
			this.onLowestScaleTooSlow()
		} else if (ratio < cleanRatio && this.current < this.max) {
			this.setScale(Math.min(this.max, this.current + step))
			this.cooldown = this.retry
		}
	}

	private setScale(v: number) {
		this.current = v
		this.renderer.setPixelRatio(v)
	}
}
