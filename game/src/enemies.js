// The gloom: wisps, darts, hulks and the Herald. An enemy walks the
// road's waypoints, can be chilled by Frost Shards, and leaks into the
// lighthouse when it reaches the end.
import { ENEMIES, waveHpScale } from './config.js';

let nextId = 1;

export function createEnemy(type, wave, points) {
  const def = ENEMIES[type];
  // The Herald's HP is flat by design; everything else scales with
  // the wave so the road gets harder as the run goes on.
  const hp = def.boss ? def.hp : Math.round(def.hp * waveHpScale(wave));
  return {
    id: nextId++,
    type,
    def,
    x: points[0].x,
    y: points[0].y,
    waypoint: 1, // index of the next waypoint to walk toward
    hp,
    maxHp: hp,
    speed: def.speed,
    radius: def.radius,
    slowUntil: 0, // game time until which the enemy is chilled
    slowFactor: 1,
    wobble: Math.random() * Math.PI * 2, // per-enemy drift phase
    flash: 0, // hit flash timer (seconds)
    dead: false,
    leaked: false,
  };
}

export function enemySpeed(enemy, now) {
  const chilled = now < enemy.slowUntil;
  return enemy.speed * (chilled ? enemy.slowFactor : 1);
}

export function updateEnemy(enemy, dt, points, now) {
  if (enemy.dead || enemy.leaked) return;
  if (enemy.flash > 0) enemy.flash -= dt;
  const target = points[enemy.waypoint];
  if (!target) {
    enemy.leaked = true;
    return;
  }
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const dist = Math.hypot(dx, dy);
  const step = enemySpeed(enemy, now) * dt;
  if (dist <= step) {
    enemy.x = target.x;
    enemy.y = target.y;
    enemy.waypoint += 1;
    if (enemy.waypoint >= points.length) enemy.leaked = true;
  } else {
    enemy.x += (dx / dist) * step;
    enemy.y += (dy / dist) * step;
  }
  // A gentle sideways drift so the column never looks like a conga line.
  enemy.wobble += dt * 2.2;
}

export function damageEnemy(enemy, amount, now) {
  enemy.hp -= amount;
  enemy.flash = 0.09;
  if (enemy.hp <= 0) {
    enemy.dead = true;
    return true;
  }
  return false;
}

export function chillEnemy(enemy, factor, duration, now) {
  // Frost always chills to the same factor; a fresh hit only extends
  // the chill. enemySpeed() ignores the factor once the time runs out.
  enemy.slowFactor = factor;
  enemy.slowUntil = Math.max(enemy.slowUntil, now + duration);
}

export function resetEnemyIds() {
  nextId = 1;
}
