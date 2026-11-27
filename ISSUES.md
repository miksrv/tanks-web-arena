# Issues

Findings of the code review of 2026-11-24 (version 0.2.1). One line per issue; nothing here is fixed yet. No new mechanics: bugs, bot behaviour, map generation, optimisation, deploy.

Marks: **[V]** verified by hand in the code or in the running game, **[A]** reported by a review pass and not re-checked. Line numbers are those of 0.2.1.

Measured baseline (production build, headless Chrome): steady 60 fps, JS about 6 % of a frame, 66–95 draw calls, about 340k triangles; no growth of geometries, textures, DOM nodes or heap over 22 rounds.

## 1. Combat and vehicles

- [x] ~~**[V]** Point-blank shots pass through the target: the shell starts at the muzzle, already inside or past the neighbour's hit box (gap up to ~1 m: 2–3 of 10 hit nose-on, 0 of 10 side-on); the reticle armour hint is blind the same way. `src/world/obb.ts:99`, `src/combat/shells.ts:182`~~
- [x] ~~**[V]** Reversing uphill ignores the slope penalty: a Tiger on 25° drives forward at ~1.6 m/s and backward at 4 m/s. `src/tank/drive.ts:36`~~
- [ ] **[A]** Hit boxes ignore hull pitch and roll: on a 15° slope the drawn nose and tail are ~0.8 m off the boxes (up to ~1.5 m at 31°). `src/tank/hitBoxes.ts:17-29`, `src/tank/tank.ts:431`
- [ ] **[A]** Ground contact is sampled every 2.5 m: a shell buried in a crest 1–2 m in front of a hull often counts as a hull hit; the impact is drawn up to 2.5 m long and under the surface. `src/combat/shells.ts:203-210`
- [ ] **[A]** A shell stopped by a rock bursts at the middle of the step (up to ~8 m short of the rock, often in mid-air), and splash is counted from there. `src/combat/shells.ts:197-198`, `src/world/props/props.ts:153`
- [ ] **[A]** SU-57: the gun shield is drawn above the casemate hit box (`tH` 0.45, `mountY` 1.25), so shots at the shield pass through and the mantlet zone is ~2 cm; Marder III overhangs by ~0.2 m. `src/config/vehicles/ussr/su57.ts:33,60`
- [ ] **[A]** Howitzers and rocket launchers overshoot at short range (under ~40 m for SPGs, ~57 m for BM-13 and Panzerwerfer): launch speed assumes the solved elevation, the barrel is clamped to `elevMax`. `src/tank/gunnery.ts:35`
- [x] ~~**[A]** Sturmtiger rounds vanish silently after ~900 m of flight (`shellLife` 6 s at 153 m/s); the dispersion trace stops at ~610 m. `src/config/combat.ts:42`, `src/config/hud.ts:30`~~
- [x] ~~**[A]** Splash distance is XZ only: a burst on a cliff top or roof gives full splash to a tank directly below. `src/combat/shells.ts:271`~~
- [x] ~~**[A]** Ramming has no team check: a fast bot closing on a slower friend damages it. `src/tank/collisions.ts:70-83`~~
- [ ] **[A]** `sweep` runs the full `testShell` (dice rolls, allocations) for every nearby tank, including wrecks and candidates that lose to an earlier contact; test boxes for all, roll only for the winner. `src/combat/shells.ts:184`
- [x] ~~**[A]** Latent: the suspension loop is hard-coded to 5 samples but divides by `SUSPENSION.trackSamples`. `src/tank/suspension.ts:55-63`~~
- [ ] **[A]** Latent: `faceOf` uses `turretForward()` (with gun traverse) for casemates whose box does not rotate; harmless while arcs stay under ~37°. `src/combat/armor.ts:96`
- [ ] **[A]** Pz. IV H and Pz. III J: the cupola box overhangs the turret box rear by ~7 cm (cosmetic).

## 2. Bots

