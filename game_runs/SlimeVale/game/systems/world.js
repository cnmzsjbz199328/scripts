/* SlimeVale — 世界推进系统：摄像机（跟随+棘轮+锁点）/ 距离触发器（敌人·技能包·锁点）/
 * 段叙事 / 检查点重生。骨架同 WyrmsEnd（SIDESCROLLER.md §2/§4），新增：
 *   - pack 触发器 → 悬浮技能包（单跳高度，碰到即吃）
 *   - cine 锁点 → 开战即录制，主怪死后播另一视角回放（见 systems/replay.js） */
Object.assign(MeadowScene.prototype, {

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
      this.camMinX = Math.max(this.camMinX, cam.scrollX);          // 棘轮：只进不退
      cam.scrollX = Math.max(cam.scrollX, this.camMinX);
    }
  },

  _clampX(x) {
    const pad = Forge.CAM.edgePad;
    if (this.lock) return Phaser.Math.Clamp(x, this.lock.camX + pad, this.lock.camX + Forge.W - pad);
    const c = this.cameras.main.scrollX;
    return Phaser.Math.Clamp(x, c + pad, Math.min(c + Forge.W - pad, Forge.WORLD.W - pad));
  },

  _clampEnemyX(x, e) {
    if (e.lockbound && this.lock)
      return Phaser.Math.Clamp(x, this.lock.camX + 30, this.lock.camX + Forge.W - 30);
    return Phaser.Math.Clamp(x, 20, Forge.WORLD.W - 20);
  },

  _updateTriggers() {
    if (this.lock) return;
    for (const tr of this._trigs) {
      if (tr.done || tr.at > this.P.x) continue;
      tr.done = true;
      if (tr.lock) { this._startLock(tr.lock, tr.at); return; }
      if (tr.pack) { this._spawnPack(tr.pack, tr.at + Forge.PACK_DX); continue; }
      const x = Phaser.Math.Clamp(this.P.x + tr.dx, 50, Forge.WORLD.W - 50);
      this._spawnEnemy(tr.type, x);
    }
  },

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
    this._toast(`${seg.name}\n${seg.intro}\n${seg.hint}`, first ? 3400 : 3000);
    if (!first) window.GameAudio && GameAudio.play('ui');
  },

  // ── 锁点：镜头收成单屏 → 波次 → 清完解锁；cine 锁点全程录制供回放 ──
  _startLock(lockDef, atX) {
    this.lock = {
      camX: Phaser.Math.Clamp(atX - 240, 0, Forge.WORLD.W - Forge.W),
      def: lockDef, wi: -1, toSpawn: 0,
    };
    const L = this.lock;
    // 竞技场外残余散兵静默清理（遭遇窗口已过，留着会隔着锁边界放冷箭）
    for (const e of this.enemies) {
      if (e.dead || e.lockbound) continue;
      if (e.x < L.camX - 20 || e.x > L.camX + Forge.W + 20) this._removeEnemy(e);
    }
    this.enemies = this.enemies.filter((e) => !e._culled);
    if (lockDef.cine) this._recStart();
    window.GameAudio && GameAudio.play('splashBad');
    this._toast(lockDef.final ? '枯萎之冠在前 —— 讨回春天' : '枯萎气息封路 —— 弹开它们', 1600);
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
        this._checkLock();
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
    this._recStop();
    const after = () => {
      if (this.ended) return;
      if (L.def.final) return this._win();
      const P = this.P, before = P.hp;
      P.hp = Math.min(Forge.PLAYER.maxHp, P.hp + 2);
      if (P.hp !== before) window.GameHUD && GameHUD.setHearts(P.hp, Forge.PLAYER.maxHp);
      window.GameAudio && GameAudio.play('unlock');
      this._toast('道路重新亮起来了 —— 往东 →', 1800);
    };
    // 回放：cine 锁点 + 素材足量 + 非 bot（bot 跑管线不看电影；?cinetest 强制播供调试）
    const wantCine = L.def.cine && this._rec && this._rec.frames.length > 12
      && (!this.auto || /cinetest/.test(location.search));
    if (wantCine) this.time.delayedCall(1050, () => { if (!this.ended) this._playCine(after); });
    else after();
  },

  // ── 技能包：悬浮在单跳高度，碰到即吃（覆盖旧技能）──
  _spawnPack(skill, x) {
    for (const p of this.packs) if (p.skill === skill && Math.abs(p.x - x) < 120) return;   // 重生重臂防重复
    const y0 = Forge.C.FEET_Y - 108;
    const img = this.add.image(x, y0, 'pack_' + skill).setDepth(Forge.C.DEPTH.PICK);
    const label = this.add.text(x, y0 - 46, Forge.SKILLS[skill].name, {
      fontFamily: 'Trebuchet MS, PingFang SC, sans-serif', fontSize: '13px',
      color: '#2c6e57', stroke: '#ffffff', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(Forge.C.DEPTH.PICK);
    this.packs.push({ skill, x, y0, t: Math.random() * 6, img, label });
  },

  _updatePacks(dms) {
    const cam = this.cameras.main.scrollX;
    for (const p of this.packs) {
      p.t += dms / 1000;
      const y = p.y0 + Math.sin(p.t * 2.6) * 8;
      p.img.setY(y).setAngle(Math.sin(p.t * 1.8) * 7);
      p.label.setY(y - 46);
      if (p.x < cam - Forge.W * Forge.CAM.leashScreens) { p.img.destroy(); p.label.destroy(); p._culled = true; }
    }
    this.packs = this.packs.filter((p) => !p._culled);
  },

  // ── 检查点重生：回段首，重臂检查点之后的触发器 ──
  _respawn() {
    if (this.ended) return;
    for (const e of this.enemies) this._removeEnemy(e);
    this.enemies = [];
    for (const pr of this.projectiles) pr.dart.die();
    this.projectiles = [];
    this._clearPlayerShots();
    const seg = Forge.SEGMENTS[this.segIdx];
    const cx = Math.max(100, seg.x0 + 80);
    this.lock = null;
    this._recStop();
    for (const tr of this._trigs) if (tr.at >= cx) tr.done = false;
    const P = this.P;
    P.hp = Forge.PLAYER.maxHp; P.invuln = 1400; P.state = 'free';
    P.x = cx; P.dir = 1; P.y = Forge.C.FEET_Y; P.vy = 0; P.jumps = 0;
    for (const k in P.cds) P.cds[k] = 0;
    this.camMinX = Math.max(0, Math.min(cx - Forge.W * Forge.CAM.aheadFrac, Forge.WORLD.W - Forge.W));
    this.cameras.main.scrollX = this.camMinX;
    window.GameHUD && GameHUD.setHearts(P.hp, Forge.PLAYER.maxHp);
    window.GameHUD && GameHUD.setObjective(`${seg.name} · 残命 ${this.lives}`);
    // 露水重凝入场
    this.player.setPosition(cx, P.y).setVisible(false).setAlpha(1);
    Forge.FX.morph({
      src: { cloud: this._playerCloud(), x: cx, y: P.y - 140, scale: P.scale * 0.4, flip: 1 },
      dst: { cloud: this._playerCloud(), x: cx, y: P.y, scale: P.scale, flip: 1 },
      dur: 520, turb: 44, rise: 12,
      mix: this._lightMix(),
      onDone: () => { if (!this.ended) this.player.setVisible(true); },
    });
    this._toast(`露水又聚成了露露 —— 从段首再来（残命 ${this.lives}）`, 2200);
  },
});
