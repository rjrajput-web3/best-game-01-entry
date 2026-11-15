// Sparks, bursts, rings and floating gold text. The effects layer
// owns no game logic; game.js calls it and render.js draws it.
export function createFx() {
  return {
    particles: [],
    texts: [],
    sparks(x, y, color, count) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 120;
        this.particles.push({
          kind: 'spark',
          x,
          y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: 0.35 + Math.random() * 0.2,
          maxLife: 0.55,
          color,
          size: 2 + Math.random() * 2.5,
        });
      }
    },
    burst(x, y, color, count) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 200;
        this.particles.push({
          kind: 'spark',
          x,
          y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: 0.45 + Math.random() * 0.3,
          maxLife: 0.75,
          color,
          size: 2.5 + Math.random() * 3,
        });
      }
      this.particles.push({
        kind: 'ring',
        x,
        y,
        life: 0.3,
        maxLife: 0.3,
        color,
        size: 6,
        grow: 190,
      });
    },
    ring(x, y, color) {
      this.particles.push({
        kind: 'ring',
        x,
        y,
        life: 0.4,
        maxLife: 0.4,
        color,
        size: 8,
        grow: 120,
      });
    },
    // A wisp popping into light: a rising glow plus a few sparks.
    pop(x, y, color) {
      this.particles.push({
        kind: 'glow',
        x,
        y,
        life: 0.5,
        maxLife: 0.5,
        color,
        size: 14,
        grow: 60,
      });
      this.sparks(x, y, color, 8);
    },
    goldText(x, y, text) {
      this.texts.push({ x, y, text, life: 1.1, maxLife: 1.1 });
    },
    banner(text, sub) {
      this.texts.push({ x: 480, y: 300, text, sub, life: 1.8, maxLife: 1.8, big: true });
    },
    update(dt) {
      for (const p of this.particles) {
        p.life -= dt;
        if (p.kind === 'spark') {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.92;
          p.vy *= 0.92;
        }
      }
      this.particles = this.particles.filter((p) => p.life > 0);
      for (const t of this.texts) {
        t.life -= dt;
        t.y -= dt * 26;
      }
      this.texts = this.texts.filter((t) => t.life > 0);
    },
  };
}
