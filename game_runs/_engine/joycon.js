/* engine/joycon.js — Joy-Con 2 input client (protocol v2), shared by every game.
 * ─────────────────────────────────────────────────────────────────────────
 * Classic-script port of the reference client in https://github.com/cnmzsjbz199328/Joycon
 * at commit ce5abf5a4468ebce18dbe570cb899b799a882555:
 *   shared/protocol/contracts.mjs    → the constants/helpers below (subset: no motion types)
 *   shared/protocol/input-client.mjs → JoyCon2Input + connectJoyCon2, logic unchanged
 * The upstream files are ES modules; game_runs/ loads ordered <script> tags with
 * window namespaces (MIGRATION.md §2), so the code is re-wrapped in an IIFE and
 * exported as window.JoyCon2. Only the wrapping changed (no import/export); the
 * one addition inside connectJoyCon2 is `input.url`, read by status displays.
 * When upgrading, diff against those two upstream files and keep PROTOCOL_VERSION
 * equal to the adapter's (v1 and v2 are incompatible).
 * BladeTrinity/tools/joycon-check.mjs --upstream=<checkout> replays one scripted
 * session through both and fails on any difference in emitted events.
 *
 * What the adapter does (not here): BLE, packet decoding, stick calibration.
 * What this file does: per-controller state, press/release edges, and the
 * no-stuck-keys guarantee (offline / socket closed / >1 s without frames ⇒
 * everything released and sticks centred). Game action mapping lives in each game.
 *
 * Added on top of the port (game_runs-specific, not upstream):
 *   JoyCon2.resolveUrl(loc, nav) — when a page should connect at all (see below)
 *   JoyCon2.shared()             — one connection per page, reused across scene restarts
 *   JoyCon2.closeShared()
 *
 * 中文：上游参考客户端的普通 <script> 移植（逻辑逐行一致，只换了模块外壳），
 * 外加"本页是否连接"策略和整页单例。按键映射不在这里，在各游戏目录。
 */