- [x] ~~**[V]** Throttle magnitude is ignored, only its sign is used: every "slow down" (0.3 in a sharp turn, 0.35–0.55 in traffic, 0.4 swerving, 0.6–0.85 approaching a spot) is full speed. Bots circle a near point they cannot reach, miss the swerve around a building, ram friends. Fix: scale the target speed by `|throttle|`. `src/tank/drive.ts:35-36`~~
- [ ] **[A]** Bots never fire on the move: bloom at cruise speed (4–14) is far above their firing threshold (0.33–0.65), so defenders, capturers and retreating bots take fire without answering. Needs a short halt to shoot. `src/ai/gunner.ts:244`, `src/tank/gunnery.ts:105-111`
- [ ] **[A]** "Too close, back off" fights the 5 m leash to the firing position: the bot jerks back and forth, never opens the range and cannot settle its aim; the reverse steering there is not mirrored. `src/ai/fight.ts:73,108-112`
- [x] ~~**[V]** The «Защищайте базу!» (Defend the base!) signal is undone within 0.4 s: `defendBases` clears the defenders whenever no capture is in progress. `src/ai/team.ts:123`, `src/game/teamSignals.ts:87`~~
- [x] ~~**[V]** `stuckEvents` never resets on progress: "third stuck in a row" is the third of the whole battle. `src/ai/avoidance.ts:216`~~
- [ ] **[A]** A broken track counts as stuck (an event every 2.5 s, a reroute every 7.5 s), and the reroute is applied in any mode: in `hold` the bot can stay parked until an enemy appears. `src/ai/avoidance.ts:203`, `src/ai/bot.ts:153-154`
- [ ] **[A]** The "target hidden" timer runs only with the gun loaded and settled: an IS-2 whose target went behind a house waits ~14 s before it moves. `src/ai/gunner.ts:113,253`
- [ ] **[A]** The group "front" counts tanks no longer in the push (retreated, defending, resupplying): healthy tanks stop to regroup for up to 25 s of every 40 s. `src/ai/team.ts:201-205`
- [ ] **[A]** A bot on the player's order («Атакую!» Attacking!, «Нужна помощь!» Need help!) still stops to regroup. `src/ai/roles/strike.ts:85,105`
- [ ] **[A]** Bots change shell at the only moment it costs 2.5 s (gun loaded); `facingArmor` has no hysteresis, so a turning target causes repeated swaps. `src/ai/gunner.ts:231`, `src/ai/targeting.ts:27-31`
- [ ] **[A]** Cover spots and the reverse into them ignore buildings: the bot backs into a wall and grinds on it. `src/ai/positions.ts:114-136`, `src/ai/steering.ts:16-24`
- [x] ~~**[A]** "Hurt" depends on the frame rate (`hp < lastHp − 1` per frame): fire damage triggers evade at 20 fps or with `?speed=3+`; use the `tank.hits` counter. `src/ai/bot.ts:135`~~
- [ ] **[A]** `faceToward` does almost nothing for turreted tanks (threshold 144°): hulls stay side-on to the enemy while regrouping or in cover. `src/ai/steering.ts:29`
- [ ] **[A]** Artillery picks targets it will not fire at (reach 1150 m, fire held beyond 0.95 of it and under 60 m). `src/ai/targeting.ts:13`, `src/ai/gunner.ts:200`
- [ ] **[A]** The low-HP retreat is undone within seconds: a scout goes to the next lookout, a TD is pulled back to its group. `src/ai/roles/light.ts:83-87`, `src/ai/roles/td.ts:66-88`
- [ ] **[A]** A defender that drops out (retreat, broken track) is still counted as sent: no replacement, the capture runs on. `src/ai/team.ts:112-118`, `src/ai/roles/common.ts:14`
- [ ] **[A]** Hit by an unseen enemy while holding, the bot backs ~10 m and returns to the same spot; SPGs do not react at all. `src/ai/bot.ts:361-366,400`
- [ ] **[A]** A whole strike group picks its hold spot around one point; two bots choosing at once can take the same spot. `src/ai/roles/strike.ts:49-51`, `src/ai/steering.ts:47`
- [ ] **[A]** Skilled bots hold fire on a "hopeless" plate and never move for a better angle. `src/ai/gunner.ts:263-270`
- [ ] **[A]** Full line-of-fire check every frame for every loaded bot that cannot shoot, plus `losBlocker` computed only for the debug label; check at 5–10 Hz. `src/ai/gunner.ts:252-254`
- [x] ~~**[A]** All bots retarget on the same frame (`retarget` starts at 0 for everyone). `src/ai/bot.ts:38,308-311`~~
- [ ] **[A]** Obstacle probes and the traffic scan run for bots that are not driving. `src/ai/avoidance.ts:52-55`
- [ ] **[A]** Per-frame garbage in bot code: an object per visible enemy (`team.ts:180`), per bot (`bot.ts:141,373`), a closure per bot (`avoidance.ts:82`), a `slab` closure per `raySegment` (`src/world/obb.ts:113`), `turretForward()` (`tank.ts:222`). Low impact.

