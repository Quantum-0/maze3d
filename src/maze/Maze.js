import { mulberry32, shuffle } from '../core/utils.js';

// Одинаковый ключ для границы двух клеток, в каком бы порядке они ни шли.
export function edgeKey(ax, ay, bx, by) {
  return ax < bx || (ax === bx && ay < by) ? `${ax},${ay}|${bx},${by}` : `${bx},${by}|${ax},${ay}`;
}

const DIRS = {
  top: { dx: 0, dy: -1, opposite: 'bottom' },
  right: { dx: 1, dy: 0, opposite: 'left' },
  bottom: { dx: 0, dy: 1, opposite: 'top' },
  left: { dx: -1, dy: 0, opposite: 'right' },
};

export class Maze {
  constructor(cols, rows, seed) {
    this.cols = cols;
    this.rows = rows;
    this.seed = seed;
    const rng = mulberry32(seed);
    this.cells = [];
    for (let y = 0; y < rows; y++) {
      const row = [];
      for (let x = 0; x < cols; x++) {
        row.push({ x, y, walls: { top: true, right: true, bottom: true, left: true } });
      }
      this.cells.push(row);
    }
    this._carvePerfect(rng);
    this.cyclesAdded = this._carveCycles(rng);
    this._placeStartFinish();
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  cell(x, y) {
    return this.cells[y][x];
  }

  canGo(x, y, dir) {
    const d = DIRS[dir];
    if (!this.inBounds(x + d.dx, y + d.dy)) return false;
    return !this.cell(x, y).walls[dir];
  }

  _carvePerfect(rng) {
    const stack = [this.cell(0, 0)];
    const visited = new Set(['0,0']);
    while (stack.length) {
      const c = stack[stack.length - 1];
      const options = Object.entries(DIRS).filter(([dir, d]) => {
        const nx = c.x + d.dx;
        const ny = c.y + d.dy;
        return this.inBounds(nx, ny) && !visited.has(nx + ',' + ny);
      });
      if (!options.length) {
        stack.pop();
        continue;
      }
      const [dir, d] = options[Math.floor(rng() * options.length)];
      const n = this.cell(c.x + d.dx, c.y + d.dy);
      c.walls[dir] = false;
      n.walls[d.opposite] = false;
      visited.add(n.x + ',' + n.y);
      stack.push(n);
    }
  }

  _carveCycles(rng) {
    const candidates = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const c = this.cell(x, y);
        if (y > 0 && c.walls.top) candidates.push({ x, y, dir: 'top' });
        if (x > 0 && c.walls.left) candidates.push({ x, y, dir: 'left' });
      }
    }
    shuffle(candidates, rng);
    const ratio = 0.15 + rng() * 0.05;
    const n = Math.floor(candidates.length * ratio);
    for (let i = 0; i < n; i++) {
      const { x, y, dir } = candidates[i];
      const d = DIRS[dir];
      this.cell(x, y).walls[dir] = false;
      this.cell(x + d.dx, y + d.dy).walls[d.opposite] = false;
    }
    return n;
  }

  _bfs(sx, sy) {
    const dist = Array.from({ length: this.rows }, () => new Array(this.cols).fill(-1));
    const prev = Array.from({ length: this.rows }, () => new Array(this.cols).fill(null));
    dist[sy][sx] = 0;
    const q = [{ x: sx, y: sy }];
    let far = q[0];
    let head = 0;
    while (head < q.length) {
      const c = q[head++];
      if (dist[c.y][c.x] > dist[far.y][far.x]) far = c;
      for (const [dir] of Object.entries(DIRS)) {
        if (!this.canGo(c.x, c.y, dir)) continue;
        const d = DIRS[dir];
        const nx = c.x + d.dx;
        const ny = c.y + d.dy;
        if (dist[ny][nx] !== -1) continue;
        dist[ny][nx] = dist[c.y][c.x] + 1;
        prev[ny][nx] = c;
        q.push({ x: nx, y: ny });
      }
    }
    return { dist, prev, far };
  }

  _placeStartFinish() {
    const first = this._bfs(0, 0);
    const second = this._bfs(first.far.x, first.far.y);
    this.start = first.far;
    this.finish = second.far;
    this.path = [];
    let cur = second.far;
    while (cur) {
      this.path.push(cur);
      cur = second.prev[cur.y][cur.x];
    }
    this.path.reverse();
    this.solutionLength = this.path.length - 1;
  }

  wallSegments() {
    const segs = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const c = this.cell(x, y);
        if (c.walls.top) segs.push({ x, y, dir: 'h' });
        if (c.walls.left) segs.push({ x, y, dir: 'v' });
        if (y === this.rows - 1 && c.walls.bottom) segs.push({ x, y: y + 1, dir: 'h' });
        if (x === this.cols - 1 && c.walls.right) segs.push({ x: x + 1, y, dir: 'v' });
      }
    }
    return segs;
  }
}
