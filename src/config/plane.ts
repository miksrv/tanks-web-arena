// The player's aircraft (V in battle): an arcade flight model and its bomb load. Units: metres, seconds, radians.

export const PLANE = {
	spawnHeight: 130, // m above the player's tank when the plane is called in
	ceiling: 380, // m above sea level: no climbing past it
	minSpeed: 38, // m/s at idle throttle in level flight
	maxSpeed: 85, // m/s at full throttle
	cruise: 0.6, // throttle at take-off
	throttleRate: 0.6, // throttle change per second while W / S is held
	accel: 0.6, // 1/s: how fast the speed follows the throttle
	climbDrag: 0.5, // share of gravity that slows a climb and speeds up a dive
	turnRate: 0.85, // rad/s of heading toward the mouse direction
	pitchRate: 0.8, // rad/s of nose up/down toward the mouse direction
	maxClimb: 0.7, // rad nose up
	maxDive: 1.1, // rad nose down
	maxBank: 1.2, // rad of roll in a turn (cosmetic)
	edge: 420, // m from the centre: past it the plane turns back over the map
	spotRadius: 220, // m on the ground around the plane where enemies are spotted for the team
	cooldown: 6, // s after a crash before the plane can be called in again
	sightStep: 0.1, // s per step of the bomb sight's fall prediction
	sightSteps: 300, // steps of that prediction (30 s of fall)
	propSpin: 60, // rad/s at full throttle
	camera: { distance: 22, min: 12, max: 60, height: 4 },
	bomb: {
		max: 6, // bombs in the bays
		rearm: 5, // s per bomb restocked while flying
		interval: 0.35, // s between two drops
		pen: 120, // mm: a direct hit goes through any roof
		dmg: 800,
		caliber: 250,
		splash: 14, // m blast radius
		life: 30, // s of free fall before the bomb is dropped from the list
	},
}

/** The aircraft model, its bomb sight ring and the bombs in the air. */
export const PLANE_VIEW = {
	colors: {
		ussr: '#4d5a34',
		germany: '#5d6457',
		belly: '#8fa3ad',
		glass: '#2c3640',
		dark: '#2a2724',
		white: '#e8e8e8',
		red: '#c62828',
	},
	ringSegments: 48, // line segments of the bomb sight ring
	bombMeshes: 24, // falling bombs drawn at once
}
