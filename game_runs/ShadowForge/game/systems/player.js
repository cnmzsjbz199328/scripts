/* ShadowForge — 玩家状态机（Object.assign 到 ArenaScene 原型）。
 * 变形即招式：J 化矛突刺(击穿) / K 化锤震地(击退) / L 雾化闪避(无敌帧) /
 * E 消耗「魄」化形为恶鬼(限时,J 变爪袭)。
 * 状态: free / spear / hammer / mist / morphing / lunge / dead。
 * 受击判定只在 free、hammer 生效——化矛化雾期间没有"身体"。 */
Object.assign(ArenaScene.prototype, {

  _buildPlayer() {
    const C = Forge.C, P = Forge.PLAYER;
    this.P = {
      x: 180, dir: 1, hp: P.maxHp, essence: 0,
      state: 'free', form: 'dante', scale: P.scale,
      formLeft: 0, invuln: 0,
      cds: { spear: 0, hammer: 0, mist: 0, lunge: 0 },
    };
    this.playerShadow = this.add.ellipse(this.P.x, C.FEET_Y - 10, 70, 12, 0x000000, 0.3)
      .setDepth(C.DEPTH.SHADOW);
    this.player = this.add.sprite(this.P.x, this._pY(), 'dante_idle_0')
      .setOrigin(0.5, 1).setScale(this.P.scale).setDepth(C.DEPTH.CHAR);
    this.player.play('dante_idle');
  },

  // 脚底锚点世界 y：glb 帧底部有 24px 透明留白须补偿，svg(恶鬼形)没有
  _pY() {
    return Forge.C.FEET_Y + (this.P.form === 'dante' ? Forge.C.GLB_PAD * this.P.scale : 0);
  },

  _playerCloud() {
    return Forge.Cloud.fromTexture(this, this.P.form === 'dante' ? 'dante_idle_0' : 'fiend_0', Forge.FXN.morph);
  },

  _updatePlayer(dms) {
    const P = this.P, C = Forge.C;
    for (const k in P.cds) P.cds[k] = Math.max(0, P.cds[k] - dms);
    P.invuln = Math.max(0, P.invuln - dms);
    if (P.form === 'fiend') {
      P.formLeft -= dms;
      if (P.formLeft <= 0 && P.state === 'free') this._revertForm();
    }
    if (P.state !== 'free') return;

    // 移动：键盘或 bot 意图
    let mv = 0;
    if (this.auto) mv = this._botMv || 0;
    else {
      if (this.keys.A.isDown || this.keys.LEFT.isDown) mv = -1;
      else if (this.keys.D.isDown || this.keys.RIGHT.isDown) mv = 1;
    }
    if (mv) {
      P.dir = mv;
      const spd = P.form === 'fiend' ? Forge.FIEND_FORM.speed : Forge.PLAYER.speed;
      P.x = Phaser.Math.Clamp(P.x + mv * spd * dms / 1000, C.X_MIN, C.X_MAX);
    }
    this.player.setX(P.x).setFlipX(P.dir < 0);
    const walkKey = P.form === 'fiend' ? 'fiend_move' : 'dante_walk';
    const idleKey = P.form === 'fiend' ? 'fiend_move' : 'dante_idle';
    const want = mv ? walkKey : idleKey;
    if (!this.player.anims.currentAnim || this.player.anims.currentAnim.key !== want)
      this.player.play(want, true);

    if (!this.auto) {
      const K = Phaser.Input.Keyboard.JustDown;
      if (K(this.keys.J)) P.form === 'fiend' ? this._fiendLunge() : this._doSpear();
      if (K(this.keys.K)) this._doHammer();
      if (K(this.keys.L) || K(this.keys.SPACE)) this._doMist();
      if (K(this.keys.E)) this._doTransform();
    }
  },

  // ── J 化矛突刺：人→矛(morph) → 矛体飞掠击穿(实体段) → 矛→人(morph) ──
  _doSpear() {
    const S = Forge.SPEAR, P = this.P, C = Forge.C;
    if (P.state !== 'free' || P.cds.spear > 0) return;
    P.state = 'spear'; P.cds.spear = S.cd;
    const dir = P.dir, x0 = P.x, py = this._pY();
    const x1 = Phaser.Math.Clamp(x0 + dir * S.range, C.X_MIN, C.X_MAX);
    const wKey = Forge.Cloud.weapon(this, 'spear');
    const wCloud = Forge.Cloud.fromTexture(this, wKey, Forge.FXN.morph);
    const hCloud = this._playerCloud();
    this.player.setVisible(false);
    window.GameAudio && GameAudio.play('release');

    Forge.FX.morph({
      src: { cloud: hCloud, x: x0, y: py, scale: P.scale, flip: dir },
      dst: { cloud: wCloud, x: x0, y: C.FEET_Y, scale: 1, flip: dir },
      dur: S.inMs, turb: 22, rise: 14,
      onDone: () => {
        const img = this.add.image(x0, C.FEET_Y, wKey)
          .setOrigin(0.5, 1).setDepth(C.DEPTH.FX).setFlipX(dir < 0);
        const hit = new Set();
        this.tweens.add({
          targets: img, x: x1, duration: S.dashMs, ease: 'Sine.easeIn',
          onUpdate: () => {
            for (const e of this.enemies)
              if (!hit.has(e) && !e.dead && Math.abs(e.x - img.x) < S.hitW) {
                hit.add(e);
                this._hitEnemy(e, S.dmg, dir * 46);
              }
          },
          onComplete: () => {
            img.destroy();
            Forge.FX.morph({
              src: { cloud: wCloud, x: x1, y: C.FEET_Y, scale: 1, flip: dir },
              dst: { cloud: hCloud, x: x1, y: py, scale: P.scale, flip: dir },
              dur: S.outMs, turb: 24, rise: 16,
              onDone: () => {
                P.x = x1;
                this.player.setX(x1).setVisible(true);
                P.state = 'free';
              },
            });
          },
        });
      },
    });
  },

  // ── K 化锤震地：人→锤(morph) → 砸地 AOE 击退(实体段) → 锤→人(morph) ──
  _doHammer() {
    const H = Forge.HAMMER, P = this.P, C = Forge.C;
    if (P.state !== 'free' || P.cds.hammer > 0) return;
    P.state = 'hammer'; P.cds.hammer = H.cd;
    const dir = P.dir, x = P.x, py = this._pY();
    const wKey = Forge.Cloud.weapon(this, 'hammer');
    const wCloud = Forge.Cloud.fromTexture(this, wKey, Forge.FXN.morph);
    const hCloud = this._playerCloud();
    this.player.setVisible(false);

    Forge.FX.morph({
      src: { cloud: hCloud, x, y: py, scale: P.scale, flip: dir },
      dst: { cloud: wCloud, x, y: C.FEET_Y - 26, scale: 1, flip: dir },
      dur: H.inMs, turb: 24, rise: 34,
      onDone: () => {
        const img = this.add.image(x, C.FEET_Y - 26, wKey)
          .setOrigin(0.5, 1).setDepth(C.DEPTH.FX).setFlipX(dir < 0);
        this.tweens.add({
          targets: img, y: C.FEET_Y + 4, scaleY: 0.86, duration: H.slamMs, ease: 'Cubic.easeIn',
          onComplete: () => {
            // 落锤瞬间：冲击环 + AOE 击退 + 顿帧 + 震屏
            this._shockRing(x, C.FEET_Y - 8, H.radius);
            for (const e of this.enemies)
              if (!e.dead && Math.abs(e.x - x) < H.radius)
                this._hitEnemy(e, H.dmg, Math.sign(e.x - x || dir) * H.knock);
            this._hitstop(70);
            this.cameras.main.shake(130, 0.008);
            window.GameAudio && GameAudio.play('splashBad');
            this.time.delayedCall(90, () => {
              img.destroy();
              Forge.FX.morph({
                src: { cloud: wCloud, x, y: C.FEET_Y + 4, scale: 1, flip: dir },
                dst: { cloud: hCloud, x, y: py, scale: P.scale, flip: dir },
                dur: H.outMs, turb: 26, rise: 20,
                onDone: () => { this.player.setVisible(true); P.state = 'free'; },
              });
            });
          },
        });
      },
    });
  },

  // ── L 雾化闪避：同形态两点间 morph，高湍流高上浮，全程无敌 ──
  _doMist() {
    const M = Forge.MIST, P = this.P, C = Forge.C;
    if (P.state !== 'free' || P.cds.mist > 0) return;
    P.state = 'mist'; P.cds.mist = M.cd;
    P.invuln = Math.max(P.invuln, M.ms + 180);
    const dir = P.dir, x0 = P.x, py = this._pY();
    const x1 = Phaser.Math.Clamp(x0 + dir * M.dist, C.X_MIN, C.X_MAX);
    const cloud = this._playerCloud();
    this.player.setVisible(false);
    window.GameAudio && GameAudio.play('ui');
    Forge.FX.morph({
      src: { cloud, x: x0, y: py, scale: P.scale, flip: dir },
      dst: { cloud, x: x1, y: py, scale: P.scale, flip: dir },
      dur: M.ms, turb: 55, rise: 44,
      onDone: () => {
        P.x = x1;
        this.player.setX(x1).setVisible(true);
        P.state = 'free';
      },
    });
  },

  // ── E 吸收变形：消耗 1 魄，人形 → 恶鬼形（限时） ──
  _doTransform() {
    const P = this.P;
    if (P.essence < 1 || P.form !== 'dante' || P.state !== 'free') return;
    P.essence--; this._updateScore();
    P.state = 'morphing';
    const dir = P.dir, x = P.x;
    const srcCloud = this._playerCloud();
    const fiendCloud = Forge.Cloud.fromTexture(this, 'fiend_0', Forge.FXN.morph);
    this.player.setVisible(false);
    window.GameAudio && GameAudio.play('unlock');
    Forge.FX.morph({
      src: { cloud: srcCloud, x, y: this._pY(), scale: P.scale, flip: dir },
      dst: { cloud: fiendCloud, x, y: Forge.C.FEET_Y, scale: 0.85, flip: dir },
      dur: Forge.FIEND_FORM.morphMs, turb: 34, rise: 30,
      onDone: () => {
        P.form = 'fiend'; P.scale = 0.85; P.formLeft = Forge.FIEND_FORM.ms;
        this.player.setTexture('fiend_0').setScale(P.scale).setY(this._pY()).setVisible(true);
        this.player.play('fiend_move', true);
        this._toast('化形 · 恶鬼之躯 — J 爪袭');
        P.state = 'free';
      },
    });
  },

  _revertForm() {
    const P = this.P;
    if (P.form !== 'fiend' || P.state !== 'free') return;
    P.state = 'morphing';
    const dir = P.dir, x = P.x;
    const fiendCloud = this._playerCloud();
    const danteCloud = Forge.Cloud.fromTexture(this, 'dante_idle_0', Forge.FXN.morph);
    this.player.setVisible(false);
    Forge.FX.morph({
      src: { cloud: fiendCloud, x, y: this._pY(), scale: P.scale, flip: dir },
      dst: { cloud: danteCloud, x, y: Forge.C.FEET_Y + Forge.C.GLB_PAD * Forge.PLAYER.scale, scale: Forge.PLAYER.scale, flip: dir },
      dur: Forge.FIEND_FORM.morphMs, turb: 34, rise: 30,
      onDone: () => {
        P.form = 'dante'; P.scale = Forge.PLAYER.scale;
        this.player.setTexture('dante_idle_0').setScale(P.scale).setY(this._pY()).setVisible(true);
        this.player.play('dante_idle', true);
        P.state = 'free';
      },
    });
  },

  // ── 恶鬼形 J 爪袭：短促位移 + 穿击（轻量招，不走完整 morph） ──
  _fiendLunge() {
    const L = Forge.FIEND_FORM.lunge, P = this.P, C = Forge.C;
    if (P.state !== 'free' || P.cds.lunge > 0) return;
    P.state = 'lunge'; P.cds.lunge = L.cd;
    const dir = P.dir;
    const x1 = Phaser.Math.Clamp(P.x + dir * L.dist, C.X_MIN, C.X_MAX);
    Forge.FX.burst({ cloud: this._playerCloud(), x: P.x, y: this._pY(), scale: P.scale, flip: dir, n: 36, dirX: -dir });
    window.GameAudio && GameAudio.play('release');
    const hit = new Set();
    this.tweens.add({
      targets: this.player, x: x1, duration: L.ms, ease: 'Cubic.easeOut',
      onUpdate: () => {
        for (const e of this.enemies)
          if (!hit.has(e) && !e.dead && Math.abs(e.x - this.player.x) < 52) {
            hit.add(e);
            this._hitEnemy(e, L.dmg, dir * 60);
          }
      },
      onComplete: () => { P.x = x1; P.state = 'free'; },
    });
  },

  // ── 受击（分级反馈的最低档：小迸溅 + 顿帧 + 无敌闪烁） ──
  _playerHit(dmg, fromX) {
    const P = this.P;
    if (this.ended || P.invuln > 0) return;
    if (P.state !== 'free' && P.state !== 'hammer') return;   // 化矛/化雾期间没有身体
    P.hp = Math.max(0, P.hp - dmg);
    window.GameHUD && GameHUD.setHearts(P.hp, Forge.PLAYER.maxHp);
    P.invuln = Forge.PLAYER.invulnMs;
    Forge.FX.burst({
      cloud: this._playerCloud(), x: P.x, y: this._pY(), scale: P.scale, flip: P.dir,
      n: 46, dirX: P.x >= fromX ? 1 : -1,
    });
    this._hitstop(50);
    this.cameras.main.shake(90, 0.006);
    window.GameAudio && GameAudio.play('splashBad');
    this.tweens.add({ targets: this.player, alpha: 0.35, duration: 90, yoyo: true, repeat: 4,
      onComplete: () => this.player.setAlpha(1) });
    if (P.hp <= 0) this._diePlayer();
  },

  // ── 死亡：全身消散（分级反馈的最高档），不重组 ──
  _diePlayer() {
    const P = this.P;
    P.state = 'dead'; this.ended = true; this.won = false;
    this.player.setVisible(false);
    this.playerShadow.setVisible(false);
    Forge.FX.dissolve({
      cloud: this._playerCloud(), x: P.x, y: this._pY(), scale: P.scale, flip: P.dir,
      n: 620, dur: 1200,
    });
    window.GameAudio && GameAudio.play('lose');
    this.time.delayedCall(1000, () =>
      window.GameHUD && GameHUD.showGameOver(false, `影散于${Forge.WAVES[this.wave].name}。\n变形不是护身符——化矛化雾时无敌，落地成形时脆弱。`));
  },
});
