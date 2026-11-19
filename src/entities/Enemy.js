import * as THREE from 'three';
import { CELL, cellCenter } from '../world/themeHelpers.js';
import { rand } from '../core/utils.js';

const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...opts });

function part(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function buildGolem(rng) {
  const g = new THREE.Group();
  const ice = std(0xaecfe8, { roughness: 0.5 });
  const dark = std(0x7d9cbf);
  const eye = std(0x0a2030, { emissive: 0x7fd4ff, emissiveIntensity: 2 });
  g.add(part(new THREE.BoxGeometry(0.8, 0.9, 0.6), ice, 0, 0.85, 0));
  g.add(part(new THREE.IcosahedronGeometry(0.28, 0), ice, 0, 1.55, 0.05));
  g.add(part(new THREE.BoxGeometry(0.09, 0.06, 0.05), eye, -0.11, 1.58, 0.28));
  g.add(part(new THREE.BoxGeometry(0.09, 0.06, 0.05), eye, 0.11, 1.58, 0.28));
  const armL = new THREE.Group();
  armL.position.set(-0.52, 1.15, 0);
  armL.add(part(new THREE.BoxGeometry(0.22, 0.7, 0.24), dark, 0, -0.35, 0));
  const armR = new THREE.Group();
  armR.position.set(0.52, 1.15, 0);
  armR.add(part(new THREE.BoxGeometry(0.22, 0.7, 0.24), dark, 0, -0.35, 0));
  g.add(armL, armR);
  g.add(part(new THREE.ConeGeometry(0.12, 0.4, 5), ice, -0.42, 1.45, -0.15));
  g.add(part(new THREE.ConeGeometry(0.12, 0.4, 5), ice, 0.42, 1.45, -0.15));
  g.add(part(new THREE.BoxGeometry(0.28, 0.45, 0.3), dark, -0.22, 0.22, 0));
  g.add(part(new THREE.BoxGeometry(0.28, 0.45, 0.3), dark, 0.22, 0.22, 0));
  return { group: g, colors: [0xaecfe8, 0x7d9cbf], legs: [armL, armR], arms: [armL, armR], fly: 0 };
}

function buildGoblin(rng, troll) {
  const g = new THREE.Group();
  const skin = std(troll ? 0x8a7455 : 0x6f9c46);
  const cloth = std(troll ? 0x5d4a33 : 0x5a4632);
  const eye = std(0x1a0808, { emissive: troll ? 0xff8a3d : 0xffd24d, emissiveIntensity: 1.6 });
  const s = troll ? 1.35 : 1;
  g.add(part(new THREE.BoxGeometry(0.44 * s, 0.5 * s, 0.32 * s), cloth, 0, 0.62 * s, 0));
  g.add(part(new THREE.BoxGeometry(0.36 * s, 0.32 * s, 0.34 * s), skin, 0, 1.05 * s, 0));
  g.add(part(new THREE.ConeGeometry(0.09 * s, 0.3 * s, 4), skin, -0.17 * s, 1.32 * s, 0));
  g.add(part(new THREE.ConeGeometry(0.09 * s, 0.3 * s, 4), skin, 0.17 * s, 1.32 * s, 0));
  g.add(part(new THREE.BoxGeometry(0.07 * s, 0.05 * s, 0.04 * s), eye, -0.09 * s, 1.1 * s, 0.18 * s));
  g.add(part(new THREE.BoxGeometry(0.07 * s, 0.05 * s, 0.04 * s), eye, 0.09 * s, 1.1 * s, 0.18 * s));
  const legL = new THREE.Group();
  legL.position.set(-0.12 * s, 0.38 * s, 0);
  legL.add(part(new THREE.BoxGeometry(0.13 * s, 0.38 * s, 0.15 * s), skin, 0, -0.19 * s, 0));
  const legR = new THREE.Group();
  legR.position.set(0.12 * s, 0.38 * s, 0);
  legR.add(part(new THREE.BoxGeometry(0.13 * s, 0.38 * s, 0.15 * s), skin, 0, -0.19 * s, 0));
  const armL = new THREE.Group();
  armL.position.set(-0.29 * s, 0.82 * s, 0);
  armL.add(part(new THREE.BoxGeometry(0.1 * s, 0.4 * s, 0.12 * s), skin, 0, -0.2 * s, 0));
  const armR = new THREE.Group();
  armR.position.set(0.29 * s, 0.82 * s, 0);
  armR.add(part(new THREE.BoxGeometry(0.1 * s, 0.4 * s, 0.12 * s), skin, 0, -0.2 * s, 0));
  armR.add(part(new THREE.IcosahedronGeometry(0.14 * s, 0), std(0x8a8d84), 0, -0.44 * s, 0.1));
  g.add(legL, legR, armL, armR);
  return {
    group: g,
    colors: troll ? [0x8a7455, 0x5d4a33, 0x8a8d84] : [0x6f9c46, 0x5a4632],
    legs: [legL, legR],
    arms: [armL, armR],
    fly: 0,
  };
}

function buildDrone(rng) {
  const g = new THREE.Group();
  const metal = std(0x8fa3bd, { metalness: 0.7, roughness: 0.35 });
  const dark = std(0x2a3240, { metalness: 0.6, roughness: 0.4 });
  const eye = std(0x200404, { emissive: 0xff4040, emissiveIntensity: 2.4 });
  g.add(part(new THREE.IcosahedronGeometry(0.34, 0), metal, 0, 0, 0));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 5, 16), dark);
  ring.rotation.x = Math.PI / 2;
  ring.castShadow = true;
  g.add(ring);
  g.add(part(new THREE.BoxGeometry(0.14, 0.1, 0.1), eye, 0, 0, 0.3));
  g.add(part(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), dark, 0, 0.42, 0));
  g.add(part(new THREE.OctahedronGeometry(0.05), std(0x0a2030, { emissive: 0x35e0ff, emissiveIntensity: 2 }), 0, 0.6, 0));
  return { group: g, colors: [0x8fa3bd, 0x2a3240], ring, fly: 1.15 };
}

