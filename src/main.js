import './style.css';
import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { Maze } from './maze/Maze.js';
import { buildWallColliders } from './maze/colliders.js';
import { ThemeManager, THEME_LIST } from './world/ThemeManager.js';
import { cellCenter } from './world/themeHelpers.js';
import { HUD } from './ui/HUD.js';
import { Player } from './entities/Player.js';
import { TrapManager } from './traps/TrapManager.js';
import { EnemyManager } from './entities/Enemy.js';
import { mulberry32 } from './core/utils.js';
import { TwitchChat } from './twitch/TwitchChat.js';
import { ChatCommands } from './twitch/ChatCommands.js';

const state = {
  theme: 'winter',
  size: 15,
  seed: (Math.random() * 1e9) | 0,
};

const engine = new Engine(document.getElementById('app'));
const themes = new ThemeManager(engine);
const player = new Player(engine.scene);
const traps = new TrapManager(engine);
const enemies = new EnemyManager(engine);
traps.sfx.listener = engine.camera;
player.group.visible = false;

let stateStart = { x: 0, z: 0 };

let mode = null;
let menuOpen = true;
let won = false;
let startTime = performance.now();
let hudClock = 0;
let finish = { x: 0, z: 0 };

const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape' && mode) openMenu();
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

let attackQueued = false;
const camCtl = { yaw: 0, pitch: 0.92, dist: 15.5, drag: false };
const canvas = engine.renderer.domElement;
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mousedown', (e) => {
  if (mode !== 'game' || menuOpen) return;
  if (e.button === 0) attackQueued = true;
  else if (e.button === 2) camCtl.drag = true;
});
window.addEventListener('mouseup', (e) => {
  if (e.button === 2) camCtl.drag = false;
});
window.addEventListener('mousemove', (e) => {
  if (!camCtl.drag || mode !== 'game') return;
  camCtl.yaw -= e.movementX * 0.0045;
  camCtl.pitch = Math.min(1.35, Math.max(0.35, camCtl.pitch + e.movementY * 0.0045));
});

const prevPad = { jump: false, attack: false, menu: false };
let prevSpace = false;

function readPads() {
  const out = { x: 0, z: 0, run: false, jump: false, attack: false, menu: false, yaw: 0, pitch: 0, navUp: false, navDown: false, navLeft: false, navRight: false, navConfirm: false, raw: null };
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (!pad) continue;
    out.raw = pad.buttons;
    const ax = pad.axes[0] || 0;
    const ay = pad.axes[1] || 0;
    if (Math.abs(ax) > 0.18) out.x += ax;
    if (Math.abs(ay) > 0.18) out.z -= ay;
    if (ay < -0.6) out.navUp = true;
    if (ay > 0.6) out.navDown = true;
    if (ax < -0.6) out.navLeft = true;
    if (ax > 0.6) out.navRight = true;
    const rx = pad.axes[2] || 0;
    const ry = pad.axes[3] || 0;
    if (Math.abs(rx) > 0.18) out.yaw -= rx;
    if (Math.abs(ry) > 0.18) out.pitch += ry;
    const b = pad.buttons;
    const pr = (i) => b[i] && (b[i].pressed || b[i].value > 0.5);
    if (pr(14)) out.x -= 1;
    if (pr(15)) out.x += 1;
    if (pr(12)) out.z += 1;
    if (pr(13)) out.z -= 1;
    if (pr(12)) out.navUp = true;
    if (pr(13)) out.navDown = true;
    if (pr(14)) out.navLeft = true;
    if (pr(15)) out.navRight = true;
    if (pr(7)) out.run = true;
    if (pr(1)) out.jump = true;
    if (pr(0)) out.attack = true;
    if (pr(0)) out.navConfirm = true;
    if (pr(9)) out.menu = true;
  }
  return out;
}

