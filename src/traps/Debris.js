import * as THREE from 'three';
import { rand } from '../core/utils.js';

const MAX_PIECES = 150;

export class Debris {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.pieces = [];
    this.geo = new THREE.BoxGeometry(1, 1, 1);
  }

  spawn(x, y, z, size, color, vel, rotVel) {
    if (this.pieces.length >= MAX_PIECES) {
      const old = this.pieces.shift();
      this.group.remove(old.mesh);
      old.mesh.material.dispose();
    }
    const m = new THREE.Mesh(
      this.geo,
      new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true })
    );
    m.scale.set(size, size * rand(Math.random, 0.5, 1), size * rand(Math.random, 0.5, 1));
    m.position.set(x, y, z);
    m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    m.castShadow = true;
    this.group.add(m);
    this.pieces.push({
      mesh: m,
      vel: vel.clone(),
      rotVel: rotVel || new THREE.Vector3(rand(Math.random, -4, 4), rand(Math.random, -4, 4), rand(Math.random, -4, 4)),
      rest: m.scale.y * 0.4 + 0.02,
      settled: false,
    });
  }

  burst(x, y, z, count, colors, power = 3) {
    for (let i = 0; i < count; i++) {
      const color = Array.isArray(colors) ? colors[(Math.random() * colors.length) | 0] : colors;
      const vel = new THREE.Vector3(rand(Math.random, -power, power), rand(Math.random, 1.5, power + 1.5), rand(Math.random, -power, power));
      this.spawn(x + rand(Math.random, -0.4, 0.4), y + rand(Math.random, -0.3, 0.5), z + rand(Math.random, -0.4, 0.4), rand(Math.random, 0.16, 0.42), color, vel);
    }
  }

  update(dt) {
    for (const p of this.pieces) {
      if (p.settled) continue;
      p.vel.y -= 20 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.rotVel.x * dt;
      p.mesh.rotation.y += p.rotVel.y * dt;
      p.mesh.rotation.z += p.rotVel.z * dt;
      if (p.mesh.position.y <= p.rest) {
        p.mesh.position.y = p.rest;
        if (Math.abs(p.vel.y) > 3) {
          p.vel.y *= -0.3;
          p.vel.x *= 0.5;
          p.vel.z *= 0.5;
        } else {
          p.settled = true;
          p.mesh.rotation.x = Math.round(p.mesh.rotation.x / (Math.PI / 2)) * (Math.PI / 2);
          p.mesh.rotation.z = Math.round(p.mesh.rotation.z / (Math.PI / 2)) * (Math.PI / 2);
        }
      }
    }
  }

  dispose() {
    for (const p of this.pieces) p.mesh.material.dispose();
    this.pieces.length = 0;
    this.geo.dispose();
    if (this.group.parent) this.group.parent.remove(this.group);
  }
}