## 3. Map generation

Audit of 159 maps (150 random seeds and the 9 named ones). Any fix of the first four changes the layouts: re-run `scripts/map-previews.mjs` afterwards.

- [ ] **[V]** Buildings stand on roads inside settlements (131 of 159 maps): `biomeAnalytic` returns `village`/`town` before the road test, so `isWetOrRoad` never sees a road there; road paint and the road speed bonus vanish inside settlements too. `src/world/terrain/terrain.ts:353-355`, `src/world/buildings/builder.ts:88-91`
- [ ] **[A]** Farms and churches have no road check at all. `src/world/buildings/village.ts:79-90,102-104`, `src/world/buildings/town.ts:54-57`
- [ ] **[A]** Bunkers never check roads (3 maps with a pillbox within 8.5 m of a centre line). `src/world/terrain/layout.ts:325-349`
- [ ] **[A]** Trees and bushes grow through buildings (106 of 159 maps; rocks on 12, haystacks on 8, trees within 2 m of a road centre on 29): props are built before buildings. Crown and bark colours must move to their own RNG stream first. `src/game/world.ts:59`, `src/world/props/scatter.ts:67-75,160-181`, `src/world/props/meshes.ts:95,102`
- [ ] **[A]** Buildings float or are buried on slopes: corners up to 4.8 m above ground («Карелия», Karelia), bunkers buried over 1.5 m on 40 maps; the levelled pad is 0.55 r, buildings go out to 0.85 r. `src/world/terrain/terrain.ts:257-263`, `src/world/buildings/village.ts:110`, `src/world/buildings/town.ts:62`
- [ ] **[V]** The same seed gives different maps in Chrome and Safari: `.sort(() => r() - 0.5)` depends on the engine's sort; use Fisher–Yates. `src/world/terrain/layout.ts:133`
- [ ] **[A]** Ruin colliders are one solid 4 m box: a demolished side is an invisible block, walls above 4 m let shells through. `src/world/buildings/town.ts:23-43`
- [ ] **[A]** A road can drown beside the river (1 of 159 maps, 1.3 m deep, impassable): the causeway is skipped near the whole river, not only at crossings. `src/world/terrain/terrain.ts:318`

## 4. Game loop, camera, records

