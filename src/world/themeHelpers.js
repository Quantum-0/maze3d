import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rand, pick } from '../core/utils.js';

export { rand, pick };
export const CELL = 4;

export function cellCenter(maze, x, y) {
  return {
    x: (x - (maze.cols - 1) / 2) * CELL,
    z: (y - (maze.rows - 1) / 2) * CELL,
  };
}

export function worldToCell(maze, x, z) {
  return {
    x: Math.round(x / CELL + (maze.cols - 1) / 2),
    y: Math.round(z / CELL + (maze.rows - 1) / 2),
  };
}

export function mazeExtent(maze) {
  return Math.max(maze.cols, maze.rows) * CELL;
}

export function forEachWall(maze, cb) {
  for (const s of maze.wallSegments()) {
    const c = cellCenter(maze, s.x, s.y);
    if (s.dir === 'h') cb(c.x, c.z - CELL / 2, true);
    else cb(c.x - CELL / 2, c.z, false);
  }
}

export function displace(geo, amt, rng, keepBottom = false) {
  const pos = geo.attributes.position;
  const h = geo.parameters ? geo.parameters.height || 0 : 0;
  const offs = new Map();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const k = Math.round(x * 1000) + '_' + Math.round(y * 1000) + '_' + Math.round(z * 1000);
    let o = offs.get(k);
    if (!o) {
      o = { x: (rng() - 0.5) * amt, y: (rng() - 0.5) * amt, z: (rng() - 0.5) * amt };
      offs.set(k, o);
    }
    const ny = keepBottom && y <= -h / 2 + 0.01 ? y : y + o.y;
    pos.setXYZ(i, x + o.x, ny, z + o.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function rockGeometry(rng, { w, h, d, jag = 0.35 }) {
  const g = new THREE.BoxGeometry(w, h, d, 3, 2, 3);
  return displace(g, jag, rng, true);
}

export class GeoBatch {
  constructor(material, tinted = false) {
    this.material = material;
    this.geos = [];
    this.tinted = tinted;
  }

  add(geometry, x, y, z, rotY = 0, sx = 1, sy = 1, sz = 1, tint = 1) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    const m = new THREE.Matrix4()
      .makeRotationY(rotY)
      .scale(new THREE.Vector3(sx, sy, sz))
      .setPosition(x, y, z);
    g.applyMatrix4(m);
    if (this.tinted) {
      const count = g.attributes.position.count;
      const colors = new Float32Array(count * 3).fill(tint);
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    this.geos.push(g);
    return this;
  }

  build(group, castShadow = true, receiveShadow = true) {
    if (!this.geos.length) return null;
    const merged = mergeGeometries(this.geos, false);
    for (const g of this.geos) g.dispose();
    this.geos.length = 0;
    const mesh = new THREE.Mesh(merged, this.material);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    group.add(mesh);
    return mesh;
  }
}

function makeGridTexture(bg, line, rx, rz) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#' + bg.toString(16).padStart(6, '0');
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = '#' + line.toString(16).padStart(6, '0');
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, rz);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeFloor(maze, rng, { color, jitter = 0.08, roughness = 1, metalness = 0, groundColor = null, groundScale = 2.6, gridColor = null, facets = null }) {
  const group = new THREE.Group();
  const w = maze.cols * CELL;
  const h = maze.rows * CELL;
  const g = new THREE.PlaneGeometry(w, h, maze.cols * 2, maze.rows * 2);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, (rng() - 0.5) * jitter * 2);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color: gridColor ? 0xffffff : color,
    map: gridColor ? makeGridTexture(color, gridColor, maze.cols * 2, maze.rows * 2) : null,
    roughness,
    metalness,
    flatShading: true,
  });
  if (facets) {
    const t = makeFacetedNormalMap(rng, facets);
    t.repeat.set(maze.cols, maze.rows);
    mat.normalMap = t;
    const s = facets.scale ?? 0.6;
    mat.normalScale = new THREE.Vector2(s, s);
  }
  const floor = new THREE.Mesh(g, mat);
  floor.receiveShadow = true;
  group.add(floor);
  if (groundColor) {
    const gg = new THREE.PlaneGeometry(w * groundScale, h * groundScale, 16, 16);
    gg.rotateX(-Math.PI / 2);
    const gp = gg.attributes.position;
    for (let i = 0; i < gp.count; i++) {
      gp.setY(i, (rng() - 0.5) * 0.5);
    }
    gp.needsUpdate = true;
    gg.computeVertexNormals();
    const ground = new THREE.Mesh(
      gg,
      new THREE.MeshStandardMaterial({ color: groundColor, roughness: 1, flatShading: true })
    );
    ground.position.y = -0.35;
    ground.receiveShadow = true;
    group.add(ground);
  }
  return group;
}

