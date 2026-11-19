import * as THREE from 'three';
import {
  CELL,
  cellCenter,
  forEachWall,
  makeFloor,
  makePortal,
  makeAltar,
  GeoBatch,
  rockGeometry,
  displace,
  makeFacetedNormalMap,
  scatterSpots,
  pathWorldPoints,
  rand,
  pick,
} from '../themeHelpers.js';

export const forest = {
  id: 'forest',
  name: 'Лес',
  salt: 202,
  bloom: { strength: 0.5, radius: 0.55, threshold: 0.85 },
  exposure: 1.05,
  build(maze, rng, engine) {
    const group = new THREE.Group();
    const scene = engine.scene;
    scene.background = new THREE.Color(0xb7c690);
    scene.fog = new THREE.FogExp2(0xa3b57e, 0.0115);

    const hemi = new THREE.HemisphereLight(0xffe3b3, 0x3f5c36, 0.55);
    group.add(hemi);
    const ext = Math.max(maze.cols, maze.rows) * CELL;
    const dir = new THREE.DirectionalLight(0xffbd6e, 1.5);
    dir.position.set(34, 26, -22);
    dir.castShadow = true;
    dir.shadow.camera.left = -(ext / 2 + 10);
    dir.shadow.camera.right = ext / 2 + 10;
    dir.shadow.camera.top = ext / 2 + 10;
    dir.shadow.camera.bottom = -(ext / 2 + 10);
    dir.shadow.camera.near = 5;
    dir.shadow.camera.far = 140;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.bias = -0.0004;
    dir.shadow.normalBias = 0.05;
    group.add(dir, dir.target);

    group.add(makeFloor(maze, rng, { color: 0x6f9a52, jitter: 0.09, groundColor: 0x59803f, groundScale: 3.9 }));

    const earthMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 1, flatShading: true, vertexColors: true });
    earthMat.normalMap = makeFacetedNormalMap(rng, { cells: 6, relief: 1.1, lo: 95, hi: 175 });
    earthMat.normalScale = new THREE.Vector2(0.7, 0.7);
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x53803f, roughness: 1, flatShading: true });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a8d84, roughness: 0.95, flatShading: true });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 1, flatShading: true });
    const leafMats = [0x4c8039, 0x5d9448, 0x6fae52].map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true })
    );

    const earthBatch = new GeoBatch(earthMat, true);
    const mossBatch = new GeoBatch(mossMat);
    const stoneBatch = new GeoBatch(stoneMat);
    const trunkBatch = new GeoBatch(trunkMat);
    const leafBatches = leafMats.map((m) => new GeoBatch(m));

    const t = 1.0;
    const earthVariants = [0, 1, 2, 3].map(() => rockGeometry(rng, { w: CELL + t * 0.9, h: 2.8, d: t, jag: 0.55 }));
    const mossVariants = [0, 1].map(() => rockGeometry(rng, { w: CELL + 1.15, h: 0.45, d: t * 1.3, jag: 0.22 }));
    const boulder = new THREE.IcosahedronGeometry(0.55, 0);
    forEachWall(maze, (x, z, horizontal) => {
      const ry = (horizontal ? 0 : Math.PI / 2) + rand(rng, -0.05, 0.05);
      const sy = rand(rng, 0.8, 1.2);
      const sLen = rand(rng, 0.96, 1.06);
      earthBatch.add(pick(rng, earthVariants), x, 1.4 * sy - 0.3, z, ry, sLen, sy, rand(rng, 0.95, 1.1), rand(rng, 0.86, 1.14));
      mossBatch.add(pick(rng, mossVariants), x, 2.8 * sy - 0.32, z, ry, sLen, 1, 1.05);
      if (rng() < 0.12) {
        stoneBatch.add(boulder, x + rand(rng, -1, 1), 2.8 * sy - 0.2, z + rand(rng, -0.4, 0.4), rng() * Math.PI, 1, rand(rng, 0.7, 1.3), 1);
      }
    });

    const trunkGeo = new THREE.CylinderGeometry(0.16, 0.24, 2.2, 6);
    const crownBig = [0, 1].map(() => displace(new THREE.IcosahedronGeometry(1.15, 0), 0.16, rng));
    const crownSmall = [0, 1].map(() => displace(new THREE.IcosahedronGeometry(0.75, 0), 0.13, rng));
    const trees = scatterSpots(maze, rng, Math.floor((maze.cols * maze.rows) / 2.8), {
      avoid: [maze.start, maze.finish],
      margin: 1.45,
      spreadMin: 1.2,
    });
    for (const spot of trees) {
      const s = rand(rng, 0.7, 1.15);
      const ry = rng() * Math.PI * 2;
      trunkBatch.add(trunkGeo, spot.x, 1.1 * s, spot.z, 0, s, s, s);
      pick(rng, leafBatches).add(pick(rng, crownBig), spot.x, 2.5 * s, spot.z, ry, s * rand(rng, 0.95, 1.15), s * rand(rng, 0.9, 1.1), s * rand(rng, 0.95, 1.15));
      pick(rng, leafBatches).add(pick(rng, crownSmall), spot.x, 3.55 * s, spot.z, ry, s * rand(rng, 0.9, 1.1), s * rand(rng, 0.95, 1.2), s * rand(rng, 0.9, 1.1));
    }

    const bush = new THREE.IcosahedronGeometry(0.6, 0);
    const bushes = scatterSpots(maze, rng, Math.floor((maze.cols * maze.rows) / 5), {
      avoid: [maze.start, maze.finish],
      margin: 1.4,
      spreadMin: 1.05,
    });
    for (const spot of bushes) {
      pick(rng, leafBatches).add(bush, spot.x, 0.32, spot.z, rng() * Math.PI, rand(rng, 0.7, 1.4), rand(rng, 0.5, 0.8), rand(rng, 0.7, 1.4));
    }

    const tuft = new THREE.ConeGeometry(0.06, 0.45, 4);
    const tuftMat = new THREE.MeshStandardMaterial({ color: 0x9cc47a, roughness: 1, flatShading: true });
    const tuftBatch = new GeoBatch(tuftMat);
    const tufts = scatterSpots(maze, rng, Math.floor((maze.cols * maze.rows) / 3.2), {
      avoid: [maze.start, maze.finish],
    });
    for (const spot of tufts) {
      for (let i = 0; i < 3; i++) {
        tuftBatch.add(tuft, spot.x + rand(rng, -0.45, 0.45), 0.2, spot.z + rand(rng, -0.45, 0.45), 0, 1, rand(rng, 0.7, 1.5), 1);
      }
    }

    const stemGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.26, 5);
    const capGeo = new THREE.ConeGeometry(0.18, 0.2, 6);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xd8cbb0, roughness: 1, flatShading: true });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xc1443c, roughness: 0.8, flatShading: true });
    const stemBatch = new GeoBatch(stemMat);
    const capBatch = new GeoBatch(capMat);
    const brownCapMat = new THREE.MeshStandardMaterial({ color: 0x9a6a4a, roughness: 0.8, flatShading: true });
    const capBatches = [capBatch, new GeoBatch(brownCapMat)];
    const mushrooms = scatterSpots(maze, rng, Math.floor((maze.cols * maze.rows) / 5), {
      avoid: [maze.start, maze.finish],
    });
    for (const spot of mushrooms) {
      const n = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const s = rand(rng, 0.7, 1.4);
        const mx = spot.x + rand(rng, -0.4, 0.4);
        const mz = spot.z + rand(rng, -0.4, 0.4);
        stemBatch.add(stemGeo, mx, 0.13 * s, mz, 0, s, s, s);
        pick(rng, capBatches).add(capGeo, mx, 0.32 * s, mz, 0, s, s, s);
      }
    }

    const pathMat = new THREE.MeshStandardMaterial({ color: 0x9a978c, roughness: 1, flatShading: true });
    const stepBatch = new GeoBatch(pathMat);
    const stepGeo = new THREE.CylinderGeometry(1, 0.88, 0.1, 7);
    const pts = pathWorldPoints(maze);
    for (let i = 2; i < pts.length - 2; i++) {
      if (rng() < 0.3) continue;
      const p = pts[i];
      const n = pts[Math.min(i + 1, pts.length - 1)];
      const dx = n.x - p.x;
      const dz = n.z - p.z;
      const px = -dz;
      const pz = dx;
      for (const sgn of [-1, 1]) {
        if (rng() < 0.25) continue;
        const r = rand(rng, 0.3, 0.45);
        stepBatch.add(stepGeo, p.x + px * sgn * 0.55 + dx * rand(rng, -0.2, 0.2), 0.03, p.z + pz * sgn * 0.55 + dz * rand(rng, -0.2, 0.2), rng() * 3, r, 1, r * rand(rng, 0.85, 1));
      }
    }

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1, flatShading: true });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.8, flatShading: true });
    const benches = [];
    for (let i = 4; i < maze.path.length - 3; i += 8) {
      if (rng() < 0.35) continue;
      const cellObj = maze.path[i];
      const next = maze.path[i + 1];
      const p = pts[i];
      const dx = next.x - cellObj.x;
      const dz = next.y - cellObj.y;
      const wallName = (v) => (v[1] === -1 ? 'top' : v[1] === 1 ? 'bottom' : v[0] === -1 ? 'left' : 'right');
      const left = { v: [-dz, dx] };
      const right = { v: [dz, -dx] };
      left.wall = wallName(left.v);
      right.wall = wallName(right.v);
      const w = maze.cell(cellObj.x, cellObj.y);
      const side = w.walls[left.wall] ? left : w.walls[right.wall] ? right : null;
      if (!side) continue;
      const bx = p.x + side.v[0] * 1.62;
      const bz = p.z + side.v[1] * 1.62;
      const ry = Math.atan2(-side.v[0], -side.v[1]);
      const bench = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.09, 0.5), woodMat);
      seat.position.y = 0.48;
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.42, 0.07), woodMat);
      back.position.set(0, 0.8, -0.24);
      back.rotation.x = -0.12;
      bench.add(seat, back);
      for (const lx of [-0.52, 0.52]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.5, 0.46), legMat);
        leg.position.set(lx, 0.24, 0);
        bench.add(leg);
      }
      bench.traverse((o) => {
        if (o.isMesh) o.castShadow = o.receiveShadow = true;
      });
      bench.position.set(bx, 0, bz);
      bench.rotation.y = ry;
      group.add(bench);
      benches.push(bench);
    }

    const archMat = new THREE.MeshStandardMaterial({ color: 0x2f5233, roughness: 1, flatShading: true });
    const thornMat = new THREE.MeshStandardMaterial({ color: 0x1f3322, roughness: 1, flatShading: true });
    const archBatch = new GeoBatch(archMat);
    const thornBatch = new GeoBatch(thornMat);
    const archGeo = new THREE.TorusGeometry(1.75, 0.09, 5, 12, Math.PI);
    const thornGeo = new THREE.ConeGeometry(0.05, 0.26, 4);
    const leafGeo = new THREE.IcosahedronGeometry(0.14, 0);
    const rot2 = (lx, lz, th) => [lx * Math.cos(th) + lz * Math.sin(th), -lx * Math.sin(th) + lz * Math.cos(th)];
    for (let i = 3; i < maze.path.length - 3; i += 6) {
      if (rng() < 0.3) continue;
      const cellObj = maze.path[i];
      const next = maze.path[i + 1];
      const w = maze.cell(cellObj.x, cellObj.y);
      const dx = next.x - cellObj.x;
      let ok;
      let th;
      if (dx !== 0) {
        ok = w.walls.top && w.walls.bottom && !w.walls.left && !w.walls.right;
        th = Math.PI / 2;
      } else {
        ok = w.walls.left && w.walls.right && !w.walls.top && !w.walls.bottom;
        th = 0;
      }
      if (!ok) continue;
      const p = pts[i];
      archBatch.add(archGeo, p.x, 0.02, p.z, th);
      for (let k = 0; k < 5; k++) {
        const a = rand(rng, 0.25, Math.PI - 0.25);
        const [wx, wz] = rot2(Math.cos(a) * 1.8, 0, th);
        thornBatch.add(thornGeo, p.x + wx, Math.sin(a) * 1.8, p.z + wz, rng() * 3, 1, rand(rng, 0.8, 1.5), 1);
        if (rng() < 0.6) {
          const [lx2, lz2] = rot2(Math.cos(a) * 1.72, rand(rng, -0.1, 0.1), th);
          pick(rng, leafBatches).add(leafGeo, p.x + lx2, Math.sin(a) * 1.72, p.z + lz2, rng() * 3);
        }
      }
    }

    const blobGeo = new THREE.IcosahedronGeometry(0.18, 0);
    forEachWall(maze, (x, z, horizontal) => {
      if (rng() < 0.78) return;
      const side = rng() < 0.5 ? 1 : -1;
      const nx = horizontal ? 0 : side;
      const nz = horizontal ? side : 0;
      const nBlobs = 2 + Math.floor(rng() * 3);
      for (let j = 0; j < nBlobs; j++) {
        const along = rand(rng, -1.8, 1.8);
        const ox = horizontal ? along : nx * 0.58;
        const oz = horizontal ? nz * 0.58 : along;
        pick(rng, leafBatches).add(blobGeo, x + ox, rand(rng, 0.25, 1.5), z + oz, rng() * 3, rand(rng, 0.8, 1.6), rand(rng, 0.8, 1.6), rand(rng, 0.8, 1.6));
      }
      for (let j = 0; j < 2; j++) {
        const along = rand(rng, -1.6, 1.6);
        const ox = horizontal ? along : nx * 0.58;
        const oz = horizontal ? nz * 0.58 : along;
        thornBatch.add(thornGeo, x + ox, rand(rng, 0.15, 0.45), z + oz, 0, 1, rand(rng, 1, 1.8), 1);
      }
    });

    const clearingMat = new THREE.MeshStandardMaterial({ color: 0x8fc06a, roughness: 1, flatShading: true });
    const flowerMats = [0xf5f5e8, 0xf2d34c, 0xe88fb4].map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true })
    );
    const flowerBatches = flowerMats.map((m) => new GeoBatch(m));
    const flowerGeo = new THREE.ConeGeometry(0.06, 0.18, 5);
    const mazeHalf = ext / 2 + 2.5;
    const dFar = ext * 1.6;
    const clearings = [];
    const cCount = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < cCount; i++) {
      const cr = Math.min(rand(rng, 4.5, 7.5), ext * 0.11);
      const dC = mazeHalf + cr + rand(rng, 3, 8);
      const side = Math.floor(rng() * 4);
      const along = rand(rng, -dC * 0.8, dC * 0.8);
      let cx;
      let cz;
      if (side === 0) {
        cx = -dC;
        cz = along;
      } else if (side === 1) {
        cx = dC;
        cz = along;
      } else if (side === 2) {
        cx = along;
        cz = -dC;
      } else {
        cx = along;
        cz = dC;
      }
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(cr, cr * 0.9, 0.5, 12), clearingMat);
      disc.position.set(cx, -0.3, cz);
      disc.receiveShadow = true;
      group.add(disc);
      clearings.push({ x: cx, z: cz, r: cr });
      for (let j = 0; j < 7; j++) {
        const fa = rng() * Math.PI * 2;
        const fr = rng() * cr * 0.75;
        pick(rng, flowerBatches).add(flowerGeo, cx + Math.cos(fa) * fr, 0.04, cz + Math.sin(fa) * fr, 0, 1, rand(rng, 0.8, 1.5), 1);
      }
    }

    const target = 620 + Math.floor(ext * 3.4);
    let placed = 0;
    let guard = target * 14;
    while (placed < target && guard-- > 0) {
      const x = rand(rng, -dFar, dFar);
      const z = rand(rng, -dFar, dFar);
      const d = Math.max(Math.abs(x), Math.abs(z));
      if (d < mazeHalf + 1.3) continue;
      const f = Math.min(1, (d - mazeHalf) / (dFar - mazeHalf));
      if (rng() > 0.42 + 0.58 * f) continue;
      if (clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + 3)) continue;
      const s = (1.15 + 2.1 * f) * rand(rng, 0.85, 1.2);
      const ry = rng() * Math.PI * 2;
      const batch = pick(rng, leafBatches);
      trunkBatch.add(trunkGeo, x, 1.1 * s - 0.15, z, 0, s, s, s);
      batch.add(pick(rng, crownBig), x, 2.5 * s, z, ry, s * rand(rng, 0.95, 1.2), s * rand(rng, 0.9, 1.15), s * rand(rng, 0.95, 1.2));
      const b2 = pick(rng, leafBatches);
      b2.add(pick(rng, crownSmall), x + rand(rng, -0.4, 0.4) * s, 3.55 * s, z + rand(rng, -0.4, 0.4) * s, ry, s * rand(rng, 0.9, 1.15), s * rand(rng, 0.95, 1.25), s * rand(rng, 0.9, 1.15));
      placed++;
    }

    const bushCount = 42 + Math.floor(ext * 0.9);
    for (let i = 0; i < bushCount; i++) {
      const dC = mazeHalf + rand(rng, 1.5, 12);
      const side = Math.floor(rng() * 4);
      const along = rand(rng, -dC, dC);
      let bx;
      let bz;
      if (side === 0) {
        bx = -dC;
        bz = along;
      } else if (side === 1) {
        bx = dC;
        bz = along;
      } else if (side === 2) {
        bx = along;
        bz = -dC;
      } else {
        bx = along;
        bz = dC;
      }
      pick(rng, leafBatches).add(bush, bx, -0.05, bz, rng() * 3, rand(rng, 1, 1.9), rand(rng, 0.6, 1), rand(rng, 1, 1.9));
    }

    const campStoneMat = new THREE.MeshStandardMaterial({ color: 0x8a8d84, roughness: 1, flatShading: true });
    const logMat = new THREE.MeshStandardMaterial({ color: 0x5a3f28, roughness: 1, flatShading: true });
    const coalMat = new THREE.MeshStandardMaterial({
      color: 0x20100a,
      emissive: 0xff6a2a,
      emissiveIntensity: 2,
      roughness: 0.6,
      flatShading: true,
    });
    const campfires = [];
    const fireSpots = clearings.slice(0, 2 + Math.floor(rng() * 2));
    for (const c of fireSpots) {
      const fire = new THREE.Group();
      for (let j = 0; j < 7; j++) {
        const sa = (j / 7) * Math.PI * 2;
        const stone = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(rng, 0.14, 0.2), 0), campStoneMat);
        stone.position.set(Math.cos(sa) * 0.72, 0.1, Math.sin(sa) * 0.72);
        stone.rotation.set(rng() * 3, rng() * 3, rng() * 3);
        stone.castShadow = true;
        fire.add(stone);
      }
      for (let j = 0; j < 3; j++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 5), logMat);
        log.position.y = 0.14;
        log.rotation.set(1.15, j * 2.1, 0.4);
        log.castShadow = true;
        fire.add(log);
      }
      const coals = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), coalMat);
      coals.position.y = 0.16;
      fire.add(coals);
      const flameOuter = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.75, 6),
        new THREE.MeshStandardMaterial({
          color: 0x301405,
          emissive: 0xff8a3c,
          emissiveIntensity: 2.4,
          roughness: 0.5,
          flatShading: true,
        })
      );
      flameOuter.position.y = 0.55;
      const flameInner = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.42, 6),
        new THREE.MeshStandardMaterial({
          color: 0x301c05,
          emissive: 0xffd9a0,
          emissiveIntensity: 3,
          roughness: 0.5,
          flatShading: true,
        })
      );
      flameInner.position.y = 0.44;
      fire.add(flameOuter, flameInner);
      const light = new THREE.PointLight(0xff9440, 16, 12, 2);
      light.position.y = 1;
      fire.add(light);
      fire.position.set(c.x, -0.05, c.z);
      group.add(fire);
      campfires.push({ flameOuter, flameInner, light, phase: rng() * 10 });
    }

    const startC = cellCenter(maze, maze.start.x, maze.start.y);
    const finishC = cellCenter(maze, maze.finish.x, maze.finish.y);
    const portal = makePortal(0x8dffa9);
    portal.group.position.set(startC.x, 0, startC.z);
    group.add(portal.group);
    const altar = makeAltar(0xffcf6e);
    altar.group.position.set(finishC.x, 0, finishC.z);
    group.add(altar.group);

    earthBatch.build(group);
    mossBatch.build(group);
    stoneBatch.build(group);
    trunkBatch.build(group);
    for (const b of leafBatches) b.build(group);
    tuftBatch.build(group);
    stemBatch.build(group);
    for (const b of capBatches) b.build(group);
    stepBatch.build(group);
    archBatch.build(group);
    thornBatch.build(group);
    for (const b of flowerBatches) b.build(group);
    for (const g of [...earthVariants, ...mossVariants, boulder, trunkGeo, ...crownBig, ...crownSmall, bush, tuft, stemGeo, capGeo, stepGeo, archGeo, thornGeo, leafGeo, blobGeo, flowerGeo]) g.dispose();

    const flyCount = 130;
    const area = ext;
    const positions = new Float32Array(flyCount * 3);
    const base = new Float32Array(flyCount * 3);
    const phase = new Float32Array(flyCount);
    for (let i = 0; i < flyCount; i++) {
      base[i * 3] = rand(rng, -area / 2, area / 2);
      base[i * 3 + 1] = rand(rng, 0.6, 2.8);
      base[i * 3 + 2] = rand(rng, -area / 2, area / 2);
      phase[i] = rng() * Math.PI * 2;
    }
    positions.set(base);
    const flyGeo = new THREE.BufferGeometry();
    flyGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const flies = new THREE.Points(
      flyGeo,
      new THREE.PointsMaterial({
        color: 0xd8ff7a,
        size: 0.16,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    group.add(flies);

    const update = (dt, t) => {
      portal.update(dt, t);
      altar.update(dt, t);
      for (const cf of campfires) {
        const s = 0.9 + Math.sin(t * 9 + cf.phase) * 0.12 + Math.sin(t * 23 + cf.phase * 3) * 0.06;
        cf.flameOuter.scale.set(s, 1 + Math.sin(t * 11 + cf.phase) * 0.2, s);
        cf.flameInner.scale.set(s, 1 + Math.sin(t * 13 + cf.phase * 2) * 0.25, s);
        cf.light.intensity = 14 + Math.sin(t * 8 + cf.phase) * 3 + Math.sin(t * 19 + cf.phase) * 1.5;
      }
      const p = flyGeo.attributes.position;
      for (let i = 0; i < flyCount; i++) {
        const ph = phase[i];
        p.setXYZ(
          i,
          base[i * 3] + Math.sin(t * 0.7 + ph) * 0.8,
          base[i * 3 + 1] + Math.sin(t * 1.1 + ph * 1.3) * 0.45,
          base[i * 3 + 2] + Math.cos(t * 0.5 + ph) * 0.8
        );
      }
      p.needsUpdate = true;
    };

    return { group, update };
  },
};
