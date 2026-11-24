import * as THREE from 'three';
import { rand } from '../core/utils.js';
import { rockGeometry, makeFacetedNormalMap, CELL } from '../world/themeHelpers.js';
import { SmokeColumn } from './Smoke.js';

export const THEME_CFG = {
  winter: {
    jet: {
      color: 0xd8ecff,
      glow: 0x9fd8ff,
      light: 0xbfe3ff,
      core: 0xffffff,
      mid: 0xdcecff,
      outer: 0x9fc8f0,
    },
    spike: 0xdfeaf6,
    floor: 0xd9e5f5,
    rock: 0x9fb6d4,
    wall: [0x5c6a86, 0xf2f7ff],
    cut: 'snowmen',
    cutColors: [0xeef4ff, 0xe07830],
    accent: 0x86d9ff,
  },
  forest: {
    jet: {
      color: 0xb8ff70,
      glow: 0x6fdc3c,
      light: 0x8dff4d,
      core: 0xf0ffd0,
      mid: 0x8dff4d,
      outer: 0x2e7d1f,
    },
    spike: 0x6b4a2e,
    floor: 0x6f9a52,
    rock: 0x8a8d84,
    wall: [0x7a5a3c, 0x53803f],
    cut: 'bushes',
    cutColors: [0x4c8039, 0x5d9448, 0x6fae52],
    accent: 0x8dffa9,
  },
  scifi: {
    jet: {
      color: 0x8af4ff,
      glow: 0x19e6ff,
      light: 0x35e0ff,
      core: 0xffffff,
      mid: 0x66f2ff,
      outer: 0x0f7dd8,
    },
    spike: 0x9fb3cd,
    floor: 0x27303f,
    rock: 0x2b3446,
    wall: [0x39445c, 0x7e90ab],
    cut: 'wires',
    cutColors: [0x1a222f, 0x35e0ff],
    accent: 0x35e0ff,
  },
  dungeon: {
    jet: {
      color: 0xffc27a,
      glow: 0xff7a2a,
      light: 0xff9a3c,
      core: 0xfff3c0,
      mid: 0xffa04d,
      outer: 0xd23000,
    },
    spike: 0x585f70,
    floor: 0x2b2f3a,
    rock: 0x4a505e,
    wall: [0x414858, null],
    cut: 'boards',
    cutColors: [0x6b4a2e, 0x5a3f28],
    accent: 0xffb454,
  },
};

const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true, ...opts });

