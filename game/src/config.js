// Lumen Keep — all tuning in one place: board size, tower and enemy
// definitions, the twelve waves, economy and scoring. Nothing here
// touches the canvas; game.js reads these tables to run the game.
export const BOARD = {
  cols: 15,
  rows: 9,
  cell: 64,
  hudHeight: 56,
  barHeight: 72,
};
export const WIDTH = BOARD.cols * BOARD.cell; // 960
export const HEIGHT = BOARD.hudHeight + BOARD.rows * BOARD.cell + BOARD.barHeight; // 704

export const START_GOLD = 160;
export const START_KEEP_HP = 20;
export const MAX_WAVE = 12;
export const SELL_REFUND = 0.7;
export const MAX_TOWER_LEVEL = 3;

// The gloom's road across the board, in grid cells. It enters off the
// left edge, snakes through the field and ends at the lighthouse keep
// on the right edge. Waypoints are cell centres; the road is drawn
// between them.
export const WAYPOINT_CELLS = [
  [-1, 4],
  [4, 4],
  [4, 1],
  [10, 1],
  [10, 7],
  [13, 7],
  [13, 4],
  [15, 4],
];

// Cells the lighthouse keep occupies; never buildable, never road.
export const KEEP_CELLS = [
  [14, 3],
  [14, 4],
  [14, 5],
];

export const TOWERS = {
  spark: {
    key: 'spark',
    name: 'Spark Prism',
    short: 'Spark',
    cost: 50,
    range: 115,
    damage: 9,
    rate: 2.5, // shots per second
    projectileSpeed: 430,
    splash: 0,
    slowFactor: 1, // no slow
    slowDuration: 0,
    color: '#ffd166',
    glow: '#ffea9e',
    blurb: 'Fast bolts of light. Cheap and cheerful.',
  },
  ember: {
    key: 'ember',
    name: 'Ember Lens',
    short: 'Ember',
    cost: 100,
    range: 96,
    damage: 28,
    rate: 0.8,
    projectileSpeed: 310,
    splash: 56, // px radius of the blast
    slowFactor: 1,
    slowDuration: 0,
    color: '#ff7b54',
    glow: '#ffb199',
    blurb: 'Slow, heavy fireballs that burst on impact.',
  },
  frost: {
    key: 'frost',
    name: 'Frost Shard',
    short: 'Frost',
    cost: 150,
    range: 165,
    damage: 6,
    rate: 1.1,
    projectileSpeed: 390,
    splash: 0,
    slowFactor: 0.5, // enemies move at half speed while chilled
    slowDuration: 1.6,
    color: '#7fe7ff',
    glow: '#c8f6ff',
    blurb: 'Chills the gloom, slowing it to half speed.',
  },
};
export const TOWER_ORDER = ['spark', 'ember', 'frost'];

export function towerStats(def, level) {
  // Level 1 is the base card. Each level adds 60% damage and 12 px range.
  return {
    damage: Math.round(def.damage * Math.pow(1.6, level - 1)),
    range: def.range + (level - 1) * 12,
    rate: def.rate,
  };
}

export function upgradeCost(def, level) {
  // Cost to go from `level` to `level + 1`.
  return Math.round(def.cost * 0.7 * level);
}

export const ENEMIES = {
  mote: {
    key: 'mote',
    name: 'Gloom Mote',
    hp: 22,
    speed: 58,
    reward: 6,
    radius: 11,
    leak: 1, // keep HP lost if it reaches the lighthouse
    score: 10,
    color: '#b388ff',
    core: '#e9dcff',
  },
  dart: {
    key: 'dart',
    name: 'Gloom Dart',
    hp: 30,
    speed: 88,
    reward: 12,
    radius: 10,
    leak: 1,
    score: 15,
    color: '#ff5d8f',
    core: '#ffd3e2',
  },
  wisp: {
    key: 'wisp',
    name: 'Gloom Wisp',
    hp: 55,
    speed: 46,
    reward: 10,
    radius: 13,
    leak: 1,
    score: 15,
    color: '#8affc1',
    core: '#dcffe9',
  },
  hulk: {
    key: 'hulk',
    name: 'Gloom Hulk',
    hp: 190,
    speed: 30,
    reward: 22,
    radius: 18,
    leak: 2,
    score: 25,
    color: '#ff9f43',
    core: '#ffe3c2',
  },
  herald: {
    key: 'herald',
    name: 'Gloom Herald',
    hp: 2200, // flat: the boss never takes the wave HP scale
    speed: 24,
    reward: 250,
    radius: 30,
    leak: 10,
    score: 500,
    color: '#e63946',
    core: '#ffb3b8',
    boss: true,
  },
};

// One wave is a list of groups; groups spawn one after another, each
// enemy `interval` seconds after the previous one in its group.
export const WAVES = [
  [{ type: 'mote', count: 8, interval: 0.9 }],
  [
    { type: 'mote', count: 10, interval: 0.8 },
    { type: 'dart', count: 4, interval: 0.7 },
  ],
  [
    { type: 'mote', count: 10, interval: 0.7 },
    { type: 'wisp', count: 6, interval: 0.9 },
  ],
  [
    { type: 'wisp', count: 10, interval: 0.8 },
    { type: 'dart', count: 6, interval: 0.6 },
  ],
  [
    { type: 'hulk', count: 3, interval: 1.4 },
    { type: 'mote', count: 12, interval: 0.6 },
  ],
  [
    { type: 'dart', count: 12, interval: 0.55 },
    { type: 'wisp', count: 8, interval: 0.8 },
  ],
  [
    { type: 'hulk', count: 5, interval: 1.2 },
    { type: 'wisp', count: 10, interval: 0.7 },
  ],
  [
    { type: 'dart', count: 16, interval: 0.5 },
    { type: 'mote', count: 14, interval: 0.55 },
  ],
  [
    { type: 'hulk', count: 7, interval: 1.1 },
    { type: 'wisp', count: 12, interval: 0.65 },
    { type: 'dart', count: 10, interval: 0.5 },
  ],
  [
    { type: 'hulk', count: 9, interval: 1.0 },
    { type: 'dart', count: 14, interval: 0.5 },
    { type: 'wisp', count: 12, interval: 0.6 },
  ],
  [
    { type: 'hulk', count: 10, interval: 0.9 },
    { type: 'wisp', count: 16, interval: 0.55 },
    { type: 'dart', count: 16, interval: 0.45 },
    { type: 'mote', count: 20, interval: 0.45 },
  ],
  [
    { type: 'herald', count: 1, interval: 1 },
    { type: 'hulk', count: 6, interval: 1.2 },
    { type: 'wisp', count: 10, interval: 0.6 },
  ],
];

export function waveHpScale(wave) {
  return Math.pow(1.13, wave - 1);
}

export function waveClearBonus(wave) {
  return 20 + 10 * wave;
}

export const BEST_KEY = 'lumen-keep-best';
