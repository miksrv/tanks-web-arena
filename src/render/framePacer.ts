import { RENDER } from '../config'

/**
 * Frame pacing on any refresh rate. Rendering is gated by a schedule that advances by the target interval, so the
 * average rate is the target — 60 fps on 75, 90, 120, 144 Hz panels alike — instead of the panel rate divided by a
 * whole number (a fixed minimum gap gives 144 Hz / 3 = 48 fps and 75 Hz / 2 = 37.5 fps). A panel barely faster
 * than the target (60.5 Hz) would lose one refresh every couple of seconds, a visible hitch: it renders them all.
 */
export class FramePacer {
	private nextAt = 0
	private lastAt = 0
	/** ms between refreshes, smoothed (0 until measured). */
	private refresh = 0

	/** Call on every rAF callback; returns true when this one should simulate and render. */
	shouldRender(now: number, targetFps: number): boolean {
		const interval = 1000 / targetFps
		const gap = now - this.lastAt
		this.lastAt = now
		// Only refresh-sized gaps: a hidden tab or a hitch says nothing about the panel
		if (gap > 0 && gap < 50) this.refresh = this.refresh ? this.refresh + (gap - this.refresh) * 0.05 : gap
		if (this.refresh * (1 + RENDER.nearRate) >= interval) {
			this.nextAt = now + interval
			return true
		}
		if (now < this.nextAt - RENDER.earlySlack) return false
		// Fell behind by more than a frame (slow frame, hidden tab): resynchronise instead of rushing to catch up
		this.nextAt = now - this.nextAt > interval ? now + interval : this.nextAt + interval
		return true
	}
}

/** Rendered frames per second of real time, refreshed twice a second (the P overlay and the debug log). */
export class FpsCounter {
	value = 0
	private acc = 0
	private frames = 0

	count(dt: number) {
		this.acc += dt
		this.frames++
		if (this.acc < 0.5) return
		this.value = Math.round(this.frames / this.acc)
		this.acc = this.frames = 0
	}
}