export function scatterSpots(maze, rng, count, { avoid = [], margin = 1.25, spreadMin = null } = {}) {
  const lo = spreadMin === null ? margin * 0.6 : spreadMin;
  const avoidSet = new Set(avoid.map((c) => c.x + ',' + c.y));
  const spots = [];
  let guard = count * 30;
  while (spots.length < count && guard-- > 0) {
    const x = Math.floor(rng() * maze.cols);
    const y = Math.floor(rng() * maze.rows);
    if (avoidSet.has(x + ',' + y)) continue;
    avoidSet.add(x + ',' + y);
    const c = cellCenter(maze, x, y);
    const ox = (rng() < 0.5 ? -1 : 1) * (lo + rng() * (margin - lo));
    const oz = (rng() < 0.5 ? -1 : 1) * (lo + rng() * (margin - lo));
    spots.push({ x: c.x + ox, z: c.z + oz });
  }
  return spots;
}

export function pathWorldPoints(maze) {
  return maze.path.map((c) => cellCenter(maze, c.x, c.y));
}

export function makeBeam(color, height = 14, radius = 0.3, opacity = 0.16) {
  const g = new THREE.CylinderGeometry(radius, radius * 1.5, height, 8, 1, true);
  const m = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.y = height / 2;
  return mesh;
}

export function makeFacetedNormalMap(rng, { size = 256, cells = 7, relief = 1.3 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  const pts = [];
  const cellSize = size / cells;
  for (let j = 0; j <= cells; j++) {
    const row = [];
    for (let i = 0; i <= cells; i++) {
      const jx = i === 0 || i === cells ? 0 : (rng() - 0.5) * cellSize * 0.55;
      const jy = j === 0 || j === cells ? 0 : (rng() - 0.5) * cellSize * 0.55;
      row.push([i * cellSize + jx, j * cellSize + jy]);
    }
    pts.push(row);
  }

  const waves = [];
  for (let k = 0; k < 4; k++) {
    const m = (2 + Math.floor(rng() * 3)) * (rng() < 0.5 ? -1 : 1) * Math.PI * 2;
    const n = (2 + Math.floor(rng() * 3)) * (rng() < 0.5 ? -1 : 1) * Math.PI * 2;
    waves.push({ m, n, p: rng() * Math.PI * 2, a: 1 / (k + 1) });
  }
  const gradAt = (u, v) => {
    let dx = 0;
    let dy = 0;
    for (const w of waves) {
      const arg = u * w.m + v * w.n + w.p;
      dx += w.a * w.m * Math.cos(arg);
      dy += w.a * w.n * Math.cos(arg);
    }
    return { dx: dx / 2, dy: dy / 2 };
  };
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const g = gradAt(rng(), rng());
    sum += g.dx * g.dx + g.dy * g.dy;
  }
  const rms = Math.sqrt(sum / 128) || 1;
  const k = (relief / rms) * 0.15;

  const fillTri = (a, b, c) => {
    const u = ((a[0] + b[0] + c[0]) / 3) / size;
    const v = ((a[1] + b[1] + c[1]) / 3) / size;
    const g = gradAt(u, v);
    let dx = g.dx * k;
    let dy = g.dy * k;
    const mag = Math.hypot(dx, dy);
    if (mag > 0.28) {
      dx = (dx / mag) * 0.28;
      dy = (dy / mag) * 0.28;
    }
    const len = Math.sqrt(dx * dx + dy * dy + 1);
    const r = ((-dx / len) * 0.5 + 0.5) * 255;
    const gr = ((-dy / len) * 0.5 + 0.5) * 255;
    const bl = ((1 / len) * 0.5 + 0.5) * 255;
    ctx.fillStyle = `rgb(${r | 0},${gr | 0},${bl | 0})`;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.closePath();
    ctx.fill();
  };
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const a = pts[j][i];
      const b = pts[j][i + 1];
      const c = pts[j + 1][i + 1];
      const d = pts[j + 1][i];
      if (rng() < 0.5) {
        fillTri(a, b, c);
        fillTri(a, c, d);
      } else {
        fillTri(a, b, d);
        fillTri(b, c, d);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

export function makePortal(color) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.75, 0.35, 8),
    new THREE.MeshStandardMaterial({ color: 0x2e3440, roughness: 0.9, flatShading: true })
  );
  base.position.y = 0.17;
  base.castShadow = base.receiveShadow = true;
  group.add(base);

  const spinner = new THREE.Group();
  spinner.position.y = 1.45;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.02, 0.12, 6, 24),
    new THREE.MeshStandardMaterial({
      color: 0x11131a,
      emissive: color,
      emissiveIntensity: 2.6,
      roughness: 0.4,
      flatShading: true,
    })
  );
  const innerColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.45);
  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.64, 0.075, 6, 18),
    new THREE.MeshStandardMaterial({
      color: 0x11131a,
      emissive: innerColor,
      emissiveIntensity: 2.8,
      roughness: 0.4,
      flatShading: true,
    })
  );
  ring2.rotation.x = 0.6;
  spinner.add(ring, ring2);
  group.add(spinner);

  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(0.92, 24),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  inner.position.y = 1.45;
  group.add(inner);

  const light = new THREE.PointLight(color, 30, 18, 2);
  light.position.y = 1.7;
  group.add(light);

  group.add(makeBeam(color, 16, 0.26, 0.1));

  const update = (dt, t) => {
    spinner.rotation.y += dt * 0.9;
    inner.material.opacity = 0.2 + Math.sin(t * 2.2) * 0.08;
    light.intensity = 26 + Math.sin(t * 2.2) * 7;
  };
  return { group, update };
}