(function (root) {
  if (root.JoyCon2) return;            // idempotent, like hud.js

  // ───────────── contracts.mjs (subset) ─────────────
  // v2 (2026-10-24): per-controller status, "connected" = controller online,
  // stickRaw / imuReady, full button set.
  const PROTOCOL_VERSION = 2;
  const WS_DEFAULT_URL = 'ws://127.0.0.1:8765';
  const CONTROLLER = ['left', 'right'];
  const CONNECTION_STATES = ['connecting', 'connected', 'disconnected', 'reconnecting', 'cooldown', 'stopped'];
  /** Button name lists per side ("stick" = stick click). */
  const BUTTONS_LEFT = ['up', 'down', 'left', 'right', 'l', 'zl', 'sl', 'sr', 'minus', 'capture', 'stick'];
  const BUTTONS_RIGHT = ['a', 'b', 'x', 'y', 'r', 'zr', 'sl', 'sr', 'plus', 'home', 'c', 'stick'];

  function buttonsFor(controller) {
    return controller === 'right' ? BUTTONS_RIGHT : BUTTONS_LEFT;
  }
  /** Every button of that side, released. */
  function neutralButtons(controller) {
    return Object.fromEntries(buttonsFor(controller).map((n) => [n, false]));
  }

  // ───────────── input-client.mjs ─────────────
  // Guarantees (the whole point -- no stuck keys):
  //   - every press is followed by exactly one release;
  //   - a controller that is not online has nothing pressed and sticks at 0,0.
  //     It goes offline when the adapter reports it not "connected", when the
  //     WebSocket closes, or when no frame arrived for `staleMs` (it comes back
  //     on the next frame, re-pressing whatever is still held);
  //   - frames for an offline controller are ignored.
  const defaultNow = () => root.performance.now();

  function makeDevice(controller) {
    return {
      controller,
      connection: 'unknown', // last adapter status for this controller
      online: false, // connection === "connected" && frames not stale
      stale: false,
      calibrated: false,
      imuReady: false,
      address: null,
      hint: null,
      buttons: neutralButtons(controller),
      stick: { x: 0, y: 0 },
      stickRaw: null,
      battery: null,
      timestamp: null, // adapter clock (s) of the last frame
      seq: null,
      frames: 0,
      ignoredFrames: 0,
      lastFrameAt: null, // local clock (ms)
    };
  }

  class JoyCon2Input extends EventTarget {
    /** @param {{controllers?: string[], staleMs?: number, now?: () => number}} [opts] */
    constructor({ controllers = CONTROLLER, staleMs = 1000, now = defaultNow } = {}) {
      super();
      this.controllers = [...controllers];
      this.staleMs = staleMs;
      this.now = now;
      this.adapter = { transport: 'closed', hello: null };
      this.devices = Object.fromEntries(this.controllers.map((c) => [c, makeDevice(c)]));
      this._badVersions = new Set();
    }

    /** Subscribe; returns an unsubscribe function. */
    on(type, fn) {
      const h = (e) => fn(e.detail);
      this.addEventListener(type, h);
      return () => this.removeEventListener(type, h);
    }

    device(controller) {
      return this.devices[controller] ?? null;
    }

    isPressed(controller, button) {
      return !!this.devices[controller]?.buttons[button];
    }

    _emit(type, detail) {
      this.dispatchEvent(new CustomEvent(type, { detail }));
    }

    _emitDevice(dev) {
      const { lastFrameAt, ...snapshot } = dev;
      this._emit('device', { ...snapshot, buttons: { ...dev.buttons } });
    }

    _releaseAll(dev, reason) {
      for (const name of Object.keys(dev.buttons)) {
        if (dev.buttons[name]) {
          dev.buttons[name] = false;
          this._emit('release', { controller: dev.controller, button: name, reason, timestamp: dev.timestamp, localTime: this.now() });
        }
      }
      if (dev.stick.x !== 0 || dev.stick.y !== 0) {
        dev.stick = { x: 0, y: 0 };
        this._emit('stick', { controller: dev.controller, x: 0, y: 0, raw: dev.stickRaw, reason });
      }
    }

    _setOffline(dev, reason) {
      const was = dev.online;
      dev.online = false;
      this._releaseAll(dev, reason);
      return was;
    }

    /** Feed one WebSocket message (string or already-parsed object). */
    handleMessage(message) {
      let msg = message;
      if (typeof message === 'string') {
        try {
          msg = JSON.parse(message);
        } catch {
          return;
        }
      }
      if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;
      if (msg.v !== PROTOCOL_VERSION) {
        if (!this._badVersions.has(msg.v)) {
          this._badVersions.add(msg.v);
          this._emit('error', { message: `adapter speaks protocol v${msg.v}, this client v${PROTOCOL_VERSION}` });
        }
        return;
      }
      const data = msg.data ?? {};
      if (msg.type === 'hello') {
        this.adapter.hello = data;
        this._emit('adapter', { ...this.adapter });
      } else if (msg.type === 'status') {
        this._status(data);
      } else if (msg.type === 'frame') {
        this._frame(data);
      }
    }

    _status(s) {
      const dev = this.devices[s.controller];
      if (!dev) return; // "unknown" or a controller this client did not ask for
      dev.connection = s.connection;
      dev.calibrated = !!s.calibrated;
      dev.hint = s.hint ?? null;
      dev.address = s.address ?? dev.address;
      if (s.connection === 'connected') {
        dev.online = true;
        dev.stale = false;
        dev.lastFrameAt = this.now(); // grace period before the stale check applies
      } else {
        this._setOffline(dev, 'offline');
        dev.stale = false;
        dev.imuReady = false;
      }
      this._emitDevice(dev);
    }

    _frame(f) {
      const dev = this.devices[f.controller];
      if (!dev) return;
      if (dev.connection !== 'connected') {
        dev.ignoredFrames++;
        return;
      }
      dev.lastFrameAt = this.now();
      const wasOffline = !dev.online;
      dev.online = true;
      dev.stale = false;
      dev.timestamp = f.timestamp;
      dev.seq = f.seq;
      dev.frames++;
      dev.imuReady = f.imuReady !== false;
      dev.battery = f.battery ?? null;
      dev.stickRaw = f.stickRaw ?? null;
      if (wasOffline) this._emitDevice(dev);

      const fb = f.buttons ?? {};
      for (const name of buttonsFor(dev.controller)) {
        const down = !!fb[name];
        if (down === dev.buttons[name]) continue;
        dev.buttons[name] = down;
        this._emit(down ? 'press' : 'release', {
          controller: dev.controller, button: name, timestamp: f.timestamp, localTime: dev.lastFrameAt,
          ...(down ? {} : { reason: 'input' }),
        });
      }
      const x = f.stick?.x ?? 0;
      const y = f.stick?.y ?? 0;
      if (x !== dev.stick.x || y !== dev.stick.y) {
        dev.stick = { x, y };
        this._emit('stick', { controller: dev.controller, x, y, raw: dev.stickRaw });
      }
      this._emit('frame', { controller: dev.controller, frame: f });
    }

    handleTransportOpen() {
      this.adapter.transport = 'open';
      this._emit('adapter', { ...this.adapter });
    }

    /** The WebSocket closed: nothing the adapter said still holds. */
    handleTransportClosed() {
      this.adapter.transport = 'closed';
      for (const dev of Object.values(this.devices)) {
        this._setOffline(dev, 'transport');
        dev.connection = 'unknown';
        dev.stale = false;
        dev.imuReady = false;
        this._emitDevice(dev);
      }
      this._emit('adapter', { ...this.adapter });
    }

    /** Stale-frame watchdog; call periodically (connectJoyCon2 does, every 100 ms). */
    tick() {
      const t = this.now();
      for (const dev of Object.values(this.devices)) {
        if (dev.online && dev.lastFrameAt != null && t - dev.lastFrameAt > this.staleMs) {
          dev.stale = true;
          this._setOffline(dev, 'stale');
          this._emitDevice(dev);
        }
      }
    }
  }

  /**
   * Connect a JoyCon2Input to the adapter and keep the socket open (reconnects
   * with a capped backoff). Returns the JoyCon2Input plus close() and send().
   * @param {{url?: string, controllers?: string[], staleMs?: number, reconnect?: boolean, WebSocketImpl?: any}} [opts]
   */
  function connectJoyCon2({
    url = WS_DEFAULT_URL,
    controllers,
    staleMs,
    reconnect = true,
    WebSocketImpl = root.WebSocket,
  } = {}) {
    if (!WebSocketImpl) throw new Error('no WebSocket implementation (Node >= 22 or a browser needed)');
    const input = new JoyCon2Input({ controllers, staleMs });
    let ws = null;
    let closed = false;
    let retry = 0;
    let retryTimer = null;

    const open = () => {
      input.adapter.transport = 'connecting';
      input._emit('adapter', { ...input.adapter });
      ws = new WebSocketImpl(url);
      ws.onopen = () => {
        retry = 0;
        input.handleTransportOpen();
      };
      ws.onmessage = (ev) => input.handleMessage(typeof ev.data === 'string' ? ev.data : String(ev.data));
      ws.onerror = () => {}; // onclose follows and handles it
      ws.onclose = () => {
        input.handleTransportClosed();
        if (!closed && reconnect) retryTimer = setTimeout(open, Math.min(8000, 500 * 2 ** retry++));
      };
    };
    const watchdog = setInterval(() => input.tick(), 100);
    open();

    input.close = () => {
      closed = true;
      clearInterval(watchdog);
      clearTimeout(retryTimer);
      ws?.close();
    };
    /** Send a client message, e.g. send("mark", {...}) for annotated captures. */
    input.send = (type, data) => {
      if (ws?.readyState !== 1) return false;
      ws.send(JSON.stringify({ v: PROTOCOL_VERSION, type, data }));
      return true;
    };
    input.url = url;
    return input;
  }

  // ───────────── game_runs additions (not upstream) ─────────────

  // Whether this page should connect, and to what. Returns a ws URL or null.
  //   ?joycon=off | 0 | false     never
  //   ?joycon=ws://host:port      that adapter
  //   ?joycon  (or =1 / =on)      the default ws://127.0.0.1:8765
  //   no parameter:
  //     navigator.webdriver       never — verify/playtest treat every failed socket
  //                               attempt as a console error (Chrome logs them, JS can't mute it)
  //     localhost / 127.0.0.1 / [::1] / file:   the default URL (local play)
  //     anything else (the public HTTPS showreel)   never — opt in with ?joycon,
  //                               so visitors without an adapter get no failed
  //                               sockets and no local-network permission prompt
  // 中文：本机打开自动连；线上页面须加 ?joycon 才连；自动化环境不连（除非显式给参数）。
  function resolveUrl(loc, nav) {
    loc = loc || root.location;
    nav = nav || root.navigator;
    let p = null;
    try { p = new URLSearchParams(loc.search).get('joycon'); } catch { p = null; }
    if (p !== null) {
      const v = p.trim();
      if (/^(off|0|false|no)$/i.test(v)) return null;
      if (/^wss?:\/\//i.test(v)) return v;
      return WS_DEFAULT_URL;
    }
    if (nav && nav.webdriver) return null;
    const host = (loc.hostname || '').toLowerCase();
    if (loc.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1') {
      return WS_DEFAULT_URL;
    }
    return null;
  }

  // One connection per page. Phaser scene restarts re-run create(); reconnecting
  // there would drop the adapter's status replay and churn the socket, so scenes
  // subscribe to this instance and unsubscribe on shutdown instead.
  let shared = undefined;
  function getShared() {
    if (shared !== undefined) return shared;
    const url = resolveUrl();
    shared = url && root.WebSocket ? connectJoyCon2({ url, controllers: CONTROLLER }) : null;
    return shared;
  }
  function closeShared() {
    if (shared) shared.close();
    shared = null;
  }

  root.JoyCon2 = {
    PROTOCOL_VERSION, WS_DEFAULT_URL, CONTROLLER, CONNECTION_STATES,
    BUTTONS_LEFT, BUTTONS_RIGHT, buttonsFor, neutralButtons,
    JoyCon2Input, connectJoyCon2,
    resolveUrl, shared: getShared, closeShared,
    source: { repo: 'https://github.com/cnmzsjbz199328/Joycon', commit: 'ce5abf5a4468ebce18dbe570cb899b799a882555' },
  };
})(typeof window !== 'undefined' ? window : globalThis);