function buildInput(pad) {
  let x = 0;
  let z = 0;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) z += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) z -= 1;
  x += pad.x;
  z += pad.z;
  const len = Math.hypot(x, z);
  if (len > 1) {
    x /= len;
    z /= len;
  }
  const spaceNow = keys.has('Space');
  const jump = (spaceNow && !prevSpace) || (pad.jump && !prevPad.jump);
  const attack = attackQueued || (pad.attack && !prevPad.attack);
  const run = keys.has('ShiftLeft') || keys.has('ShiftRight') || pad.run;
  prevSpace = spaceNow;
  prevPad.jump = pad.jump;
  prevPad.attack = pad.attack;
  attackQueued = false;
  return { x, z, run, jump, attack };
}

function rebuild(newMaze = true) {
  if (newMaze) state.seed = (Math.random() * 1e9) | 0;
  const maze = new Maze(state.size, state.size, state.seed);
  themes.apply(state.theme, maze, state.seed);
  player.setColliders(buildWallColliders(maze));
  player.setDarkMode(state.theme === 'dungeon');
  const startC = cellCenter(maze, maze.start.x, maze.start.y);
  finish = cellCenter(maze, maze.finish.x, maze.finish.y);
  stateStart = startC;
  player.respawn(startC.x, startC.z);
  if (mode === 'game') {
    traps.build(maze, state.theme, mulberry32((state.seed ^ 0x5f3759df) >>> 0), player);
    enemies.build(maze, state.theme, mulberry32((state.seed ^ 0x1a2b3c4d) >>> 0), player, traps.debris, traps.sfx);
  } else {
    traps.dispose();
    enemies.dispose();
  }
  won = false;
  startTime = performance.now();
  chatCommands.reset();
  hud.hideVictory();
  hud.setActiveTheme(state.theme);
  hud.setMeta({
    seed: state.seed,
    cols: maze.cols,
    rows: maze.rows,
    cycles: maze.cyclesAdded,
    path: maze.solutionLength,
  });
  hud.drawMinimap(maze);
  hud.setTime(0);
  if (mode === 'game') {
    camCtl.yaw = 0;
    camCtl.pitch = 0.92;
    const cp = Math.cos(camCtl.pitch);
    const sp = Math.sin(camCtl.pitch);
    engine.camera.position.set(
      startC.x + Math.sin(camCtl.yaw) * cp * camCtl.dist,
      0.6 + sp * camCtl.dist,
      startC.z + Math.cos(camCtl.yaw) * cp * camCtl.dist
    );
    engine.camera.lookAt(startC.x, 1.2, startC.z);
  }
}

function startViewer() {
  mode = 'viewer';
  menuOpen = false;
  hud.hideStart();
  hud.setMode('viewer');
  hud.hideVictory();
  engine.setControlsActive(true);
  engine.controls.autoRotate = true;
  player.group.visible = false;
  rebuild(true);
}

function startGame(themeId, size) {
  state.theme = themeId;
  state.size = size;
  mode = 'game';
  menuOpen = false;
  hud.hideStart();
  hud.setMode('game');
  engine.setControlsActive(false);
  player.group.visible = true;
  rebuild(true);
}

function openMenu() {
  menuOpen = true;
  camCtl.drag = false;
  hud.hideVictory();
  hud.showStart();
  hud.setMode(null);
  if (mode === 'viewer') {
    engine.controls.autoRotate = true;
  }
}

const hud = new HUD({
  themes: THEME_LIST,
  onViewerStart: startViewer,
  onGameStart: startGame,
  onTheme: (id) => {
    state.theme = id;
    rebuild(false);
  },
  onRegen: () => rebuild(true),
  onSize: (n) => {
    state.size = n;
    rebuild(true);
  },
  onVictoryLook: () => {
    player.frozen = false;
  },
});

traps.onDamage = (amount, from) => {
  player.takeDamage(amount, from.x, from.z);
};
enemies.onDamage = (amount, from) => {
  player.takeDamage(amount, from.x, from.z);
};
player.onHp = (hp) => {
  hud.setHp(hp / player.maxHp);
};
player.onHurt = () => {
  traps.sfx.hurt(player.position);
};
player.onDeath = () => {
  hud.showDeath();
  setTimeout(() => {
    player.respawn(stateStart.x, stateStart.z);
    player.frozen = false;
    hud.hideDeath();
  }, 1500);
};
player.onAttackHit = () => {
  traps.handleAttack(player.position, player.angle);
  enemies.handleAttack(player.position, player.angle);
};