function buildSpider(rng, spitter) {
  const g = new THREE.Group();
  const body = std(0x3a3f4c);
  const dark = std(0x23262e);
  const eye = std(0x1a0505, { emissive: spitter ? 0x7fdc4a : 0xff5030, emissiveIntensity: 2.2 });
  g.add(part(new THREE.IcosahedronGeometry(0.42, 0), body, 0, 0.5, -0.1));
  g.add(part(new THREE.IcosahedronGeometry(0.26, 0), dark, 0, 0.48, 0.3));
  g.add(part(new THREE.BoxGeometry(0.06, 0.05, 0.04), eye, -0.09, 0.55, 0.5));
  g.add(part(new THREE.BoxGeometry(0.06, 0.05, 0.04), eye, 0.09, 0.55, 0.5));
  if (spitter) {
    g.add(part(new THREE.IcosahedronGeometry(0.18, 0), std(0x4a6b2e, { emissive: 0x7fdc4a, emissiveIntensity: 0.8 }), 0, 0.72, -0.15));
  }
  const legs = [];
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1;
    const k = i % 3;
    const leg = new THREE.Group();
    leg.position.set(side * 0.3, 0.5, -0.15 + k * 0.25);
    const seg = part(new THREE.BoxGeometry(0.72, 0.06, 0.07), dark, side * 0.28, -0.23, 0);
    seg.rotation.z = -side * 0.68;
    leg.add(seg);
    g.add(leg);
    legs.push(leg);
  }
  return { group: g, colors: spitter ? [0x3a3f4c, 0x4a6b2e] : [0x3a3f4c, 0x23262e], legs, spider: true, fly: 0 };
}

function buildGhost(rng, tint) {
  const g = new THREE.Group();
  const cloakMat = new THREE.MeshStandardMaterial({
    color: tint,
    roughness: 0.8,
    flatShading: true,
    transparent: true,
    opacity: 0.42,
    emissive: tint,
    emissiveIntensity: 0.25,
    depthWrite: false,
  });
  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.5, 8, 3, true), cloakMat);
  cloak.position.y = 0.95;
  g.add(cloak);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), cloakMat);
  head.position.y = 1.72;
  g.add(head);
  const eyeMat = std(0x050510, { emissive: 0xdfefff, emissiveIntensity: 1.8 });
  g.add(part(new THREE.BoxGeometry(0.07, 0.09, 0.05), eyeMat, -0.1, 1.75, 0.2));
  g.add(part(new THREE.BoxGeometry(0.07, 0.09, 0.05), eyeMat, 0.1, 1.75, 0.2));
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.14, 0),
    std(0x101418, { emissive: tint, emissiveIntensity: 1.6 })
  );
  core.position.y = 1.1;
  g.add(core);
  return { group: g, colors: [tint], fly: 0.5, ghost: true, cloakMat };
}

function buildWisp(rng) {
  const g = new THREE.Group();
  const coreMat = std(0x201505, { emissive: 0xffd08a, emissiveIntensity: 3 });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), coreMat);
  g.add(core);
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0xffd08a,
    transparent: true,
    opacity: 0.18,
    emissive: 0xffd08a,
    emissiveIntensity: 0.8,
    depthWrite: false,
  });
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), shellMat);
  g.add(shell);
  const light = new THREE.PointLight(0xffb454, 26, 15, 2);
  g.add(light);
  return { group: g, colors: [0xffd08a], fly: 1.3, wisp: true, light, coreMat, shellMat };
}

