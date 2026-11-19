export class Sfx {
  constructor() {
    this.ctx = null;
    this.listener = null;
  }

  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  _spatial(pos) {
    if (!pos || !this.listener) return { gain: 1, pan: 0 };
    const l = this.listener.position;
    const e = this.listener.matrixWorld.elements;
    const dx = pos.x - l.x;
    const dy = (pos.y || 0) - l.y;
    const dz = pos.z - l.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const gain = Math.min(1, Math.max(0, (28 - dist) / 23));
    if (gain < 0.03) return null;
    const pan = Math.max(-0.5, Math.min(0.5, ((dx * e[0] + dy * e[1] + dz * e[2]) / dist) * 0.5));
    return { gain, pan };
  }

  _chain(pos) {
    const c = this.ensure();
    if (!c) return null;
    const spatial = this._spatial(pos);
    if (!spatial) return null;
    const env = c.createGain();
    let node = env;
    if (c.createStereoPanner && spatial.pan !== 0) {
      const p = c.createStereoPanner();
      p.pan.value = spatial.pan;
      node.connect(p);
      node = p;
    }
    const sg = c.createGain();
    sg.gain.value = spatial.gain;
    node.connect(sg);
    sg.connect(c.destination);
    return env;
  }

  blip(freq, dur, type = 'square', vol = 0.06, slide = 0, pos = null) {
    const c = this.ensure();
    if (!c) return;
    const env = this._chain(pos);
    if (!env) return;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) {
      o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), c.currentTime + dur);
    }
    env.gain.setValueAtTime(vol, c.currentTime);
    env.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(env);
    o.start();
    o.stop(c.currentTime + dur + 0.02);
  }

  noise(dur = 0.3, vol = 0.12, cutoff = 800, pos = null) {
    const c = this.ensure();
    if (!c) return;
    const env = this._chain(pos);
    if (!env) return;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    src.connect(f);
    f.connect(env);
    env.gain.setValueAtTime(vol, c.currentTime);
    src.start();
  }

  click(pos) {
    this.blip(1500, 0.05, 'square', 0.035, 0, pos);
  }

  spike(pos) {
    this.blip(320, 0.12, 'sawtooth', 0.07, -160, pos);
    this.noise(0.08, 0.05, 3000, pos);
  }

  whoosh(pos) {
    this.noise(0.5, 0.1, 1400, pos);
  }

  thud(pos) {
    this.blip(85, 0.28, 'sine', 0.22, -35, pos);
    this.noise(0.18, 0.1, 320, pos);
  }

  hurt(pos) {
    this.blip(190, 0.16, 'square', 0.08, -70, pos);
  }

  crack(pos) {
    this.noise(0.22, 0.12, 2600, pos);
    this.blip(680, 0.07, 'square', 0.04, -200, pos);
  }

  zap(pos) {
    this.blip(1400, 0.12, 'sawtooth', 0.05, -1000, pos);
    this.blip(2600, 0.06, 'square', 0.03, -1600, pos);
  }

  crumble(pos) {
    this.noise(0.7, 0.14, 480, pos);
    this.blip(110, 0.3, 'sine', 0.12, -40, pos);
  }
}