- [x] ~~**[V]** Camera shake never decays while paused: Esc right after a shot or a hit leaves the picture vibrating for the whole pause. `src/camera.ts:163-165`~~
- [x] ~~**[V]** «Завершить бой» (Leave the battle) counts as survived, and medals are awarded for a forfeited battle. `src/game/records.ts:112`, `src/game/game.ts:304-307`~~
- [ ] **[A]** Two tabs overwrite each other's battle history (records are loaded once, saved whole). `src/game/records.ts:103-135`
- [ ] **[A]** A simultaneous double capture is not a draw: the first zone wins, so Germany always wins the tie in standard mode. `src/game/capture.ts:58-64`
- [x] ~~**[A]** The camera's `smoothPos` and `initialized` are never reset: a new round starts with a swoop from the previous map. `src/camera.ts:202-207`~~
- [x] ~~**[A]** `go()` has no phase guard: the `?autostart` timer or Enter on a focused hidden button can restart a round mid-battle. `src/game/game.ts:170-173`~~
- [ ] **[A]** `devicePixelRatio` is read once: moving the window to another monitor or zooming leaves the old scale ceiling. `src/game/game.ts:83-87,127-130`
- [x] ~~**[A]** Keys can stick on macOS: no `keyup` for a key released while Cmd is held; release all on Meta `keyup`. `src/input.ts:24-33`~~
- [ ] **[A]** Test hooks on the live site: `?round=` and `?speed=` still write records, `?round=abc` gives a round that never ends, `?tank=constructor` passes the `in` check. `src/game/testHooks.ts:33-43`
- [ ] **[A]** The plane is unreachable (its entry is commented out) but still built and updated every frame: `Plane`, `PlaneView`, `Shells.drop`, the `'plane'` camera mode, `#planeHud`, `src/config/plane.ts`. Remove. `src/game/playerController.ts:108-109,172-185`, `src/game/game.ts:47,113,331,341,372`

## 5. Rendering and performance

- [x] ~~**[A]** Tank wheels (InstancedMesh) share a material with plain meshes: three.js re-resolves the program every frame (~15 % of main-thread work). Give wheels their own material and drop their shadow (up to 14 fewer shadow draw calls). `src/tank/tankView.ts:109-110,137`~~
- [ ] **[A]** Static scenery is never culled and is fully redrawn into the shadow map every frame: one InstancedMesh per prop kind and one merged building mesh span the map, the shadow box covers ~6 % of it (100–150k wasted triangles). Split trees, bushes, rocks by sector and buildings by settlement. `src/world/props/meshes.ts:68-73,153-165`, `src/world/buildings/buildings.ts:44-46`
- [ ] **[A]** The shadow camera follows the target without texel snapping: shadow edges may crawl while moving (from code, not observed). `src/render/environment.ts:78-80`
- [ ] **[A]** A falling tree re-uploads whole instance buffers every frame for ~1.1 s; use `addUpdateRange`. `src/world/props/meshes.ts:217-224`
- [ ] **[A]** Adaptive resolution compares the frame time with 60 fps, not with the display rate: on a 30 Hz display (Safari Low Power Mode, TV) the scale drops to the minimum and shadow quality is lowered for the whole session. `src/render/adaptiveResolution.ts:36-57`
- [ ] **[A]** One main-thread hitch (round start, map upload) can count as GPU slowness and drop the scale. `src/render/adaptiveResolution.ts:36-45`
- [ ] **[A]** The frame pacer skips a frame periodically on displays slightly above 60 Hz (60.5 Hz: every 2 s, 61 Hz: every second). `src/render/framePacer.ts:12-17`
- [ ] **[A]** The full scene renders while nothing changes: 60 fps in a paused battle, 30 fps in the garage under a 90 % opaque overlay. `src/game/game.ts:363-382`
- [ ] **[A]** Every `resize` event re-renders all garage portrait cards (~13 WebGL renders per event); debounce. `src/hud/garage.ts:248-250,355-362`
- [ ] **[A]** Small per-frame HUD costs: `Array.from(ring.children)` (`src/hud/reticle.ts:129`), `tanks.filter` twice (`src/hud/statusPanel.ts:157`), popup styles written unconditionally (`src/hud/notifications.ts:99-105`).
- [ ] **[A]** Small per-frame garbage in the simulation: `hitBoxes` tuples (`src/combat/armor.ts:74-78`), `hullPose` closure and objects (`src/tank/suspension.ts:22,65`), `collideWithWorld` array (`src/tank/collisions.ts:23`), `resupplyAll` `.map` (`src/tank/ammo.ts:95`). Low priority: GC is 3 ms per 10 s.
- [ ] **[A]** Tank world matrices are updated twice per frame (`src/game/game.ts:332` and the renderer). Negligible.
- [ ] **[A]** Wheel geometry is built per tank instead of cached per shape (round-start cost only). `src/tank/tankView.ts:107`
- [ ] **[V]** The bundle is one 895 KB chunk (261 KB gzip); Vite warns about the size.