const SETS = {
  winter: [
    {
      kind: 'golem',
      hp: 3,
      speed: 1.5,
      chase: 2.3,
      sight: 10,
      damage: 12,
      radius: 0.55,
      ranged: { kind: 'arc', speed: 9, dmg: 10, color: 0xaecfe8, g: 9 },
    },
    { kind: 'ghost', pattern: 'phase', tint: 0xbfe3ff, hp: 2, speed: 1.7, sense: 11, damage: 8, radius: 0.35 },
  ],
  forest: [
    {
      kind: 'goblin',
      hp: 2,
      speed: 2.0,
      chase: 3.3,
      sight: 11,
      damage: 8,
      radius: 0.4,
      ranged: { kind: 'arc', speed: 10, dmg: 9, color: 0x8a8d84, g: 11, troll: true },
    },
    { kind: 'ghost', pattern: 'phase', tint: 0xc8f0b0, hp: 2, speed: 1.8, sense: 11, damage: 8, radius: 0.35 },
  ],
  scifi: [
    {
      kind: 'drone',
      hp: 2,
      speed: 2.3,
      chase: 3.7,
      sight: 12,
      damage: 10,
      radius: 0.45,
      ranged: { kind: 'laser', dmg: 11 },
    },
    { kind: 'ghost', pattern: 'phase', tint: 0x9fdcff, hp: 2, speed: 1.9, sense: 12, damage: 9, radius: 0.35 },
  ],
  dungeon: [
    {
      kind: 'spider',
      pattern: 'ambush',
      hp: 2,
      speed: 0.6,
      chase: 4.1,
      sight: 9,
      damage: 10,
      radius: 0.45,
      ranged: { kind: 'arc', speed: 8, dmg: 8, color: 0x7fdc4a, g: 7, spitter: true },
    },
    { kind: 'wisp', pattern: 'phase', hp: 2, speed: 2.1, sense: 13, damage: 8, radius: 0.35 },
  ],
};

function worldToCell(maze, x, z) {
  return {
    x: Math.round(x / CELL + (maze.cols - 1) / 2),
    y: Math.round(z / CELL + (maze.rows - 1) / 2),
  };
}

function hasLOS(maze, x0, z0, x1, z1) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.4));
  let pc = worldToCell(maze, x0, z0);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const c = worldToCell(maze, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t);
    if (!maze.inBounds(c.x, c.y)) return false;
    if (c.x === pc.x && c.y === pc.y) continue;
    const dx = c.x - pc.x;
    const dy = c.y - pc.y;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return false;
    if (dx !== 0 && dy !== 0) {
      const hOk = !maze.cell(pc.x, pc.y).walls[dx > 0 ? 'right' : 'left'] && !maze.cell(c.x, pc.y).walls[dy > 0 ? 'bottom' : 'top'];
      const vOk = !maze.cell(pc.x, pc.y).walls[dy > 0 ? 'bottom' : 'top'] && !maze.cell(pc.x, c.y).walls[dx > 0 ? 'right' : 'left'];
      if (!hOk && !vOk) return false;
    } else if (dx !== 0) {
      if (maze.cell(pc.x, pc.y).walls[dx > 0 ? 'right' : 'left']) return false;
    } else if (maze.cell(pc.x, pc.y).walls[dy > 0 ? 'bottom' : 'top']) {
      return false;
    }
    pc = c;
  }
  return true;
}

