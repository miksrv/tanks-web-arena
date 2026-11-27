/** HUD timings, sizes and colours, one group per `src/hud` module. */
export const HUD = {
	/** Centre messages and the sixth-sense lamp (`hud.ts`). */
	messages: {
		sixthSenseTime: 4, // s the lamp stays lit
		centerBigTime: 3.5, // s a centre message stays big before it shrinks to its slim line
	},
	/** Kill feed, damage log, hit-direction arrows and damage popups. */
	notifications: {
		feedLife: 8, // s a kill-feed line stays
		feedMax: 6, // lines
		logLife: 2.6, // s a damage-log line stays
		logMax: 4, // lines
		arrowLife: 2, // s a hit-direction arrow stays
		arrowFade: 0.8, // s of that spent fading out
		popupLife: 1.6, // s a damage popup stays
		popupRise: 2.5, // m/s
	},
	ribbons: {
		pulse: 0.6, // s a ribbon stays highlighted after it counts up
		life: 7, // s a ribbon stays on screen after its last event
		fade: 0.5, // s of that spent fading out (matches the CSS transition)
	},
	reticle: {
		minPx: 14, // px, the smallest reticle (it is as wide as the converged dispersion, which is tiny without zoom)
		maxShare: 0.7, // of the window height, the widest dispersion circle
		linePx: 2, // px, the reticle's line: the reload ring runs along its middle
		artyRingPx: 48, // px, the reload ring in the artillery view
		readyFlash: 0.45, // s of the green "loaded" flash
		traceTime: { direct: 4, howitzer: 12, mortar: 9 }, // s of flight the dispersion circle is traced over
	},
	minimap: {
		size: 220, // minimap size in canvas pixels
		rim: 40, // m of the mountain foot the map shows around the battlefield (as far as a tank can climb)
		redrawInterval: 1 / 20, // s: nothing on the map moves faster than that
		pingLife: 3, // s
	},
	radial: {
		itemR: 105, // px from the centre to an option
		pointerMax: 120, // px the pointer may stray from the centre
		deadZone: 28, // px: closer to the centre nothing is picked (release = cancel)
	},
	/** Names and health bars over the tanks. */
	labels: {
		aboveTurret: 1.2, // m above the turret roof
		colors: { allyName: '#8fd36b', enemyName: '#ff8a80', allyBar: '#8fd36b', enemyBar: '#ff5a5a' },
	},
	/** The garage's vehicle preview: a three-quarter view from the front left, a little from above. */
	preview: {
		fov: 30, // deg
		viewYaw: 0.75, // rad
		viewPitch: 0.3, // rad
		spinSpeed: 0.5, // rad/s, the selected vehicle's turntable
		margin: 1.08, // framing slack around the silhouette
	},
	scoreboard: {
		refresh: 0.25, // s
	},
	status: {
		/**
		 * The player's vehicle panel: 'schema' = a top-down diagram of the vehicle that shows the damage, the health as
		 * a thin bar, the number only for a moment after a hit; 'bar' = no diagram, the health bar with the number
		 * always on.
		 */
		style: 'schema' as 'schema' | 'bar',
		hpShow: 3, // s the health number stays after the health drops (schema style)
		hitArc: 1.5, // s the diagram shows the side a hit came from
		hitMarkLife: 12, // s a struck part of the diagram stays lit, fading out
		hitFlash: 0.35, // s
	},
	garage: {
		statMax: { hp: 1400, speed: 16, pen: 200, dmg: 2100, armor: 200 }, // bar scale maxima for the vehicle cards
	},
	/** Battle log colours. */
	logColors: {
		good: '#8fd36b',
		bad: '#ff5a5a',
		warn: '#ff9f6b',
		info: '#9ad1ff',
		damage: '#ffd166',
		fire: '#ff7a1a',
	},
}
