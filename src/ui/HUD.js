export class HUD {
  constructor({ themes, onViewerStart, onGameStart, onTheme, onRegen, onSize, onVictoryLook }) {
    this.root = document.getElementById('hud');
    this.root.innerHTML = `
      <div class="panel" id="panel" style="display:none">
        <h1>3D Лабиринт</h1>
        <div class="subtitle">Визуализатор</div>
        <div class="themes" id="panel-themes"></div>
        <div class="row">
          <label for="size-select">Размер</label>
          <select id="size-select">
            <option value="11">11 × 11</option>
            <option value="15" selected>15 × 15</option>
            <option value="21">21 × 21</option>
            <option value="31">31 × 31</option>
          </select>
        </div>
        <button class="primary" id="regen-btn">Сгенерировать заново</button>
        <div class="meta" id="meta"></div>
      </div>
      <div class="minimap-box" id="minimap-box" style="display:none">
        <canvas id="minimap" width="200" height="200"></canvas>
        <div class="minimap-caption">старт — зелёный, финиш — золотой</div>
      </div>
      <div class="timer" id="timer" style="display:none">Время: <span id="time">0.0</span> с</div>
      <div class="hp-wrap" id="hp-wrap" style="display:none">
        <div class="hp-label">HP</div>
        <div class="hp-bar"><div class="hp-fill" id="hp-fill"></div></div>
      </div>
      <div class="vignette" id="vignette"></div>
      <div class="death" id="death" style="display:none">
        <div class="death-card"><h2>Вы погибли</h2><div class="death-sub">Возврат к старту...</div></div>
      </div>
      <div class="hint" id="hint" style="display:none"></div>
      <div class="victory" id="victory" style="display:none">
        <div class="victory-card">
          <h2>Лабиринт пройден!</h2>
          <div class="v-time" id="victory-time">0.0 с</div>
          <div class="buttons">
            <button class="primary" id="victory-new">Новый лабиринт</button>
            <button class="secondary" id="victory-look">Осмотреться</button>
          </div>
        </div>
      </div>
      <div class="start" id="start">
        <div class="start-card">
          <h1>3D Лабиринт</h1>
          <div class="subtitle">Выберите режим</div>
          <div class="mode-buttons">
            <button class="mode-btn" id="mode-viewer">
              <span class="mode-title">Визуализатор</span>
              <span class="mode-desc">Свободная камера, минимапа, смена тем и размеров</span>
            </button>
            <button class="mode-btn" id="mode-game">
              <span class="mode-title">Игра</span>
              <span class="mode-desc">Найдите алтарь. Камера следует за героем</span>
            </button>
          </div>
          <div class="game-setup" id="game-setup" style="display:none">
            <div class="setup-label">Локация</div>
            <div class="themes" id="start-themes"></div>
            <div class="row">
              <label for="start-size">Размер</label>
              <select id="start-size">
                <option value="11">11 × 11</option>
                <option value="15" selected>15 × 15</option>
                <option value="21">21 × 21</option>
                <option value="31">31 × 31</option>
              </select>
            </div>
            <button class="primary" id="start-game-btn">Начать игру</button>
          </div>
          <div class="start-hint">Esc — вернуться в меню</div>
        </div>
      </div>
    `;

    const panelThemes = this.root.querySelector('#panel-themes');
    for (const t of themes) {
      const btn = document.createElement('button');
      btn.textContent = t.name;
      btn.dataset.id = t.id;
      btn.addEventListener('click', () => onTheme(t.id));
      panelThemes.appendChild(btn);
    }

    this.gameTheme = themes[0].id;
    this.gameSize = 15;
    const startThemes = this.root.querySelector('#start-themes');
    for (const t of themes) {
      const btn = document.createElement('button');
      btn.textContent = t.name;
      btn.dataset.id = t.id;
      if (t.id === this.gameTheme) btn.classList.add('active');
      btn.addEventListener('click', () => {
        this.gameTheme = t.id;
        startThemes.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.id === t.id));
      });
      startThemes.appendChild(btn);
    }

    this.root.querySelector('#mode-viewer').addEventListener('click', () => onViewerStart());
    this.root.querySelector('#mode-game').addEventListener('click', () => {
      this.root.querySelector('#game-setup').style.display = 'block';
    });
    this.root.querySelector('#start-size').addEventListener('change', (e) => {
      this.gameSize = parseInt(e.target.value, 10);
    });
    this.root.querySelector('#start-game-btn').addEventListener('click', () => onGameStart(this.gameTheme, this.gameSize));

    this.root.querySelector('#size-select').addEventListener('change', (e) => onSize(parseInt(e.target.value, 10)));
    this.root.querySelector('#regen-btn').addEventListener('click', () => onRegen());
    this.root.querySelector('#victory-new').addEventListener('click', () => {
      this.hideVictory();
      onRegen();
    });
    this.root.querySelector('#victory-look').addEventListener('click', () => {
      this.hideVictory();
      if (onVictoryLook) onVictoryLook();
    });

    this.minimap = this.root.querySelector('#minimap');
    this.panel = this.root.querySelector('#panel');
    this.minimapBox = this.root.querySelector('#minimap-box');
    this.timerEl = this.root.querySelector('#timer');
    this.timeEl = this.root.querySelector('#time');
    this.hintEl = this.root.querySelector('#hint');
    this.meta = this.root.querySelector('#meta');
    this.startEl = this.root.querySelector('#start');
    this.victoryEl = this.root.querySelector('#victory');
    this.victoryTimeEl = this.root.querySelector('#victory-time');
    this.hpWrap = this.root.querySelector('#hp-wrap');
    this.hpFill = this.root.querySelector('#hp-fill');
    this.vignetteEl = this.root.querySelector('#vignette');
    this.deathEl = this.root.querySelector('#death');
    this._maze = null;
    this._playerPos = null;
    this._focused = null;
  }

  showStart() {
    this.startEl.style.display = 'flex';
    this.root.querySelector('#game-setup').style.display = 'none';
  }

  hideStart() {
    this.startEl.style.display = 'none';
  }

  setMode(mode) {
    this.panel.style.display = mode === 'viewer' ? 'block' : 'none';
    this.minimapBox.style.display = mode === 'viewer' ? 'block' : 'none';
    this.timerEl.style.display = mode === 'game' ? 'block' : 'none';
    this.hpWrap.style.display = mode === 'game' ? 'flex' : 'none';
    if (mode !== 'game') this.setVignette(0);
    if (mode !== 'game') this.hideDeath();
    if (mode === 'viewer') {
      this.hintEl.style.display = 'block';
      this.hintEl.textContent = 'ЛКМ — облёт · Колесо — зум · ПКМ — панорама · Esc — меню';
    } else if (mode === 'game') {
      this.hintEl.style.display = 'block';
      this.hintEl.textContent =
        'WASD / Стрелки / Стик — движение · Shift / RT — бег · Space / B — прыжок · ЛКМ / A — удар · ПКм / Правый стик — камера · Esc / Menu — меню';
    } else {
      this.hintEl.style.display = 'none';
    }
  }

  setActiveTheme(id) {
    this.root.querySelectorAll('#panel-themes button').forEach((b) => {
      b.classList.toggle('active', b.dataset.id === id);
    });
  }

  setMeta({ seed, cols, rows, cycles, path }) {
    this.meta.textContent = `Сид: ${seed} · Клетки: ${cols}×${rows} · Циклов: +${cycles} · Путь: ${path}`;
  }

  setTime(sec) {
    this.timeEl.textContent = sec.toFixed(1);
  }

  setHp(ratio) {
    const pct = Math.max(0, Math.min(1, ratio));
    this.hpFill.style.width = pct * 100 + '%';
    this.hpFill.classList.toggle('low', pct < 0.28);
    this.hpFill.classList.toggle('mid', pct >= 0.28 && pct < 0.55);
  }

  setVignette(alpha) {
    this.vignetteEl.style.opacity = alpha.toFixed(3);
  }

  showDeath() {
    this.deathEl.style.display = 'flex';
  }

  hideDeath() {
    this.deathEl.style.display = 'none';
  }

  hasOverlay() {
    return this.startEl.style.display !== 'none' || this.victoryEl.style.display !== 'none';
  }

  _focusables() {
    if (this.victoryEl.style.display !== 'none') {
      return [this.root.querySelector('#victory-new'), this.root.querySelector('#victory-look')];
    }
    if (this.startEl.style.display !== 'none') {
      const btns = [this.root.querySelector('#mode-viewer'), this.root.querySelector('#mode-game')];
      if (this.root.querySelector('#game-setup').style.display !== 'none') {
        this.root.querySelectorAll('#start-themes button').forEach((b) => btns.push(b));
        btns.push(this.root.querySelector('#start-game-btn'));
      }
      return btns.filter(Boolean);
    }
    return [];
  }

  _setFocus(btn) {
    if (this._focused) this._focused.classList.remove('gp-focus');
    this._focused = btn;
    if (btn) btn.classList.add('gp-focus');
  }

  gamepadMove(step) {
    const btns = this._focusables();
    if (!btns.length) return;
    let idx = btns.indexOf(this._focused);
    if (idx < 0) idx = 0;
    else idx = (idx + step + btns.length) % btns.length;
    this._setFocus(btns[idx]);
  }

  gamepadConfirm() {
    if (this._focused) this._focused.click();
  }

  clearFocus() {
    this._setFocus(null);
  }

  showVictory(sec) {
    this.victoryTimeEl.textContent = sec.toFixed(1) + ' с';
    this.victoryEl.style.display = 'flex';
  }

  hideVictory() {
    this.victoryEl.style.display = 'none';
  }

  drawMinimap(maze) {
    this._maze = maze;
    this._playerPos = null;
    this._renderMinimap();
  }

  setPlayer(x, z) {
    this._playerPos = { x, z };
    this._renderMinimap();
  }

  _renderMinimap() {
    const maze = this._maze;
    if (!maze) return;
    const canvas = this.minimap;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const pad = 10;
    const cw = (size - pad * 2) / maze.cols;
    const ch = (size - pad * 2) / maze.rows;
    const toX = (x) => pad + (x + 0.5) * cw;
    const toY = (y) => pad + (y + 0.5) * ch;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(8, 11, 18, 0.9)';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(160, 178, 210, 0.95)';
    ctx.lineWidth = Math.max(1.5, cw * 0.14);
    ctx.beginPath();
    for (const s of maze.wallSegments()) {
      if (s.dir === 'h') {
        ctx.moveTo(toX(s.x) - cw / 2, toY(s.y) - ch / 2);
        ctx.lineTo(toX(s.x) + cw / 2, toY(s.y) - ch / 2);
      } else {
        ctx.moveTo(toX(s.x) - cw / 2, toY(s.y) - ch / 2);
        ctx.lineTo(toX(s.x) - cw / 2, toY(s.y) + ch / 2);
      }
    }
    ctx.stroke();

    const dot = (x, y, color, r) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    dot(toX(maze.start.x), toY(maze.start.y), '#58ff9d', Math.max(3, cw * 0.3));
    dot(toX(maze.finish.x), toY(maze.finish.y), '#ffd166', Math.max(3, cw * 0.3));

    if (this._playerPos) {
      const cell = 4;
      const px = pad + (this._playerPos.x / cell + (maze.cols - 1) / 2 + 0.5) * cw;
      const py = pad + (this._playerPos.z / cell + (maze.rows - 1) / 2 + 0.5) * ch;
      dot(px, py, '#ffffff', Math.max(2.5, cw * 0.16));
      dot(px, py, '#4da3ff', Math.max(3, cw * 0.24));
    }
  }
}
