import * as THREE from 'three';

const SPEED = 6.2;
const RUN_SPEED = 10.6;
const RADIUS = 0.42;
const JUMP_V = 8.6;
const GRAVITY = 25;
const ATTACK_DUR = 0.4;
const UP = new THREE.Vector3(0, 1, 0);

function mesh(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function buildKnight() {
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x8494ad, roughness: 0.55, metalness: 0.35, flatShading: true });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0x3e5a8c, roughness: 0.9, flatShading: true });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2e3644, roughness: 0.85, flatShading: true });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0b48c, roughness: 0.9, flatShading: true });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xdde7f2, roughness: 0.25, metalness: 0.85, flatShading: true });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.4, metalness: 0.7, flatShading: true });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0x442200,
    emissive: 0xffb35c,
    emissiveIntensity: 1.6,
    roughness: 0.5,
    flatShading: true,
  });

  const root = new THREE.Group();
  root.add(mesh(new THREE.BoxGeometry(0.46, 0.24, 0.3), darkMat, 0, 0.56, 0));
  root.add(mesh(new THREE.BoxGeometry(0.52, 0.56, 0.32), armorMat, 0, 0.94, 0));
  root.add(mesh(new THREE.BoxGeometry(0.56, 0.1, 0.36), darkMat, 0, 0.68, 0));
  root.add(mesh(new THREE.BoxGeometry(0.18, 0.42, 0.03), clothMat, 0, 0.82, 0.17));
  root.add(mesh(new THREE.BoxGeometry(0.3, 0.26, 0.28), skinMat, 0, 1.38, 0));
  root.add(mesh(new THREE.BoxGeometry(0.36, 0.16, 0.34), armorMat, 0, 1.54, 0));
  root.add(mesh(new THREE.ConeGeometry(0.14, 0.22, 4), goldMat, 0, 1.71, 0));
  root.add(mesh(new THREE.BoxGeometry(0.2, 0.12, 0.34), armorMat, 0.37, 1.18, 0));
  root.add(mesh(new THREE.BoxGeometry(0.2, 0.12, 0.34), armorMat, -0.37, 1.18, 0));
  const swordArm = new THREE.Group();
  swordArm.position.set(-0.38, 1.16, 0);
  swordArm.add(mesh(new THREE.BoxGeometry(0.14, 0.52, 0.16), armorMat, 0, -0.26, 0));
  swordArm.add(mesh(new THREE.BoxGeometry(0.05, 0.16, 0.05), darkMat, 0, -0.58, 0));
  swordArm.add(mesh(new THREE.BoxGeometry(0.22, 0.05, 0.07), goldMat, 0, -0.66, 0));
  swordArm.add(mesh(new THREE.BoxGeometry(0.07, 0.82, 0.025), bladeMat, 0, -1.1, 0));
  swordArm.add(mesh(new THREE.OctahedronGeometry(0.055), bladeMat, 0, -1.54, 0));
  root.add(swordArm);

  const lanternArm = new THREE.Group();
  lanternArm.position.set(0.38, 1.16, 0);
  lanternArm.add(mesh(new THREE.BoxGeometry(0.14, 0.52, 0.16), armorMat, 0, -0.26, 0));
  lanternArm.add(mesh(new THREE.BoxGeometry(0.03, 0.18, 0.03), darkMat, 0, -0.62, 0.05));
  lanternArm.add(mesh(new THREE.BoxGeometry(0.13, 0.16, 0.13), lanternMat, 0, -0.74, 0.05));
  root.add(lanternArm);

  const legL = new THREE.Group();
  legL.position.set(-0.13, 0.48, 0);
  legL.add(mesh(new THREE.BoxGeometry(0.17, 0.44, 0.2), darkMat, 0, -0.22, 0));
  legL.add(mesh(new THREE.BoxGeometry(0.19, 0.1, 0.27), armorMat, 0, -0.43, 0.02));
  const legR = new THREE.Group();
  legR.position.set(0.13, 0.48, 0);
  legR.add(mesh(new THREE.BoxGeometry(0.17, 0.44, 0.2), darkMat, 0, -0.22, 0));
  legR.add(mesh(new THREE.BoxGeometry(0.19, 0.1, 0.27), armorMat, 0, -0.43, 0.02));
  root.add(legL, legR);

  return { root, swordArm, lanternArm, legL, legR, mats: [armorMat, clothMat, darkMat, skinMat, bladeMat, goldMat] };
}

