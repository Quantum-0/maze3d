import * as THREE from 'three';
import { CELL, cellCenter } from '../world/themeHelpers.js';
import { Sfx } from './Sfx.js';
import { Debris } from './Debris.js';
import { THEME_CFG, JetTrap, SpikeTrap, RockfallTrap, FakeWallTrap, CuttableObstacle } from './trapTypes.js';

const SIDE_DIRS = {
  top: [0, -1],
  bottom: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export class TrapManager {
  constructor(engine) {
    this.engine = engine;
    this.sfx = new Sfx();
    this.traps = [];
    this.colliders = [];
    this.group = null;
    this.debris = null;
    this.player = null;
    this.cfg = null;
    this.rng = null;
    this.themeId = null;
    this.wallNormal = null;
    this.dirty = false;
    this.onDamage = null;
  }

  build(maze, themeId, rng, player) {
    this.dispose();
    this.player = player;
    this.themeId = themeId;
    this.rng = rng;
    this.cfg = THEME_CFG[themeId] || THEME_CFG.winter;
    this.group = new THREE.Group();
    this.engine.scene.add(this.group);
    this.debris = new Debris(this.engine.scene);

    const dist = this._bfsDistances(maze, maze.start);
    const distF = this._bfsDistances(maze, maze.finish);
    const safe = new Set();
    const eligible = [];
    for (let y = 0; y < maze.rows; y++) {
      for (let x = 0; x < maze.cols; x++) {
        if (dist[y][x] < 3 || distF[y][x] < 3) safe.add(x + ',' + y);
        else eligible.push({ x, y });
      }
    }

    const jets = 3 + Math.floor(maze.cols * 0.35);
    const spikes = 4 + Math.floor(maze.cols * 0.5);
    const rocks = 2 + Math.floor(maze.cols * 0.25);
    const fakes = 1 + Math.floor(maze.cols * 0.15);
    const cuts = 2 + Math.floor(maze.cols * 0.2);

    const cells = eligible.slice();
    this._shuffle(cells);

    let ci = 0;
    const nextCell = () => (ci < cells.length ? cells[ci++] : null);

    for (let i = 0; i < jets; i++) {
      let c = nextCell();
      let guard = 20;
      while (c && guard-- > 0) {
        const walls = Object.entries(SIDE_DIRS).filter(([dir]) => maze.cell(c.x, c.y).walls[dir]);
        if (walls.length) {
          const [dir, v] = walls[(rng() * walls.length) | 0];
          const center = cellCenter(maze, c.x, c.y);
          const horizontal = v[1] !== 0;
          const wx = center.x + v[0] * (CELL / 2 - 0.02);
          const wz = center.z + v[1] * (CELL / 2 - 0.02);
          const jetDir = horizontal ? -v[1] : -v[0];
          this.traps.push(new JetTrap(this, wx, wz, horizontal, jetDir));
          break;
        }
        c = nextCell();
      }
    }

    for (let i = 0; i < spikes; i++) {
      const c = nextCell();
      if (!c) break;
      const center = cellCenter(maze, c.x, c.y);
      const mode = rng() < 0.5 ? 'auto' : 'prox';
      this.traps.push(new SpikeTrap(this, center.x, center.z, mode));
    }

    for (let i = 0; i < rocks; i++) {
      const c = nextCell();
      if (!c) break;
      const center = cellCenter(maze, c.x, c.y);
      this.traps.push(new RockfallTrap(this, center.x, center.z));
    }

    const openEdges = [];
    for (let y = 0; y < maze.rows; y++) {
      for (let x = 0; x < maze.cols; x++) {
        const cell = maze.cell(x, y);
        if (y > 0 && !cell.walls.top) openEdges.push({ ax: x, ay: y, bx: x, by: y - 1, horizontal: true });
        if (x > 0 && !cell.walls.left) openEdges.push({ ax: x, ay: y, bx: x - 1, by: y, horizontal: false });
      }
    }
    const pathEdges = new Set();
    for (let i = 0; i < maze.path.length - 1; i++) {
      const a = maze.path[i];
      const b = maze.path[i + 1];
      pathEdges.add(this._edgeKey(a.x, a.y, b.x, b.y));
    }
    const usable = openEdges.filter(
      (e) => !safe.has(e.ax + ',' + e.ay) && !safe.has(e.bx + ',' + e.by)
    );
    this._shuffle(usable);
    const used = new Set();
    const edgeCenter = (e) => {
      const c = cellCenter(maze, e.ax, e.ay);
      return e.horizontal ? { x: c.x, z: c.z - CELL / 2 } : { x: c.x - CELL / 2, z: c.z };
    };

    const pathUsable = usable.filter((e) => pathEdges.has(this._edgeKey(e.ax, e.ay, e.bx, e.by)));
    let placedCuts = 0;
    const midStart = Math.floor(pathUsable.length / 3);
    for (let i = midStart; i < pathUsable.length && placedCuts < Math.min(2, cuts); i += 3) {
      const e = pathUsable[i];
      const key = this._edgeKey(e.ax, e.ay, e.bx, e.by);
      used.add(key);
      const c = edgeCenter(e);
      this.traps.push(new CuttableObstacle(this, c.x, c.z, e.horizontal));
      placedCuts++;
    }
    for (const e of usable) {
      if (placedCuts >= cuts) break;
      const key = this._edgeKey(e.ax, e.ay, e.bx, e.by);
      if (used.has(key)) continue;
      used.add(key);
      const c = edgeCenter(e);
      this.traps.push(new CuttableObstacle(this, c.x, c.z, e.horizontal));
      placedCuts++;
    }

    for (const e of usable) {
      if (this.traps.filter((t) => t instanceof FakeWallTrap).length >= fakes) break;
      const key = this._edgeKey(e.ax, e.ay, e.bx, e.by);
      if (used.has(key)) continue;
      used.add(key);
      const c = edgeCenter(e);
      this.traps.push(new FakeWallTrap(this, c.x, c.z, e.horizontal));
    }

    this.refreshColliders();
  }

  update(dt, playerPos, jumpY, t) {
    for (const trap of this.traps) {
      trap.update(dt, playerPos.x, playerPos.z, jumpY, t);
    }
    if (this.debris) this.debris.update(dt);
    if (this.dirty) {
      this.dirty = false;
      this.refreshColliders();
    }
  }

  handleAttack(pos, angle) {
    let hit = false;
    const fx = Math.sin(angle);
    const fz = Math.cos(angle);
    for (const trap of this.traps) {
      if (trap instanceof CuttableObstacle && trap.state === 'alive') {
        const dx = trap.x - pos.x;
        const dz = trap.z - pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 2.5) continue;
        const dot = (dx / d) * fx + (dz / d) * fz;
        if (dot > 0.45) {
          trap.hit();
          hit = true;
        }
      }
    }
    return hit;
  }

  refreshColliders() {
    this.colliders = this.traps.filter((t) => t.blocking && t.collider).map((t) => t.collider);
    if (this.player) this.player.extraColliders = this.colliders;
  }

  markDirty() {
    this.dirty = true;
  }

  damage(fromPos, amount) {
    if (this.onDamage) this.onDamage(amount, fromPos);
  }

  _edgeKey(ax, ay, bx, by) {
    return ax < bx || (ax === bx && ay < by) ? `${ax},${ay}|${bx},${by}` : `${bx},${by}|${ax},${ay}`;
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (this.rng() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  _bfsDistances(maze, from) {
    const dist = Array.from({ length: maze.rows }, () => new Array(maze.cols).fill(-1));
    dist[from.y][from.x] = 0;
    const q = [from];
    let head = 0;
    while (head < q.length) {
      const c = q[head++];
      for (const [dir, v] of Object.entries(SIDE_DIRS)) {
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

  dispose() {
    for (const trap of this.traps) {
      if (trap.dispose) trap.dispose();
    }
    this.traps.length = 0;
    if (this.debris) {
      this.debris.dispose();
      this.debris = null;
    }
    if (this.group) {
      this.group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
      this.engine.scene.remove(this.group);
      this.group = null;
    }
    if (this.wallNormal) {
      this.wallNormal.dispose();
      this.wallNormal = null;
    }
    this.colliders = [];
    if (this.player) this.player.extraColliders = [];
  }
}
