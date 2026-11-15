// Boot and the one loop: input is read as it happens, the game
// advances in fixed 1/60 s steps (several in a slow frame, none in a
// fast one), and the renderer paints what is there.
//
// ?seed=N fixes the decoration and the run. ?shot=start|play|victory|
// defeat (with &seed=N) stages that scene instead of running the
// loop, paints it twice and sets window.__shotReady for a screenshot.
// window.__lumen exposes the game for automated play-tests.
import { HEIGHT, WIDTH } from './config.js';
import { createGame } from './game.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const STEP = 1 / 60;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
let game = stageShot(shot, canvas, seed);
window.__lumen = { game: () => game, shot };

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
  };
}

function describe(game) {
  if (game.screen === 'title') return 'Lumen Keep — click or press Enter to begin.';
  if (game.screen === 'victory') return `Victory! Score ${game.score}. Press R to play again.`;
  if (game.screen === 'defeat') return `Defeat on wave ${game.wave}. Score ${game.score}. Press R to play again.`;
  if (game.screen === 'paused') return 'Paused. Press P to resume.';
  return `Wave ${Math.max(1, game.wave)} of 12 · Gold ${game.gold} · Keep HP ${game.keepHp} · Score ${game.score}`;
}

function runShot() {
  let painted = 0;
  function paint() {
    game.draw();
    status.textContent = describe(game);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  canvas.addEventListener('click', (event) => {
    const p = canvasPoint(event);
    game.click(p.x, p.y);
  });
  canvas.addEventListener('mousemove', (event) => {
    const p = canvasPoint(event);
    game.mouse(p.x, p.y);
  });
  window.addEventListener('keydown', (event) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
    game.key(event.code);
  });
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    const elapsed = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      game.update(STEP);
      accumulator -= STEP;
    }
    game.draw();
    status.textContent = describe(game);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot();
else runGame();
