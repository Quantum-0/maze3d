// Анонимное (только чтение) подключение к чату канала через tmi.js.
// Библиотека грузится только при наличии ?twitch=<ник> — остальные посетители её не скачивают.

const CHANNEL_RE = /^[a-z0-9_]{3,25}$/i;
// Состояние канала приходит сразу после входа; если его нет — канала с таким ником не существует.
const JOIN_TIMEOUT = 10000;

export class TwitchChat {
  constructor({ onStatus, onMessage }) {
    this.onStatus = onStatus;
    this.onMessage = onMessage;
    this.channel = null;
    this.name = null;
    this.joined = false;
    this.client = null;
  }

  static channelFromUrl(search = location.search) {
    const raw = (new URLSearchParams(search).get('twitch') || '').trim();
    return raw && CHANNEL_RE.test(raw) ? raw.toLowerCase() : null;
  }

  async start() {
    const raw = (new URLSearchParams(location.search).get('twitch') || '').trim();
    if (!raw) return;
    const channel = TwitchChat.channelFromUrl();
    if (!channel) {
      this.name = raw.slice(0, 30);
      this._status('error');
      return;
    }
    this.channel = channel;
    this.name = channel[0].toUpperCase() + channel.slice(1);
    this._status('connecting');
    try {
      const mod = await import('tmi.js');
      const tmi = mod.default ?? mod;
      const client = new tmi.Client({
        channels: [channel],
        connection: { reconnect: true, secure: true },
        options: { skipUpdatingEmotesets: true },
      });
      this.client = client;
      client.on('roomstate', () => {
        if (this.joined) return;
        this.joined = true;
        this._status('connected');
      });
      client.on('message', (target, tags, message) => {
        // Точное написание ника канала анонимно узнать неоткуда, кроме сообщений его владельца.
        if (tags.username === channel && tags['display-name'] && tags['display-name'] !== this.name) {
          this.name = tags['display-name'];
          if (this.joined) this._status('connected');
        }
        this.onMessage({ username: tags.username, displayName: tags['display-name'], color: tags.color }, message);
      });
      client.on('disconnected', () => {
        this.joined = false;
        this._status('reconnecting');
      });
      // После сбоя tmi.js переподключается сам, поэтому отвергнутое подключение не считаем ошибкой —
      // ошибку ставит таймаут ниже, если канал так и не присоединился.
      client.connect().catch(() => {});
      setTimeout(() => {
        if (!this.joined && this.client === client) this._status('error');
      }, JOIN_TIMEOUT);
    } catch (e) {
      this._status('error');
    }
  }

  _status(state) {
    this.onStatus({ state, name: this.name });
  }
}