const DIRS = {
  top: [0, -1],
  bottom: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

class Enemy {
  constructor(mgr, def, cell) {
    this.mgr = mgr;
    this.def = def;
    this.hp = def.hp;
    this.alive = true;
    this.dying = 0;
    this.burstDone = false;
    this.cell = { ...cell };
    const c = cellCenter(mgr.maze, cell.x, cell.y);
    this.pos = new THREE.Vector3(c.x, 0, c.z);
    this.target = null;
    this.state = def.pattern === 'phase' ? 'drift' : 'patrol';
    this.attackCd = rand(mgr.rng, 0.5, 1.5);
    this.hitFlash = 0;
    this.attackAnim = 0;
    this.aimT = 0;
    this.fireCd = rand(mgr.rng, 0.5, 2);
    this.knock = new THREE.Vector3();
    this.angle = mgr.rng() * Math.PI * 2;
    this.lostTimer = 0;
    this.phase = mgr.rng() * Math.PI * 2;
    this.wake = def.pattern === 'phase' ? rand(mgr.rng, 3, 5) : rand(mgr.rng, 1, 2.5);

    if (def.kind === 'golem') this.model = buildGolem(mgr.rng);
    else if (def.kind === 'goblin') this.model = buildGoblin(mgr.rng, !!def.rangedCfg?.troll);
    else if (def.kind === 'drone') this.model = buildDrone(mgr.rng);
    else if (def.kind === 'spider') this.model = buildSpider(mgr.rng, !!def.rangedCfg?.spitter);
    else if (def.kind === 'ghost') this.model = buildGhost(mgr.rng, def.tint);
    else this.model = buildWisp(mgr.rng);

    this.group = new THREE.Group();
    this.group.add(this.model.group);
    this.group.position.copy(this.pos);
    mgr.group.add(this.group);
    this.mats = [];
    this.model.group.traverse((o) => {
      if (o.isMesh && o.material && !o.material.transparent) {
        o.material.userData.baseEmissive = o.material.emissive.getHex();
        o.material.userData.baseEmissiveI = o.material.emissiveIntensity;
        this.mats.push(o.material);
      }
    });
    if (def.role === 'ranged' && def.rangedCfg?.kind === 'laser') {
      this.aimBeam = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.03, 1),
        new THREE.MeshBasicMaterial({ color: 0xff5040, transparent: true, opacity: 0, depthWrite: false })
      );
      mgr.group.add(this.aimBeam);
    }
  }

  hit(fromX, fromZ) {
    if (!this.alive) return;
    this.hp--;
    this.hitFlash = 1;
    const dx = this.pos.x - fromX;
    const dz = this.pos.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.knock.set((dx / len) * 7, 0, (dz / len) * 7);
    if (this.hp <= 0) {
      this.alive = false;
      this.dying = 0.95;
      this.mgr.sfx.crumble({ x: this.pos.x, y: 0.8, z: this.pos.z });
    } else {
      this.mgr.sfx.crack({ x: this.pos.x, y: 1, z: this.pos.z });
      this.aimT = 0;
    }
  }

  stepTo(x, z, speed, dt) {
    const dx = x - this.pos.x;
    const dz = z - this.pos.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.02) return true;
    const k = Math.min(1, (speed * dt) / len);
    this.pos.x += dx * k;
    this.pos.z += dz * k;
    const target = Math.atan2(dx, dz);
    let diff = target - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.angle += diff * Math.min(1, dt * 10);
    return false;
  }

  pickNeighbor() {
    const maze = this.mgr.maze;
    const options = [];
    for (const [dir, v] of Object.entries(DIRS)) {
      if (maze.cell(this.cell.x, this.cell.y).walls[dir]) continue;
      options.push({ x: this.cell.x + v[0], y: this.cell.y + v[1] });
    }
    if (!options.length) return null;
    return options[(this.mgr.rng() * options.length) | 0];
  }

  patrolStep(dt) {
    if (!this.target) {
      const n = this.pickNeighbor();
      if (n) this.target = cellCenter(this.mgr.maze, n.x, n.y);
    }
    if (this.target && this.stepTo(this.target.x, this.target.z, this.def.speed, dt)) {
      this.cell = worldToCell(this.mgr.maze, this.target.x, this.target.z);
      this.target = null;
    }
  }

  updateDying(dt) {
    this.dying -= dt;
    const k = 1 - Math.max(0, this.dying / 0.95);
    if (this.model.fly > 0) {
      this.model.group.position.y = Math.max(0.18, this.model.fly * (1 - k));
      const sh = k > 0.5 ? Math.max(0.01, 1 - (k - 0.5) * 2) : 1;
      this.model.group.scale.setScalar(sh);
    } else {
      this.model.group.rotation.x = -Math.min(1, k * 1.6) * (Math.PI / 2) * 0.95;
      this.group.position.y = -Math.min(1, k * 1.6) * 0.12;
    }
    if (this.dying < 0.35 && !this.burstDone) {
      this.burstDone = true;
      this.mgr.debris.burst(this.pos.x, 0.7, this.pos.z, 9, this.model.colors, 3.2);
      this.group.visible = false;
      if (this.aimBeam) this.aimBeam.visible = false;
    }
  }

  fireAt(px, pz, jumpY) {
    const cfg = this.def.rangedCfg;
    if (cfg.kind === 'laser') {
      const dx = px - this.pos.x;
      const dz = pz - this.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      this.mgr.spawnBeam(this.pos.x, 1.2 + this.model.fly, this.pos.z, px, 1 + jumpY, pz, 0.06, 0xff5040);
      this.mgr.sfx.zap({ x: this.pos.x, y: 1.5, z: this.pos.z });
      if (d < this.def.sight && hasLOS(this.mgr.maze, this.pos.x, this.pos.z, px, pz)) {
        this.mgr.damage(this.pos, cfg.dmg);
      }
    } else {
      const y0 = 1.2 + this.model.fly;
      const dx = px - this.pos.x;
      const dz = pz - this.pos.z;
      const d = Math.hypot(dx, dz);
      const T = Math.max(0.35, d / cfg.speed);
      const vel = new THREE.Vector3(dx / T, (1.0 + jumpY - y0) / T + 0.5 * cfg.g * T, dz / T);
      this.mgr.spawnProjectile(this.pos.x, y0, this.pos.z, vel, cfg);
      this.mgr.sfx.whoosh({ x: this.pos.x, y: 1.5, z: this.pos.z });
    }
  }

  update(dt, px, pz, jumpY, t, combat) {
    if (!this.alive) {
      this.updateDying(dt);
      return;
    }
    this.wake -= dt;
    const dist = Math.hypot(px - this.pos.x, pz - this.pos.z);
    this.attackCd -= dt;
    this.fireCd -= dt;
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 3);
    if (this.attackAnim > 0) this.attackAnim -= dt;
    if (this.knock.lengthSq() > 0.01) {
      this.pos.addScaledVector(this.knock, dt);
      this.knock.multiplyScalar(Math.max(0, 1 - dt * 6));
    }

    const def = this.def;
    const awake = this.wake <= 0;
    if (def.pattern === 'phase') {
      if (!awake || !combat) {
        this.state = 'drift';
      } else if (this.state === 'chase') {
        this.stepTo(px, pz, def.speed, dt);
        if (dist > def.sense * 1.5) this.state = 'drift';
      } else {
        if (dist < 4.5 || (dist < def.sense && hasLOS(this.mgr.maze, this.pos.x, this.pos.z, px, pz))) {
          this.state = 'chase';
        }
        if (!this.driftTarget || this.stepTo(this.driftTarget.x, this.driftTarget.z, def.speed * 0.45, dt)) {
          this.driftTarget = cellCenter(this.mgr.maze, (this.mgr.rng() * this.mgr.maze.cols) | 0, (this.mgr.rng() * this.mgr.maze.rows) | 0);
        }
      }
      if (combat && awake && dist < 1.2 && this.attackCd <= 0 && jumpY < 1.4) {
        this.attackCd = 1.2;
        this.attackAnim = 0.35;
        this.mgr.damage(this.pos, def.damage);
      }
    } else if (def.role === 'ranged') {
      const los = hasLOS(this.mgr.maze, this.pos.x, this.pos.z, px, pz);
      if (!awake || !combat || (!los && dist > def.sight)) {
        this.aimT = 0;
        this.patrolStep(dt);
      } else if (dist < 3.2) {
        this.stepTo(this.pos.x * 2 - px, this.pos.z * 2 - pz, def.speed * 0.9, dt);
        this.aimT = 0;
      } else {
        const face = Math.atan2(px - this.pos.x, pz - this.pos.z);
        let diff = face - this.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.angle += diff * Math.min(1, dt * 6);
        if (dist > def.sight * 0.85) this.stepTo(px, pz, def.speed * 0.7, dt);
        if (combat && this.aimT > 0) {
          this.aimT -= dt;
          if (this.aimBeam) this.updateAimBeam(px, pz, jumpY);
          if (this.aimT <= 0) {
            if (this.aimBeam) this.aimBeam.material.opacity = 0;
            this.fireAt(px, pz, jumpY);
            this.attackAnim = 0.3;
            this.fireCd = rand(this.mgr.rng, 2.2, 3.2);
          }
        } else if (combat && this.fireCd <= 0) {
          this.aimT = def.rangedCfg.kind === 'laser' ? 0.75 : 0.55;
          if (this.aimBeam) this.updateAimBeam(px, pz, jumpY);
        }
      }
    } else {
      const los = hasLOS(this.mgr.maze, this.pos.x, this.pos.z, px, pz);
      if (this.state === 'patrol') {
        if (def.pattern === 'ambush') {
          this.angle += Math.sin(t * 1.5 + this.phase) * dt * 0.4;
          if (awake && combat && los && dist < def.sight) {
            this.state = 'chase';
            this.attackAnim = 0.3;
          }
        } else {
          if (awake && combat && los && dist < def.sight) this.state = 'chase';
          this.patrolStep(dt);
        }
      } else if (combat) {
        if (!los && dist > def.sight * 1.3) {
          this.lostTimer += dt;
          if (this.lostTimer > 2.5) {
            this.state = 'patrol';
            this.lostTimer = 0;
            this.target = null;
          }
        } else {
          this.lostTimer = 0;
        }
        const next = this.mgr.nextStepFrom(this.cell);
        if (next) {
          const c = cellCenter(this.mgr.maze, next.x, next.y);
          this.stepTo(c.x, c.z, def.chase, dt);
          this.cell = worldToCell(this.mgr.maze, this.pos.x, this.pos.z);
        } else {
          this.stepTo(px, pz, def.chase, dt);
        }
        if (combat && awake && dist < 1.4 && this.attackCd <= 0 && jumpY < 1.6) {
          this.attackCd = 1.15;
          this.attackAnim = 0.35;
          this.mgr.damage(this.pos, def.damage);
        }
      } else {
        this.state = 'patrol';
        this.target = null;
        this.lostTimer = 0;
      }
    }

    this.group.position.set(this.pos.x, 0, this.pos.z);
    this.group.rotation.y = this.angle;
    const m = this.model;
    const bobSpeed = this.state === 'chase' || this.aimT > 0 ? 11 : 6;
    if (m.fly > 0) {
      m.group.position.y = m.fly + Math.sin(t * 2.2 + this.phase) * 0.15;
      if (m.ring) m.ring.rotation.z += dt * 4;
      if (m.wisp) {
        m.group.rotation.y += dt * 2;
        m.group.rotation.x += dt * 0.8;
      }
    } else {
      m.group.position.y = Math.abs(Math.sin(t * bobSpeed + this.phase)) * 0.06;
    }
    if (m.legs && !m.spider) {
      const sw = Math.sin(t * bobSpeed + this.phase);
      m.legs[0].rotation.x = sw * 0.6;
      m.legs[1].rotation.x = -sw * 0.6;
    }
    if (m.spider) {
      for (let i = 0; i < m.legs.length; i++) {
        m.legs[i].rotation.x = Math.sin(t * 14 + i * 1.9 + this.phase) * 0.35;
      }
    }
    if (m.ghost) {
      m.cloakMat.opacity = 0.34 + Math.sin(t * 3 + this.phase) * 0.08 + (this.state === 'chase' ? 0.12 : 0);
      m.group.rotation.y = Math.sin(t * 1.7 + this.phase) * 0.3;
    }
    if (this.aimT > 0) {
      m.group.scale.setScalar(1 + Math.sin(t * 24) * 0.05);
    } else {
      m.group.scale.setScalar(1);
    }
    if (this.attackAnim > 0) {
      m.group.rotation.x = -Math.sin(((0.35 - this.attackAnim) / 0.35) * Math.PI) * 0.45;
    } else {
      m.group.rotation.x = 0;
    }
    for (const mat of this.mats) {
      if (this.hitFlash > 0) {
        mat.emissive.setHex(0xff4030);
        mat.emissiveIntensity = this.hitFlash;
      } else {
        mat.emissive.setHex(mat.userData.baseEmissive);
        mat.emissiveIntensity = mat.userData.baseEmissiveI;
      }
    }
    if (m.wisp) {
      if (this.state === 'chase') {
        const blink = 1.4 + Math.sin(t * 16) * 1.2;
        m.coreMat.emissive.setHex(0xff2810);
        m.coreMat.emissiveIntensity = Math.max(0.25, blink);
        m.shellMat.emissive.setHex(0xff2810);
        m.shellMat.color.setHex(0xff2810);
        m.light.color.setHex(0xff4030);
        m.light.intensity = 16 + Math.sin(t * 16) * 9;
      } else {
        m.coreMat.emissive.setHex(0xffd08a);
        m.coreMat.emissiveIntensity = 3;
        m.shellMat.emissive.setHex(0xffd08a);
        m.shellMat.color.setHex(0xffd08a);
        m.light.color.setHex(0xffb454);
        m.light.intensity = 26;
      }
    }
  }

  updateAimBeam(px, pz, jumpY) {
    const y0 = 1.2 + this.model.fly;
    const beam = this.aimBeam;
    const dx = px - this.pos.x;
    const dz = pz - this.pos.z;
    const len = Math.hypot(dx, dz);
    beam.scale.set(1, 1, len);
    beam.position.set(this.pos.x + dx / 2, (y0 + 1 + jumpY) / 2, this.pos.z + dz / 2);
    beam.lookAt(px, 1 + jumpY, pz);
    beam.material.opacity = 0.3 + Math.sin(this.aimT * 40) * 0.15;
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    if (this.aimBeam) {
      this.aimBeam.geometry.dispose();
      this.aimBeam.material.dispose();
      if (this.aimBeam.parent) this.aimBeam.parent.remove(this.aimBeam);
    }
  }
}