export function makeAltar(color) {
  const group = new THREE.Group();
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x2e3440, roughness: 0.9, flatShading: true });
  const s1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 1.8), stepMat);
  s1.position.y = 0.17;
  s1.castShadow = s1.receiveShadow = true;
  const s2 = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.3, 1.25), stepMat);
  s2.position.y = 0.47;
  s2.castShadow = s2.receiveShadow = true;
  group.add(s1, s2);

  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55),
    new THREE.MeshStandardMaterial({
      color: 0x0c0d10,
      emissive: color,
      emissiveIntensity: 2.4,
      roughness: 0.3,
      flatShading: true,
    })
  );
  crystal.scale.set(1, 1.7, 1);
  crystal.position.y = 1.75;
  group.add(crystal);

  const shardMat = new THREE.MeshStandardMaterial({
    color: 0x0c0d10,
    emissive: color,
    emissiveIntensity: 2.2,
    roughness: 0.3,
    flatShading: true,
  });
  const shards = [];
  for (let i = 0; i < 2; i++) {
    const sh = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), shardMat);
    sh.scale.set(1, 1.6, 1);
    group.add(sh);
    shards.push(sh);
  }

  const light = new THREE.PointLight(color, 36, 20, 2);
  light.position.y = 2.1;
  group.add(light);

  group.add(makeBeam(color, 18, 0.32, 0.13));

  const update = (dt, t) => {
    crystal.rotation.y += dt * 0.8;
    crystal.position.y = 1.75 + Math.sin(t * 1.6) * 0.15;
    for (let i = 0; i < shards.length; i++) {
      const a = t * 1.3 + (i * Math.PI) / shards.length;
      shards[i].position.set(Math.cos(a) * 1.15, 1.1 + Math.sin(t * 2 + i) * 0.2, Math.sin(a) * 1.15);
      shards[i].rotation.y += dt * 2;
    }
    light.intensity = 32 + Math.sin(t * 1.9) * 8;
  };
  return { group, update };
}
