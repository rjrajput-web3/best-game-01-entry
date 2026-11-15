# Lumen Keep

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/rjrajput-web3/best-game-01-entry/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/rjrajput-web3/best-game-01-entry/reward.svg)](https://make.fun/bounty/best-game-01)

Lumen Keep is a tower-defence game about the last lighthouse: build light prisms along the gloom's winding road, stop the wisps before they reach the keep, and survive all 12 waves — including the Gloom Herald. Three prism types (fast Spark, bursting Ember, slowing Frost), upgrades, selling, wave bonuses, a boss, synthesized sound and a full title / play / victory / defeat loop.

## Play it

Open `game/index.html` in a desktop browser — the game is plain static files and plays with zero network requests.

- Click a prism card (or press `1` / `2` / `3`), then click a field cell to build.
- `Space` sends the next wave, `P` pauses, `F` fast-forwards, `M` toggles sound, `R` restarts, `Esc` cancels.
- Click a placed prism to upgrade it or sell it back.

## Run it locally

Serve the `game/` folder with any static server and open it, for example:

```sh
python3 -m http.server --directory game 8080
```

then open http://localhost:8080 in desktop Chrome.

## Entry

This repository is an entry in the [best-game-01 competition on make.fun](https://make.fun/bounty/best-game-01). `main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots in `screenshots/` are real renders of the game in a browser (title, play, victory, defeat), staged with `?shot=start|play|victory|defeat&seed=7` as recorded in `shots.json`.

## Optional: earn referral rewards, a second way to make money

Winning a competition is one way to earn on make.fun. Referring is another: sign up through [my referral link](https://make.fun/r/hzsbvtpc) and build entries of your own.