export class Player {
  constructor(scene) {
    this.group = new THREE.Group();
    this.parts = buildKnight();
    this.group.add(this.parts.root);

    this.light = new THREE.PointLight(0xffd9a0, 3.2, 8, 2);
    this.light.position.set(0, -0.75, 0.05);
    this.parts.lanternArm.add(this.light);

    this.spot = new THREE.SpotLight(0xffc98a, 200, 30, 0.6, 0.5, 1.8);
    this.spot.position.set(0, 2.6, 0);
    this.spot.target.position.set(0, 0.2, 3);
    this.spot.castShadow = true;
    this.spot.visible = false;
    this.spot.shadow.mapSize.set(1024, 1024);
    this.spot.shadow.bias = -0.0015;
    this.spot.shadow.normalBias = 0.04;
    this.spot.shadow.camera.near = 0.5;
    this.spot.shadow.camera.far = 30;
    this.group.add(this.spot, this.spot.target);

    this.velocity = new THREE.Vector3();
    this.angle = 0;
    this.walkPhase = 0;
    this.jumpY = 0;
    this.vy = 0;
    this.grounded = true;
    this.attackTimer = 0;
    this.attackHitDone = false;
    this.frozen = false;
    this.colliders = [];
    this.extraColliders = [];
    this.hp = 100;
    this.maxHp = 100;
    this.invuln = 0;
    this.dead = false;
    this.onHp = null;
    this.onDeath = null;
    this.onHurt = null;
    this.onAttackHit = null;
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._wish = new THREE.Vector3();
    scene.add(this.group);
  }

  get position() {
    return this.group.position;
  }

  setColliders(list) {
    this.colliders = list;
  }

  setDarkMode(on) {
    this.spot.visible = on;
    this.light.intensity = on ? 2.2 : 3.2;
  }

  respawn(x, z) {
    this.group.position.set(x, 0, z);
    this.velocity.set(0, 0, 0);
    this.angle = Math.atan2(-x, -z);
    this.group.rotation.y = this.angle;
    this.jumpY = 0;
    this.vy = 0;
    this.grounded = true;
    this.attackTimer = 0;
    this.attackHitDone = false;
    this.frozen = false;
    this.hp = this.maxHp;
    this.dead = false;
    this.invuln = 1.2;
    this.parts.root.visible = true;
    this._setFlash(0);
    if (this.onHp) this.onHp(this.hp);
  }