// Команды из чата действуют только в идущей игре: не в меню, не после победы и не во время респауна.
const chatCommands = new ChatCommands({
  player,
  traps,
  enemies,
  isActive: () => mode === 'game' && !menuOpen && !won && !player.dead,
});
const chat = new TwitchChat({
  onStatus: (status) => hud.setTwitch(status),
  onMessage: (user, text) => chatCommands.handle(user, text),
});
chat.start();
if (import.meta.env.DEV) {
  window.__chatCommands = chatCommands;
  window.__twitchChat = chat;
}

const _camGoal = new THREE.Vector3();
const menuPad = { up: false, down: false, left: false, right: false, a: false };
engine.addUpdater((dt, t) => {
  const pad = readPads();

  if (hud.hasOverlay()) {
    const nav = [
      { key: 'up', on: pad.navUp },
      { key: 'down', on: pad.navDown },
      { key: 'left', on: pad.navLeft },
      { key: 'right', on: pad.navRight },
    ];
    const steps = { up: -1, down: 1, left: -1, right: 1 };
    for (const n of nav) {
      if (n.on && !menuPad[n.key]) hud.gamepadMove(steps[n.key]);
      menuPad[n.key] = n.on;
    }
    const a = pad.navConfirm;
    if (a && !menuPad.a) hud.gamepadConfirm();
    menuPad.a = a;
    if (mode === 'game') {
      const input = { x: 0, z: 0, run: false, jump: false, attack: false };
      player.update(dt, input, engine.camera);
      traps.update(dt, player.position, player.jumpY, t);
      enemies.update(dt, player.position, player.jumpY, t, false);
    }
    return;
  }
  hud.clearFocus();

  if (pad.menu && !prevPad.menu && mode) {
    prevPad.menu = true;
    openMenu();
    return;
  }
  prevPad.menu = pad.menu;
  if (mode !== 'game') return;

  if (!menuOpen) {
    camCtl.yaw += pad.yaw * 2.4 * dt;
    camCtl.pitch = Math.min(1.35, Math.max(0.35, camCtl.pitch + pad.pitch * 1.9 * dt));
  } else {
    prevPad.jump = pad.jump;
    prevPad.attack = pad.attack;
    prevSpace = keys.has('Space');
    attackQueued = false;
  }

  const input = menuOpen ? { x: 0, z: 0, run: false, jump: false, attack: false } : buildInput(pad);
  player.update(dt, input, engine.camera);
  hud.setVignette(player.invuln > 0 ? Math.min(0.55, player.invuln * 0.5) : 0);
  traps.update(dt, player.position, player.jumpY, t);
  const combatActive = !menuOpen && !won && !player.dead;
  enemies.update(dt, player.position, player.jumpY, t, combatActive);
  const p = player.position;

  const damp = 1 - Math.pow(0.0015, dt);
  const cp = Math.cos(camCtl.pitch);
  const sp = Math.sin(camCtl.pitch);
  _camGoal.set(
    p.x + Math.sin(camCtl.yaw) * cp * camCtl.dist,
    0.6 + sp * camCtl.dist,
    p.z + Math.cos(camCtl.yaw) * cp * camCtl.dist
  );
  engine.camera.position.lerp(_camGoal, damp);
  engine.camera.lookAt(p.x, 1.2 + player.jumpY, p.z);

  if (!won && !menuOpen) {
    const dx = p.x - finish.x;
    const dz = p.z - finish.z;
    const dy = player.jumpY;
    if (dx * dx + dz * dz + dy * dy < 2.1) {
      won = true;
      player.frozen = true;
      hud.showVictory((performance.now() - startTime) / 1000);
    }
  }
  hudClock += dt;
  if (hudClock > 0.12) {
    hudClock = 0;
    if (!won) hud.setTime((performance.now() - startTime) / 1000);
  }
});

engine.start();
hud.setMode(null);
rebuild(true);
