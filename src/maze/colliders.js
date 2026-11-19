import { CELL, forEachWall } from '../world/themeHelpers.js';

export function buildWallColliders(maze, half = 0.58) {
  const walls = [];
  forEachWall(maze, (x, z, horizontal) => {
    const hx = horizontal ? CELL / 2 + half : half;
    const hz = horizontal ? half : CELL / 2 + half;
    walls.push({ minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz });
  });
  return walls;
}
