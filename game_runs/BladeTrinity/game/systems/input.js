/* BladeTrinity — 输入动作层：键盘 + Joy-Con 2 → 游戏动作。
 *
 * 游戏逻辑只读这里（this._in.held / pressed / released / releaseReason / moveX），
 * 不再直接读 Phaser Key 或 JustDown。协议客户端在 _engine/joycon.js（跨游戏共享），
 * 这里只放 BladeTrinity 的键位映射与合并规则。
 *
 * ── 合并规则（键盘与手柄同时用）──
 * · held    = 任一来源按住。一个来源松开，另一个还按着 → 动作仍按住（不会掐断蓄力/防御）。
 * · pressed = 本帧 held 由假变真。另一个来源已按住时再按 → 不算新的按下（同一招不会出两次）。
 * · released= 本帧 held 由真变假。
 * · 边沿【每帧只在 update() 开头推进一次】，之后谁读都是同一个值 —— 旧代码的 JustDown
 *   是"谁先读谁消费"，读不到的那一帧会把按下留到以后再触发（蓄力中按 J，松开 L 后才出刀）。
 *   现在没人读的那一帧按下就作废，不会延迟触发旧动作。
 * · 手柄的点按若整个落在两帧之间（手柄 ~33Hz、游戏掉帧时），按"按住一帧"补上。
 *   键盘不做这个补偿，保持原手感（JustDown 本来也漏这种点按）。
 *
 * ── 异常中断（不是玩家松手）──
 * 手柄离线 / 适配器 socket 断开 / 超过 1 秒没有新帧（_engine 客户端负责判定）/ 页面切到后台
 * / 窗口失焦（键盘被 Phaser 清空）都会让按住的动作松开。releaseReason() 对这类松开返回
 * 'lost'，蓄力和居合架式据此【作废、不出招】（charge.js _tickCharge / arte.js _tickIai）——
 * 正常松手才放剑气、才抜刀。已扣的蓝不退（同"被打断"的规矩）。
 *
 * ── 恢复后不补旧输入 ──
 * 手柄重连 / 帧恢复 / 页面回到前台 / 场景（重新）开始时，仍按着的手柄键与偏离中心的摇杆
 * 一律【忽略到松开（回中）一次为止】。参考客户端会在恢复后的第一帧把仍按住的键报成新按下，
 * 这里不照单全收：断连期间按住的 Y 不该在恢复那一刻出一刀，按着 + 键重开也不该在新场景里
 * 顺手把选人确认掉。
 *
 * ── 摇杆 ──
 * 战斗移动沿用原来的【固定速度】（数字化：|x|≥0.5 起步、<0.3 停），不改平衡。
 * 菜单方向一次只认一个轴、过 0.6 触发一次、回到 0.3 以内才能再触发 —— 不会每个输入包挪一格。
 */
BT.INPUT = {
  moveOn: 0.5, moveOff: 0.3,   // 战斗左右
  upOn: 0.6,                    // "上"（↑+A 升空）阈值更高：走路时拇指稍微上偏不该把缩地变成升空
  menuOn: 0.6, menuOff: 0.3,   // 菜单方向；moveOff/menuOff 也是"恢复后须回中"的判据
};

// 动作 → 绑定。keys = Phaser 键名；jc = '手柄侧.键名'（协议 v2 的键名）；
// stick = 左摇杆数字化方向（move: 战斗，各轴独立；menu: 菜单，一次一个轴）。
// 键盘部分与改造前逐键一致（含 W/↑ 同时是"跳"和"上"）。
// 手柄"上"不跳：跳是 B，否则 ↑+A 升空之前总会先起跳一次。
BT.BINDINGS = {
  moveLeft:  { keys: ['A', 'LEFT'],  jc: ['left.left'],  stick: 'move:-x' },
  moveRight: { keys: ['D', 'RIGHT'], jc: ['left.right'], stick: 'move:+x' },
  up:        { keys: ['W', 'UP'],    jc: ['left.up'],    stick: 'move:+y' },
  jump:      { keys: ['W', 'UP'],    jc: ['right.b'] },
  attack:    { keys: ['J'],          jc: ['right.y'] },
  guard:     { keys: ['S'],          jc: ['left.zl'] },
  charge:    { keys: ['L'],          jc: ['right.zr'] },
  blink:     { keys: ['SPACE'],      jc: ['right.a'] },
  menuLeft:  { keys: ['A', 'LEFT'],  jc: ['left.left'],  stick: 'menu:-x' },
  menuRight: { keys: ['D', 'RIGHT'], jc: ['left.right'], stick: 'menu:+x' },
  menuUp:    { keys: ['W', 'UP'],    jc: ['left.up'],    stick: 'menu:+y' },
  menuDown:  { keys: ['S', 'DOWN'],  jc: ['left.down'],  stick: 'menu:-y' },
  confirm:   { keys: ['SPACE', 'J', 'ENTER'], jc: ['right.a', 'right.plus'] },
  // 结束后重开：手柄专用（键盘照旧用鼠标点 ↻）。不绑 A —— KO 那一刻还在连按缩地的话会直接跳过倒地演出。
  restart:   { keys: [],             jc: ['right.plus'] },
};

