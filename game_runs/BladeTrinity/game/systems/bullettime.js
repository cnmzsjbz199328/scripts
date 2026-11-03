/* BladeTrinity — 可变速战斗时钟 + 蓄力变装子弹时间。
 *
 * 用户定（2026-11-03，plans/blade-trinity-bullet-time-plan.md）：变装在 420ms 里走完看不清 →
 * 蓄力期间【全场慢放】（不是时停）。战斗时间里蓄力仍是 420ms，规则与平衡一概不变，
 * 只是画面被拉长；松手当帧硬切回 1×。
 *
 * ── 战斗时钟 ──
 * 游戏逻辑里约 40 处直接读 this.time.now（combat/charge/defense/crit/arte/…），POST_UPDATE
 * 钩子、__probe、delayedCall 回调也读它。逐处改成"乘倍率"既啰嗦又必漏，所以反过来：
 * 把 Clock 实例的 now 换成 getter/setter —— Phaser 每帧照常往里写真实时间（Clock.update
 * 里 `this.now = time`，早于 scene.update），setter 按当前倍率把真实增量折算成游戏增量累加，
 * getter 返回游戏时间。于是所有读 this.time.now 的地方天然拿到游戏时间，不用改一行。
 * 已核 Phaser 3.60.0：引擎内部不读 scene.time.now（只有 Clock.boot / Clock.update 写它）。
 *
 * ⚠️ 约定：玩法逻辑只能读 this.time.now 或 update 的 time/delta，【不得】读 performance.now()
 *    / Date.now() / game.loop.* —— 那些是真实时间，慢放期间会和战斗时钟错位。
 */
Object.assign(BladeTrinityScene.prototype, {

  // create() 第一行调用。Clock 实例跨 scene.restart 保留，所以重复安装必须幂等：
  // 状态对象挂在 Clock 上，重开时沿用（游戏时间保持单调，不回拨），只把倍率复位到 1。
  _installFightClock() {
    const clock = this.time;
    let st = clock.__fightClock;
    if (!st) {
      const now0 = clock.now;
      // game = 游戏时间；real = 上次写入的真实时间；scale = 当前倍率；
      // frameScale = 本帧写入时生效的倍率（update 用它把 Phaser 的 delta 折算成游戏 delta）
      st = { game: now0, real: now0, scale: 1, frameScale: 1, primed: false };
      Object.defineProperty(clock, 'now', {
        configurable: true,
        get() { return st.game; },
        set(v) {
          // 首次写入：安装时读到的初值可能来自 Clock.boot（game.loop.time，与每帧写入的 rAF
          // 时间不同源）。两者对不上就以这次写入为准对齐，而不是把差值当成一帧的流逝。
          if (!st.primed) {
            st.primed = true;
            if (!(Math.abs(v - st.real) < 1000)) {
              st.real = v;
              if (v > st.game) st.game = v;
              st.frameScale = st.scale;
              return;
            }
          }
          const d = Math.max(0, v - st.real);   // 真实时间倒退（不应发生）按 0 计，游戏时间保持单调
          st.real = v;
          st.frameScale = st.scale;
          st.game += d * st.scale;
        },
      });
      clock.__fightClock = st;
    }
    this._fightClock = st;
    this._resetTimeScale();
    // 慢放判据挂 POST_UPDATE（见 _tickBulletTime）。scene 的事件对象跨 restart 保留，
    // 监听器必须在 shutdown 时摘掉，否则每重开一次叠一层。
    const onPost = (time, delta) => this._tickBulletTime(delta);
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, onPost);
    // 重开 / 关场景：一切倍率回 1。不复位的话重开后新一局从第一帧起就是慢放。
    this.events.once('shutdown', () => {
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, onPost);
      this._resetTimeScale();
    });
  },

  // 每帧从现状推导要不要慢放，不在 _startCharge / _endCharge 里埋开关 —— 这样任何收蓄路径
  // （释放 / 取消 / 受击 / 换场 / 重开 / KO）都不可能把慢放卡住。与抜刀 freezeUntil 同一套路。
  //
  // 挂在 POST_UPDATE（realDelta = Phaser 的真实 delta）而不是 update 开头：
  //   ① 它没有 update 那些按 phase 的 early return，KO 进 over / interlude 照样复位；
  //   ② 它看得到【本帧】的收蓄 —— 松手那一帧 update 里就把 charging 清了，这里当帧切回 1×，
  //      下一帧的时钟、物理、动画、补间已经全是原速。放在 update 开头会多慢一帧。
  _tickBulletTime(realDelta) {
    const cfg = this._btCfg;
    this._btWant = !!(cfg && cfg.enabled) && this.phase === 'fight'
      && (this.fighters || []).some((f) => f.charging && f.tf);
    // 第一步只引入时钟：倍率恒为 1，行为与之前一致
    if (this._fightClock.scale !== 1) this._resetTimeScale();
  },

  _resetTimeScale() {
    const st = this._fightClock;
    if (st) st.scale = 1;
  },
});
