import * as THREE from 'three';

let NOISE_TEX = null;

function makeNoiseTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const r = Math.hypot(dx, dy) * 2;
      const falloff = Math.max(0, 1 - r * r);
      const n = 0.45 + 0.55 * Math.random();
      const idx = (y * size + x) * 4;
      const l = 0.5 + 0.5 * Math.random();
      img.data[idx] = 255 * l;
      img.data[idx + 1] = 255 * l;
      img.data[idx + 2] = 255 * l;
      img.data[idx + 3] = 255 * falloff * n;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function getNoiseTexture() {
  if (!NOISE_TEX) NOISE_TEX = makeNoiseTexture();
  return NOISE_TEX;
}

const SMOKE_VERT = `
  attribute float aLife;
  attribute float aSize;
  attribute float aSeed;
  varying float vLife;
  varying float vSeed;
  void main() {
    vLife = aLife;
    vSeed = aSeed;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (0.55 + vLife * 1.7) * (46.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const SMOKE_FRAG = `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform vec3 uColor;
  varying float vLife;
  varying float vSeed;
  void main() {
    float ang = vSeed * 6.2831 + vLife * (vSeed - 0.5) * 3.0;
    vec2 uv = gl_PointCoord - 0.5;
    vec2 r = vec2(uv.x * cos(ang) - uv.y * sin(ang), uv.x * sin(ang) + uv.y * cos(ang)) + 0.5;
    vec4 tex = texture2D(uMap, r);
    float fadeIn = smoothstep(0.0, 0.15, vLife);
    float fadeOut = 1.0 - smoothstep(0.5, 1.0, vLife);
    float a = tex.a * fadeIn * fadeOut * uOpacity;
    if (a < 0.004) discard;
    float shade = 0.55 + 0.45 * tex.r;
    gl_FragColor = vec4(uColor * shade, a);
  }
`;

export class SmokeColumn {
  constructor(parent, x, y, z, { count = 28, rate = 22, rise = 1.4, spread = 0.45, size = 26, life = 2.0, opacity = 0.32, color = 0x1a1a1a, dirX = 0, dirZ = 0, len = 0 } = {}) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.rate = rate;
    this.rise = rise;
    this.spread = spread;
    this.baseSize = size;
    this.baseLife = life;
    this.baseOpacity = opacity;
    this.dirX = dirX;
    this.dirZ = dirZ;
    this.len = len;
    this.acc = 0;
    this.emitTimer = 0;
    this.always = false;

    this.parts = [];
    for (let i = 0; i < count; i++) {
      this.parts.push({ active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 1, dur: 1, size: 1, seed: Math.random() });
    }
    const geo = new THREE.BufferGeometry();
    this.posArr = new Float32Array(count * 3);
    this.lifeArr = new Float32Array(count);
    this.sizeArr = new Float32Array(count);
    this.seedArr = new Float32Array(count);
    for (let i = 0; i < count; i++) this.lifeArr[i] = 1;
    geo.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(this.lifeArr, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizeArr, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(this.seedArr, 1));
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: getNoiseTexture() },
        uOpacity: { value: opacity },
        uColor: { value: new THREE.Color(color) },
      },
      vertexShader: SMOKE_VERT,
      fragmentShader: SMOKE_FRAG,
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    parent.add(this.points);
  }

  emit(duration) {
    this.emitTimer = Math.max(this.emitTimer, duration);
  }

  spawn() {
    let slot = null;
    for (const p of this.parts) {
      if (!p.active) {
        slot = p;
        break;
      }
    }
    if (!slot) slot = this.parts[0];
    slot.active = true;
    const k = this.len > 0 ? Math.pow(Math.random(), 1.8) : 0;
    const along = k * this.len;
    slot.x = this.x + this.dirX * along + (Math.random() - 0.5) * this.spread * 0.7;
    slot.y = this.y + (Math.random() - 0.5) * 0.15 + k * 0.35;
    slot.z = this.z + this.dirZ * along + (Math.random() - 0.5) * this.spread * 0.7;
    slot.vx = (Math.random() - 0.5) * this.spread + this.dirX * (0.4 + Math.random() * 0.5);
    slot.vy = this.rise * (0.7 + Math.random() * 0.6);
    slot.vz = (Math.random() - 0.5) * this.spread + this.dirZ * (0.4 + Math.random() * 0.5);
    slot.life = 0;
    slot.dur = this.baseLife * (0.65 + Math.random() * 0.7);
    slot.size = this.baseSize * (0.6 + Math.random() * 0.8);
    slot.seed = Math.random();
  }

  update(dt, t) {
    if (this.always) this.emitTimer = Math.max(this.emitTimer, 0.1);
    if (this.emitTimer > 0) {
      this.emitTimer -= dt;
      this.acc += dt * this.rate;
      while (this.acc >= 1) {
        this.acc -= 1;
        this.spawn();
      }
    }
    let n = 0;
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      if (!p.active) {
        this.lifeArr[i] = 1;
        continue;
      }
      p.life += dt / p.dur;
      if (p.life >= 1) {
        p.active = false;
        this.lifeArr[i] = 1;
        continue;
      }
      p.vx += Math.sin(t * 1.3 + p.seed * 9) * dt * 0.4;
      p.vz += Math.cos(t * 1.1 + p.seed * 7) * dt * 0.4;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      this.posArr[i * 3] = p.x;
      this.posArr[i * 3 + 1] = p.y;
      this.posArr[i * 3 + 2] = p.z;
      this.lifeArr[i] = p.life;
      this.sizeArr[i] = p.size;
      this.seedArr[i] = p.seed;
      n++;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aLife.needsUpdate = true;
    this.points.geometry.attributes.aSize.needsUpdate = true;
    this.points.geometry.attributes.aSeed.needsUpdate = true;
    this.material.uniforms.uOpacity.value = this.baseOpacity;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
    if (this.points.parent) this.points.parent.remove(this.points);
  }
}
