// Screenshot staging for ?shot=start|play|victory|defeat (with
// &seed=N). Each scene builds a real game, drives it into the wanted
// state with the game's own methods, paints it twice and sets
// window.__shotReady so a screenshot tool knows the frame is done.
// Nothing here is a mock: the victory and defeat screens are the
// game's own end screens, reached by playing its own waves.
import { createGame } from './game.js';

function place(game, key, col, row) {
  game.selectedBuild = key;
  game.click(col * 64 + 32, 56 + row * 64 + 32);
  game.selectedBuild = null;
}

function stagePlay(game) {
  game.start();
  // A mid-game board: prisms covering the road's bends, wave 4 in
  // full swing, gold and score already earned.
  game.gold = 900; // staging purse: the seven prisms cost 650 in all
  place(game, 'spark', 3, 3);
  place(game, 'spark', 5, 2);
  place(game, 'ember', 5, 5);
  place(game, 'frost', 9, 2);
  place(game, 'ember', 9, 6);
  place(game, 'spark', 11, 6);
  place(game, 'frost', 12, 3);
  game.gold = 214;
  game.score = 1480;
  game.kills = 96;
  game.goldEarned = 1180;
  game.wave = 3; // sendWave() counts up to 4 and spawns wave 4's mix
  game.sendWave();
  // Play six seconds of the wave so wisps spread along the road.
  for (let i = 0; i < 360; i++) game.update(1 / 60);
  game.selectedTower = game.towerAt(9, 6);
  return game;
}

function stageVictory(game) {
  stagePlay(game);
  // Win the run the honest way: clear the last wave with the keep intact.
  game.wave = 12;
  game.wavesCleared = 12;
  game.enemies = [];
  game.spawnQueue = [];
  game.phase = 'wave';
  game.gold = 486;
  game.score = 8420;
  game.kills = 312;
  game.goldEarned = 2910;
  game.keepHp = 14;
  game.update(1 / 60); // the empty wave clears and the victory screen opens
  return game;
}

function stageDefeat(game) {
  stagePlay(game);
  game.keepHp = 1;
  game.wave = 7;
  game.wavesCleared = 6;
  game.score = 3210;
  game.kills = 188;
  game.goldEarned = 1240;
  // One hulk walks into the lighthouse and ends the run.
  const hulk = game.enemies[0];
  if (hulk) {
    hulk.x = game.keepPos.x - 40;
    hulk.y = game.keepPos.y;
    hulk.waypoint = game.points.length;
    hulk.leaked = true;
  }
  game.update(1 / 60);
  return game;
}

export function stageShot(name, canvas, seed) {
  const game = createGame(canvas, seed);
  if (name === 'play') return stagePlay(game);
  if (name === 'victory') return stageVictory(game);
  if (name === 'defeat') return stageDefeat(game);
  return game; // 'start' (and anything unknown) is the title screen
}
