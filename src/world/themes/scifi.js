import * as THREE from 'three';
import {
  CELL,
  cellCenter,
  forEachWall,
  makeFloor,
  makePortal,
  makeAltar,
  GeoBatch,
  rand,
  pick,
} from '../themeHelpers.js';

export const scifi = {
  id: 'scifi',
  name: 'Техно',
  salt: 303,
  bloom: { strength: 0.45, radius: 0.45, threshold: 0.75 },
  exposure: 1.15,
  build(maze, rng, engine) {
    const group = new THREE.Group();
    const scene = engine.scene;
    scene.background = new THREE.Color(0x111726);
    scene.fog = new THREE.FogExp2(0x111726, 0.012);

    const hemi = new THREE.HemisphereLight(0xd6e6ff, 0x2a3242, 1.05);
    group.add(hemi);
    const ext = Math.max(maze.cols, maze.rows) * CELL;
    const dir = new THREE.DirectionalLight(0xe8f2ff, 1.15);
    dir.position.set(24, 38, 16);
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
    const fill = new THREE.DirectionalLight(0xaebfd8, 0.5);
    fill.position.set(-30, 24, -22);
    group.add(fill, fill.target);

    group.add(
      makeFloor(maze, rng, { color: 0x27303f, jitter: 0.015, roughness: 0.4, metalness: 0.5, groundColor: 0x161b26 })
    );

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x45526e, roughness: 0.4, metalness: 0.7, flatShading: true });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x7e90ab, roughness: 0.35, metalness: 0.8, flatShading: true });
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x2b3549, roughness: 0.5, metalness: 0.6, flatShading: true });
    const ventMat = new THREE.MeshStandardMaterial({ color: 0x111826, roughness: 0.6, metalness: 0.4, flatShading: true });
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x1a222f, roughness: 0.45, metalness: 0.75, flatShading: true });
    const coolantMat = new THREE.MeshStandardMaterial({
      color: 0x03211f,
      emissive: 0x2bd9c8,
      emissiveIntensity: 1.3,
      roughness: 0.35,
      flatShading: true,
    });
    coolantMat.defines = { USE_UV: '' };
    const coolantTime = { value: 0 };
    coolantMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = coolantTime;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
{
  float flowK = smoothstep(0.25, 0.8, fract(vUv.y * 2.0 - uTime * 0.32));
  totalEmissiveRadiance *= 0.35 + 1.9 * flowK;
}`
        );
    };
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0x33404e,
      emissive: 0xeaf6ff,
      emissiveIntensity: 2.2,
      roughness: 0.3,
      flatShading: true,
    });

    const wallBatch = new GeoBatch(wallMat);
    const trimBatch = new GeoBatch(trimMat);
    const panelBatch = new GeoBatch(panelMat);
    const ventBatch = new GeoBatch(ventMat);
    const bracketBatch = new GeoBatch(bracketMat);
    const coolantBatch = new GeoBatch(coolantMat);

    const wallGeo = new THREE.BoxGeometry(CELL + 0.9, 3, 1);
    const trimGeo = new THREE.BoxGeometry(CELL + 0.95, 0.1, 0.24);
    const tubeGeo = new THREE.CylinderGeometry(0.08, 0.08, CELL + 0.4, 6);
    tubeGeo.rotateZ(Math.PI / 2);
    const tube2Geo = new THREE.CylinderGeometry(0.055, 0.055, CELL + 0.4, 6);
    tube2Geo.rotateZ(Math.PI / 2);
    const clampGeo = new THREE.BoxGeometry(0.22, 0.36, 0.36);
    const riserGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.3, 6);
    const panelGeo = new THREE.BoxGeometry(2.6, 1.7, 0.09);
    const ventGeo = new THREE.BoxGeometry(2.2, 0.05, 0.03);
    const ledGeo = new THREE.BoxGeometry(0.07, 0.07, 0.04);

    const ledDefs = [
      { color: 0x39ff9c, phase: 0, speed: 2.2 },
      { color: 0x39ff9c, phase: 1.3, speed: 3.1 },
      { color: 0xbfe0ff, phase: 2.1, speed: 1.7 },
      { color: 0x2bd9c8, phase: 0.5, speed: 2.6 },
    ].map((d) => ({
      ...d,
      mat: new THREE.MeshStandardMaterial({
        color: 0x04140c,
        emissive: d.color,
        emissiveIntensity: 1.1,
        roughness: 0.3,
      }),
    }));

    forEachWall(maze, (x, z, horizontal) => {
      const ry = horizontal ? 0 : Math.PI / 2;
      const sy = rand(rng, 0.97, 1.06);
      wallBatch.add(wallGeo, x, 1.45 * sy, z, ry, 1, sy, 1);
      trimBatch.add(trimGeo, x, 3.02 * sy, z, ry);

      if (rng() < 0.7) {
        const side = rng() < 0.5 ? 1 : -1;
        const nx = horizontal ? 0 : side;
        const nz = horizontal ? side : 0;
        const y1 = rand(rng, 1.05, 1.3);
        coolantBatch.add(tubeGeo, x + nx * 0.64, y1, z + nz * 0.64, ry);
        if (rng() < 0.6) {
          coolantBatch.add(tube2Geo, x + nx * 0.64, y1 + 0.34, z + nz * 0.64, ry);
        }
        for (let k = -1; k <= 1; k++) {
          bracketBatch.add(
            clampGeo,
            x + (horizontal ? k * 1.6 : nx * 0.64),
            y1,
            z + (horizontal ? nz * 0.64 : k * 1.6),
            ry
          );
        }
        if (rng() < 0.35) {
          const endSign = rng() < 0.5 ? 1 : -1;
          const ex = horizontal ? (CELL / 2 - 0.35) * endSign : nx * 0.64;
          const ez = horizontal ? nz * 0.64 : (CELL / 2 - 0.35) * endSign;
          coolantBatch.add(riserGeo, x + ex, 1.3, z + ez, 0);
          bracketBatch.add(clampGeo, x + ex, 2.4, z + ez, 0);
          bracketBatch.add(clampGeo, x + ex, 0.25, z + ez, 0);
        }
      }

      if (rng() < 0.4) {
        const side = rng() < 0.5 ? 1 : -1;
        const nx = horizontal ? 0 : side;
        const nz = horizontal ? side : 0;
        const px = x + nx * 0.57;
        const pz = z + nz * 0.57;
        panelBatch.add(panelGeo, px, 1.5, pz, ry);
        for (let v = -1; v <= 1; v++) {
          ventBatch.add(ventGeo, px + nx * 0.06, 1.5 + v * 0.5, pz + nz * 0.06, ry);
        }
        const nLeds = 2 + Math.floor(rng() * 3);
        for (let l = 0; l < nLeds; l++) {
          const led = new THREE.Mesh(ledGeo, pick(rng, ledDefs).mat);
          led.position.set(
            px + nx * 0.06 + (horizontal ? rand(rng, -1, 1) : 0),
            1.5 + rand(rng, -0.72, 0.72),
            pz + nz * 0.06 + (horizontal ? 0 : rand(rng, -1, 1))
          );
          group.add(led);
        }
      }
    });

    const lampHousingGeo = new THREE.BoxGeometry(2.6, 0.12, 0.66);
    const lampGeo = new THREE.BoxGeometry(2.35, 0.06, 0.5);
    const lampBatch = new GeoBatch(lampMat);
    const lampCount = Math.floor((maze.cols * maze.rows) / 5);
    const lampUsed = new Set([maze.start.x + ',' + maze.start.y, maze.finish.x + ',' + maze.finish.y]);
    let lampGuard = lampCount * 30;
    let lampsPlaced = 0;
    while (lampsPlaced < lampCount && lampGuard-- > 0) {
      const cx = Math.floor(rng() * maze.cols);
      const cy = Math.floor(rng() * maze.rows);
      const key = cx + ',' + cy;
      if (lampUsed.has(key)) continue;
      lampUsed.add(key);
      lampsPlaced++;
      const c = cellCenter(maze, cx, cy);
      const w = maze.cell(cx, cy);
      let ry;
      if (!w.walls.left && !w.walls.right) ry = 0;
      else if (!w.walls.top && !w.walls.bottom) ry = Math.PI / 2;
      else ry = rng() < 0.5 ? 0 : Math.PI / 2;
      const y = rand(rng, 8.5, 11.5);
      bracketBatch.add(lampHousingGeo, c.x, y, c.z, ry);
      lampBatch.add(lampGeo, c.x, y - 0.07, c.z, ry);
    }

    const startC = cellCenter(maze, maze.start.x, maze.start.y);
    const finishC = cellCenter(maze, maze.finish.x, maze.finish.y);
    const portal = makePortal(0x35e0ff);
    portal.group.position.set(startC.x, 0, startC.z);
    group.add(portal.group);
    const altar = makeAltar(0xffa53d);
    altar.group.position.set(finishC.x, 0, finishC.z);
    group.add(altar.group);

    wallBatch.build(group, true, true);
    trimBatch.build(group, false, true);
    panelBatch.build(group, false, true);
    ventBatch.build(group, false, true);
    bracketBatch.build(group, false, true);
    coolantBatch.build(group, false, true);
    lampBatch.build(group, false, true);
    for (const g of [wallGeo, trimGeo, tubeGeo, tube2Geo, clampGeo, riserGeo, panelGeo, ventGeo, ledGeo, lampHousingGeo, lampGeo]) g.dispose();

    const update = (dt, t) => {
      portal.update(dt, t);
      altar.update(dt, t);
      coolantTime.value = t;
      lampMat.emissiveIntensity = 2.1 + Math.sin(t * 0.9) * 0.15;
      for (const led of ledDefs) {
        led.mat.emissiveIntensity = 0.9 + (Math.sin(t * led.speed + led.phase) > 0.35 ? 0.7 : 0);
      }
    };

    return { group, update };
  },
};
