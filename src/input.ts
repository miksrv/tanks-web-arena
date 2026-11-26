/** Wheel delta in pixels whatever the device reports: lines (Firefox) or pages. One mouse notch ≈ 100 px. */
function wheelPixels(e: WheelEvent): number {
	if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) return e.deltaY * 33
	if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) return e.deltaY * window.innerHeight
	return e.deltaY
}

/** Keyboard + pointer-locked mouse. Mouse deltas accumulate per frame; the HUD reads `locked` to show the click-to-play hint. */
export class Input {
	keys = new Set<string>()
	pressed = new Set<string>()
	mouseDx = 0
	mouseDy = 0
	wheel = 0
	leftClicked = false
	leftDown = false
	/** Right button held (free look: the gun stays laid). */
	rightDown = false
	locked = false
	/** Set by the HUD while an overlay (garage, result) wants plain mouse input. */
	overlay = false

	constructor(private readonly el: HTMLElement) {
		window.addEventListener('keydown', (e) => {
			if (!this.keys.has(e.code)) this.pressed.add(e.code)
			this.keys.add(e.code)
			// In battle these would scroll the page or move focus; in the garage Tab and Space still work the buttons
			if (this.overlay && (e.code === 'Tab' || e.code === 'Space')) return
			if (['Space', 'Tab', 'ShiftLeft', 'ShiftRight'].includes(e.code) || e.code.startsWith('Arrow'))
				e.preventDefault()
		})
		window.addEventListener('keyup', (e) => {
			// macOS sends no keyup for keys released while Cmd is held: drop them all with Cmd
			if (e.code === 'MetaLeft' || e.code === 'MetaRight') this.keys.clear()
			else this.keys.delete(e.code)
		})
		window.addEventListener('blur', () => this.releaseAll())
		document.addEventListener('pointerlockchange', () => {
			this.locked = document.pointerLockElement === el
			if (!this.locked) this.releaseAll()
		})
		el.addEventListener('mousedown', (e) => {
			if (this.overlay) return
			if (!this.locked) {
				this.lock()
				return
			}
			if (e.button === 0) {
				this.leftClicked = true
				this.leftDown = true
			}
			if (e.button === 2) this.rightDown = true
		})
		window.addEventListener('mouseup', (e) => {
			if (e.button === 0) this.leftDown = false
			if (e.button === 2) this.rightDown = false
		})
		el.addEventListener('mousemove', (e) => {
			if (this.locked) {
				this.mouseDx += e.movementX
				this.mouseDy += e.movementY
			}
		})
		el.addEventListener(
			'wheel',
			(e) => {
				if (this.locked) this.wheel += wheelPixels(e)
				e.preventDefault()
			},
			{ passive: false },
		)
		el.addEventListener('contextmenu', (e) => e.preventDefault())
	}
	down(code: string) {
		return this.keys.has(code)
	}
	justPressed(code: string) {
		return this.pressed.has(code)
	}
	/** Ask for the pointer lock (needs a user gesture; a refusal is not an error). */
	lock() {
		try {
			const r = this.el.requestPointerLock() as unknown as Promise<void> | undefined
			r?.catch?.(() => undefined)
		} catch {
			/* headless or unsupported */
		}
	}
	unlock() {
		if (this.locked) document.exitPointerLock()
	}
	endFrame() {
		this.pressed.clear()
		this.mouseDx = this.mouseDy = 0
		this.wheel = 0
		this.leftClicked = false
	}
	/** Focus or pointer lock lost: no key or button can stay held. */
	private releaseAll() {
		this.keys.clear()
		this.leftDown = this.rightDown = false
	}
}
