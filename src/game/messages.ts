import { ARCHETYPES, HIT_PART_LABEL, HIT_ZONE_LABEL, HUD, NATION_LABEL, SEASON_LABEL, WEATHER } from '../config'
import { RAD_TO_DEG } from '../core/math'
import type { Terrain } from '../world/terrain'
import type { Outcome } from './match'
import type { Medal } from './medals'
import type { HitResult } from '../combat/armor'
import type { Tank } from '../tank/tank'

/** Colours of the battle log (the table is `HUD.logColors`). */
export const COLOR = HUD.logColors
const ZONE: Record<string, string> = HIT_PART_LABEL
const SPOT: Record<string, string> = HIT_ZONE_LABEL

/** "башня", "нижний лист", "корпус (экран)": where a hit landed, for the log and the battle report. */
export function hitPlace(hit: HitResult): string {
	if (hit.zone === 'screen') return `${ZONE[hit.part]} (экран)`
	return hit.zone ? SPOT[hit.zone] : ZONE[hit.part]
}
const r = Math.round

/** The player's own shell struck `hit`. */
export function playerHitText(hit: HitResult): { text: string; color: string } {
	const color = hit.penetrated ? COLOR.good : hit.ricochet ? COLOR.info : COLOR.warn
	if (hit.ricochet) return { text: 'Рикошет!', color }
	if (hit.penetrated) return { text: `Пробитие: −${r(hit.damage)} (${hitPlace(hit)}, ${r(hit.effective)} мм)`, color }
	if (hit.damage > 0) return { text: `Фугас: −${r(hit.damage)}`, color }
	return { text: `Не пробил: ${r(hit.effective)} мм под ${r(hit.angle * RAD_TO_DEG)}°`, color }
}

/** The player's tank was struck by `by`. */
export function hitTakenText(hit: HitResult, by: Tank): { text: string; color: string } {
	const color = hit.penetrated ? COLOR.bad : COLOR.info
	const zone = hitPlace(hit)
	if (hit.ricochet) return { text: `Рикошет от ${zone}`, color }
	if (hit.penetrated) return { text: `Пробитие ${zone}: −${r(hit.damage)} (${by.def.name})`, color }
	return { text: `Не пробито: ${zone} (${by.def.name})`, color }
}

/** "степь · лето · туман": the map's country, season and weather for the battle intro. */
export function mapTitle(t: Terrain): string {
	return `${ARCHETYPES[t.archetype].label} · ${SEASON_LABEL[t.season]} · ${WEATHER[t.weather].label}`
}

const OUTCOME: Record<Outcome, (side: string) => string> = {
	destroyed: (side) => `${side}: все машины противника уничтожены`,
	capture: (side) => `${side}: база захвачена`,
	time: (side) => `${side}: время вышло, у них больше машин`,
	defended: (side) => `${side}: оборона выстояла`,
	left: () => 'Вы покинули бой',
}

/** Result screen for the finished round: who won and why, the player's numbers and medals. */
export function resultHtml(winner: 0 | 1 | -1 | null, outcome: Outcome, player: Tank, medals: Medal[]): string {
	const title = winner === -1 ? 'Ничья' : winner === player.team ? 'Победа!' : 'Поражение'
	const reason =
		winner === -1 || winner === null
			? outcome === 'destroyed'
				? 'Все машины уничтожены'
				: outcome === 'capture'
					? 'Обе базы захвачены'
					: 'Время вышло'
			: OUTCOME[outcome](NATION_LABEL[winner === 0 ? 'ussr' : 'germany'])
	const s = player.stats
	const stats = [
		`урон ${r(player.damageDealt)}`,
		`по засвету ${r(s.assist)}`,
		`заблокировано ${r(s.blocked)}`,
		`уничтожено ${player.kills}`,
		`обнаружено ${player.spots}`,
	].join(' · ')
	const list = medals.map((m) => `<span class="medal"><b>${m.name}</b>${m.why}</span>`).join('')
	return (
		`${title}<small>${reason}</small><small>${stats}</small>` +
		(list ? `<div class="medals">${list}</div>` : '') +
		`<small>Возврат в гараж через несколько секунд</small>`
	)
}

export function countdownHtml(timer: number, howitzer: boolean): string {
	const hint = howitzer ? ' · колесо вперёд или Shift — артиллерийский вид' : ''
	return `${Math.ceil(timer)}<br><small>Приготовиться${hint}</small>`
}

/** The player's tank is knocked out: the camera stays on the wreck for `timer` more seconds. */
export function wreckHtml(timer: number): string {
	return `Танк подбит<br><small>Наблюдение за боем через ${Math.ceil(timer)} с · Enter — завершить бой</small>`
}

/** The slim line under the screen while the dead player watches a teammate. */
export const SPECTATE_HTML = '<small>Наблюдение · Пробел — следующий союзник · Enter — завершить бой</small>'

export function killHtml(t: Tank, by: Tank | null): string {
	const who = by ? `<b>${by.name}</b> (${by.def.name})` : 'Кто-то'
	const how = t.detonated ? ' · боеукладка' : ''
	return `${who} уничтожил ${t.name} <small>(${t.def.name}${how})</small>`
}
