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

export const winter = {
  id: 'winter',
  name: 'Зима',
  salt: 101,
  bloom: { strength: 0.5, radius: 0.55, threshold: 0.85 },
  exposure: 1.05,
  build(maze, rng, engine) {
    const group = new THREE.Group();
    const scene = engine.scene;
    scene.background = new THREE.Color(0x0d1626);
    scene.fog = new THREE.FogExp2(0x101b30, 0.0135);

    const hemi = new THREE.HemisphereLight(0x8fb3ff, 0x27314d, 0.55);
    group.add(hemi);
    const ext = Math.max(maze.cols, maze.rows) * CELL;
    const dir = new THREE.DirectionalLight(0x6b8cff, 1.3);
    dir.position.set(30, 44, 18);
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

    group.add(
      makeFloor(maze, rng, {
        color: 0xdce8f7,
        jitter: 0.07,
        groundColor: 0xa8bcd9,
        groundScale: 4.2,
        facets: { cells: 4, relief: 0.8, scale: 0.55 },
      })
    );

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5c6a86, roughness: 0.95, flatShading: true, vertexColors: true });
    stoneMat.normalMap = makeFacetedNormalMap(rng, { cells: 7, relief: 1.4 });
    stoneMat.normalScale = new THREE.Vector2(0.8, 0.8);
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf2f7ff, roughness: 0.9, flatShading: true });
    snowMat.normalMap = makeFacetedNormalMap(rng, { cells: 5, relief: 0.65 });
    snowMat.normalScale = new THREE.Vector2(0.55, 0.55);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2f, roughness: 1, flatShading: true });
    const firMat = new THREE.MeshStandardMaterial({ color: 0x2e5546, roughness: 0.9, flatShading: true });

    const stoneBatch = new GeoBatch(stoneMat, true);
    const snowBatch = new GeoBatch(snowMat);
    const trunkBatch = new GeoBatch(trunkMat);
    const firBatch = new GeoBatch(firMat);

    const t = 1.0;
    const rockVariants = [0, 1, 2, 3].map(() => rockGeometry(rng, { w: CELL + t * 0.9, h: 3.0, d: t, jag: 0.42 }));
    const capVariants = [0, 1].map(() => rockGeometry(rng, { w: CELL + 1.1, h: 0.5, d: t * 1.35, jag: 0.16 }));
    forEachWall(maze, (x, z, horizontal) => {
      const ry = (horizontal ? 0 : Math.PI / 2) + rand(rng, -0.05, 0.05);
      const sy = rand(rng, 0.8, 1.25);
      const sLen = rand(rng, 0.96, 1.06);
      stoneBatch.add(pick(rng, rockVariants), x, 1.5 * sy - 0.3, z, ry, sLen, sy, rand(rng, 0.95, 1.1), rand(rng, 0.86, 1.14));
      const capH = rand(rng, 0.4, 0.6);
      snowBatch.add(pick(rng, capVariants), x, 3 * sy - 0.32 - capH / 2 + 0.14, z, ry, sLen, capH / 0.5, 1.05);
    });

    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.2, 0.9, 5);
    const cone1 = new THREE.ConeGeometry(1.05, 1.5, 6);
    const cone2 = new THREE.ConeGeometry(0.8, 1.3, 6);
    const cone3 = new THREE.ConeGeometry(0.52, 1.1, 6);
    const snowC1 = new THREE.ConeGeometry(0.76, 0.92, 6);
    const snowC2 = new THREE.ConeGeometry(0.58, 0.79, 6);
    const snowC3 = new THREE.ConeGeometry(0.38, 0.67, 6);
    const trees = scatterSpots(maze, rng, Math.floor((maze.cols * maze.rows) / 3.2), {
      avoid: [maze.start, maze.finish],
    });
    for (const spot of trees) {
      const s = rand(rng, 0.8, 1.35);
      const ry = rng() * Math.PI * 2;
      trunkBatch.add(trunkGeo, spot.x, 0.45 * s, spot.z, ry, s, s, s);
      firBatch.add(cone1, spot.x, 1.35 * s, spot.z, ry, s, s, s);
      firBatch.add(cone2, spot.x, 2.15 * s, spot.z, ry, s, s, s);
      firBatch.add(cone3, spot.x, 2.9 * s, spot.z, ry, s, s, s);
      snowBatch.add(snowC1, spot.x, 1.64 * s, spot.z, ry, s, s, s);
      snowBatch.add(snowC2, spot.x, 2.41 * s, spot.z, ry, s, s, s);
      snowBatch.add(snowC3, spot.x, 3.12 * s, spot.z, ry, s, s, s);
    }

    const drift = new THREE.IcosahedronGeometry(1, 0);
    const drifts = scatterSpots(maze, rng, Math.floor((maze.cols * maze.rows) / 4), {
      avoid: [maze.start, maze.finish],
    });
    for (const spot of drifts) {
      snowBatch.add(drift, spot.x, 0.02, spot.z, rng() * Math.PI, rand(rng, 0.45, 1.0), rand(rng, 0.2, 0.33), rand(rng, 0.45, 1.0));
    }

    forEachWall(maze, (x, z, horizontal) => {
      if (rng() < 0.62) return;
      const ry = horizontal ? 0 : Math.PI / 2;
      const side = rng() < 0.5 ? 1 : -1;
      const nx = horizontal ? 0 : side;
      const nz = horizontal ? side : 0;
      const along = rand(rng, -1.4, 1.4);
      snowBatch.add(
        drift,
        x + nx * 0.85 + (horizontal ? along : 0),
        0.03,
        z + nz * 0.85 + (horizontal ? 0 : along),
        ry,
        rand(rng, 1.4, 2.6),
        rand(rng, 0.28, 0.48),
        rand(rng, 0.75, 1.1)
      );
    });

    const mazeHalf = ext / 2 + 2.5;
    const lakeSize = Math.max(4, Math.min(rand(rng, 4.5, 6.5), ext * 0.1));
    const lakeGap = lakeSize + rand(rng, 1.5, 3.5);
    const lakeSide = Math.floor(rng() * 4);
    const lakeAlong = rand(rng, -mazeHalf * 0.7, mazeHalf * 0.7);
    let lakeX;
    let lakeZ;
    if (lakeSide === 0) {
      lakeX = -mazeHalf - lakeGap;
      lakeZ = lakeAlong;
    } else if (lakeSide === 1) {
      lakeX = mazeHalf + lakeGap;
      lakeZ = lakeAlong;
    } else if (lakeSide === 2) {
      lakeX = lakeAlong;
      lakeZ = -mazeHalf - lakeGap;
    } else {
      lakeX = lakeAlong;
      lakeZ = mazeHalf + lakeGap;
    }
    const lake = new THREE.Mesh(
      new THREE.CylinderGeometry(lakeSize, lakeSize * 0.85, 0.5, 14),
      new THREE.MeshStandardMaterial({
        color: 0xa9d2ee,
        roughness: 0.15,
        metalness: 0.5,
        emissive: 0x0a1e33,
        emissiveIntensity: 0.9,
        flatShading: true,
      })
    );
    lake.position.set(lakeX, -0.3, lakeZ);
    lake.scale.z = rand(rng, 0.7, 1.1);
    lake.receiveShadow = true;
    group.add(lake);

    const crackGeo = new THREE.BoxGeometry(1, 0.04, 0.06);
    const shardGeo = new THREE.OctahedronGeometry(0.35, 0);
    for (let i = 0; i < 4; i++) {
      const ca = rng() * Math.PI * 2;
      snowBatch.add(
        crackGeo,
        lakeX + Math.cos(ca) * lakeSize * rand(rng, 0.2, 0.55),
        -0.03,
        lakeZ + Math.sin(ca) * lakeSize * rand(rng, 0.2, 0.55) * lake.scale.z,
        ca,
        rand(rng, 0.3, 0.7),
        1,
        1
      );
    }
    for (let i = 0; i < 3; i++) {
      const sa = rng() * Math.PI * 2;
      snowBatch.add(
        shardGeo,
        lakeX + Math.cos(sa) * lakeSize * rand(rng, 0.75, 0.95),
        0.05,
        lakeZ + Math.sin(sa) * lakeSize * rand(rng, 0.75, 0.95) * lake.scale.z,
        rng() * Math.PI,
        rand(rng, 0.5, 0.9),
        rand(rng, 1.6, 2.6),
        rand(rng, 0.5, 0.9)
      );
    }
    for (let i = 0; i < 7; i++) {
      const da = (i / 7) * Math.PI * 2 + rng() * 0.5;
      snowBatch.add(
        drift,
        lakeX + Math.cos(da) * (lakeSize + rand(rng, 0.2, 0.9)),
        -0.05,
        lakeZ + Math.sin(da) * (lakeSize + rand(rng, 0.2, 0.9)) * lake.scale.z,
        rng() * Math.PI,
        rand(rng, 0.9, 1.7),
        rand(rng, 0.35, 0.55),
        rand(rng, 0.9, 1.7)
      );
    }
    crackGeo.dispose();
    shardGeo.dispose();

    const postMat = new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.8, flatShading: true });
    const lanternPostBatch = new GeoBatch(postMat);
    const lanternGlassMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a08,
      emissive: 0xff9d4d,
      emissiveIntensity: 3.2,
      roughness: 0.4,
      flatShading: true,
    });
    const lanternGlassBatch = new GeoBatch(lanternGlassMat);
    const postGeo = new THREE.BoxGeometry(0.13, 2.3, 0.13);
    const capGeo = new THREE.BoxGeometry(0.36, 0.28, 0.36);
    const glassGeo = new THREE.BoxGeometry(0.26, 0.34, 0.26);
    const lanternLights = [];
    const pts = pathWorldPoints(maze);
    for (let i = 4; i < pts.length - 3; i += 5) {
      const p = pts[i];
      const ox = rand(rng, -0.95, 0.95);
      const oz = rand(rng, -0.95, 0.95);
      lanternPostBatch.add(postGeo, p.x + ox, 1.15, p.z + oz);
      lanternPostBatch.add(capGeo, p.x + ox, 2.42, p.z + oz);
      lanternGlassBatch.add(glassGeo, p.x + ox, 2.28, p.z + oz);
      const light = new THREE.PointLight(0xff9a3c, 22, 15, 2);
      light.position.set(p.x + ox, 2.4, p.z + oz);
      group.add(light);
      lanternLights.push(light);
    }

    const mountainMat = new THREE.MeshStandardMaterial({ color: 0x3a4560, roughness: 1, flatShading: true });
    const mountainBatch = new GeoBatch(mountainMat);
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x4a5a78, roughness: 1, flatShading: true });
    const hillBatch = new GeoBatch(hillMat);
    const ringSpot = (dMin, dMax, i, total) => {
      const dC = rand(rng, dMin, dMax);
      const side = i % 4;
      const along = ((i / total) * 2 - 1) * dC + rand(rng, -4, 4);
      if (side === 0) return { x: -dC, z: along };
      if (side === 1) return { x: dC, z: along };
      if (side === 2) return { x: along, z: -dC };
      return { x: along, z: dC };
    };
    const mCount = 12 + Math.floor(rng() * 4);
    for (let i = 0; i < mCount; i++) {
      const spot = ringSpot(ext * 0.98, ext * 1.28, i, mCount);
      const px = spot.x;
      const pz = spot.z;
      const h = rand(rng, 22, 46);
      const dC = Math.max(Math.abs(px), Math.abs(pz));
      const base = Math.max(5, Math.min(h * rand(rng, 0.4, 0.6), dC - mazeHalf - 5));
      if (base < 5) continue;
      if (Math.hypot(px - lakeX, pz - lakeZ) < base + lakeSize + 3) continue;
      const rot = rng() * Math.PI;
      const cone = new THREE.ConeGeometry(base, h, 6, 2);
      displace(cone, rand(rng, 1.2, 2.4), rng, true);
      mountainBatch.add(cone, px, h / 2 - 0.4, pz, rot);
      cone.dispose();
      const capH = h * 0.45;
      const capBase = Math.max(2.5, base * (capH / h) * 1.12);
      const cap = new THREE.ConeGeometry(capBase, capH, 6, 1);
      snowBatch.add(cap, px, h - 0.4 - capH / 2 + 0.5, pz, rot);
      cap.dispose();
    }
    const hCount = 8 + Math.floor(rng() * 5);
    for (let i = 0; i < hCount; i++) {
      const spot = ringSpot(ext * 0.68, ext * 0.92, i + 2, hCount + 4);
      const px = spot.x;
      const pz = spot.z;
      const h = rand(rng, 3.5, 9);
      const dC = Math.max(Math.abs(px), Math.abs(pz));
      const base = Math.max(2.5, Math.min(h * rand(rng, 1.2, 1.8), dC - mazeHalf - 2));
      if (base < 2.5) continue;
      if (Math.hypot(px - lakeX, pz - lakeZ) < base + lakeSize + 2) continue;
      const rot = rng() * Math.PI;
      const cone = new THREE.ConeGeometry(base, h, 7, 1);
      displace(cone, rand(rng, 0.5, 1.0), rng, true);
      hillBatch.add(cone, px, h / 2 - 0.4, pz, rot);
      cone.dispose();
      const capH = h * 0.42;
      const capBase = Math.max(1.5, base * (capH / h) * 1.12);
      const cap = new THREE.ConeGeometry(capBase, capH, 7, 1);
      snowBatch.add(cap, px, h - 0.4 - capH / 2 + 0.3, pz, rot);
      cap.dispose();
    }

    const startC = cellCenter(maze, maze.start.x, maze.start.y);
    const finishC = cellCenter(maze, maze.finish.x, maze.finish.y);
    const portal = makePortal(0x86d9ff);
    portal.group.position.set(startC.x, 0, startC.z);
    group.add(portal.group);
    const altar = makeAltar(0xffd27a);
    altar.group.position.set(finishC.x, 0, finishC.z);
    group.add(altar.group);

    stoneBatch.build(group);
    snowBatch.build(group);
    trunkBatch.build(group);
    firBatch.build(group);
    lanternPostBatch.build(group);
    lanternGlassBatch.build(group);
    mountainBatch.build(group);
    hillBatch.build(group);
    for (const g of [...rockVariants, ...capVariants, trunkGeo, cone1, cone2, cone3, snowC1, snowC2, snowC3, drift, postGeo, capGeo, glassGeo]) g.dispose();

    const snowCount = 420;
    const area = ext * 1.4;
    const positions = new Float32Array(snowCount * 3);
    const vel = new Float32Array(snowCount);
    const phase = new Float32Array(snowCount);
    for (let i = 0; i < snowCount; i++) {
      positions[i * 3] = rand(rng, -area / 2, area / 2);
      positions[i * 3 + 1] = rand(rng, 0, 18);
      positions[i * 3 + 2] = rand(rng, -area / 2, area / 2);
      vel[i] = rand(rng, 0.6, 1.5);
      phase[i] = rng() * Math.PI * 2;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const snowPts = new THREE.Points(
      snowGeo,
      new THREE.PointsMaterial({
        color: 0xe8f1ff,
        size: 0.14,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
    );
    group.add(snowPts);

    const update = (dt, t) => {
      portal.update(dt, t);
      altar.update(dt, t);
      for (let i = 0; i < lanternLights.length; i++) {
        const l = lanternLights[i];
        l.intensity = 20 + Math.sin(t * 6 + i * 2.4) * 2.5 + Math.sin(t * 13.7 + i) * 1.2;
      }
      const p = snowGeo.attributes.position;
      for (let i = 0; i < snowCount; i++) {
        let y = p.getY(i) - vel[i] * dt;
        if (y < 0) y = 18;
        p.setY(i, y);
        p.setX(i, p.getX(i) + Math.sin(t * 0.6 + phase[i]) * dt * 0.35);
      }
      p.needsUpdate = true;
    };

    return { group, update };
  },
};