  takeDamage(amount, fromX, fromZ) {
    if (this.invuln > 0 || this.dead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invuln = 0.9;
    this._setFlash(1);
    const dx = this.group.position.x - fromX;
    const dz = this.group.position.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.velocity.x += (dx / len) * 9;
    this.velocity.z += (dz / len) * 9;
    if (this.grounded) {
      this.vy = 2.6;
      this.grounded = false;
    }
    if (this.onHurt) this.onHurt();
    if (this.onHp) this.onHp(this.hp);
    if (this.hp <= 0) {
      this.dead = true;
      this.frozen = true;
      if (this.onDeath) this.onDeath();
    }
  }

  _setFlash(v) {
    for (const m of this.parts.mats) {
      if (v > 0) {
        m.emissive.setHex(0xff3030);
        m.emissiveIntensity = v;
      } else {
        m.emissiveIntensity = 0;
      }
    }
  }

  update(dt, input, camera) {
    const pos = this.group.position;
    const frozen = this.frozen;
    const ix = frozen ? 0 : input.x;
    const iz = frozen ? 0 : input.z;

    camera.getWorldDirection(this._fwd);
    this._fwd.y = 0;
    if (this._fwd.lengthSq() < 1e-6) this._fwd.set(0, 0, -1);
    this._fwd.normalize();
    this._right.crossVectors(this._fwd, UP);
    this._wish.set(0, 0, 0).addScaledVector(this._fwd, iz).addScaledVector(this._right, ix);
    if (this._wish.lengthSq() > 1) this._wish.normalize();
    const hasInput = this._wish.lengthSq() > 0.02;

    const maxSpeed = input.run && !frozen ? RUN_SPEED : SPEED;
    const control = this.grounded ? 1 : 0.6;
    const k = 1 - Math.pow(0.0001, dt);
    this.velocity.lerp(this._wish.multiplyScalar(maxSpeed * control), k * (this.grounded ? 1 : 0.5));
    pos.x += this.velocity.x * dt;
    pos.z += this.velocity.z * dt;

    if (!frozen && input.jump && this.grounded) {
      this.vy = JUMP_V;
      this.grounded = false;
    }
    if (!this.grounded) {
      this.vy -= GRAVITY * dt;
      this.jumpY += this.vy * dt;
      if (this.jumpY <= 0) {
        this.jumpY = 0;
        this.vy = 0;
        this.grounded = true;
      }
    }

    for (const list of [this.colliders, this.extraColliders]) {
      for (const c of list) {
        if (pos.x < c.minX - RADIUS || pos.x > c.maxX + RADIUS || pos.z < c.minZ - RADIUS || pos.z > c.maxZ + RADIUS) continue;
        const cx = Math.min(Math.max(pos.x, c.minX), c.maxX);
        const cz = Math.min(Math.max(pos.z, c.minZ), c.maxZ);
        const dx = pos.x - cx;
        const dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= RADIUS * RADIUS) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          const push = RADIUS - d;
          pos.x += (dx / d) * push;
          pos.z += (dz / d) * push;
        } else {
          const dl = pos.x - (c.minX - RADIUS);
          const dr = c.maxX + RADIUS - pos.x;
          const dn = pos.z - (c.minZ - RADIUS);
          const df = c.maxZ + RADIUS - pos.z;
          const m = Math.min(dl, dr, dn, df);
          if (m === dl) pos.x = c.minX - RADIUS;
          else if (m === dr) pos.x = c.maxX + RADIUS;
          else if (m === dn) pos.z = c.minZ - RADIUS;
          else pos.z = c.maxZ + RADIUS;
        }
      }
    }

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (hasInput) {
      const target = Math.atan2(this._wish.x, this._wish.z);
      let diff = target - this.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.angle += diff * (1 - Math.pow(0.000001, dt));
      this.group.rotation.y = this.angle;
    }

    if (!frozen && input.attack && this.attackTimer <= 0) {
      this.attackTimer = ATTACK_DUR;
      this.attackHitDone = false;
    }
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      const ph = 1 - this.attackTimer / ATTACK_DUR;
      if (!this.attackHitDone && ph > 0.45) {
        this.attackHitDone = true;
        if (this.onAttackHit) this.onAttackHit();
      }
    }

    if (this.invuln > 0) {
      this.invuln -= dt;
      const flicker = Math.sin(this.invuln * 40);
      this.parts.root.visible = this.dead || flicker < 0.55;
      this._setFlash(Math.max(0, this.invuln - 0.45) * 1.8);
    } else if (!this.parts.root.visible) {
      this.parts.root.visible = true;
    }

    const p = this.parts;
    const ratio = Math.min(1, speed / RUN_SPEED);
    if (this.attackTimer > 0) {
      const ph = 1 - this.attackTimer / ATTACK_DUR;
      p.swordArm.rotation.x = -2.6 + ph * 3.3;
      p.swordArm.rotation.z = -0.45 * Math.sin(ph * Math.PI);
      p.lanternArm.rotation.x = 0.5 * Math.sin(ph * Math.PI);
    } else if (!this.grounded) {
      p.swordArm.rotation.x = -0.5;
      p.swordArm.rotation.z = 0;
      p.lanternArm.rotation.x = 0.35;
      p.legL.rotation.x = 0.4;
      p.legR.rotation.x = -0.25;
    } else {
      p.swordArm.rotation.z = 0;
      this.walkPhase += dt * (4 + 8 * ratio) * (ratio > 0.03 ? 1 : 0.25);
      const sw = Math.sin(this.walkPhase);
      p.legL.rotation.x = sw * 0.7 * ratio;
      p.legR.rotation.x = -sw * 0.7 * ratio;
      p.lanternArm.rotation.x = -sw * 0.55 * ratio;
      p.swordArm.rotation.x = sw * 0.22 * ratio;
    }
    const bob = this.grounded ? Math.abs(Math.cos(this.walkPhase)) * 0.05 * ratio : 0;
    p.root.position.y = this.jumpY + bob;
  }
}