## 6. Audio

- [x] ~~**[A]** Audio is never suspended when the tab is hidden: engines and rain keep playing; suspend on `visibilitychange`. `src/fx/audio.ts:66-69`~~
- [ ] **[A]** A DelayNode (1.6 s buffer) per distant sound, one per rocket of a salvo; pass the lag to `noise()`/`partial()` instead. `src/fx/audio.ts:154-156`
- [ ] **[A]** Mute only zeroes the master gain: every node is still created and processed. `src/fx/audio.ts:458-466`
- [ ] **[A]** Engine graphs are re-automated every frame even when silent (~53 `setTargetAtTime` per frame in battle, 11 in the garage). `src/fx/engineSound.ts:188-209`, `src/fx/engineMix.ts:71-74`, `src/game/engineAudio.ts:46-49`
- [x] ~~**[A]** The audio context can stay suspended if the first key is not an activating gesture (Esc): keep the start listeners until the context runs. `src/fx/audio.ts:58-64`~~
- [ ] **[A]** One-shot audio chains are never disconnected (they rely on node GC). `src/fx/audio.ts:144-157`

## 7. Build and deploy

- [x] ~~**[V]** Deploy has a window with a broken site: `mirror --delete` removes the old bundles before the new `index.html` is uploaded (the comment claims the opposite). Mirror without `--delete`, put `index.html`, then delete. `.github/workflows/deploy.yml:62-63`~~
- [x] ~~**[V]** No favicon: every visit gets a 404 for `/favicon.ico`; an inline SVG data-URI icon keeps `public/` empty. `index.html`~~
- [x] ~~**[A]** `.htaccess`: hashed `.webp` files are not in the one-year cache rule. `public/.htaccess:10`~~
- [x] ~~**[A]** `.htaccess`: `Header set` is not wrapped in `IfModule mod_headers.c` (a 500 for the whole site without the module). `public/.htaccess:12`~~
- [x] ~~**[A]** `.htaccess`: DEFLATE lists `application/javascript` only; if the host serves `text/javascript` the bundle goes out uncompressed (check with `curl -I -H 'Accept-Encoding: gzip'`). `public/.htaccess:4`~~
- [ ] **[A]** FTP: certificate verification is off and the secrets are interpolated into a shell string (a password with `"`, `$` or a space breaks the step). `.github/workflows/deploy.yml:47,50`
- [x] ~~**[A]** A draft PR marked ready is not checked until the next push: add `ready_for_review` to the trigger types. `.github/workflows/checks.yml:3-15`~~

## 8. Docs and comments that disagree with the code

- [x] ~~**[A]** `docs/mechanics/tanks.md:61` gun elevation "−5…−8° / +16…+17°": the config has −5.7…−9.7° and +11.5…+22.9° (rockets up to +63°).~~
- [x] ~~**[A]** `docs/mechanics/tanks.md:44` "Roof 10–30 mm": the config ranges from 3 to 40 mm.~~
- [x] ~~**[A]** `docs/mechanics/combat.md:81` "30 % chance to knock off a track" by splash: the code uses `0.3 × closeness`. `src/combat/shells.ts:277`~~
- [ ] **[A]** `docs/mechanics/spotting-bots-match.md` says bots heading to a base fire on the move; they cannot (see Bots).
- [x] ~~**[A]** `src/config/combat.ts:8` comment says overmatch means "no slope bonus"; the code still applies 1/cos (`combat.md` is right).~~
- [ ] **[A]** `src/tank/suspension.ts:26-27` comment and the names `cL`/`cR` are swapped (the vector is the left one; the maths is consistent).

## Suggested order

1. Patch release of cheap, safe fixes: point-blank shots, bot throttle, reverse uphill, shake on pause, forfeit counted as survived, defend-the-base signal, stuck counter, deploy order, favicon, wheel material.
2. Bot behaviour: halt to shoot, back-off jitter, retreat, regrouping, hidden-target timer.
3. Map generation (changes every map and the previews): ship separately.
