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
  makeFacetedNormalMap,
  displace,
  scatterSpots,
  pathWorldPoints,
  rand,
  pick,
} from '../themeHelpers.js';
import { SmokeColumn } from '../../traps/Smoke.js';

export const dungeon = {
  id: 'dungeon',
  name: 'Подземелье',
  salt: 404,
  bloom: { strength: 0.5, radius: 0.45, threshold: 0.78 },
  exposure: 1.15,
  build(maze, rng, engine) {
    const group = new THREE.Group();
    const scene = engine.scene;
    scene.background = new THREE.Color(0x050506);
    scene.fog = new THREE.FogExp2(0x060607, 0.028);

    const hemi = new THREE.HemisphereLight(0x1f2126, 0x0b0c0e, 0.22);
    group.add(hemi);

    group.add(
      makeFloor(maze, rng, {
        color: 0x2b2f3a,
        jitter: 0.09,
        groundColor: 0x1b1e26,
        facets: { cells: 6, relief: 1.1, scale: 0.85 },
      })
    );

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x414858, roughness: 1, flatShading: true, vertexColors: true });
    stoneMat.normalMap = makeFacetedNormalMap(rng, { cells: 8, relief: 1.5 });
    stoneMat.normalScale = new THREE.Vector2(0.9, 0.9);
    const stoneBatch = new GeoBatch(stoneMat, true);
    const t = 1.0;
    const rockVariants = [0, 1, 2, 3].map(() => rockGeometry(rng, { w: CELL + t * 0.9, h: 3.5, d: t * 1.1, jag: 0.5 }));
    forEachWall(maze, (x, z, horizontal) => {
      const ry = (horizontal ? 0 : Math.PI / 2) + rand(rng, -0.04, 0.04);
      const sy = rand(rng, 0.9, 1.15);
      stoneBatch.add(pick(rng, rockVariants), x, 1.75 * sy - 0.3, z, ry, rand(rng, 0.96, 1.05), sy, rand(rng, 0.95, 1.1), rand(rng, 0.82, 1.18));
    });

    const pebbleGeo = new THREE.IcosahedronGeometry(1, 0);
    const pebbleSpots = scatterSpots(maze, rng, Math.floor((maze.cols * maze.rows) * 0.7), {
      avoid: [maze.start, maze.finish],
    });
    for (const spot of pebbleSpots) {
      const n = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const r = rand(rng, 0.07, 0.2);
        stoneBatch.add(
          pebbleGeo,
          spot.x + rand(rng, -0.9, 0.9),
          r * rand(rng, 0.3, 0.55),
          spot.z + rand(rng, -0.9, 0.9),
          rng() * 3,
          r,
          r * rand(rng, 0.6, 0.95),
          r,
          rand(rng, 0.85, 1.15)
        );
      }
      if (rng() < 0.1) {
        const r = rand(rng, 0.3, 0.55);
        stoneBatch.add(pebbleGeo, spot.x, r * 0.35, spot.z, rng() * 3, r, r * rand(rng, 0.5, 0.8), r, rand(rng, 0.8, 1.2));
      }
    }

    const stalGeo = new THREE.ConeGeometry(1, 1, 5, 2);
    forEachWall(maze, (x, z, horizontal) => {
      if (rng() < 0.7) return;
      const side = rng() < 0.5 ? 1 : -1;
      const nx = horizontal ? 0 : side;
      const nz = horizontal ? side : 0;
      const count = 1 + Math.floor(rng() * 2);
      for (let i = 0; i < count; i++) {
        const along = rand(rng, -1.7, 1.7);
        const h = rand(rng, 0.7, 2.1);
        const r = h * rand(rng, 0.22, 0.35);
        const g = stalGeo.clone();
        displace(g, 0.25, rng);
        stoneBatch.add(
          g,
          x + nx * rand(rng, 0.72, 0.95) + (horizontal ? along : 0),
          h / 2 - 0.15,
          z + nz * rand(rng, 0.72, 0.95) + (horizontal ? 0 : along),
          rng() * Math.PI,
          r,
          h,
          r,
          rand(rng, 0.85, 1.15)
        );
        g.dispose();
      }
    });

    const startC = cellCenter(maze, maze.start.x, maze.start.y);
    const finishC = cellCenter(maze, maze.finish.x, maze.finish.y);
    const portal = makePortal(0x7fe8d8);
    portal.group.position.set(startC.x, 0, startC.z);
    group.add(portal.group);
    const altar = makeAltar(0xffd27a);
    altar.group.position.set(finishC.x, 0, finishC.z);
    group.add(altar.group);

    const brazierMat = new THREE.MeshStandardMaterial({ color: 0x1c1f26, roughness: 0.9, flatShading: true });
    const coalMat = new THREE.MeshStandardMaterial({
      color: 0x20100a,
      emissive: 0xff8c3a,
      emissiveIntensity: 2.5,
      roughness: 0.6,
      flatShading: true,
    });
    const brazierGeo = new THREE.CylinderGeometry(0.42, 0.28, 0.55, 7);
    const coalGeo = new THREE.IcosahedronGeometry(0.26, 0);
    const emberLights = [];
    const brazierSpots = [startC, finishC];
    const pts = pathWorldPoints(maze);
    for (let i = Math.floor(pts.length / 3); i < pts.length; i += Math.floor(pts.length / 3)) {
      brazierSpots.push(pts[i]);
      if (brazierSpots.length >= 4) break;
    }
    for (const s of brazierSpots) {
      const x = s.x + rand(rng, -1.1, 1.1);
      const z = s.z + rand(rng, -1.1, 1.1);
      const br = new THREE.Mesh(brazierGeo, brazierMat);
      br.position.set(x, 0.28, z);
      br.castShadow = true;
      const coal = new THREE.Mesh(coalGeo, coalMat);
      coal.position.set(x, 0.62, z);
      group.add(br, coal);
      const light = new THREE.PointLight(0xff9a3c, 18, 13, 2);
      light.position.set(x, 0.9, z);
      group.add(light);
      emberLights.push(light);
    }

    const torchWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 1, flatShading: true });
    const torchMetalMat = new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.7, metalness: 0.5, flatShading: true });
    const torchGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.6, 5);
    const bracketGeo = new THREE.BoxGeometry(0.1, 0.26, 0.1);
    const flames = [];
    const SIDE_WALLS = {
      x: [
        { v: [0, -1], wall: 'top' },
        { v: [0, 1], wall: 'bottom' },
      ],
      z: [
        { v: [-1, 0], wall: 'left' },
        { v: [1, 0], wall: 'right' },
      ],
    };
    for (let i = 2; i < maze.path.length - 2; i += 3) {
      if (rng() < 0.25 || flames.length >= 9) continue;
      const cellObj = maze.path[i];
      const next = maze.path[i + 1];
      const dx = next.x - cellObj.x;
      const dz = next.y - cellObj.y;
      const sides = Math.abs(dx) > 0 ? SIDE_WALLS.x : SIDE_WALLS.z;
      const options = sides.filter((s) => maze.cell(cellObj.x, cellObj.y).walls[s.wall]);
      if (!options.length) continue;
      const side = pick(rng, options);
      const c = cellCenter(maze, cellObj.x, cellObj.y);
      const tx = c.x + side.v[0] * 1.56;
      const tz = c.z + side.v[1] * 1.56;
      const torch = new THREE.Group();
      const bracket = new THREE.Mesh(bracketGeo, torchMetalMat);
      bracket.position.y = 0.05;
      const stick = new THREE.Mesh(torchGeo, torchWoodMat);
      stick.rotation.z = -0.55;
      stick.position.set(0.16, 0.26, 0);
      bracket.castShadow = stick.castShadow = true;
      torch.add(bracket, stick);
      const flameOuter = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.42, 6),
        new THREE.MeshStandardMaterial({
          color: 0x2a1204,
          emissive: 0xff8c3a,
          emissiveIntensity: 2.2,
          roughness: 0.5,
          flatShading: true,
        })
      );
      flameOuter.position.set(0.36, 0.64, 0);
      const flameInner = new THREE.Mesh(
        new THREE.ConeGeometry(0.07, 0.24, 6),
        new THREE.MeshStandardMaterial({
          color: 0x2a1c04,
          emissive: 0xffd9a0,
          emissiveIntensity: 3,
          roughness: 0.5,
          flatShading: true,
        })
      );
      flameInner.position.set(0.36, 0.56, 0);
      torch.add(flameOuter, flameInner);
      const light = new THREE.PointLight(0xff9a3c, 14, 12, 2);
      light.position.set(0.42, 0.8, 0);
      torch.add(light);
      torch.position.set(tx, 2.15, tz);
      torch.rotation.y = Math.atan2(-side.v[0], -side.v[1]) - Math.PI / 2;
      group.add(torch);
      const ry = torch.rotation.y;
      const fx = tx + 0.42 * Math.cos(ry);
      const fz = tz - 0.42 * Math.sin(ry);
      flames.push({
        flameOuter,
        flameInner,
        light,
        phase: rng() * 10,
        smoke: new SmokeColumn(group, fx, 2.8, fz, {
          count: 12,
          rate: 6,
          rise: 0.65,
          spread: 0.14,
          size: 11,
          life: 2.4,
          opacity: 0.45,
          color: 0x121212,
        }),
      });
    }

    const dripCount = 7;
    const dripSpots = [];
    const usedCells = new Set([maze.start.x + ',' + maze.start.y, maze.finish.x + ',' + maze.finish.y]);
    let dripGuard = dripCount * 25;
    while (dripSpots.length < dripCount && dripGuard-- > 0) {
      const cx = Math.floor(rng() * maze.cols);
      const cy = Math.floor(rng() * maze.rows);
      const key = cx + ',' + cy;
      if (usedCells.has(key)) continue;
      usedCells.add(key);
      const c = cellCenter(maze, cx, cy);
      const x = c.x + rand(rng, -1.1, 1.1);
      const z = c.z + rand(rng, -1.1, 1.1);
      const puddle = new THREE.Mesh(
        new THREE.CircleGeometry(rand(rng, 0.35, 0.6), 10),
        new THREE.MeshStandardMaterial({ color: 0x1c2836, roughness: 0.15, metalness: 0.7, transparent: true, opacity: 0.85 })
      );
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(x, 0.055, z);
      group.add(puddle);
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x9fc4e8, emissive: 0x24405e, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.3 })
      );
      drop.scale.set(1, 1.8, 1);
      drop.visible = false;
      group.add(drop);
      const splash = new THREE.Mesh(
        new THREE.RingGeometry(0.06, 0.1, 12),
        new THREE.MeshBasicMaterial({ color: 0x7aa8cc, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
      );
      splash.rotation.x = -Math.PI / 2;
      splash.position.set(x, 0.08, z);
      group.add(splash);
      dripSpots.push({ x, z, drop, splash, state: 'wait', timer: rand(rng, 1, 6), vy: 0, dropY: 0 });
    }

    stoneBatch.build(group, true, true);
    for (const g of [...rockVariants, pebbleGeo, stalGeo]) g.dispose();

    const update = (dt, t) => {
      portal.update(dt, t);
      altar.update(dt, t);
      for (let i = 0; i < emberLights.length; i++) {
        emberLights[i].intensity = 16 + Math.sin(t * 7 + i * 2.2) * 3 + Math.sin(t * 15.3 + i) * 1.5;
      }
      for (const f of flames) {
        const s = 0.92 + Math.sin(t * 10 + f.phase) * 0.1 + Math.sin(t * 27 + f.phase * 2) * 0.05;
        f.flameOuter.scale.set(s, 1 + Math.sin(t * 12 + f.phase) * 0.18, s);
        f.flameInner.scale.set(s, 1 + Math.sin(t * 15 + f.phase) * 0.22, s);
        f.light.intensity = 12.5 + Math.sin(t * 9 + f.phase) * 2.5 + Math.sin(t * 21 + f.phase) * 1.2;
        f.smoke.always = true;
        f.smoke.update(dt, t);
      }
      for (const d of dripSpots) {
        if (d.state === 'wait') {
          d.timer -= dt;
          if (d.timer <= 0) {
            d.state = 'fall';
            d.dropY = 5.4;
            d.vy = 0;
            d.drop.visible = true;
          }
        } else if (d.state === 'fall') {
          d.vy += 14 * dt;
          d.dropY -= d.vy * dt;
          if (d.dropY <= 0.07) {
            d.dropY = 0.07;
            d.state = 'splash';
            d.timer = 0.38;
            d.drop.visible = false;
            d.splash.material.opacity = 0.75;
            d.splash.scale.set(1, 1, 1);
          }
          d.drop.position.set(d.x, d.dropY, d.z);
        } else {
          d.timer -= dt;
          const k = 1 - d.timer / 0.38;
          d.splash.scale.set(1 + k * 6, 1 + k * 6, 1 + k * 6);
          d.splash.material.opacity = Math.max(0, 0.75 * (1 - k));
          if (d.timer <= 0) {
            d.state = 'wait';
            d.timer = rand(rng, 2.5, 7);
          }
        }
      }
    };

    return { group, update };
  },
};
