// Every sound is synthesized with WebAudio: no audio files, no
// network. The pad starts on the first user gesture (browsers block
// audio before one) and the M key or the mute button silences it all.
export function createAudio() {
  const api = {
    ctx: null,
    master: null,
    muted: false,
    padNodes: null,

    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return true;
      }
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return false;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.5;
        this.master.connect(this.ctx.destination);
        return true;
      } catch {
        return false;
      }
    },

    setMuted(muted) {
      this.muted = muted;
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
      }
    },

    // One short oscillator note with an exponential decay envelope.
    tone(freq, dur, type, vol, slideTo) {
      if (!this.ensure() || this.muted) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },

    // A filtered noise burst (hits, pops, the wave horn's breath).
    noise(dur, vol, filterFreq) {
      if (!this.ensure() || this.muted) return;
      const t = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t);
    },

    shoot(kind) {
      if (kind === 'ember') this.tone(180, 0.16, 'sawtooth', 0.10, 70);
      else if (kind === 'frost') this.tone(880, 0.1, 'sine', 0.07, 1320);
      else this.tone(720, 0.07, 'square', 0.045, 980);
    },

    kill() {
      this.tone(660, 0.12, 'sine', 0.09);
      setTimeout(() => this.tone(990, 0.16, 'sine', 0.09), 55);
    },

    coin() {
      this.tone(1240, 0.09, 'triangle', 0.06, 1560);
    },

    leak() {
      this.tone(140, 0.35, 'sawtooth', 0.16, 55);
      this.noise(0.25, 0.1, 500);
    },

    horn() {
      this.tone(196, 0.5, 'sawtooth', 0.1, 262);
      setTimeout(() => this.tone(294, 0.45, 'sawtooth', 0.09), 180);
    },

    click() {
      this.tone(520, 0.05, 'triangle', 0.06);
    },

    build() {
      this.tone(330, 0.1, 'triangle', 0.09);
      setTimeout(() => this.tone(495, 0.14, 'triangle', 0.09), 70);
    },

    upgrade() {
      [440, 554, 659].forEach((f, i) => setTimeout(() => this.tone(f, 0.16, 'triangle', 0.09), i * 70));
    },

    victory() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, 'triangle', 0.11), i * 140));
    },

    defeat() {
      [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.5, 'sawtooth', 0.08), i * 200));
    },

    // A soft two-note pad that drifts under the game. Started lazily.
    startPad() {
      if (!this.ensure() || this.muted || this.padNodes) return;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.035;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      gain.connect(filter);
      filter.connect(this.master);
      const oscs = [110, 164.81, 220].map((freq) => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start();
        return osc;
      });
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.018;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
      this.padNodes = { oscs, lfo, gain };
    },
  };
  return api;
}
