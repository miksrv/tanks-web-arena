import type { Audio } from '../fx/audio'
import type { EngineSource } from '../fx/engineMix'
import type { EngineState } from '../fx/engineSound'
import type { Tank } from '../tank/tank'

/** An engine switched off (the garage, a wreck). */
export const ENGINE_OFF: EngineState = { throttle: 0, speed: 0, maxSpeed: 1, turn: 0, traverse: 0, alive: false }

/** What the engine and the running gear of a tank are doing, for its sound. */
export function engineState(t: Tank): EngineState {
	return {
		throttle: t.throttle,
		speed: t.speed,
		maxSpeed: t.def.speed,
		turn: t.yawRate,
		traverse: t.turretRate / t.def.turretTurn,
		alive: t.alive,
	}
}

/**
 * The other vehicles whose engines the player may hear: those drawn on screen (an unspotted enemy stays silent, so
 * the sound gives away nothing the eyes do not).
 */
export function engineSources(tanks: readonly Tank[], own: Tank | null): EngineSource[] {
	const out: EngineSource[] = []
	for (const t of tanks) {
		if (t === own || !t.alive || !t.view.group.visible) continue
		out.push({ ...engineState(t), traverse: 0, key: t, engine: t.def.engine, x: t.pos.x, z: t.pos.z })
	}
	return out
}

/**
 * Per frame: the player's engine and the vehicles around. Nothing is
 * simulated in the garage: the tank's last throttle must not keep the engine roaring there.
 */
export function playEngines(audio: Audio, garage: boolean, player: Tank, tanks: readonly Tank[]) {
	if (garage) {
		audio.engine(player.def.engine, ENGINE_OFF)
		audio.traffic([])
		return
	}
	audio.engine(player.def.engine, engineState(player))
	audio.traffic(engineSources(tanks, player))
}