export class JetTrap {
  constructor(mgr, x, z, horizontal, side) {
    const cfg = mgr.cfg;
    this.mgr = mgr;
    this.x = x;
    this.z = z;
    this.dir = horizontal ? new THREE.Vector3(0, 0, side) : new THREE.Vector3(side, 0, 0);
    this.y = 1.4;
    this.cycle = rand(mgr.rng, 3, 5);
    this.timer = rand(mgr.rng, 0.5, this.cycle);
    this.firing = 0;

    const nx = x + this.dir.x * 0.56;
    const nz = z + this.dir.z * 0.56;
    const g = new THREE.Group();
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.24, 8), std(0x14161c, { roughness: 0.6 }));
    if (horizontal) hole.rotation.x = Math.PI / 2;
    else hole.rotation.z = Math.PI / 2;
    hole.position.set(nx, this.y, nz);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.035, 5, 12),
      std(0x111111, { emissive: cfg.accent, emissiveIntensity: 0.55 })
    );
    rim.position.copy(hole.position);
    if (!horizontal) rim.rotation.y = Math.PI / 2;
    g.add(hole, rim);

    this.nozzle = new THREE.Vector3(nx, this.y, nz);
    const N = 34;
    this.count = N;
    this.phases = [];
    for (let i = 0; i < N; i++) this.phases.push(mgr.rng());
    this.spread = [];
    for (let i = 0; i < N; i++) this.spread.push(rand(mgr.rng, -0.45, 0.45));
    this.sizes = [];
    for (let i = 0; i < N; i++) this.sizes.push(rand(mgr.rng, 0.7, 1.3));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(new Float32Array(N), 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(N), 1));
    const lifeAttr = geo.attributes.aLife;
    const seedAttr = geo.attributes.aSeed;
    for (let i = 0; i < N; i++) {
      lifeAttr.setX(i, i / N);
      seedAttr.setX(i, mgr.rng());
    }
    this.points = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        uniforms: {
          uCore: { value: new THREE.Color(cfg.jet.core) },
          uMid: { value: new THREE.Color(cfg.jet.mid) },
          uOuter: { value: new THREE.Color(cfg.jet.outer) },
          uOpacity: { value: 0 },
        },
        vertexShader: `
          attribute float aLife;
          attribute float aSeed;
          varying float vLife;
          varying float vSeed;
          void main() {
            vLife = aLife;
            vSeed = aSeed;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (30.0 + 60.0 * aLife) * aSeed * (36.0 / max(1.0, -mv.z));
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform vec3 uCore;
          uniform vec3 uMid;
          uniform vec3 uOuter;
          uniform float uOpacity;
          varying float vLife;
          varying float vSeed;
          void main() {
            vec2 uv = gl_PointCoord - 0.5;
            float r = length(uv) * 2.0;
            float soft = exp(-r * r * 3.2);
            if (soft < 0.02) discard;
            vec3 col = mix(uCore, uMid, smoothstep(0.0, 0.45, vLife));
            col = mix(col, uOuter, smoothstep(0.45, 1.0, vLife));
            float a = soft * (1.0 - vLife * 0.85) * (0.65 + 0.35 * vSeed) * uOpacity;
            gl_FragColor = vec4(col * (1.6 - vLife * 0.8), a);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.points.frustumCulled = false;
    this.light = new THREE.PointLight(cfg.jet.light, 0, 9, 2);
    this.light.position.set(nx, this.y, nz);
    this.smoke = new SmokeColumn(mgr.group, nx + this.dir.x * 0.3, this.y + 0.15, nz + this.dir.z * 0.3, {
      count: 26,
      rate: 24,
      rise: 1.5,
      spread: 0.5,
      size: 24,
      life: 1.9,
      opacity: 0.5,
      color: 0x161616,
      dirX: this.dir.x,
      dirZ: this.dir.z,
      len: 3.0,
    });
    mgr.group.add(g, this.points, this.light);
  }

  update(dt, px, pz, jumpY, t) {
    const distP = Math.hypot(px - this.x, pz - this.z);
    if (this.firing > 0) {
      this.firing -= dt;
      const fade = Math.max(0, Math.min(1, this.firing * 4));
      this.points.material.uniforms.uOpacity.value = fade;
      this.light.intensity = 14 * fade;
      if (this.firing < 0.55) this.smoke.emit(0.9);
      const pos = this.points.geometry.attributes.position;
      const lifeAttr = this.points.geometry.attributes.aLife;
      for (let i = 0; i < this.count; i++) {
        const prog = (t * 1.6 + this.phases[i]) % 1;
        const accel = prog * prog * 0.55 + prog * 0.45;
        const d = accel * 3.4;
        const turb = Math.sin(t * 11 + i * 1.7) * 0.12 * prog;
        pos.setXYZ(
          i,
          this.nozzle.x + this.dir.x * d + (this.dir.x === 0 ? this.spread[i] * prog + turb : turb),
          this.nozzle.y + this.spread[i] * prog * 0.5 + prog * prog * 0.35,
          this.nozzle.z + this.dir.z * d + (this.dir.z === 0 ? this.spread[i] * prog + turb : turb)
        );
        lifeAttr.setX(i, prog);
      }
      pos.needsUpdate = true;
      lifeAttr.needsUpdate = true;
      const relX = px - this.nozzle.x;
      const relZ = pz - this.nozzle.z;
      const along = relX * this.dir.x + relZ * this.dir.z;
      const perp = Math.abs(relX * this.dir.z - relZ * this.dir.x);
      if (along > 0.2 && along < 3.3 && perp < 0.95) {
        this.mgr.damage(this.nozzle, 12);
      }
      if (this.firing <= 0) {
        this.timer = this.cycle + rand(this.mgr.rng, 0, 1.2);
        this.points.material.uniforms.uOpacity.value = 0;
        this.light.intensity = 0;
      }
    } else if (distP < 24) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.firing = 1;
        this.mgr.sfx.whoosh(this.nozzle);
      }
    }
    this.smoke.update(dt, t);
  }

  dispose() {
    this.points.geometry.dispose();
    this.points.material.dispose();
    this.smoke.dispose();
  }
}

export class SpikeTrap {
  constructor(mgr, x, z, mode) {
    const cfg = mgr.cfg;
    this.mgr = mgr;
    this.x = x;
    this.z = z;
    this.mode = mode;
    this.state = 'idle';
    this.timer = rand(mgr.rng, 1, mode === 'auto' ? 5 : 3);
    this.armed = true;

    this.hintMat = std(cfg.floor, { emissive: cfg.accent, emissiveIntensity: 0 });
    const hintGeo = new THREE.CylinderGeometry(0.16, 0.17, 0.07, 7);
    const offsets = [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55], [0, 0]];
    for (const [ox, oz] of offsets) {
      const hint = new THREE.Mesh(hintGeo, this.hintMat);
      hint.position.set(x + ox, 0.035, z + oz);
      mgr.group.add(hint);
    }

    this.spikeGroup = new THREE.Group();
    const spikeMat = std(cfg.spike, { roughness: 0.7 });
    this.spikeHeights = [];
    for (const [ox, oz] of offsets) {
      const h = rand(mgr.rng, 0.7, 1.0);
      this.spikeHeights.push(h);
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.13, h, 5), spikeMat);
      s.position.set(x + ox, -h / 2 - 0.1, z + oz);
      s.castShadow = true;
      this.spikeGroup.add(s);
    }
    mgr.group.add(this.spikeGroup);
  }

  update(dt, px, pz, jumpY) {
    const dist = Math.hypot(px - this.x, pz - this.z);
    this.pos = { x: this.x, y: 0, z: this.z };
    if (this.state === 'idle') {
      if (this.mode === 'auto') {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'warn';
          this.timer = 0.6;
          this.mgr.sfx.click(this.pos);
        }
      } else if (this.armed && dist < 2.4) {
        this.state = 'warn';
        this.timer = 0.6;
        this.mgr.sfx.click(this.pos);
      }
    } else if (this.state === 'warn') {
      this.timer -= dt;
      this.hintMat.emissiveIntensity = 0.5 + Math.sin(performance.now() * 0.04) * 0.4;
      if (this.timer <= 0) {
        this.state = 'up';
        this.timer = 1.0;
        this.mgr.sfx.spike(this.pos);
      }
    } else if (this.state === 'up') {
      this.timer -= dt;
      this.hintMat.emissiveIntensity = 0.25;
      const k = Math.min(1, (1 - this.timer) * 6);
      for (let i = 0; i < this.spikeGroup.children.length; i++) {
        const s = this.spikeGroup.children[i];
        const h = this.spikeHeights[i];
        s.position.y = -h / 2 - 0.1 + (h / 2 + 0.28) * k * (1 + 0.08 * Math.sin(k * 9));
      }
      if (dist < 1.2 && jumpY < 0.85) {
        this.mgr.damage(this, 15);
      }
      if (this.timer <= 0) {
        this.state = 'retract';
        this.timer = 0.35;
      }
    } else if (this.state === 'retract') {
      this.timer -= dt;
      const k = Math.max(0, this.timer / 0.35);
      for (let i = 0; i < this.spikeGroup.children.length; i++) {
        const s = this.spikeGroup.children[i];
        const h = this.spikeHeights[i];
        s.position.y = (-h / 2 - 0.1) + (h / 2 + 0.28) * k;
      }
      if (this.timer <= 0) {
        this.state = 'cooldown';
        this.hintMat.emissiveIntensity = 0;
        if (this.mode === 'auto') {
          this.state = 'idle';
          this.timer = rand(this.mgr.rng, 3, 5);
        } else {
          this.timer = 10;
          this.armed = false;
        }
      }
    } else if (this.state === 'cooldown') {
      this.timer -= dt;
      if (this.timer <= 0 && dist > 3.5) {
        this.state = 'idle';
        this.armed = true;
      }
    }
  }

  dispose() {
    this.spikeGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    this.hintMat.dispose();
  }
}

export class RockfallTrap {
  constructor(mgr, x, z, { oneshot = false } = {}) {
    const cfg = mgr.cfg;
    this.mgr = mgr;
    this.x = x;
    this.z = z;
    this.oneshot = oneshot;
    this.dead = false;
    this.state = oneshot ? 'shadow' : 'idle';
    this.timer = oneshot ? 1.5 : 0;
    this.armed = !oneshot;

    if (!oneshot) {
      const pebbleMat = std(cfg.rock);
      for (let i = 0; i < 4; i++) {
        const p = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(mgr.rng, 0.09, 0.17), 0), pebbleMat);
        p.position.set(x + rand(mgr.rng, -0.5, 0.5), 0.06, z + rand(mgr.rng, -0.5, 0.5));
        p.rotation.set(mgr.rng() * 3, mgr.rng() * 3, 0);
        mgr.group.add(p);
      }
    }

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.05, 14),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.set(x, 0.09, z);
    mgr.group.add(this.shadow);

    this.rock = new THREE.Mesh(rockGeometry(mgr.rng, { w: 1.5, h: 1.4, d: 1.5, jag: 0.35 }), std(cfg.rock));
    this.rock.castShadow = this.rock.receiveShadow = true;
    this.rock.visible = false;
    mgr.group.add(this.rock);
    this.collider = {
      minX: x - 1.0,
      maxX: x + 1.0,
      minZ: z - 1.0,
      maxZ: z + 1.0,
    };
    this.blocking = false;
    if (oneshot) mgr.sfx.click({ x, y: 0, z });
  }

  update(dt, px, pz) {
    const dist = Math.hypot(px - this.x, pz - this.z);
    if (this.state === 'idle') {
      if (this.armed && dist < 3.2) {
        this.state = 'shadow';
        this.timer = 1.5;
        this.mgr.sfx.click({ x: this.x, y: 0, z: this.z });
      }
    } else if (this.state === 'shadow') {
      this.timer -= dt;
      const k = 1 - this.timer / 1.5;
      this.shadow.material.opacity = 0.15 + 0.35 * k;
      this.shadow.scale.setScalar(0.25 + k * 1.1);
      if (this.timer <= 0) {
        this.state = 'fall';
        this.timer = 0.22;
        this.rock.visible = true;
        this.rock.position.set(this.x, 11, this.z);
        this.rock.rotation.set(0.3, this.mgr.rng() * 3, 0.2);
      }
    } else if (this.state === 'fall') {
      this.timer -= dt;
      const k = Math.max(0, this.timer / 0.22);
      this.rock.position.y = 0.7 + 10.3 * k * k;
      if (this.timer <= 0) {
        this.state = 'sit';
        this.timer = 2.2;
        this.rock.position.y = 0.62;
        this.shadow.material.opacity = 0;
        this.mgr.sfx.thud({ x: this.x, y: 0.5, z: this.z });
        if (dist < 1.35) this.mgr.damage(this, 25);
        this.blocking = true;
        this.mgr.markDirty();
      }
    } else if (this.state === 'sit') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'fade';
        this.timer = 0.8;
      }
    } else if (this.state === 'fade') {
      this.timer -= dt;
      this.rock.position.y -= dt * 1.4;
      this.rock.scale.multiplyScalar(1 - dt * 0.6);
      if (this.timer <= 0) {
        this.rock.visible = false;
        this.blocking = false;
        this.mgr.markDirty();
        this.rock.scale.setScalar(1);
        if (this.oneshot) {
          this.dead = true;
        } else {
          this.state = 'cooldown';
          this.armed = false;
          this.timer = 12;
        }
      }
    } else if (this.state === 'cooldown') {
      this.timer -= dt;
      if (this.timer <= 0 && dist > 4.5) {
        this.state = 'idle';
        this.armed = true;
      }
    }
  }

  dispose() {
    this.rock.geometry.dispose();
    this.rock.material.dispose();
    this.shadow.geometry.dispose();
    this.shadow.material.dispose();
  }
}

export function buildFakeWallMesh(mgr) {
  const cfg = mgr.cfg;
  const g = new THREE.Group();
  if (mgr.themeId === 'scifi') {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(CELL + 0.9, 3, 1), std(cfg.wall[0], { roughness: 0.4, metalness: 0.7 }));
    wall.position.y = 1.5;
    wall.castShadow = wall.receiveShadow = true;
    g.add(wall);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(CELL + 0.95, 0.1, 0.24), std(cfg.wall[1], { roughness: 0.35, metalness: 0.8 }));
    trim.position.y = 3.05;
    g.add(trim);
  } else {
    const wall = new THREE.Mesh(
      rockGeometry(mgr.rng, { w: CELL + 0.9, h: 3, d: 1, jag: mgr.themeId === 'dungeon' ? 0.5 : 0.42 }),
      std(cfg.wall[0])
    );
    if (!mgr.wallNormal) {
      mgr.wallNormal = makeFacetedNormalMap(mgr.rng, { cells: 7, relief: 1.3 });
    }
    wall.material.normalMap = mgr.wallNormal;
    wall.material.normalScale = new THREE.Vector2(0.8, 0.8);
    wall.position.y = 1.5;
    wall.castShadow = wall.receiveShadow = true;
    g.add(wall);
    if (cfg.wall[1] !== null) {
      const cap = new THREE.Mesh(rockGeometry(mgr.rng, { w: CELL + 1.1, h: 0.5, d: 1.35, jag: 0.16 }), std(cfg.wall[1]));
      cap.position.y = 3.05;
      cap.castShadow = true;
      g.add(cap);
    }
  }
  return g;
}

export class FakeWallTrap {
  constructor(mgr, x, z, horizontal) {
    this.mgr = mgr;
    this.x = x;
    this.z = z;
    this.horizontal = horizontal;
    this.state = 'idle';
    this.timer = 0;
    this.blocking = true;

    this.pivot = new THREE.Group();
    this.pivot.position.set(x, 0, z);
    this.mesh = buildFakeWallMesh(mgr);
    this.mesh.rotation.y = horizontal ? 0 : Math.PI / 2;
    this.pivot.add(this.mesh);
    mgr.group.add(this.pivot);

    const hx = horizontal ? CELL / 2 + 0.55 : 0.55;
    const hz = horizontal ? 0.55 : CELL / 2 + 0.55;
    this.collider = { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz };
  }

  update(dt, px, pz) {
    if (this.state === 'idle') {
      if (Math.hypot(px - this.x, pz - this.z) < 2.35) {
        this.state = 'tilt';
        this.timer = 1.05;
        this.mgr.sfx.crack({ x: this.x, y: 1.5, z: this.z });
        const away = (pz - this.z) * (this.horizontal ? 1 : 0) + (px - this.x) * (this.horizontal ? 0 : 1);
        this.fallSign = away >= 0 ? 1 : -1;
      }
    } else if (this.state === 'tilt') {
      this.timer -= dt;
      const k = 1 - this.timer / 1.05;
      const angle = 0.55 * k * k;
      if (this.horizontal) this.pivot.rotation.x = angle * this.fallSign;
      else this.pivot.rotation.z = -angle * this.fallSign;
      if (this.timer <= 0) {
        this.state = 'fall';
        this.timer = 0.35;
      }
    } else if (this.state === 'fall') {
      this.timer -= dt;
      const k = 1 - Math.max(0, this.timer / 0.35);
      const angle = 0.55 + (Math.PI / 2 - 0.55) * k * k;
      if (this.horizontal) this.pivot.rotation.x = angle * this.fallSign;
      else this.pivot.rotation.z = -angle * this.fallSign;
      if (this.timer <= 0) {
        this.mgr.sfx.crumble({ x: this.x, y: 1, z: this.z });
        this.mgr.sfx.thud({ x: this.x, y: 0.4, z: this.z });
        this.mesh.visible = false;
        this.blocking = false;
        this.mgr.markDirty();
        const cfg = this.mgr.cfg;
        const colors = cfg.wall.filter((c) => c !== null);
        const fallDir = this.horizontal ? new THREE.Vector3(0, 0, this.fallSign) : new THREE.Vector3(this.fallSign, 0, 0);
        for (let i = 0; i < 11; i++) {
          const along = rand(this.mgr.rng, -2.2, 2.2);
          const d = rand(this.mgr.rng, 0.8, 2.4);
          this.mgr.debris.spawn(
            this.x + (this.horizontal ? along : fallDir.x * d),
            0.3,
            this.z + (this.horizontal ? fallDir.z * d : along),
            rand(this.mgr.rng, 0.25, 0.6),
            colors[(this.mgr.rng() * colors.length) | 0],
            new THREE.Vector3(fallDir.x * rand(this.mgr.rng, 1, 3), rand(this.mgr.rng, 1, 3), fallDir.z * rand(this.mgr.rng, 1, 3))
          );
        }
        if (Math.hypot(px - this.x, pz - this.z) < 1.9) {
          this.mgr.damage(this, 20);
        }
        this.state = 'done';
      }
    }
  }

  dispose() {
    this.mesh.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
}

function buildCutObject(mgr, style, offset) {
  const cfg = mgr.cfg;
  const rng = mgr.rng;
  const g = new THREE.Group();
  if (style === 'snowmen') {
    const snow = std(cfg.cutColors[0], { roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), snow);
    body.scale.y = 1.25;
    body.position.y = 0.5;
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.27, 0), snow);
    head.position.y = 1.12;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 5), std(cfg.cutColors[1]));
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 1.15, 0.3);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 6), std(0x2e3644));
    hat.position.y = 1.42;
    g.add(body, head, nose, hat);
    g.scale.setScalar(rand(rng, 0.85, 1.1));
    g.position.x = offset;
    g.userData.color = cfg.cutColors[0];
  } else if (style === 'bushes') {
    const bush = new THREE.Mesh(
      new THREE.IcosahedronGeometry(rand(rng, 0.72, 0.95), 0),
      std(cfg.cutColors[(rng() * 3) | 0])
    );
    bush.position.y = 0.62;
    bush.scale.y = 1.15;
    g.add(bush);
    g.position.x = offset;
    g.userData.color = bush.material.color.getHex();
  } else if (style === 'boards') {
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.72, 2.7, 0.15), std(cfg.cutColors[(rng() * 2) | 0]));
    board.position.y = 1.35;
    board.rotation.z = rand(rng, -0.1, 0.1);
    g.add(board);
    const nail = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.08, 0.19), std(cfg.cutColors[1]));
    nail.position.y = rand(rng, 1.0, 1.8);
    g.add(nail);
    g.position.x = offset;
    g.userData.color = board.material.color.getHex();
  } else {
    for (const px of [-0.45, 0.45]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 2.3, 6),
        std(cfg.cutColors[0], { metalness: 0.7, roughness: 0.4 })
      );
      post.position.set(px, 1.15, 0);
      g.add(post);
    }
    const wireMat = std(0x0a2622, { emissive: cfg.cutColors[1], emissiveIntensity: 1.6 });
    for (const wy of [0.6, 1.25, 1.9]) {
      const wire = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.06, 0.06), wireMat);
      wire.position.y = wy;
      g.add(wire);
    }
    g.position.x = offset;
    g.userData.color = cfg.cutColors[1];
  }
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}

export class CuttableObstacle {
  constructor(mgr, x, z, horizontal) {
    this.mgr = mgr;
    this.x = x;
    this.z = z;
    this.horizontal = horizontal;
    this.hp = 3;
    this.blocking = true;
    this.state = 'alive';
    this.flash = 0;

    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.group.rotation.y = horizontal ? 0 : Math.PI / 2;
    this.partsArr = [];
    const offsets = [-0.85, 0, 0.85];
    for (let i = 0; i < 3; i++) {
      const part = buildCutObject(mgr, mgr.cfg.cut, offsets[i]);
      this.group.add(part);
      this.partsArr.push(part);
    }
    mgr.group.add(this.group);

    const hx = horizontal ? CELL / 2 - 0.55 : 0.4;
    const hz = horizontal ? 0.4 : CELL / 2 - 0.55;
    this.collider = { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz };
  }

  hit() {
    if (this.state !== 'alive') return;
    this.hp--;
    this.flash = 1;
    this.mgr.sfx.crack({ x: this.x, y: 1, z: this.z });
    const idx = this.partsArr.findIndex((p) => p.visible);
    if (idx >= 0) {
      const part = this.partsArr[idx];
      part.visible = false;
      const wp = new THREE.Vector3();
      part.getWorldPosition(wp);
      this.mgr.debris.burst(wp.x, wp.y + 0.6, wp.z, 4, part.userData.color, 2.5);
    }
    if (this.hp <= 0) {
      this.state = 'broken';
      this.blocking = false;
      this.mgr.markDirty();
    }
  }

  update(dt) {
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
}

export class GroundArrow {
  constructor(mgr, x, z, dirX, dirZ, life, y = 0.13) {
    this.x = x;
    this.z = z;
    this.life = life;
    this.dead = false;

    const shape = new THREE.Shape();
    shape.moveTo(-0.26, -1.35);
    shape.lineTo(0.26, -1.35);
    shape.lineTo(0.26, 0.15);
    shape.lineTo(0.7, 0.15);
    shape.lineTo(0, 1.35);
    shape.lineTo(-0.7, 0.15);
    shape.lineTo(-0.26, 0.15);
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(Math.PI / 2);
    this.material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.4, 2, 0),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.set(x, y, z);
    this.mesh.rotation.y = Math.atan2(dirX, dirZ);
    this.mesh.renderOrder = 2;
    mgr.group.add(this.mesh);
  }

  update(dt, px, pz, jumpY, t) {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }
    const pulse = 0.5 + 0.5 * Math.sin(t * 6);
    this.mesh.scale.setScalar(0.94 + pulse * 0.1);
    this.material.opacity = Math.min(1, this.life) * (0.78 + pulse * 0.22);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
