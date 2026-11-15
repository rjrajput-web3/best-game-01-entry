// Every pixel of Lumen Keep is drawn here: night sky, the field and
// its road, the lighthouse, prisms, wisps, shots, sparks, the HUD,
// the build bar and the title / victory / defeat screens. game.js
// owns the state; this file only paints it.
import { BOARD, HEIGHT, MAX_TOWER_LEVEL, TOWER_ORDER, TOWERS, WIDTH, towerStats, upgradeCost } from './config.js';
import { cellCenter } from './field.js';
import { clamp } from './random.js';

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

export function towerPanelRect(tower) {
  // Floating panel for a selected placed tower, anchored above it.
  const w = 216;
  const h = 118;
  let x = clamp(tower.x - w / 2, 8, WIDTH - w - 8);
  let y = tower.y - h - 26;
  if (y < BOARD.hudHeight + 8) y = tower.y + 30;
  return { x, y, w, h };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function drawStar(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function background(field, time) {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, '#0b1030');
    sky.addColorStop(0.45, '#141b45');
    sky.addColorStop(1, '#1d2a52');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (const s of field.stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(time * s.twinkle + s.phase));
      ctx.globalAlpha = a;
      drawStar(ctx, s.x, s.y, s.r, '#dfe8ff');
    }
    ctx.globalAlpha = 1;

    // The moon, high over the keep.
    const moon = ctx.createRadialGradient(872, 84, 6, 872, 84, 46);
    moon.addColorStop(0, 'rgba(255, 246, 214, 0.9)');
    moon.addColorStop(0.35, 'rgba(255, 246, 214, 0.28)');
    moon.addColorStop(1, 'rgba(255, 246, 214, 0)');
    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(872, 84, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6d6';
    ctx.beginPath();
    ctx.arc(872, 84, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(214, 196, 150, 0.55)';
    ctx.beginPath();
    ctx.arc(864, 78, 4, 0, Math.PI * 2);
    ctx.arc(880, 92, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function ground(field) {
    // Meadow tiles with a faint checker, then the road.
    for (let row = 0; row < BOARD.rows; row++) {
      for (let col = 0; col < BOARD.cols; col++) {
        const x = col * BOARD.cell;
        const y = BOARD.hudHeight + row * BOARD.cell;
        ctx.fillStyle = (col + row) % 2 === 0 ? '#1a2447' : '#18203f';
        ctx.fillRect(x, y, BOARD.cell, BOARD.cell);
      }
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let col = 0; col <= BOARD.cols; col++) {
      ctx.beginPath();
      ctx.moveTo(col * BOARD.cell, BOARD.hudHeight);
      ctx.lineTo(col * BOARD.cell, HEIGHT - BOARD.barHeight);
      ctx.stroke();
    }
    for (let row = 0; row <= BOARD.rows; row++) {
      const y = BOARD.hudHeight + row * BOARD.cell;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    for (const d of field.decor) {
      ctx.fillStyle = d.kind === 'tuft' ? `rgba(94, 160, 110, ${0.5 * d.shade})` : `rgba(140, 150, 190, ${0.55 * d.shade})`;
      if (d.kind === 'tuft') {
        ctx.beginPath();
        ctx.moveTo(d.x - d.size, d.y + d.size);
        ctx.lineTo(d.x, d.y - d.size);
        ctx.lineTo(d.x + d.size, d.y + d.size);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function road(points) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255, 214, 130, 0.16)';
    ctx.lineWidth = 52;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.strokeStyle = '#3d2f1e';
    ctx.lineWidth = 44;
    ctx.stroke();
    ctx.strokeStyle = '#57432c';
    ctx.lineWidth = 36;
    ctx.stroke();
    // Cobble dashes down the middle of the road.
    ctx.strokeStyle = 'rgba(255, 230, 170, 0.35)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 22]);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function keep(state, time) {
    const { x, y } = state.keepPos;
    // Ground shadow and stone base.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + 58, 44, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c355e';
    roundRect(ctx, x - 34, y - 18, 68, 76, 8);
    ctx.fill();
    ctx.fillStyle = '#3a4672';
    ctx.fillRect(x - 34, y - 18, 68, 12);
    // The tower itself.
    const tower = ctx.createLinearGradient(x - 20, 0, x + 20, 0);
    tower.addColorStop(0, '#e8e2d4');
    tower.addColorStop(0.5, '#fbf7ea');
    tower.addColorStop(1, '#cfc6ae');
    ctx.fillStyle = tower;
    ctx.beginPath();
    ctx.moveTo(x - 20, y + 58);
    ctx.lineTo(x - 13, y - 62);
    ctx.lineTo(x + 13, y - 62);
    ctx.lineTo(x + 20, y + 58);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#b8452f';
    ctx.fillRect(x - 16, y - 30, 32, 10);
    ctx.fillRect(x - 18, y + 8, 36, 10);
    // Lamp room and its rotating beams.
    const lampY = y - 78;
    ctx.fillStyle = '#2c355e';
    ctx.fillRect(x - 16, lampY - 4, 32, 22);
    const lampGlow = ctx.createRadialGradient(x, lampY + 7, 2, x, lampY + 7, 30);
    lampGlow.addColorStop(0, 'rgba(255, 240, 170, 0.95)');
    lampGlow.addColorStop(1, 'rgba(255, 240, 170, 0)');
    ctx.fillStyle = lampGlow;
    ctx.beginPath();
    ctx.arc(x, lampY + 7, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a0';
    ctx.beginPath();
    ctx.arc(x, lampY + 7, 9, 0, Math.PI * 2);
    ctx.fill();
    const angle = time * 0.7;
    for (const dir of [angle, angle + Math.PI]) {
      const beam = ctx.createLinearGradient(x, lampY + 7, x + Math.cos(dir) * 260, lampY + 7 + Math.sin(dir) * 260);
      beam.addColorStop(0, 'rgba(255, 238, 160, 0.30)');
      beam.addColorStop(1, 'rgba(255, 238, 160, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(x, lampY + 7);
      ctx.lineTo(x + Math.cos(dir - 0.09) * 260, lampY + 7 + Math.sin(dir - 0.09) * 260);
      ctx.lineTo(x + Math.cos(dir + 0.09) * 260, lampY + 7 + Math.sin(dir + 0.09) * 260);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#2c355e';
    ctx.beginPath();
    ctx.moveTo(x - 18, lampY - 4);
    ctx.lineTo(x, lampY - 18);
    ctx.lineTo(x + 18, lampY - 4);
    ctx.closePath();
    ctx.fill();
    // Keep HP as a small bar under the tower.
    const hpFrac = clamp(state.keepHp / state.maxKeepHp, 0, 1);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    roundRect(ctx, x - 30, y + 66, 60, 8, 4);
    ctx.fill();
    ctx.fillStyle = hpFrac > 0.5 ? '#7be495' : hpFrac > 0.25 ? '#ffd166' : '#ff5d5d';
    roundRect(ctx, x - 30, y + 66, 60 * hpFrac, 8, 4);
    ctx.fill();
  }

  function towers(state) {
    for (const t of state.towers) {
      const stats = towerStats(t.def, t.level);
      const selected = state.selectedTower === t;
      const hovered =
        state.hover && state.hover.col === t.col && state.hover.row === t.row;
      if (selected || hovered) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.strokeStyle = t.def.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(t.x, t.y, stats.range, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      // Stone base.
      ctx.fillStyle = '#39406b';
      ctx.beginPath();
      ctx.arc(t.x, t.y + 4, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a5288';
      ctx.beginPath();
      ctx.arc(t.x, t.y + 2, 17, 0, Math.PI * 2);
      ctx.fill();
      // The gem: a faceted diamond that slowly turns.
      const spin = state.time * 0.4 + t.id;
      const glow = ctx.createRadialGradient(t.x, t.y - 4, 2, t.x, t.y - 4, 26);
      glow.addColorStop(0, t.def.glow);
      glow.addColorStop(0.55, t.def.color);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(t.x, t.y - 4, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(t.x, t.y - 4);
      ctx.rotate(Math.sin(spin) * 0.12);
      ctx.fillStyle = t.def.color;
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(11, 0);
      ctx.lineTo(0, 15);
      ctx.lineTo(-11, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(11, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Barrel: a short line toward the aim when the tower has a target.
      ctx.strokeStyle = t.def.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y - 4);
      ctx.lineTo(t.x + Math.cos(t.aim) * 20, t.y - 4 + Math.sin(t.aim) * 20);
      ctx.stroke();
      // Muzzle flash.
      if (t.flash > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(t.x + Math.cos(t.aim) * 22, t.y - 4 + Math.sin(t.aim) * 22, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      // Level pips.
      for (let i = 0; i < MAX_TOWER_LEVEL; i++) {
        ctx.fillStyle = i < t.level ? '#ffd166' : 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.arc(t.x - 12 + i * 12, t.y + 24, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Ghost preview while placing: the tower follows the mouse.
    if (state.selectedBuild && state.hover && state.hover.inField) {
      const def = TOWERS[state.selectedBuild];
      const { x, y } = cellCenter(state.hover.col, state.hover.row);
      const ok = state.canBuildAt(state.hover.col, state.hover.row);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = ok ? def.color : '#ff5d5d';
      ctx.beginPath();
      ctx.arc(x, y - 4, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ok ? def.color : '#ff5d5d';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y - 4, def.range, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function enemies(state) {
    for (const e of state.enemies) {
      if (e.dead || e.leaked) continue;
      const chilled = state.time < e.slowUntil;
      const wob = Math.sin(e.wobble) * 2;
      const glow = ctx.createRadialGradient(e.x, e.y + wob, 2, e.x, e.y + wob, e.radius + 12);
      glow.addColorStop(0, e.def.color);
      glow.addColorStop(0.6, e.def.color + '55');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(e.x, e.y + wob, e.radius + 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Body.
      ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.def.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y + wob, e.radius, 0, Math.PI * 2);
      ctx.fill();
      // Core.
      ctx.fillStyle = e.def.core;
      ctx.beginPath();
      ctx.arc(e.x, e.y + wob, e.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // Eyes, always looking down the road.
      const look = e.waypoint < state.points.length ? state.points[e.waypoint] : { x: e.x + 1, y: e.y };
      const la = Math.atan2(look.y - e.y, look.x - e.x);
      const ex = Math.cos(la) * 4;
      const ey = Math.sin(la) * 3;
      ctx.fillStyle = '#1b1430';
      ctx.beginPath();
      ctx.arc(e.x - 5 + ex, e.y + wob - 2 + ey, 2.6, 0, Math.PI * 2);
      ctx.arc(e.x + 5 + ex, e.y + wob - 2 + ey, 2.6, 0, Math.PI * 2);
      ctx.fill();
      if (chilled) {
        ctx.strokeStyle = 'rgba(127, 231, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y + wob, e.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (e.def.boss) {
        // Spiked crown for the Herald.
        ctx.fillStyle = '#ffd166';
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(e.x + i * 10 - 4, e.y + wob - e.radius + 2);
          ctx.lineTo(e.x + i * 10, e.y + wob - e.radius - 12);
          ctx.lineTo(e.x + i * 10 + 4, e.y + wob - e.radius + 2);
          ctx.closePath();
          ctx.fill();
        }
      }
      // HP bar.
      const frac = clamp(e.hp / e.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(e.x - 16, e.y + wob - e.radius - 10, 32, 5);
      ctx.fillStyle = frac > 0.5 ? '#7be495' : frac > 0.25 ? '#ffd166' : '#ff5d5d';
      ctx.fillRect(e.x - 16, e.y + wob - e.radius - 10, 32 * frac, 5);
    }
  }

  function projectiles(state) {
    for (const p of state.projectiles) {
      const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 10);
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.4, p.color);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function effects(state) {
    for (const p of state.fx.particles) {
      const frac = clamp(p.life / p.maxLife, 0, 1);
      if (p.kind === 'spark') {
        ctx.globalAlpha = frac;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * frac + 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'ring') {
        ctx.globalAlpha = frac * 0.8;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + p.grow * (1 - frac), 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'glow') {
        ctx.globalAlpha = frac * 0.7;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + p.grow * (1 - frac), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const t of state.fx.texts) {
      const frac = clamp(t.life / t.maxLife, 0, 1);
      ctx.globalAlpha = Math.min(1, frac * 1.5);
      if (t.big) {
        text(ctx, t.text, t.x, t.y, 34, '#ffe9a0', 'center');
        if (t.sub) text(ctx, t.sub, t.x, t.y + 30, 16, '#dfe8ff', 'center', 'normal');
      } else {
        text(ctx, t.text, t.x, t.y, 14, '#ffd166', 'center');
      }
    }
    ctx.globalAlpha = 1;
  }

  function hud(state) {
    ctx.fillStyle = 'rgba(8, 12, 32, 0.72)';
    ctx.fillRect(0, 0, WIDTH, BOARD.hudHeight);
    ctx.fillStyle = 'rgba(255, 233, 160, 0.25)';
    ctx.fillRect(0, BOARD.hudHeight - 2, WIDTH, 2);
    // Gold.
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(26, 28, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b8860b';
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('G', 26, 28);
    text(ctx, `${state.gold}`, 44, 28, 20, '#ffd166');
    // Keep HP as hearts.
    for (let i = 0; i < 5; i++) {
      const filled = state.keepHp > i * 4;
      drawHeart(150 + i * 24, 28, 9, filled ? '#ff6b81' : 'rgba(255,255,255,0.18)');
    }
    text(ctx, `Keep ${state.keepHp}/${state.maxKeepHp}`, 278, 28, 15, '#ffb3c0');
    // Wave.
    text(ctx, `WAVE ${Math.max(1, state.wave)} / 12`, 480, 20, 17, '#dfe8ff', 'center');
    const left = state.enemiesRemaining;
    text(
      ctx,
      state.phase === 'build' ? 'Build phase — send the next wave when ready' : `Gloom on the road: ${left}`,
      480,
      42,
      13,
      state.phase === 'build' ? '#8affc1' : '#ffb199',
      'center',
      'normal',
    );
    // Score and best.
    text(ctx, `SCORE ${state.score}`, 936, 20, 17, '#ffffff', 'right');
    text(ctx, `BEST ${state.best}`, 936, 42, 12, '#9fb0d8', 'right', 'normal');
  }

  function drawHeart(x, y, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.2, y, x - s * 0.6, y - s, x, y - s * 0.3);
    ctx.bezierCurveTo(x + s * 0.6, y - s, x + s * 1.2, y, x, y + s * 0.9);
    ctx.fill();
  }

  function buildBar(state) {
    const y = HEIGHT - BOARD.barHeight;
    ctx.fillStyle = 'rgba(8, 12, 32, 0.78)';
    ctx.fillRect(0, y, WIDTH, BOARD.barHeight);
    ctx.fillStyle = 'rgba(255, 233, 160, 0.25)';
    ctx.fillRect(0, y, WIDTH, 2);
    TOWER_ORDER.forEach((key, i) => {
      const def = TOWERS[key];
      const x = 12 + i * 156;
      const by = y + 8;
      const afford = state.gold >= def.cost;
      const selected = state.selectedBuild === key;
      ctx.fillStyle = selected ? 'rgba(255, 209, 102, 0.22)' : 'rgba(255,255,255,0.05)';
      roundRect(ctx, x, by, 148, 56, 9);
      ctx.fill();
      ctx.strokeStyle = selected ? '#ffd166' : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = selected ? 2 : 1;
      roundRect(ctx, x, by, 148, 56, 9);
      ctx.stroke();
      ctx.globalAlpha = afford ? 1 : 0.45;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(x + 20, by + 14);
      ctx.lineTo(x + 31, by + 28);
      ctx.lineTo(x + 20, by + 42);
      ctx.lineTo(x + 9, by + 28);
      ctx.closePath();
      ctx.fill();
      text(ctx, def.name, x + 40, by + 16, 14, '#ffffff');
      text(ctx, `${def.cost} gold  ·  [${i + 1}]`, x + 40, by + 36, 12, '#ffd166', 'left', 'normal');
      ctx.globalAlpha = 1;
    });
    // Buttons on the right: Send Wave, speed, pause, mute.
    drawButton(state.sendWaveRect, state.phase === 'build' ? 'SEND WAVE  [Space]' : 'WAVE RUNNING…', state.phase === 'build' ? '#ffd166' : '#5a6b9c', '#1b1430');
    drawButton(state.speedRect, `${state.speed}x`, '#7fe7ff', '#0b1030');
    drawButton(state.pauseRect, state.screen === 'paused' ? '▶' : 'II', '#dfe8ff', '#0b1030');
    drawButton(state.muteRect, state.muted ? 'MUTE' : 'SND', '#dfe8ff', '#0b1030');
    if (state.selectedBuild) {
      text(ctx, `${TOWERS[state.selectedBuild].blurb}  Click a glowing field cell to build — Esc to cancel.`, 480, y + 66, 12, '#9fb0d8', 'center', 'normal');
    }
  }

  function drawButton(rect, label, bg, fg) {
    ctx.fillStyle = bg;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    text(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, rect.h > 40 ? 15 : 12, fg, 'center');
  }

  function towerPanel(state) {
    const t = state.selectedTower;
    // The panel belongs to live play only: end screens have their own
    // text and must not fight it for the same pixels.
    if (!t || state.screen !== 'playing') return;
    const r = towerPanelRect(t);
    const stats = towerStats(t.def, t.level);
    const cost = upgradeCost(t.def, t.level);
    ctx.fillStyle = 'rgba(8, 12, 32, 0.94)';
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fill();
    ctx.strokeStyle = t.def.color;
    ctx.lineWidth = 1.5;
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.stroke();
    text(ctx, `${t.def.name}  ·  Lv ${t.level}`, r.x + 12, r.y + 16, 14, '#ffffff');
    text(ctx, `Damage ${stats.damage}   Range ${stats.range}   ${stats.rate}/s`, r.x + 12, r.y + 38, 12, '#dfe8ff', 'left', 'normal');
    const upRect = { x: r.x + 12, y: r.y + 54, w: 100, h: 30 };
    const sellRect = { x: r.x + 120, y: r.y + 54, w: 84, h: 30 };
    state.upgradeRect = upRect;
    state.sellRect = sellRect;
    if (cost !== null) {
      drawButton(upRect, `UPGRADE ${cost}g`, state.gold >= cost ? '#ffd166' : '#5a6b9c', '#1b1430');
    } else {
      drawButton(upRect, 'MAX LEVEL', '#5a6b9c', '#dfe8ff');
    }
    drawButton(sellRect, `SELL +${Math.floor(t.invested * 0.7)}g`, '#ff9f43', '#1b1430');
    text(ctx, 'Click elsewhere to close', r.x + 12, r.y + 100, 11, '#9fb0d8', 'left', 'normal');
  }

  function overlay(state) {
    if (state.screen === 'title') {
      ctx.fillStyle = 'rgba(6, 9, 26, 0.62)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      text(ctx, 'LUMEN KEEP', 480, 190, 64, '#ffe9a0', 'center');
      text(ctx, 'The last lighthouse. The gloom is coming. Hold the light.', 480, 252, 19, '#dfe8ff', 'center', 'normal');
      text(ctx, 'Build prisms along the road. Wisps that reach the lighthouse cost Keep HP.', 480, 310, 16, '#9fb0d8', 'center', 'normal');
      text(ctx, 'Spark is fast · Ember bursts · Frost slows. Survive all 12 waves.', 480, 336, 16, '#9fb0d8', 'center', 'normal');
      text(ctx, 'Click a prism card, then click the field to build.  [1/2/3] pick · [Space] send wave · [P] pause · [M] sound', 480, 372, 14, '#ffd166', 'center', 'normal');
      const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
      ctx.globalAlpha = pulse;
      text(ctx, 'CLICK OR PRESS ENTER TO BEGIN', 480, 440, 22, '#ffffff', 'center');
      ctx.globalAlpha = 1;
      if (state.best > 0) text(ctx, `Best score: ${state.best}`, 480, 486, 15, '#9fb0d8', 'center', 'normal');
      return;
    }
    if (state.screen === 'paused') {
      ctx.fillStyle = 'rgba(6, 9, 26, 0.6)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      text(ctx, 'PAUSED', 480, 320, 48, '#ffffff', 'center');
      text(ctx, 'Press P or click II to resume · R restarts the run', 480, 372, 16, '#dfe8ff', 'center', 'normal');
      return;
    }
    if (state.screen === 'victory' || state.screen === 'defeat') {
      const win = state.screen === 'victory';
      ctx.fillStyle = win ? 'rgba(10, 26, 14, 0.86)' : 'rgba(26, 8, 14, 0.86)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      text(ctx, win ? 'THE LIGHT HOLDS!' : 'THE LIGHT HAS FALLEN', 480, 220, 46, win ? '#ffe9a0' : '#ff8fa0', 'center');
      text(
        ctx,
        win ? 'Twelve waves broken against your prisms. The lighthouse burns on.' : `The gloom broke through on wave ${state.wave}. The keep will be rebuilt.`,
        480,
        276,
        17,
        '#dfe8ff',
        'center',
        'normal',
      );
      const lines = [
        `Score  ${state.score}`,
        `Waves cleared  ${state.wavesCleared} / 12`,
        `Wisps banished  ${state.kills}`,
        `Gold earned  ${state.goldEarned}`,
        `Keep HP left  ${Math.max(0, state.keepHp)}`,
      ];
      lines.forEach((line, i) => text(ctx, line, 480, 330 + i * 30, 17, '#ffffff', 'center', 'normal'));
      const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
      ctx.globalAlpha = pulse;
      text(ctx, 'PRESS R OR CLICK TO PLAY AGAIN', 480, 520, 20, '#ffd166', 'center');
      ctx.globalAlpha = 1;
      if (state.score > state.best && state.score > 0) {
        text(ctx, 'NEW BEST SCORE!', 480, 560, 16, '#7be495', 'center');
      }
    }
  }

  function draw(state) {
    background(state.field, state.time);
    ground(state.field);
    road(state.points);
    keep(state, state.time);
    towers(state);
    enemies(state);
    projectiles(state);
    effects(state);
    hud(state);
    buildBar(state);
    towerPanel(state);
    overlay(state);
  }

  return { draw };
}
