# Gameplay roadmap (TODO)

Deferred (discussion of 2026-11-19). Nothing here is implemented: these are the mechanics we agreed to add later, with the decisions already made and the questions still open. Numbers are drafts to calibrate in play. Growth between battles builds on the career plan in `TODO-progression.md`.

## 1. Crew levelling and skills

The main growth between battles. Goal: a real choice between a light tank with a veteran crew and a heavy tank with rookies.

Decided:

- Every crew member (commander, gunner, driver, loader) levels up on their own, up to **level 30**.
- Each level gives one point. The player spends it on **one of three parameters**, and each member has their own three.
- The crew belongs to a vehicle, so every tank ends up with its own crew build.

Draft parameters (to be confirmed):

| Member    | Parameter 1            | Parameter 2               | Parameter 3                     |
| --------- | ---------------------- | ------------------------- | ------------------------------- |
| Commander | view range             | sixth sense reacts sooner | camouflage                      |
| Gunner    | aim time               | dispersion                | chance to damage a module       |
| Driver    | speed and acceleration | hull turn                 | speed on soft ground and slopes |
| Loader    | reload                 | shell swap time           | ammo rack protection            |

Open questions:

- Size of one point and whether a parameter has a cap (30 points into one parameter must not break the balance).
- What the crew earns experience for: the battle as a whole, or each member for their own work (the gunner for hits, the commander for spotting).
- Moving a crew to another vehicle: allowed, allowed with a penalty, or not at all.
- Resetting spent points.
- Whether bot crews have levels, so that the matchmaker can weigh a veteran crew against a heavier vehicle.
- How a wounded member (already in the game) combines with their bonuses.

## 2. Vehicle modules and equipment

Growth between battles, second part.

- **Modules**: stock and top gun, turret, engine, tracks, researched with experience in the vehicle's tree (the next step of `TODO-progression.md`). A freshly bought tank starts stock.
- **Equipment**: a few slots per vehicle (three as a draft), bought with credits. One vehicle can be built as a sniper or as a brawler. Draft list: gun rammer (reload), ventilation (a little of everything), coated optics (view range), spall liner (less splash and crew wounds), reinforced suspension (tracks, soft ground), camouflage net (concealment while standing).

Open questions: the number of slots by tier, whether equipment can be removed for free, prices.

## 3. Bot characters and the enemy team's plan

Makes battles differ from one another: the player should not know in advance how the enemy will answer.

- **Characters**: besides skill, every bot gets a temperament, for example cautious, aggressive, ambusher. It shifts what the bot already does: how far it pushes, when it falls back, how long it holds a position, whether it shoots first or waits.
- **Team plan per battle**: each side rolls a plan for the whole battle, not only the lanes of its strike groups as now. Draft plans: rush one flank, hold and counter-attack, go for the base, hunt the scouts first.

Open questions: whether the player's own team shows its plan before the battle (a line in the countdown), and how plans depend on the map and the mode.

## 4. Smoke grenades

A choice inside the battle. A consumable that lays a smoke screen for a short time; it blocks spotting and the line of sight for both sides, so it covers a retreat or a dash across open ground.

Open questions: how many per battle, which vehicle classes carry them, whether bots use them, how smoke interacts with artillery view.

## Not decided

- **Events on the map** (reinforcements, weather changing mid-battle, a supply crate in the middle): needs more thought, not planned yet.
