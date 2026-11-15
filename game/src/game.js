// Lumen Keep's brain: the screens, the waves, the gold, the win and
// the loss. It owns the state render.js paints and answers the mouse
// and keyboard. One Game per run; restart builds a fresh one.
import {
  BEST_KEY,
  MAX_WAVE,
  START_GOLD,
  START_KEEP_HP,
  TOWERS,
  TOWER_ORDER,
  WAVES,
  towerStats,
  upgradeCost,
  waveClearBonus,
} from './config.js';
import { createAudio } from './audio.js';
import { createEnemy, resetEnemyIds, updateEnemy } from './enemies.js';
import { cellCenter, cellFromPoint, createField, inGrid, isBuildable, keepAnchor, waypoints } from './field.js';
import { createFx } from './particles.js';
import { createRenderer, towerPanelRect } from './render.js';
import { applyUpgrade, createTower, resetTowerIds, towerSellValue, towerUpgradeCost, updateProjectiles, updateTower } from './towers.js';

const BAR_Y = 632;

export function createGame(canvas, seed) {
  const audio = createAudio();
  const renderer = createRenderer(canvas);
  const field = createField(seed);
  const points = waypoints();
  const fx = createFx();
  resetEnemyIds();
  resetTowerIds();

  const game = {
    screen: 'title',
    phase: 'build', // 'build' between waves, 'wave' while one runs
    time: 0,
    seed,
    field,
    points,
    keepPos: keepAnchor(),
    fx,
    audio,
    towers: [],
    enemies: [],
    projectiles: [],
    spawnQueue: [],
    spawnTimer: 0,
    gold: START_GOLD,
    goldEarned: 0,
    keepHp: START_KEEP_HP,
    maxKeepHp: START_KEEP_HP,
    wave: 0,
    wavesCleared: 0,
    score: 0,
    kills: 0,
    best: readBest(),
    selectedBuild: null,
    selectedTower: null,
    hover: null,
    speed: 1,
    muted: false,
    sendWaveRect: { x: 636, y: BAR_Y + 8, w: 156, h: 56 },
    speedRect: { x: 800, y: BAR_Y + 8, w: 44, h: 56 },
    pauseRect: { x: 852, y: BAR_Y + 8, w: 44, h: 56 },
    muteRect: { x: 904, y: BAR_Y + 8, w: 44, h: 56 },
    upgradeRect: null,
    sellRect: null,
  };

  function readBest() {
    try {
      return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
    } catch {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      window.localStorage.setItem(BEST_KEY, String(value));
    } catch {
      // Storage off: the best score lasts this visit only.
    }
  }

  game.canBuildAt = function (col, row) {
    if (!isBuildable(field, col, row)) return false;
    return !game.towers.some((t) => t.col === col && t.row === row);
  };

  game.towerAt = function (col, row) {
    return game.towers.find((t) => t.col === col && t.row === row) ?? null;
  };

  Object.defineProperty(game, 'enemiesRemaining', {
    get() {
      return game.spawnQueue.length + game.enemies.filter((e) => !e.dead && !e.leaked).length;
    },
  });

  game.start = function () {
    if (game.screen !== 'title') return;
    game.screen = 'playing';
    audio.ensure();
    audio.startPad();
    fx.banner('Hold the light!', 'Build prisms, then send wave 1');
  };

  game.sendWave = function () {
    if (game.screen !== 'playing' || game.phase !== 'build') return;
    if (game.wave >= MAX_WAVE) return;
    game.wave += 1;
    game.phase = 'wave';
    game.selectedTower = null;
    const groups = WAVES[game.wave - 1];
    game.spawnQueue = [];
    for (const g of groups) {
      for (let i = 0; i < g.count; i++) {
        // Delay is relative: the gap after the previous spawn. The
        // first of a group waits a little longer (a breather).
        game.spawnQueue.push({ type: g.type, delay: i === 0 ? 1.2 : g.interval });
      }
    }
    game.spawnTimer = 0.6;
    audio.horn();
    fx.banner(`Wave ${game.wave}`, game.wave === MAX_WAVE ? 'The Gloom Herald comes…' : `${game.spawnQueue.filter((s) => s.type).length} wisps on the road`);
  };

  game.toggleSpeed = function () {
    game.speed = game.speed === 1 ? 2 : 1;
    audio.click();
  };

  game.togglePause = function () {
    if (game.screen === 'playing') {
      game.screen = 'paused';
    } else if (game.screen === 'paused') {
      game.screen = 'playing';
    }
    audio.click();
  };

  game.toggleMute = function () {
    game.muted = !game.muted;
    audio.setMuted(game.muted);
  };

  // Restart resets this same game object in place (fresh field, fresh
  // run) so the loop and the input handlers keep pointing at it.
  game.restart = function () {
    const seed = Math.floor(Math.random() * 4294967296);
    resetEnemyIds();
    resetTowerIds();
    game.screen = 'playing';
    game.phase = 'build';
    game.time = 0;
    game.seed = seed;
    game.field = createField(seed);
    game.points = waypoints();
    game.keepPos = keepAnchor();
    game.fx = createFx();
    game.towers = [];
    game.enemies = [];
    game.projectiles = [];
    game.spawnQueue = [];
    game.spawnTimer = 0;
    game.gold = START_GOLD;
    game.goldEarned = 0;
    game.keepHp = START_KEEP_HP;
    game.wave = 0;
    game.wavesCleared = 0;
    game.score = 0;
    game.kills = 0;
    game.selectedBuild = null;
    game.selectedTower = null;
    game.hover = null;
    game.speed = 1;
    game.upgradeRect = null;
    game.sellRect = null;
    game.audio.ensure();
    game.audio.startPad();
  };

  function endRun(win) {
    game.screen = win ? 'victory' : 'defeat';
    game.phase = 'build';
    if (win) {
      const bonus = game.keepHp * 25;
      game.score += bonus;
      audio.victory();
    } else {
      audio.defeat();
    }
    if (game.score > game.best) {
      game.best = game.score;
      saveBest(game.score);
    }
  }

  function clearWave() {
    const bonus = waveClearBonus(game.wave);
    game.gold += bonus;
    game.goldEarned += bonus;
    game.score += 50 * game.wave;
    game.wavesCleared = game.wave;
    fx.banner(`Wave ${game.wave} cleared!`, `+${bonus} gold bonus`);
    audio.upgrade();
    if (game.wave >= MAX_WAVE) {
      endRun(true);
    } else {
      game.phase = 'build';
    }
  }

  function buildAt(col, row) {
    const def = TOWERS[game.selectedBuild];
    if (!def) return;
    if (!game.canBuildAt(col, row)) {
      fx.goldText(cellCenter(col, row).x, cellCenter(col, row).y - 10, 'No room here');
      return;
    }
    if (game.gold < def.cost) {
      fx.goldText(cellCenter(col, row).x, cellCenter(col, row).y - 10, 'Not enough gold');
      audio.leak();
      return;
    }
    const c = cellCenter(col, row);
    game.gold -= def.cost;
    game.towers.push(createTower(def.key, col, row, c.x, c.y));
    audio.build();
    fx.ring(c.x, c.y, def.color);
  }

  function hitRect(rect, x, y) {
    return rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  game.click = function (x, y) {
    audio.ensure();
    if (game.screen === 'title') {
      game.start();
      return;
    }
    if (game.screen === 'victory' || game.screen === 'defeat') {
      game.restart();
      return;
    }
    if (hitRect(game.sendWaveRect, x, y)) {
      game.sendWave();
      return;
    }
    if (hitRect(game.speedRect, x, y)) {
      game.toggleSpeed();
      return;
    }
    if (hitRect(game.pauseRect, x, y)) {
      game.togglePause();
      return;
    }
    if (hitRect(game.muteRect, x, y)) {
      game.toggleMute();
      return;
    }
    if (game.screen === 'paused') return;
    if (game.selectedTower) {
      const panel = towerPanelRect(game.selectedTower);
      if (hitRect(game.upgradeRect, x, y) && hitRect(panel, x, y)) {
        const cost = towerUpgradeCost(game.selectedTower);
        if (cost !== null && game.gold >= cost) {
          game.gold -= cost;
          applyUpgrade(game.selectedTower);
          audio.upgrade();
          fx.ring(game.selectedTower.x, game.selectedTower.y, '#ffd166');
        } else if (cost !== null) {
          fx.goldText(game.selectedTower.x, game.selectedTower.y - 30, 'Not enough gold');
        }
        return;
      }
      if (hitRect(game.sellRect, x, y) && hitRect(panel, x, y)) {
        const value = towerSellValue(game.selectedTower);
        game.gold += value;
        game.towers = game.towers.filter((t) => t !== game.selectedTower);
        fx.goldText(game.selectedTower.x, game.selectedTower.y - 30, `+${value}g`);
        audio.coin();
        game.selectedTower = null;
        return;
      }
    }
    // Tower cards in the build bar.
    if (y >= BAR_Y) {
      for (let i = 0; i < TOWER_ORDER.length; i++) {
        const cx = 12 + i * 156;
        if (x >= cx && x <= cx + 148 && y >= BAR_Y + 8 && y <= BAR_Y + 64) {
          const key = TOWER_ORDER[i];
          game.selectedBuild = game.selectedBuild === key ? null : key;
          game.selectedTower = null;
          audio.click();
          return;
        }
      }
      return;
    }
    // The field itself.
    const { col, row } = cellFromPoint(x, y);
    if (!inGrid(col, row)) return;
    if (game.selectedBuild) {
      buildAt(col, row);
      return;
    }
    const tower = game.towerAt(col, row);
    game.selectedTower = tower;
    if (tower) audio.click();
  };

  game.key = function (code) {
    if (code === 'Enter' && game.screen === 'title') {
      game.start();
      return;
    }
    if ((code === 'KeyR' || code === 'Enter') && (game.screen === 'victory' || game.screen === 'defeat')) {
      game.restart();
      return;
    }
    if (code === 'KeyR' && game.screen === 'playing') {
      game.restart();
      return;
    }
    if (game.screen !== 'playing' && game.screen !== 'paused') return;
    if (code === 'Space') {
      game.sendWave();
    } else if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3') {
      const key = TOWER_ORDER[Number(code.slice(-1)) - 1];
      game.selectedBuild = game.selectedBuild === key ? null : key;
      game.selectedTower = null;
      audio.ensure();
      audio.click();
    } else if (code === 'Escape') {
      game.selectedBuild = null;
      game.selectedTower = null;
    } else if (code === 'KeyP') {
      game.togglePause();
    } else if (code === 'KeyF') {
      game.toggleSpeed();
    } else if (code === 'KeyM') {
      game.toggleMute();
    }
  };

  game.mouse = function (x, y) {
    const { col, row } = cellFromPoint(x, y);
    game.hover = {
      col,
      row,
      inField: inGrid(col, row) && y >= 56 && y < BAR_Y,
      x,
      y,
    };
  };

  game.update = function (dt) {
    game.time += dt;
    if (game.screen !== 'playing') {
      fx.update(dt);
      return;
    }
    const step = dt * game.speed;
    // Spawning: each queued entry waits its relative delay after the
    // previous spawn, then walks in at the road's start.
    if (game.phase === 'wave' && game.spawnQueue.length > 0) {
      game.spawnTimer -= step;
      while (game.spawnTimer <= 0 && game.spawnQueue.length > 0) {
        const next = game.spawnQueue.shift();
        game.enemies.push(createEnemy(next.type, game.wave, points));
        game.spawnTimer += next.delay;
      }
    }
    // Towers shoot.
    for (const tower of game.towers) {
      const fired = updateTower(tower, step, game.enemies, game.projectiles, game.time);
      if (fired === 'shoot') audio.shoot(tower.type);
    }
    game.projectiles = updateProjectiles(game.projectiles, step, game.enemies, fx, game.time);
    // Enemies walk; deaths and leaks settle here.
    for (const e of game.enemies) updateEnemy(e, step, points, game.time);
    for (const e of game.enemies) {
      if (e.dead) {
        game.gold += e.def.reward;
        game.goldEarned += e.def.reward;
        game.score += e.def.score;
        game.kills += 1;
        fx.pop(e.x, e.y, e.def.color);
        fx.goldText(e.x, e.y - 18, `+${e.def.reward}g`);
        audio.kill();
        audio.coin();
      } else if (e.leaked) {
        game.keepHp -= e.def.leak;
        fx.burst(game.keepPos.x - 20, game.keepPos.y, '#ff5d5d', 12);
        audio.leak();
        if (game.keepHp <= 0) {
          game.keepHp = 0;
          game.enemies = game.enemies.filter((x) => !x.leaked && !x.dead);
          endRun(false);
          fx.update(step);
          return;
        }
      }
    }
    game.enemies = game.enemies.filter((e) => !e.dead && !e.leaked);
    fx.update(step);
    // Wave done?
    if (game.phase === 'wave' && game.spawnQueue.length === 0 && game.enemies.length === 0) {
      clearWave();
    }
  };

  game.draw = function () {
    renderer.draw(game);
  };

  return game;
}
