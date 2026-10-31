# Steel Front — prototype (tanks-web-arena)

Team tank battles 7 × 7 in the spirit of World of Tanks: **USSR vs Germany**, 1943. Runs in the browser on **Three.js + Vite + TypeScript** with no external assets: the map, villages, ruined city, tanks and sound are all generated procedurally. The game UI is in Russian.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5181
npm run build    # tsc + vite build → dist/
```

## What's in the prototype

- **Modes**: two teams of 7 vehicles, no respawn, 6-minute rounds; a destroyed player spectates allies. **Standard** (each side has its own base), **Encounter** (one neutral base in the centre), **Assault** (one side defends a base and wins on the timer). Base capture speed depends on how many more attackers than defenders are in the circle (up to three tanks); with equal numbers the capture freezes. Points are not lost on leaving the circle or on being hit; they reset only when defenders alone remain in the circle. Every battle gets a new map; in the garage you can pick a named map and a mode.
- **900 × 900 m map**, new every battle. Five terrain types: central Russian mixed country, steppe with gullies and a railway, swamps with corduroy roads, a mountain pass with a ridge and saddles, a coast with sea on one flank. Eight named maps (Prokhorovka, Kursk Bulge, Polesia, The Pass, Kerch, Rzhev, Oryol, Malinovka). Weather and time of day: clear, overcast, dawn, dusk, fog, rain, snowfall; they change the light and fog as well as the view range of every vehicle. Four relief styles (hills, plain, ridges, valley), three seasons (summer, autumn with russet crowns, winter with snow and bare trees), ploughed fields, meadows, forests (trees fall under a tank; eight species — pine, spruce, linden, birch, oak, poplar, willow, apple — but only 2–3 of them per map plus apple trees in orchards), bushes (camouflage), mountains around the perimeter, a river with bridges and fords on roughly half of the maps, dirt roads between the bases. In the centre a ruined town or a factory district with workshops and a chimney; villages with a church, chapel or well, on some maps with two-storey brick houses, kolkhoz warehouses and a water tower, stone walls and orchards, isolated farmsteads, a windmill on a hill, concrete pillboxes near the lines, rows of Czech hedgehogs or dragon's teeth, tree-lined roads, rocks, haystacks, fences, earthwork revetments to fire from behind a berm, a railway on an embankment with freight trains. Every map gets its own set of features.
- **28 vehicles** in five classes. USSR — T-60, T-70, T-34-76, T-34-85, KV-1, KV-2, IS-2, SU-85, SU-100, SU-152, SU-76M, SU-122, BM-13 Katyusha; Germany — Pz. II F, Pz. II Luchs, Pz. III J, Pz. IV H, Panther D, Tiger I, KV-1 753(r) (captured KV-1), Marder III, StuG III G, StuH 42, Nashorn, Ferdinand, Wespe, Hummel, Panzerwerfer 42. Each has its own hit points, speed, armour per projection, gun, view range and camouflage; there are autocannons, derp guns with HE loaded by default, open-topped casemates and rocket artillery firing a salvo. Teams are matched by battle rating: both sides get the same classes, vehicles close to the player's, and the rating sums are balanced.
- **WoT-style armour**: front / side / rear / roof of hull and turret, impact angle, normalisation, ricochet from 70°, the three-calibre rule, ±25 % spread on penetration and damage.
- **Three shell types**: AP, APCR, HE with splash; ammunition is finite (sized by the vehicle's reload); standing on your own base refills shells and used repair kit, first aid kit and fire extinguisher. SPGs fire indirectly from a top-down view.
- **Weak zones**: lower glacis, thick gun mantlet, commander's cupola, side skirts (Schürzen) against HE; the reticle is coloured by the plate right under it.
- **Modules and crew**: track (immobilised), engine (half speed), turret ring (slow traverse), fire (extinguisher), gun damage — all fixed by the repair kit; ammo rack (damaged — longer reload, detonation — the turret is blown off). Wounded commander, gunner, driver and loader (view range, aiming, speed, reload) are healed by the first aid kit. Ramming.
- **Spotting**: view range × (1 − camouflage), line of sight through terrain and buildings, shared team spotting, a bush hides you completely (until you fire or an enemy comes within 50 m), forest helps, firing reveals you. Unspotted enemies are not drawn.
- **Reticle**: aiming, dispersion from moving, turning and firing; reticle colour by penetration chance under the cursor; a reload ring around the reticle (in arcade and sniper modes); a yellow gun marker shows where the shell would actually land if fired right now (the turret and barrel catch up with the reticle at a finite speed). Arcade camera, sniper mode with zoom, a WoT-style artillery "satellite" view: dispersion ellipse on the ground, flight trajectory, shell marker in the air, splash ring and a «Мимо» (Miss) label at the impact point.
- **Bots with roles and team play**: light tanks spot from bushes on high ground, one or two strike groups (mediums in front, heavies covering) advance along their lanes, wait for stragglers and fight for the centre, then push; scouts drive ahead and spot for the SPGs, hit tracks from the side and break off at once, and once the enemy thins out go to the rear to hunt the enemy SPG; TDs cover the group from high ground behind it, SPGs park on flat ground near the base and fire at spotted targets, stationary ones first. In combat — a position on high ground with a view of the target, falling back to cover after a shot; the whole team hunts the last enemy. Shell choice by target armour, hull angling, retreat on low HP.
- In-battle ribbons (penetration, critical hit, damage on spotting, armour, capture…), battle medals (Kolobanov, Warrior, Sniper, Steel Wall…), team signals for bots («Атакую!» Attacking!, «Нужна помощь!» Need help!, «Защищайте базу!» Defend the base!).
- Review of the last battle in the garage (whom and where you hit, who hit you), battle feed, hit log, scoreboard (Tab), minimap, hit direction indicator, particles and procedural sound with stereo panning, reload signal, sixth sense, pause on Esc. Flat "military" UI without gradients or blur: chamfered panels, condensed font, vehicle cards with stat bars.

## Controls

| Key             | Action                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------- |
| W / S           | throttle / reverse                                                                                  |
| A / D           | hull turn                                                                                           |
| Mouse           | aim (the turret follows the camera)                                                                 |
| LMB             | fire                                                                                                |
| RMB (hold)      | look around without disturbing the aim                                                              |
| Shift           | sniper mode (SPG — top-down view); the mouse wheel scrolled all the way in does the same            |
| Wheel           | zoom / camera distance; in top-down view — height, scrolling all the way out returns to arcade view |
| 1 / 2 / 3       | AP / APCR / HE                                                                                      |
| R / E / F       | repair kit (all modules) / first aid kit / fire extinguisher                                        |
| Q (hold)        | team signal menu: pick with the mouse, release Q to send                                            |
| T / G / B       | signals: Attacking! (target under the reticle or a point) / Need help! / Defend the base!           |
| V               | aircraft (in battle): mouse — heading, W / S — throttle, LMB or Space — bomb, V — back to the tank  |
| Tab / H / M / P | scoreboard / help / sound / fps                                                                     |
| Space           | after death — next ally                                                                             |
| Esc             | pause (release the mouse); click on the screen to continue                                          |

## Structure

```
src/
  main.ts               entry point: new Game(options from the URL).start()
  config/               all the numbers by area: vehicles (one file per vehicle — stats and look — in vehicles/ussr,
                        vehicles/germany), guns, shells, combat and spotting, bots, match, render and camera, world;
                        index.ts re-exports everything
  core/                 math (angles, axes, gaussian), noise (simplex, mulberry32), spatialGrid
  game/                 game.ts — loop and round lifecycle; playerController, combatFeedback (combat effects and
                        messages), messages (texts), match, capture (base capture), medals, teamSignals
                        (signals to bots), battleReport (battle review), spotting, world (map generation, garage
                        selection), testHooks
  render/               renderer, environment (sky, fog, sun), adaptiveResolution, geometryBuilder
  hud/                  hud.ts (facade) + garage, statusPanel, reticle, minimap, tankLabels, notifications,
                        scoreboard, ribbons, captureBar; dom.ts — element cache and write-on-change
  camera.ts, input.ts   camera (arcade / sniper / artillery), pointer lock and keys
  world/terrain/        terrain.ts (heights, biomes, queries), style (archetype, season, weather, mode), layout
                        (map layout), relief, river, railway, roadNetwork, smoothPath, mesh, palette, types
  world/props/          scatter, meshes (instances), props.ts (collisions and camouflage)
  world/buildings/      buildings.ts (colliders and queries), village, town, landmarks (bridges, pillboxes, windmill),
                        railway (tracks and wagons), revetments
  world/obb.ts          oriented bounding box: pushing, tracing
  tank/                 tank.ts (state, modules, firing), drive (movement), crew (crew, battle stats),
                        collisions, suspension, dispersion, ammo, hitBoxes,
                        tankView.ts + model/ (hull, turret, gun, markings, road wheels)
  combat/               armor (box hit, face, penetration), shells, ballistics, trace
  plane/                the player's aircraft: plane.ts (flight, bombs, sight, spotting), planeView.ts (model, sight ring)
  ai/                   bot.ts (core) + roles/ (light, medium, heavy, td, spg — class behaviour), team (team tactics),
                        fight (position and cover), positions, routes, targeting, gunner, steering, avoidance, lineOfFire
  fx/                   particles, groundMarks, particleShader, tankFx, artyView, audio, precipitation (rain and
                        snow)
docs/mechanics/         rules and numbers by area
```

## Development

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint (typescript-eslint, type-aware)
npm run lint:fix
npm run format      # Prettier: tabs (width 4), no semicolons, single quotes, 120 columns
npm run check       # typecheck + lint + format:check — run before committing
```

Test URL parameters: `?autostart&seed=N&tank=id&round=N&speed=K&view=top&debug`, plus `&map=classic|steppe|swamp|pass|coast`, `&mode=standard|encounter|assault`, `&weather=clear|overcast|dawn|dusk|fog|rain|snow` (see `src/game/testHooks.ts`).

## License

[MIT](LICENSE).
