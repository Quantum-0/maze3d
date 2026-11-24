import { worldToCell } from '../world/themeHelpers.js';

// Секунды между срабатываниями команды; кулдаун общий на канал.
const COOLDOWN = { enemy: 30, trap: 20, rock: 25, path: 40 };
const MAX_CHAT_ENEMIES = 5;
const MAX_CHAT_TRAPS = 10;
const ARROW_LIFE = 8;
const MAX_NAME = 25;

const COMMANDS = {
  враг: 'enemy',
  ловушка: 'trap',
  камень: 'rock',
  путь: 'path',
};

const COMMAND_RE = /^\s*!\s*(\S+)/i;

export function parseCommand(text) {
  const m = COMMAND_RE.exec(text);
  return m ? COMMANDS[m[1].toLowerCase()] || null : null;
}

export class ChatCommands {
  constructor({ player, traps, enemies, isActive }) {
    this.player = player;
    this.traps = traps;
    this.enemies = enemies;
    this.isActive = isActive;
    this.readyAt = {};
    this.reset();
  }

  // Вызывается на новый лабиринт: всё созданное чатом исчезает вместе с ним, кулдауны обнуляются.
  reset() {
    this.readyAt = { enemy: 0, trap: 0, rock: 0, path: 0 };
  }

  // Возвращает true, только если команда действительно что-то сделала.
  handle(user, text) {
    const cmd = parseCommand(text);
    if (!cmd || !this.isActive() || !this.traps.maze) return false;
    const now = performance.now() / 1000;
    if (now < this.readyAt[cmd]) return false;
    if (!this._run(cmd, user)) return false;
    this.readyAt[cmd] = now + COOLDOWN[cmd];
    return true;
  }

  _run(cmd, user) {
    const p = this.player.position;
    const cell = worldToCell(this.traps.maze, p.x, p.z);
    switch (cmd) {
      case 'enemy':
        return this.enemies.spawnChatEnemy((user.displayName || user.username || 'зритель').slice(0, MAX_NAME), user.color, MAX_CHAT_ENEMIES);
      case 'trap':
        return this.traps.spawnChatTrap(cell, MAX_CHAT_TRAPS);
      case 'rock':
        return this.traps.spawnChatRock(cell);
      default:
        return this.traps.showExitArrow(cell, ARROW_LIFE);
    }
  }
}