export class EnemyManager {
  constructor(engine) {
    this.engine = engine;
    this.group = null;
    this.enemies = [];
    this.projectiles = [];
    this.beams = [];
    this.maze = null;
    this.rng = null;
    this.player = null;
    this.debris = null;
    this.sfx = null;
    this.playerDist = null;
    this.distTimer = 0;
    this.onDamage = null;
    this.armed = false;
  }

  build(maze, themeId, rng, player, debris, sfx) {
    this.dispose();
    this.maze = maze;
    this.rng = rng;
    this.player = player;
    this.debris = debris;
    this.sfx = sfx;
    this.armed = false;
    this.group = new THREE.Group();
    this.engine.scene.add(this.group);
    const set = SETS[themeId] || SETS.winter;

    const distS = this.bfsFrom(maze, maze.start);
    const distF = this.bfsFrom(maze, maze.finish);
    const pool = [];
    const farPool = [];
    for (let y = 0; y < maze.rows; y++) {
      for (let x = 0; x < maze.cols; x++) {
        if (distF[y][x] < 3) continue;
        if (distS[y][x] >= 5) pool.push({ x, y });
        if (distS[y][x] >= 8) farPool.push({ x, y });
      }
    }
    const sh = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = (rng() * (i + 1)) | 0;
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };
    sh(pool);
    sh(farPool);

