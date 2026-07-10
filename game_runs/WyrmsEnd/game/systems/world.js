/* WyrmsEnd — 世界推进系统：摄像机（跟随+棘轮+锁点）/ 距离触发器 / 段叙事 / 检查点重生。
 * 全部按 SIDESCROLLER.md §2/§4 实现（Object.assign 到 JourneyScene 原型）。 */
Object.assign(JourneyScene.prototype, {

  // ── 摄像机：手动跟随（玩家钉在画面左 1/3）+ 棘轮（只进不退）+ 锁点收紧 ──
  _updateCamera(dms) {
    const cam = this.cameras.main;
    let target;
    if (this.lock) target = this.lock.camX;
    else target = Phaser.Math.Clamp(
      this.P.x - Forge.W * Forge.CAM.aheadFrac, this.camMinX, Forge.WORLD.W - Forge.W);
    const k = 1 - Math.pow(1 - Forge.CAM.lerp, dms / 16.7);
    cam.scrollX += (target - cam.scrollX) * k;
    if (Math.abs(target - cam.scrollX) < 0.5) cam.scrollX = target;
    if (!this.lock) {
      this.camMinX = Math.max(this.camMinX, cam.scrollX);          // 棘轮：推进后不许回卷
      cam.scrollX = Math.max(cam.scrollX, this.camMinX);
    }
  },

  // 玩家 x 钳制：锁点内钳竞技场，平时钳镜头窗口（蓝图 §9：锁点必须同时钳玩家和镜头）
  _clampX(x) {
    const pad = Forge.CAM.edgePad;
    if (this.lock) return Phaser.Math.Clamp(x, this.lock.camX + pad, this.lock.camX + Forge.W - pad);
    const c = this.cameras.main.scrollX;
    return Phaser.Math.Clamp(x, c + pad, Math.min(c + Forge.W - pad, Forge.WORLD.W - pad));
  },

  // 敌人 x 钳制：锁点内钳竞技场；平时只钳世界（离屏是合法状态）
  _clampEnemyX(x, e) {
    if (e.lockbound && this.lock)
      return Phaser.Math.Clamp(x, this.lock.camX + 30, this.lock.camX + Forge.W - 30);
    return Phaser.Math.Clamp(x, 20, Forge.WORLD.W - 20);
  },

  // ── 距离触发器：at 升序、一次性消费；散兵不锁镜头，锁点收镜头跑波次 ──
  _updateTriggers() {
    if (this.lock) return;
    for (const tr of this._trigs) {
      if (tr.done || tr.at > this.P.x) continue;
      tr.done = true;
      if (tr.lock) { this._startLock(tr.lock, tr.at); return; }
      const x = Phaser.Math.Clamp(this.P.x + tr.dx, 50, Forge.WORLD.W - 50);
      this._spawnEnemy(tr.type, x);
    }
  },

  // ── 段推进叙事：踏入新段弹卡 + 换 BGM + HUD 目标 ──
  // 只在非锁点时单调前进：锁点竞技场可能横跨段边界，战斗走位来回穿越
  // 不该反复触发叙事卡/BGM；世界有棘轮，段落叙事也只进不退
  _updateSegment() {
    if (!this.lock) {
      const s = this._segAt(this.P.x);
      if (s > this.segIdx) this._enterSegment(s, false);
    }
    this._updateScore();
  },

  _enterSegment(s, first) {
    this.segIdx = s;
    const seg = Forge.SEGMENTS[s];
    window.GameHUD && GameHUD.setObjective(`${seg.name} · 残命 ${this.lives}`);
    this._playBGM(s);
    this._toast(`${seg.name}\n${seg.intro}\n${seg.hint}`, first ? 3400 : 3000);
    if (!first) window.GameAudio && GameAudio.play('ui');
  },

  // ── 锁点：镜头收成单屏 → 竞技场波次 → 清完解锁 + 前进提示（蓝图 §4）──
  _startLock(lockDef, atX) {
    this.lock = {
      camX: Phaser.Math.Clamp(atX - 240, 0, Forge.WORLD.W - Forge.W),
      def: lockDef, wi: -1, toSpawn: 0,
    };
    // 竞技场外的残余散兵静默清理：他们的遭遇窗口已过，留着会隔着锁边界
    // 干扰战斗（bot 追场外敌被钳死在边缘，人类玩家也会被场外冷箭阴）
    const L = this.lock;
    for (const e of this.enemies) {
      if (e.dead || e.lockbound) continue;
      if (e.x < L.camX - 20 || e.x > L.camX + Forge.W + 20) {
        e.dead = true; e._culled = true;
        if (e._wpn) { e._wpn.destroy(); e._wpn = null; }
        e.spr.destroy(); e.shadow.destroy();
      }
    }
    this.enemies = this.enemies.filter((e) => !e._culled);
    window.GameAudio && GameAudio.play('splashBad');
    this._toast(lockDef.final ? '龙王在前 —— 无路可退' : '龙眷封路 —— 清出去', 1600);
    this._lockNextWave();
  },

  _lockNextWave() {
    const L = this.lock;
    if (!L || this.ended) return;
    L.wi++;
    if (L.wi >= L.def.waves.length) return this._endLock();
    const w = L.def.waves[L.wi];
    L.toSpawn = w.spawns.length;
    for (const s of w.spawns)
      this.time.delayedCall(s.t, () => {
        if (this.ended || this.lock !== L) return;
        const e = this._spawnEnemy(s.type, L.camX + s.lx);
        e.lockbound = true;
        L.toSpawn--;
        this._checkLock();   // 覆盖"最后一个未出生时场上已清空"的边界
      });
  },

  _checkLock() {
    const L = this.lock;
    if (!L || this.ended || L.toSpawn > 0) return;
    if (this.enemies.some((e) => !e.dead && e.lockbound)) return;
    this.time.delayedCall(700, () => { if (this.lock === L && !this.ended) this._lockNextWave(); });
  },

  _endLock() {
    const L = this.lock;
    this.lock = null;
    if (L.def.final) return this._win();
    // 锁间回血（横版哲学里锁点=竞技场遗产，波间回血随之保留）
    const P = this.P, before = P.hp;
    P.hp = Math.min(Forge.PLAYER.maxHp, P.hp + 2);
    if (P.hp !== before) window.GameHUD && GameHUD.setHearts(P.hp, Forge.PLAYER.maxHp);
    window.GameAudio && GameAudio.play('unlock');
    this._toast('封锁已破 —— 前路在东 →', 1800);
  },

  // ── 检查点重生：横版=高致死+检查点（段首），不是从头再来 ──
  _respawn() {
    if (this.ended) return;
    // 清场：敌人/武器/弹丸静默销毁（不掉落不计杀）
    for (const e of this.enemies) {
      e.dead = true;
      if (e._wpn) { e._wpn.destroy(); e._wpn = null; }
      e.spr.destroy(); e.shadow.destroy();
    }
    this.enemies = [];
    for (const pr of this.projectiles) pr.dart.die();
    this.projectiles = [];
    // 重臂检查点之后的触发器（含锁点），死亡地点的锁重新打
    const seg = Forge.SEGMENTS[this.segIdx];
    const cx = Math.max(100, seg.x0 + 80);
    this.lock = null;
    for (const tr of this._trigs) if (tr.at >= cx) tr.done = false;
    // 复位玩家与镜头（棘轮回退到检查点，这是唯一合法的回卷）
    const P = this.P;
    P.hp = Forge.PLAYER.maxHp; P.invuln = 1400; P.state = 'free';
    P.x = cx; P.dir = 1;
    this.camMinX = Math.max(0, Math.min(cx - Forge.W * Forge.CAM.aheadFrac, Forge.WORLD.W - Forge.W));
    this.cameras.main.scrollX = this.camMinX;
    window.GameHUD && GameHUD.setHearts(P.hp, Forge.PLAYER.maxHp);
    window.GameHUD && GameHUD.setObjective(`${seg.name} · 残命 ${this.lives}`);
    // 残躯重聚入场
    this.player.setX(cx).setY(this._pY()).setVisible(false).setAlpha(1);
    this.playerShadow.setVisible(false);
    Forge.FX.morph({
      src: { cloud: this._playerCloud(), x: cx, y: this._pY() - 140, scale: P.scale * 0.4, flip: 1 },
      dst: { cloud: this._playerCloud(), x: cx, y: this._pY(), scale: P.scale, flip: 1 },
      dur: 520, turb: 44, rise: 12,
      mix: this._lightMix(),
      onDone: () => {
        if (this.ended) return;
        this.player.setVisible(true);
        this.playerShadow.setVisible(true);
      },
    });
    this._toast(`影未散尽 —— 残躯于段首重聚（残命 ${this.lives}）`, 2200);
  },
});
