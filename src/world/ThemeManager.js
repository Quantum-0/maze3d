import { mulberry32 } from '../core/utils.js';
import { mazeExtent } from './themeHelpers.js';
import { winter } from './themes/winter.js';
import { forest } from './themes/forest.js';
import { scifi } from './themes/scifi.js';
import { dungeon } from './themes/dungeon.js';

const REGISTRY = { winter, forest, scifi, dungeon };
export const THEME_LIST = [winter, forest, scifi, dungeon].map((t) => ({ id: t.id, name: t.name }));

export class ThemeManager {
  constructor(engine) {
    this.engine = engine;
    this.current = null;
    this.currentId = null;
    this._update = null;
  }

  apply(themeId, maze, seed) {
    this.dispose();
    const theme = REGISTRY[themeId] || REGISTRY.winter;
    const rng = mulberry32(((seed ^ 0x9e3779b9) >>> 0) + theme.salt);
    const built = theme.build(maze, rng, this.engine);
    this.engine.scene.add(built.group);
    this.engine.setBloom(theme.bloom);
    this.engine.setExposure(theme.exposure ?? 1.05);
    this.engine.frameMaze(mazeExtent(maze));
    this.current = built;
    this.currentId = theme.id;
    this._update = built.update ? (dt, t) => built.update(dt, t) : null;
    if (this._update) this.engine.addUpdater(this._update);
  }

  dispose() {
    if (!this.current) return;
    if (this._update) this.engine.removeUpdater(this._update);
    this.engine.scene.remove(this.current.group);
    this.current.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
    this.engine.scene.fog = null;
    this.engine.scene.background = null;
    this.current = null;
    this._update = null;
  }
}