    const nWalkers = 2 + Math.floor(maze.cols / 8);
    const nSpecials = 1 + Math.floor(maze.cols / 10);
    let pi = 0;
    let fi = 0;
    for (let i = 0; i < nWalkers && pool.length; i++) {
      const base = set[0];
      const def = { ...base, role: 'melee' };
      if (base.ranged && rng() < 0.45) {
        def.role = 'ranged';
        def.rangedCfg = base.ranged;
      }
      this.enemies.push(new Enemy(this, def, pool[pi++ % pool.length]));
    }
    for (let i = 0; i < nSpecials && (farPool.length || pool.length); i++) {
      const src = farPool.length ? farPool : pool;
      this.enemies.push(new Enemy(this, { ...set[1], role: 'melee' }, src === farPool ? farPool[fi++ % farPool.length] : pool[pi++ % pool.length]));
    }
    this.recomputeDist();
  }

  recomputeDist() {
    const p = this.player.position;
    const cell = worldToCell(this.maze, p.x, p.z);
    if (this.maze.inBounds(cell.x, cell.y)) {
      this.playerDist = this.bfsFrom(this.maze, cell);
    }
  }

  nextStepFrom(cell) {
    if (!this.playerDist) return null;
    const base = this.playerDist[cell.y] ? this.playerDist[cell.y][cell.x] : -1;
    if (base === undefined || base < 0) return null;
    let best = null;
    let bestD = base;
    const maze = this.maze;
    for (const [dir, v] of Object.entries(DIRS)) {
      if (maze.cell(cell.x, cell.y).walls[dir]) continue;
      const nx = cell.x + v[0];
      const ny = cell.y + v[1];
      if (!maze.inBounds(nx, ny)) continue;
      const nd = this.playerDist[ny][nx];
      if (nd >= 0 && nd < bestD) {
        bestD = nd;
        best = { x: nx, y: ny };
      }
    }
    return best;
  }

  bfsFrom(maze, from) {
    const dist = Array.from({ length: maze.rows }, () => new Array(maze.cols).fill(-1));
    dist[from.y][from.x] = 0;
    const q = [from];
    let head = 0;
    while (head < q.length) {
      const c = q[head++];
      for (const [dir, v] of Object.entries(DIRS)) {
        if (maze.cell(c.x, c.y).walls[dir]) continue;
        const nx = c.x + v[0];
        const ny = c.y + v[1];
        if (!maze.inBounds(nx, ny) || dist[ny][nx] !== -1) continue;
        dist[ny][nx] = dist[c.y][c.x] + 1;
        q.push({ x: nx, y: ny });
      }
    }
    return dist;
  }

  spawnProjectile(x, y, z, vel, cfg) {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.16, 0),
      std(cfg.color, { roughness: 0.6 })
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    this.group.add(mesh);
    this.projectiles.push({ mesh, vel, g: cfg.g || 0, life: 3.5, dmg: cfg.dmg, color: cfg.color });
  }

  spawnBeam(x0, y0, z0, x1, y1, z1, radius, color) {
    const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(radius, radius, len),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false })
    );
    beam.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    beam.lookAt(x1, y1, z1);
    this.group.add(beam);
    this.beams.push({ mesh: beam, life: 0.18 });
  }

  updateProjectiles(dt, playerPos, jumpY) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      const prevX = p.mesh.position.x;
      const prevZ = p.mesh.position.z;
      p.vel.y -= p.g * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 6;
      p.mesh.rotation.y += dt * 4;
      const pos = p.mesh.position;
      let dead = p.life <= 0 || pos.y < 0.1;
      if (!dead && !hasLOS(this.maze, prevX, prevZ, pos.x, pos.z)) dead = true;
      if (!dead) {
        const dx = pos.x - playerPos.x;
        const dz = pos.z - playerPos.z;
        const dy = pos.y - (jumpY + 0.9);
        if (dx * dx + dz * dz < 0.42 && Math.abs(dy) < 1.0) {
          this.damage(pos, p.dmg);
          dead = true;
        }
      }
      if (dead) {
        this.debris.burst(pos.x, Math.max(0.2, pos.y), pos.z, 3, p.color, 1.6);
        this.sfx.thud({ x: pos.x, y: 0.3, z: pos.z });
        this.group.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.projectiles.splice(i, 1);
      }
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.life -= dt;
      b.mesh.material.opacity = Math.max(0, b.life / 0.18) * 0.85;
      if (b.life <= 0) {
        this.group.remove(b.mesh);
        b.mesh.geometry.dispose();
        b.mesh.material.dispose();
        this.beams.splice(i, 1);
      }
    }
  }

  resolveCollisions(playerPos) {
    const pr = 0.42;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.pos.x - playerPos.x;
      const dz = e.pos.z - playerPos.z;
      const d = Math.hypot(dx, dz);
      const min = pr + e.def.radius;
      if (d < min && d > 1e-4) {
        e.pos.x = playerPos.x + (dx / d) * min;
        e.pos.z = playerPos.z + (dz / d) * min;
      }
    }
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (!b.alive) continue;
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        const min = a.def.radius + b.def.radius;
        if (d < min && d > 1e-4) {
          const push = (min - d) / 2;
          a.pos.x -= (dx / d) * push;
          a.pos.z -= (dz / d) * push;
          b.pos.x += (dx / d) * push;
          b.pos.z += (dz / d) * push;
        }
      }
    }
    for (const e of this.enemies) {
      if (e.alive && e.def.pattern !== 'phase') this.resolveWalls(e);
    }
  }

  resolveWalls(e) {
    const r = e.def.radius;
    const lists = [this.player.colliders, this.player.extraColliders];
    for (const list of lists) {
      if (!list) continue;
      for (const c of list) {
        if (e.pos.x < c.minX - r || e.pos.x > c.maxX + r || e.pos.z < c.minZ - r || e.pos.z > c.maxZ + r) continue;
        const cx = Math.min(Math.max(e.pos.x, c.minX), c.maxX);
        const cz = Math.min(Math.max(e.pos.z, c.minZ), c.maxZ);
        const dx = e.pos.x - cx;
        const dz = e.pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          const push = r - d;
          e.pos.x += (dx / d) * push;
          e.pos.z += (dz / d) * push;
        } else {
          const dl = e.pos.x - (c.minX - r);
          const dr = c.maxX + r - e.pos.x;
          const dn = e.pos.z - (c.minZ - r);
          const df = c.maxZ + r - e.pos.z;
          const m = Math.min(dl, dr, dn, df);
          if (m === dl) e.pos.x = c.minX - r;
          else if (m === dr) e.pos.x = c.maxX + r;
          else if (m === dn) e.pos.z = c.minZ - r;
          else e.pos.z = c.maxZ + r;
        }
      }
    }
  }

  update(dt, playerPos, jumpY, t, combat) {
    if (!this.armed) {
      const c = worldToCell(this.maze, playerPos.x, playerPos.z);
      if (c.x !== this.maze.start.x || c.y !== this.maze.start.y) this.armed = true;
    }
    const live = combat && this.armed;
    this.distTimer -= dt;
    if (this.distTimer <= 0) {
      this.distTimer = 0.5;
      this.recomputeDist();
    }
    for (const e of this.enemies) {
      e.update(dt, playerPos.x, playerPos.z, jumpY, t, live);
    }
    this.resolveCollisions(playerPos);
    this.updateProjectiles(dt, playerPos, jumpY);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (!this.enemies[i].alive && this.enemies[i].dying <= 0) {
        this.enemies[i].dispose();
        this.group.remove(this.enemies[i].group);
        this.enemies.splice(i, 1);
      }
    }
  }

  handleAttack(pos, angle) {
    const fx = Math.sin(angle);
    const fz = Math.cos(angle);
    let hit = false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.pos.x - pos.x;
      const dz = e.pos.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.5) continue;
      if (d < 0.35) {
        e.hit(pos.x, pos.z);
        hit = true;
        continue;
      }
      const dot = (dx / d) * fx + (dz / d) * fz;
      if (dot > 0.4) {
        e.hit(pos.x, pos.z);
        hit = true;
      }
    }
    return hit;
  }

  damage(fromPos, amount) {
    if (this.onDamage) this.onDamage(amount, fromPos);
  }

  dispose() {
    for (const e of this.enemies) e.dispose();
    this.enemies.length = 0;
    for (const p of this.projectiles) {
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
    this.projectiles.length = 0;
    for (const b of this.beams) {
      b.mesh.geometry.dispose();
      b.mesh.material.dispose();
    }
    this.beams.length = 0;
    if (this.group) {
      this.engine.scene.remove(this.group);
      this.group = null;
    }
  }
}