BT.Input = class {
  constructor(scene, client) {
    this.client = client || null;
    const kb = scene.input.keyboard;
    this.keys = {};
    this.acts = Object.entries(BT.BINDINGS).map(([name, b]) => {
      for (const k of b.keys) if (!this.keys[k]) this.keys[k] = kb.addKey(k);
      let stick = null;
      if (b.stick) {
        const [kind, d] = b.stick.split(':');
        stick = { kind, axis: d[1], sign: d[0] === '-' ? -1 : 1 };
      }
      return { name, keys: b.keys, jc: b.jc, stick };
    });
    this._held = {}; this._pressed = {}; this._released = {}; this._reason = {}; this._src = {};
    this._first = true;
    this._mv = { x: 0, y: 0 };            // 战斗方向（各轴 -1/0/1）
    this._mn = { axis: null, sign: 0 };   // 菜单方向（同时只有一个）
    this._taps = new Set();               // 两次采样之间出现过的手柄按下
    this._lost = new Set();               // 两次采样之间被异常松开的手柄键
    this._masked = new Set();             // 恢复后仍按着、须先松开一次的手柄键
    this._stickMasked = false;
    this._wasOnline = { left: false, right: false };
    this._flap = { left: false, right: false };   // 两次采样之间掉过线（哪怕又回来了）
    // 恢复后的"待定期"：记下恢复那一刻客户端收到的帧数，直到收到更新的一帧为止都按恢复处理。
    // ⚠️ 必须等到【恢复后的第一帧】：status=connected 先到、第一帧晚到 30ms 是常态，
    // 只在"变在线"那一帧屏蔽的话，那一刻按键表全是松开（离线时被清空），什么也没屏蔽上，
    // 下一帧带着仍按住的 ZL 进来就直接生效了（实测：重连后照样架防）。
    this._pend = { left: null, right: null };
    this._kbLost = false; this._jcLost = false;   // 失焦 / 后台：下一帧的松开记为 'lost'
    this._hidden = typeof document !== 'undefined' && !!document.hidden;
    this._offs = [];

    if (this.client) {
      const key = (e) => `${e.controller}.${e.button}`;
      this._sub('press', (e) => { if (!this._hidden) this._taps.add(key(e)); });
      this._sub('release', (e) => {
        if (e.reason === 'input') this._masked.delete(key(e));   // 被屏蔽的键松开过 → 之后的按下是新的
        else this._lost.add(key(e));
      });
      this._sub('device', (d) => { if (!d.online && this._flap[d.controller] !== undefined) this._flap[d.controller] = true; });
      this._sub('error', (e) => { this.error = e.message; });
    }

    // 窗口失焦：Phaser 会把键盘键全部清成松开 —— 那不是玩家松手。
    const onBlur = () => { this._kbLost = true; };
    // 切到后台：游戏循环停了，手柄却还在收帧。期间的输入一律不算，回来时按"恢复"处理。
    const onVis = () => {
      const h = !!document.hidden;
      if (h === this._hidden) return;
      this._hidden = h;
      this._kbLost = this._jcLost = true;
      this._taps.clear();
      if (!h) this._flap.left = this._flap.right = true;
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('blur', onBlur);
      document.addEventListener('visibilitychange', onVis);
      this._offs.push(() => window.removeEventListener('blur', onBlur),
        () => document.removeEventListener('visibilitychange', onVis));
    }

    // 场景（重新）开始：此刻按着的手柄键不算（例如 + 键重开后还没松手）
    for (const side of ['left', 'right']) {
      const d = this._dev(side);
      if (!d) continue;
      this._wasOnline[side] = true;
      this._pend[side] = d.frames;
      this._maskSide(side, d);
    }
    BT.Input.live++;
  }

  _sub(type, fn) {
    const off = this.client.on(type, fn);
    BT.Input.subs++;
    this._offs.push(() => { off(); BT.Input.subs--; });
  }

  destroy() {
    if (!this._offs) return;
    for (const off of this._offs) off();
    this._offs = null;
    BT.Input.live--;
  }

  // 在线（且页面在前台）的手柄，否则 null
  _dev(side) {
    const d = this.client && this.client.device(side);
    return d && d.online && !this._hidden ? d : null;
  }

  // 恢复时：仍按着的键屏蔽到松开；这一侧攒下的点按全部作废（含客户端恢复后补报的"新按下"）
  _maskSide(side, d) {
    for (const b of Object.keys(d.buttons)) {
      const k = `${side}.${b}`;
      if (d.buttons[b]) this._masked.add(k);
      this._taps.delete(k);
    }
    if (side === 'left' && Math.hypot(d.stick.x, d.stick.y) >= BT.INPUT.moveOff) this._stickMasked = true;
  }

  // 手柄这一帧的有效状态
  _sampleJc() {
    const held = new Set(), dropped = { left: false, right: false };
    let stick = { x: 0, y: 0 };
    for (const side of ['left', 'right']) {
      const d = this._dev(side);
      const recovered = !!d && (!this._wasOnline[side] || this._flap[side]);
      dropped[side] = this._wasOnline[side] && (!d || this._flap[side]);
      this._wasOnline[side] = !!d;
      this._flap[side] = false;
      if (!d) { this._pend[side] = null; continue; }
      if (recovered) this._pend[side] = d.frames;
      if (this._pend[side] !== null) {
        this._maskSide(side, d);
        if (d.frames > this._pend[side]) this._pend[side] = null;   // 恢复后的第一帧已经屏蔽过了
      }
      for (const b of Object.keys(d.buttons)) {
        const k = `${side}.${b}`;
        if (!d.buttons[b]) this._masked.delete(k);
        else if (!this._masked.has(k)) held.add(k);
      }
      if (side === 'left') {
        const r = Math.hypot(d.stick.x, d.stick.y);
        if (this._stickMasked && r < BT.INPUT.moveOff) this._stickMasked = false;
        if (!this._stickMasked) stick = d.stick;
      }
    }
    const taps = new Set();
    for (const k of this._taps) if (!this._masked.has(k) && this._dev(k.split('.')[0])) taps.add(k);
    this._taps.clear();
    const lost = this._lost;
    this._lost = new Set();
    return { held, taps, lost, stick, dropped };
  }

  _stickDirs(s) {
    const I = BT.INPUT;
    const latch = (cur, v, on, off) =>
      (cur && Math.sign(v) === cur && Math.abs(v) >= off) ? cur : (Math.abs(v) >= on ? Math.sign(v) : 0);
    this._mv.x = latch(this._mv.x, s.x, I.moveOn, I.moveOff);
    this._mv.y = latch(this._mv.y, s.y, I.upOn, I.moveOff);
    const m = this._mn;
    if (m.axis && (Math.sign(s[m.axis]) !== m.sign || Math.abs(s[m.axis]) < I.menuOff)) m.axis = null;
    if (!m.axis) {
      const ax = Math.abs(s.x) >= Math.abs(s.y) ? 'x' : 'y';
      if (Math.abs(s[ax]) >= I.menuOn) { m.axis = ax; m.sign = Math.sign(s[ax]); }
    }
  }

  _stickOn(st) {
    if (!st) return false;
    if (st.kind === 'move') return this._mv[st.axis] === st.sign;
    return this._mn.axis === st.axis && this._mn.sign === st.sign;
  }

  // 每帧开头调用一次（BladeTrinityScene.update 第一行）
  update() {
    const jc = this._sampleJc();
    this._stickDirs(jc.stick);
    const kbLost = this._kbLost, jcLost = this._jcLost;
    this._kbLost = this._jcLost = false;
    for (const a of this.acts) {
      const kb = a.keys.some((k) => this.keys[k].isDown);
      const j = a.jc.some((k) => jc.held.has(k) || jc.taps.has(k)) || this._stickOn(a.stick);
      const held = kb || j;
      const prev = !!this._held[a.name], ps = this._src[a.name];
      const pressed = !this._first && held && !prev;
      const released = !this._first && !held && prev;
      if (pressed) this._reason[a.name] = null;
      if (released) {
        const jcGone = jcLost || a.jc.some((k) => jc.lost.has(k)) || (a.stick && jc.dropped.left);
        this._reason[a.name] = (ps.kb && kbLost) || (ps.jc && jcGone) ? 'lost' : 'input';
      }
      this._pressed[a.name] = pressed;
      this._released[a.name] = released;
      this._held[a.name] = held;
      this._src[a.name] = { kb, jc: j };
    }
    this._first = false;
  }

  held(a) { return !!this._held[a]; }
  pressed(a) { return !!this._pressed[a]; }
  released(a) { return !!this._released[a]; }
  // 最近一次松开的原因：'input' = 玩家松手，'lost' = 断连/后台/失焦；按下后清空为 null
  releaseReason(a) { return this._reason[a] || null; }
  // 战斗横向：-1 / 0 / 1（同时按左右时左优先，与改造前一致）
  moveX() { return this.held('moveLeft') ? -1 : this.held('moveRight') ? 1 : 0; }
  jcOnline() { return !!(this._dev('left') || this._dev('right')); }

  // 给 HUD 的连接状态
  status() {
    const c = this.client;
    if (!c) return { enabled: false };
    const side = (s) => { const d = c.device(s); return { online: !!(d && d.online), connection: d ? d.connection : 'unknown', hint: d && d.hint }; };
    return { enabled: true, url: c.url, transport: c.adapter.transport, hidden: this._hidden,
      left: side('left'), right: side('right'), error: this.error || null };
  }
};
BT.Input.live = 0;   // 存活的动作层实例数（场景重启后应恒为 1）
BT.Input.subs = 0;   // 挂在共享客户端上的订阅数（场景重启后应恒为 4）

