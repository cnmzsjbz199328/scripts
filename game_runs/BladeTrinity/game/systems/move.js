/* BladeTrinity — 移形换影（升空 / 缩地）。
 *
 * 借 WyrmsEnd 的雾化冲刺（player.js _doMist）：瞬移一段、全程无敌、留残影。这里用
 * 精灵拖尾做残影（沿路径插值几个渐隐的半透明分身），而不是点云——BladeTrinity 是
 * 图集精灵，接点云要另引一套引擎；先用便宜的拖尾验手感，要雾感再升级。
 *
 * 一个 SPACE 键，方向敏感：按住上 = 升空（纵向，进空中躲贴地招、开空中出招），
 * 否则 = 缩地（横向，躲剑气/换位）。都走冷却、不耗蓝。
 */
Object.assign(BladeTrinityScene.prototype, {

  _doBlink(f, mode, time) {
    const rk = mode === 'rise' ? 'riseReady' : 'mistReady';
    if (time < (f[rk] || 0) || !this._canAct(f)) return;
    f[rk] = time + (mode === 'rise' ? BT.BLINK.riseCd : BT.BLINK.groundCd);
    f.invuln = Math.max(f.invuln, time + BT.BLINK.iframe);
    if (this._usage && f === this.p1) this._usage.blink++;

    const sp = f.sprite;
    const x0 = sp.x, y0 = sp.y;
    let x1 = x0, y1 = y0;
    if (mode === 'rise') {
      y1 = Math.max(120, y0 - BT.BLINK.riseH);      // 别冲出画面顶
    } else {
      // 缩地方向：优先取当前按住的左右键，否则朝当前面向（向前）
      const left = this.keys.A.isDown || this.cursors.left.isDown;
      const right = this.keys.D.isDown || this.cursors.right.isDown;
      const dir = left ? -1 : right ? 1 : (f.facingLeft ? -1 : 1);
      x1 = this._clampX(x0 + dir * BT.BLINK.dist);
    }

    this._blinkGhosts(f, x0, y0, x1, y1);
    sp.setPosition(x1, y1);
    if (mode === 'rise') sp.setVelocity(0, 0);       // 升空后自由落体（重力接管）
    else sp.setVelocityX(0);
    window.GameAudio && GameAudio.play && GameAudio.play('morph');
  },

  // AI 侧移形换影的冷却：档位可覆盖。BT.BLINK 的 820/1050 是按【玩家逃生】调的，
  // 高档 AI 拿它当机动手段时，这两个数才是真正卡住出场率的闸门（概率再高也过不去）。
  _aiBlinkCd(mode) {
    const T = this._tierCfg();
    return mode === 'rise' ? (T.riseCd || BT.BLINK.riseCd) : (T.blinkCd || BT.BLINK.groundCd);
  },

  // AI 侧缩地/升空：没有键盘，方向由调用方给定（dir<0 拉开、dir>0 贴身）。
  // 与 _doBlink 同一套位移/无敌/残影，只是不读 this.keys。不计 usage（那只统计玩家）。
  _doAIBlink(f, mode, dir, time) {
    const rk = mode === 'rise' ? 'riseReady' : 'mistReady';
    if (time < (f[rk] || 0) || !this._canAct(f)) return;
    f[rk] = time + this._aiBlinkCd(mode);
    f.invuln = Math.max(f.invuln, time + BT.BLINK.iframe);
    const sp = f.sprite, x0 = sp.x, y0 = sp.y;
    let x1 = x0, y1 = y0;
    if (mode === 'rise') y1 = Math.max(120, y0 - BT.BLINK.riseH);
    else x1 = this._clampX(x0 + dir * BT.BLINK.dist);
    this._blinkGhosts(f, x0, y0, x1, y1);
    sp.setPosition(x1, y1);
    if (mode === 'rise') sp.setVelocity(0, 0); else sp.setVelocityX(0);
    window.GameAudio && GameAudio.play && GameAudio.play('morph');
  },

  // 沿瞬移路径插值几个渐隐分身——移形换影的"影"
  _blinkGhosts(f, x0, y0, x1, y1) {
    const n = BT.BLINK.ghosts, frame = f.sprite.frame.name;
    for (let k = 0; k < n; k++) {
      const t = n > 1 ? k / (n - 1) : 1;
      const img = this.add.image(Phaser.Math.Linear(x0, x1, t), Phaser.Math.Linear(y0, y1, t),
        f.id, frame).setScale(BT.SCALE).setFlipX(f.sprite.flipX)
        .setDepth(9).setAlpha(0.5 * (1 - t * 0.6)).setTint(0x8fc8ff);
      this.tweens.add({ targets: img, alpha: 0, duration: 280,
        onComplete: () => img.destroy() });
    }
  },
});
