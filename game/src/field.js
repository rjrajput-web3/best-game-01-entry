// The board: grid geometry, the gloom's road, and which cells can
// hold a prism. The road is fixed; decoration (grass, pebbles, stars)
// is seeded so every visit to the same seed looks the same.
import { BOARD, HEIGHT, KEEP_CELLS, WAYPOINT_CELLS, WIDTH } from './config.js';
import { createRandom, range } from './random.js';

export function cellCenter(col, row) {
  return {
    x: col * BOARD.cell + BOARD.cell / 2,
    y: BOARD.hudHeight + row * BOARD.cell + BOARD.cell / 2,
  };
}

export function cellFromPoint(x, y) {
  const col = Math.floor(x / BOARD.cell);
  const row = Math.floor((y - BOARD.hudHeight) / BOARD.cell);
  return { col, row };
}

export function inGrid(col, row) {
  return col >= 0 && col < BOARD.cols && row >= 0 && row < BOARD.rows;
}

function key(col, row) {
  return col + ',' + row;
}

// Walk each straight segment between waypoints and mark every cell
// the road passes through.
export function roadCells() {
  const cells = new Set();
  for (let i = 0; i < WAYPOINT_CELLS.length - 1; i++) {
    const [c0, r0] = WAYPOINT_CELLS[i];
    const [c1, r1] = WAYPOINT_CELLS[i + 1];
    const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
    for (let s = 0; s <= steps; s++) {
      const col = Math.round(c0 + ((c1 - c0) * s) / steps);
      const row = Math.round(r0 + ((r1 - r0) * s) / steps);
      if (inGrid(col, row)) cells.add(key(col, row));
    }
  }
  return cells;
}

export function keepCellSet() {
  return new Set(KEEP_CELLS.map(([c, r]) => key(c, r)));
}

export function waypoints() {
  return WAYPOINT_CELLS.map(([c, r]) => cellCenter(c, r));
}

export function keepAnchor() {
  // The lighthouse stands at the road's end, centred on the keep cells.
  return { x: WIDTH - 34, y: BOARD.hudHeight + 4 * BOARD.cell + BOARD.cell / 2 };
}

export function createField(seed) {
  const rng = createRandom(seed);
  const road = roadCells();
  const keep = keepCellSet();

  // Stars above the field, pebbles and grass tufts on buildable ground.
  const stars = [];
  for (let i = 0; i < 90; i++) {
    stars.push({
      x: rng() * WIDTH,
      y: rng() * (HEIGHT - 130),
      r: range(rng, 0.6, 1.8),
      twinkle: range(rng, 0.6, 2.4),
      phase: rng() * Math.PI * 2,
    });
  }
  const decor = [];
  for (let row = 0; row < BOARD.rows; row++) {
    for (let col = 0; col < BOARD.cols; col++) {
      const k = key(col, row);
      if (road.has(k) || keep.has(k)) continue;
      if (rng() < 0.42) {
        const c = cellCenter(col, row);
        decor.push({
          x: c.x + range(rng, -22, 22),
          y: c.y + range(rng, -20, 20),
          kind: rng() < 0.55 ? 'tuft' : 'pebble',
          size: range(rng, 3, 7),
          shade: range(rng, 0.7, 1.15),
        });
      }
    }
  }
  return { road, keep, stars, decor };
}

export function isBuildable(field, col, row) {
  if (!inGrid(col, row)) return false;
  const k = key(col, row);
  return !field.road.has(k) && !field.keep.has(k);
}
