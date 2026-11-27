# Tanks

Code: `src/tank/tank.ts`, model: `src/tank/tankView.ts` and `src/tank/model/`, stats and look: one file per vehicle in `src/config/vehicles/ussr/` and `src/config/vehicles/germany/` (listed in the nation's `index.ts`; the garage shows them by class — light, medium, heavy, TD, SPG — and by rating within a class, `tanksOf`)

## Vehicles

| Vehicle         | Class  | HP   | Speed   | Armour hull / turret (front/side/rear) | Gun                                                        | Penetration / damage / reload | View range | Camouflage |
| --------------- | ------ | ---- | ------- | -------------------------------------- | ---------------------------------------------------------- | ----------------------------- | ---------- | ---------- |
| T-70            | light  | 420  | 47 km/h | 50/25/20 · 45/30/25                    | 45 mm                                                      | 62 / 55 / 2.4 s               | 400        | 0.28       |
| T-34-85         | medium | 760  | 54      | 95/55/45 · 90/75/52                    | 85 mm                                                      | 128 / 185 / 5.6               | 380        | 0.16       |
| IS-2            | heavy  | 1250 | 36      | 155/90/60 · 110/95/90                  | 122 mm                                                     | 178 / 390 / 11.5              | 350        | 0.07       |
| SU-100          | TD     | 820  | 47      | 110/45/45 (casemate)                   | 100 mm, ±9°                                                | 178 / 300 / 7.5               | 370        | 0.30       |
| SU-122          | SPG    | 480  | 40      | 60/45/40                               | 122 mm howitzer, ±10°                                      | 50 (HE) / 450 / 14            | 300        | 0.20       |
| Pz. II Luchs    | light  | 400  | 58      | 35/25/20 · 35/25/20                    | 50 mm                                                      | 72 / 70 / 2.7                 | 410        | 0.26       |
| Pz. IV H        | medium | 720  | 41      | 85/35/25 · 55/35/30                    | 75 mm                                                      | 118 / 140 / 4.3               | 390        | 0.14       |
| Tiger I         | heavy  | 1200 | 38      | 105/82/82 · 110/82/82                  | 88 mm                                                      | 150 / 245 / 7.2               | 370        | 0.06       |
| KV-1 753(r)     | heavy  | 1100 | 31      | 95/75/70 · 95/75/75                    | 75 mm KwK 40 L/48 (captured KV-1)                          | 118 / 140 / 4.4               | 350        | 0.07       |
| StuG III G      | TD     | 780  | 40      | 95/35/30 (casemate)                    | 75 mm, ±10°                                                | 118 / 140 / 4.0               | 370        | 0.32       |
| Hummel          | SPG    | 450  | 40      | 40/25/20, open casemate                | 150 mm howitzer, ±8°                                       | 55 (HE) / 620 / 18            | 300        | 0.20       |
| T-60            | light  | 340  | 43      | 35/15/15 · 25/15/15                    | 20 mm autocannon                                           | 35 / 14 / 0.55                | 390        | 0.34       |
| T-34-76         | medium | 680  | 54      | 95/55/45 · 70/60/50                    | 76 mm                                                      | 86 / 115 / 3.9                | 370        | 0.18       |
| KV-1            | heavy  | 1100 | 31      | 95/75/70 · 95/75/75                    | 76 mm                                                      | 90 / 115 / 4.2                | 340        | 0.07       |
| KV-2            | heavy  | 1150 | 27      | 95/75/70 · 75/75/70                    | 152 mm, HE by default, splash 5 m                          | 75 / 700 / 20                 | 330        | 0.04       |
| SU-85           | TD     | 760  | 49      | 95/45/45 (casemate)                    | 85 mm, ±10°                                                | 128 / 185 / 5.2               | 360        | 0.31       |
| SU-76M          | SPG    | 380  | 47      | 35/15/15, open casemate                | 76 mm howitzer, ±15°, splash 4 m                           | 40 (HE) / 250 / 5.5           | 300        | 0.26       |
| SU-152          | TD     | 950  | 34      | 75/60/60 (casemate)                    | 152 mm, ±10°, splash 5 m                                   | 125 / 700 / 16                | 340        | 0.20       |
| Pz. II F        | light  | 330  | 40      | 35/20/15 · 30/15/15                    | 20 mm autocannon                                           | 35 / 14 / 0.55                | 380        | 0.32       |
| Pz. III J       | medium | 560  | 50      | 60/30/30 · 55/30/30                    | 50 mm L/60                                                 | 85 / 70 / 2.4                 | 380        | 0.20       |
| Panther D       | medium | 1000 | 47      | 135/45/40 · 100/45/45                  | 75 mm L/70                                                 | 170 / 140 / 5.0               | 390        | 0.10       |
| Marder III      | TD     | 420  | 43      | 25/12/10, open casemate                | 76 mm Pak 36(r), ±16°                                      | 125 / 160 / 5.0               | 370        | 0.36       |
| Nashorn         | TD     | 620  | 43      | 30/20/20, open casemate                | 88 mm L/71, ±15°                                           | 200 / 245 / 7.5               | 380        | 0.30       |
| Ferdinand       | TD     | 1400 | 25      | 200/80/80 (casemate)                   | 88 mm L/71, ±14°                                           | 200 / 245 / 7.2               | 350        | 0.05       |
| Wespe           | SPG    | 380  | 45      | 30/15/10, open casemate                | 105 mm howitzer, ±17°                                      | 45 (HE) / 380 / 10            | 300        | 0.24       |
| StuH 42         | TD     | 760  | 40      | 80/30/30 (casemate)                    | 105 mm, HE by default, splash 4 m, ±10°                    | 64 / 380 / 9                  | 360        | 0.30       |
| BM-13 Katyusha  | SPG    | 300  | 58      | 10/8/8, ZiS-6 truck                    | 16 × 132 mm rockets, ±10°                                  | 30 (HE) / 130 × 16 / 28       | 320        | 0.22       |
| Panzerwerfer 42 | SPG    | 320  | 50      | 10/8/8, half-track                     | 10 × 150 mm Nebelwerfer, ±13°                              | 30 (HE) / 200 × 10 / 32       | 320        | 0.22       |
| ISU-152         | TD     | 1300 | 35      | 120/90/60 (casemate)                   | 152 mm, ±10°, splash 5 m                                   | 135 / 700 / 14.5              | 340        | 0.12       |
| Sturmtiger      | TD     | 1300 | 32      | 150/82/82, casemate 200/82/82          | 380 mm rocket mortar, HE only, 10 rounds, splash 8 m, ±10° | 170 / 1050 / 20               | 330        | 0.04       |
| M4A2 Sherman    | medium | 720  | 45      | 90/38/38 · 88/51/51                    | 75 mm M3 (Lend-Lease)                                      | 90 / 115 / 3.6                | 380        | 0.12       |
| SU-57           | TD     | 300  | 58      | 13/7/7, open half-track                | 57 mm (Lend-Lease T48), ±26°                               | 112 / 90 / 2.9                | 370        | 0.30       |

Gun types: regular (AP by default), SPG howitzers (`howitzer`: indirect fire, top-down view), "derp guns" (`derp`: direct fire, HE by default), autocannons (`bloomShot` 0.35: a burst barely opens up the reticle) and rocket launchers (`salvo`: one press launches a series of rockets at 0.1 s intervals along the current position of the rails, each with its own dispersion; HE only; howitzer ballistics) and the rocket mortar (`mortar`, the Sturmtiger: see below). The team composition is picked by roles, the vehicle within a role is chosen at random.

Armour is given "effective" against a vertical plate: the slope of the front plates of the T-34, IS-2 and SU-100 is already included in the number. Roof 3–40 mm (rocket trucks to the Sturmtiger) — for splash and indirect fire.

Rocket mortar (`gun.mortar`, numbers in `MORTAR`): direct fire with a slow rocket-assisted HE round (153 m/s, a visible arc and a smoke trail; the aim readout shows the flight time). HE only, 10 rounds. The round is loaded at a halt: faster than 1 m/s the loading runs at ×0.4, the reload ring turns red and the readout says «ЗАРЯЖАНИЕ ТОЛЬКО НА МЕСТЕ» (loading only at a halt). The burst is a shock wave: within the blast radius a track is knocked off with a chance of 0.9 × closeness and a crew member is concussed with 0.6 × closeness, even when the roof armour took all the splash damage; trees, haystacks and fences within 1.3 × the radius go down.

## Movement

- Throttle W/S: target speed = `speed · surface · slope`, acceleration `accel` (braking ×2.2). Surfaces: road 1.15, field/meadow 1, forest 0.85, ruins 0.75, mud by the river 0.6, ford 0.35; deeper than 1.3 m — a wall.
- Climbing: −4.5 % speed per degree; a slope steeper than 31° — a wall. The slope also stops reversing.
- Houses, walls, rocks, tree trunks: the hull is pushed outward and slides along the obstacle; the speed is damped proportionally to cos² of the angle between the heading and the normal (×4 1/s), so at a tangent the tank drives almost without losing speed, while head-on it stops against it.
- Hull turn `hullTurn` rad/s, ×0.65 at full speed; in reverse the steering is mirrored. A knocked-off track — no driving, no turning.
- Suspension: each track is sampled at five points along its length (±0.4 L), a line is fitted through them; pitch is the average slope of the two lines, roll is the difference of their heights at the centre (limited to ±34°), hull height is the average of the two tracks, but not lower than the ground under the centre − 0.15 m. Smoothed over time (14/s). The bridge deck counts only when the hull centre is on it (then the support is flat). Road wheels spin by the distance travelled.
- Collisions: houses and rocks (OBB/circles) push out at three hull points; tanks are circles with mass = HP; trees fall at speed ≥ 2.5 m/s (slowdown 0.7), slower — the trunk simply stops the tank, haystacks are crushed, fences are flattened.

## Turret and gun

- The turret target is the aim point (for the player — the camera ray through the screen centre; while RMB is held, the aim is kept and «обзор» (look around) lights up under the reticle). The turret traverses at `turretTurn`.
- Turretless vehicles: sector `±arc`; if the target is outside the sector and there is no manual steering, the hull turns itself.
- Depression −3…−10° on direct-fire guns, elevation +11…+23°; howitzers up to +69°, rocket rails +3…+63°. Speed 1.5 rad/s.

## Model (`tankView.ts`, `src/tank/model/`)

Each vehicle describes its look in its own file, in `shape`. The top-level dimensions (`hullL/W/H`, `tW/tL/tH/tZ`, `trackH`) are also the hitboxes; the rest affects only the look. Model coordinate system: +z forward, +y up, +x — left side.

- `hullLook` — hull: side profile `outline` (normalised: z 0 = rear … 1 = nose, y 0 = fender line … 1 = roof), `roofW` — narrowing towards the roof for sloped sides (T-34, Panther), `lowerNose` — lower glacis between the tracks, `drums` — external fuel tanks, `spareTracks` — spare track links on the front, `skirts` — side skirts, `bowMg` — a ball-mounted machine gun in the front plate.
- `turretLook` — turret or casemate: `welded` (a profile extruded across the width with side slope `roofW`) or `round` (cast/faceted, `facets` faces: 6 — the T-34 "nut", 8 — T-60, 12 — cast), `bustle` — rear bustle, `x` — turret ring offset (T-60/T-70 — to the left), `cupola` — commander's cupola, `twinHatches` — two hatches, `stowage` — a box on the turret rear, `skirts` — turret side skirts (Pz. IV H), `sideTracks` — track links on the turret sides (Tiger), `mountY` — trunnion height.
- `gunLook` — mantlet (`box`, `round`, `ball`, `saukopf`, `shield`), muzzle brake (`none`, `single`, `double`, `multi`), `sleeve` — recoil system sleeve.
- `running` — running gear: `tracks`, `halftrack` or `truck`; number and radius of road wheels, `layout` (`even`, `paired` — bogies of the Pz. IV and Ferdinand, `interleaved` — staggered on the Tiger, Panther, Luchs), return rollers, drive sprocket at the front (Germans, T-60/70, SU-76) or at the rear (T-34, KV, IS, Ferdinand), truck axles.
- The upper hull is drawn from the fender line, the roof is at height `trackH·0.72 + hullH`; the upper run of the track with its rollers is visible. The track band is a profile around the idler, the drive sprocket and the road wheels.
- On TDs and SPGs the casemate is part of the hull, only the gun turns (within the `arc` sector) around its mantlet; on turreted vehicles the whole turret turns.
- Details are placed by rule from the outline, so every vehicle gets them: the driver's visor (a hatch in a sloped Soviet glacis) and the bow machine gun on the front plate, crew hatches with periscopes on the roof ahead of the turret, the engine deck with grilles behind it (ahead of a rear casemate), a muffler drum (Germany) or two pipes and a transmission hatch (USSR) on the rear plate, mud flaps, tools and a tow cable on the sides, headlights, antenna, tow hooks. The turret roof carries the cupola with vision slits or hatches, periscopes, a ventilator and lifting eyes; the gun has a stepped barrel, a dark bore and a coaxial machine gun.
- Paint (`TANK_PAINT` in `config/fx.ts`, textures in `model/textures.ts`): one tiling texture per nation and season, generated once and shared by all tanks. 4BO (USSR) / dunkelgelb with sprayed green and brown patches (Germany), in winter worn whitewash over it; fading, rain streaks and chips are in the texture. Parts get texture coordinates by box projection (metres), so the texture lies on every plate without stretching. A second shared texture gives the surface relief and roughness. Vertex colour alpha is the paint mask: only painted parts take the paint texture, tyres, tools, glass and markings keep their plain colour. Dust (summer), mud (autumn) or slush (winter) is a vertex tint that fades out with height.
- Markings: Balkenkreuz on the hull and turret (on the Tiger — hull only), a red star on the turret or casemate (on the T-34-76 with the faceted turret — on the hull side).
- Tracks (`model/tracks.ts`): both bands are one mesh with a link texture along the belt; the texture runs with each track separately (the outer track of a turn runs further), the road wheels of each side turn with it.
- Everything static is three meshes (hull with casemate, turret, gun) and one material per tank, plus the tracks mesh with its own material; road wheels are a single InstancedMesh (tyre, dished disc with a hub cap and a ring of holes). About 2500–4000 triangles and 5 draw calls per vehicle. Wrecks — dark colour, turret tilted.

## Sound (`src/fx/audio.ts`, `src/fx/engineSound.ts`, voices in `src/config/sound.ts`)

Everything is synthesised in the browser, there are no audio files.

- Engine: every vehicle names its engine in `engine` (`ENGINES`: V-2 diesel of the T-34, the heavier V-2 of the KV and IS, GAZ and Maybach sixes, Maybach HL 120 and HL 230 V12, the petrol-electric Ferdinand, lorry engines). A voice is the firing frequency at idle and at full revs, the diesel knock, how unevenly the cylinders fire, the resonances of the exhaust and hull, the gear whine and the number of gears. The exhaust note is a short loop of firing pulses played at the engine's revs; the revs climb through each gear and drop on the shift.
- Running gear: track clatter at the link rate and squeal in a turn, each with the level and pitch of the vehicle's tracks (the T-34 clatters, the Tiger and Panther squeal; a lorry has none). The turret traverse hums while the turret turns.
- Other vehicles: the three nearest running engines within 140 m are heard, quieter and duller with distance and panned by their bearing (`ENGINE_MIX`). Only vehicles drawn on screen sound, so an unspotted enemy cannot be heard.
- Guns (`GUN_SOUND`): a shot is voiced from the gun itself. Calibre sets the pitch and the length of the blast, muzzle velocity the supersonic crack (sharp on long guns, almost none on howitzers), a muzzle brake adds a harsh bark, autocannons under 30 mm give a short dry report. In the player's own tank the breech clanks, the barrel rings and the spent case drops on the floor.
- Distance: shots, rockets and explosions are heard late, at 340 m/s (at most 1.6 s); hit sounds on armour are not delayed.