// ─────────── 场景接线 + 连接状态 / 键位提示 ───────────
Object.assign(BladeTrinityScene.prototype, {

  _buildInput() {
    const client = window.JoyCon2 ? window.JoyCon2.shared() : null;
    if (this._in) this._in.destroy();
    this._in = new BT.Input(this, client);
    const off = () => { if (this._in) { this._in.destroy(); this._in = null; } };
    this.events.once('shutdown', off);
    this.events.once('destroy', off);
    // 连接本身是整页单例，只在整个游戏销毁时关（场景重启不关，免得反复重连）
    if (client && !this.game.__jcCloseHooked) {
      this.game.__jcCloseHooked = true;
      this.game.events.once(Phaser.Core.Events.DESTROY, () => window.JoyCon2.closeShared());
    }
    // 左下角一行小字：只在启用手柄时出现。适配器连上 ≠ 手柄在线，两件事分开显示。
    // depth 1000：前景落叶层是 999（foregroundPhysics.js），压在它下面会被叶子盖住读不出来
    this._jcLabel = client ? this.add.text(12, BT.GAME_H - 8, '', {
      fontFamily: 'Segoe UI, monospace', fontSize: '12px', color: '#a9998a',
      stroke: '#120a06', strokeThickness: 3,
    }).setOrigin(0, 1).setScrollFactor(0).setDepth(1000).setAlpha(0.85) : null;
    this._jcSig = null;
    this._tickInputHud();
  },

  // 连接状态变化时才重写文字（每帧比一次签名）
  _tickInputHud() {
    const st = this._in ? this._in.status() : { enabled: false };
    const sig = JSON.stringify(st);
    if (sig === this._jcSig) return;
    this._jcSig = sig;
    let text, color = '#a9998a';
    if (!st.enabled) {
      text = 'Joy-Con 未启用：网址加 ?joycon 连接本机 adapter';
    } else if (st.error) {
      text = `Joy-Con 协议不符：${st.error}`; color = '#f87171';
    } else if (st.transport !== 'open') {
      text = `Joy-Con 适配器未连接（${st.url}）`;
    } else {
      const s = (n, d) => `${n} ${d.online ? '●' : '○'}`;
      const waiting = !st.left.online || !st.right.online;
      const hint = (!st.left.online && st.left.hint) || (!st.right.online && st.right.hint) || '';
      text = `Joy-Con 适配器已连接　${s('左', st.left)}  ${s('右', st.right)}` +
        (st.hidden ? '　（页面在后台）' : waiting ? `　等待手柄${hint ? '：' + hint : '（按住 Sync 配对）'}` : '');
      color = waiting ? '#fbbf24' : '#86efac';
    }
    if (this._jcLabel) this._jcLabel.setText(text).setColor(color);
    const dom = document.getElementById('joycon-status');
    if (dom) { dom.textContent = text; dom.style.color = color; }
    if (this.selTip && this.selTip.active) this.selTip.setText(this._selectTipText());
    if ((this.phase === 'fight' || this.phase === 'interlude') && this.p2) this._setFightObjective();
  },

  _selectTipText() {
    return this._in && this._in.jcOnline()
      ? '摇杆 ← → 选流派　·　↑ ↓ 选难度　·　A / ＋ 确认'
      : 'A / D 选流派　·　↑ / ↓ 选难度　·　SPACE / J 确认';
  },
});
