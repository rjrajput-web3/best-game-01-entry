// Prisms and their shots. A tower picks the enemy furthest along
// the road inside its range, fires on its own clock, and its bolt
// homes in on the target. Ember bolts burst; Frost bolts chill.
import { MAX_TOWER_LEVEL, TOWERS, towerStats, upgradeCost } from './config.js';
import { chillEnemy, damageEnemy } from './enemies.js';
import { distanceSq } from './random.js';

let nextTowerId = 1;

export function createTower(type, col, row, x, y) {
  const def = TOWERS[type];
  return {
    id: nextTowerId++,
    type,
    def,
    col,
    row,
    x,
    y,
    level: 1,
    invested: def.cost, // gold sunk into this tower (for the sell price)
    cooldown: 0,
    aim: -Math.PI / 2, // barrel angle, radians
    flash: 0, // muzzle flash timer
  };
}

export function towerSellValue(tower) {
  return Math.floor(tower.invested * 0.7);
}

export function towerUpgradeCost(tower) {
  if (tower.level >= MAX_TOWER_LEVEL) return null;
  return upgradeCost(tower.def, tower.level);
}

export function applyUpgrade(tower) {
  const cost = towerUpgradeCost(tower);
  if (cost === null) return false;
  tower.invested += cost;
  tower.level += 1;
  return true;
}

// Furthest along the road = the one closest to leaking. Ties break by
// lowest HP so a tower finishes off a wounded wisp first.
export function pickTarget(tower, enemies) {
  const stats = towerStats(tower.def, tower.level);
  const rangeSq = stats.range * stats.range;
  let best = null;
  let bestScore = -1;
  for (const e of enemies) {
    if (e.dead || e.leaked) continue;
    if (distanceSq(tower.x, tower.y, e.x, e.y) > rangeSq) continue;
    const score = e.waypoint * 1000 - e.hp;
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

export function updateTower(tower, dt, enemies, projectiles, now) {
  const stats = towerStats(tower.def, tower.level);
  if (tower.cooldown > 0) tower.cooldown -= dt;
  if (tower.flash > 0) tower.flash -= dt;
  const target = pickTarget(tower, enemies);
  if (target) {
    tower.aim = Math.atan2(target.y - tower.y, target.x - tower.x);
    if (tower.cooldown <= 0) {
      tower.cooldown = 1 / stats.rate;
      tower.flash = 0.08;
      projectiles.push({
        x: tower.x + Math.cos(tower.aim) * 18,
        y: tower.y + Math.sin(tower.aim) * 18,
        target,
        tower,
        speed: tower.def.projectileSpeed,
        damage: stats.damage,
        splash: tower.def.splash,
        slowFactor: tower.def.slowFactor,
        slowDuration: tower.def.slowDuration,
        color: tower.def.color,
        alive: true,
      });
      return 'shoot';
    }
  }
  return null;
}

export function updateProjectiles(projectiles, dt, enemies, fx, now) {
  for (const p of projectiles) {
    if (!p.alive) continue;
    if (!p.target || p.target.dead || p.target.leaked) {
      // The target is gone: the bolt flies on and fizzles at its last spot.
      p.alive = false;
      fx.sparks(p.x, p.y, p.color, 4);
      continue;
    }
    const dx = p.target.x - p.x;
    const dy = p.target.y - p.y;
    const dist = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (dist <= step + p.target.radius * 0.5) {
      p.alive = false;
      hitTarget(p, enemies, fx, now);
    } else {
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
    }
  }
  return projectiles.filter((p) => p.alive);
}

function hitTarget(p, enemies, fx, now) {
  const target = p.target;
  if (p.splash > 0) {
    fx.burst(p.x, p.y, p.color, 10);
    const rSq = p.splash * p.splash;
    for (const e of enemies) {
      if (e.dead || e.leaked) continue;
      if (distanceSq(p.x, p.y, e.x, e.y) <= rSq) {
        damageEnemy(e, p.damage, now);
      }
    }
  } else {
    fx.sparks(p.x, p.y, p.color, 5);
    if (p.slowFactor < 1) {
      chillEnemy(target, p.slowFactor, p.slowDuration, now);
      fx.ring(target.x, target.y, '#7fe7ff');
    }
    damageEnemy(target, p.damage, now);
  }
}

export function resetTowerIds() {
  nextTowerId = 1;
}
