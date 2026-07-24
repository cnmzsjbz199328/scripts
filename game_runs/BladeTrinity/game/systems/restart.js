/* BladeTrinity — 结束后的重启入口。
 *
 * 用户定：不做显眼的结算弹窗。整场擂台打完（phase === 'over'，胜负都算）后，
 * 鼠标移进画面才浮出一个半透明的 ↻，点一下重开；鼠标移出画面就淡回去。
 * 在此之前只能刷新网页才能再来一局。
 *
 * ⚠️ 两条实现约束：
 * 1) 可见性用【每帧插值 alpha】而不是 tween —— phase 可能在演出中途切到 over，
 *    tween 抢来抢去会闪；插值天然收敛。
 * 2) 命中区用独立 Zone，不给 Graphics/Container 设 setInteractive：
 *    Container 的默认 hitArea 原点约定容易踩偏，Zone 的 origin 0.5 是确定的。
 */
Object.assign(BladeTrinityScene.prototype, {

  _buildRestartBtn() {
    const R = 34, x = BT.GAME_W / 2, y = BT.GAME_H / 2 + 40;

    const g = this.add.graphics().setScrollFactor(0).setDepth(90).setAlpha(0);
    g.fillStyle(0x0b0f19, 0.55); g.fillCircle(x, y, R);
    g.lineStyle(3, 0xf2e7d5, 0.95); g.strokeCircle(x, y, R);

    const icon = this.add.text(x, y + 2, '↻', {
      fontFamily: 'Segoe UI, monospace', fontSize: '42px', color: '#f2e7d5', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(91).setAlpha(0);

    const zone = this.add.zone(x, y, R * 2, R * 2).setOrigin(0.5)
      .setScrollFactor(0).setDepth(92).setInteractive({ useHandCursor: true });

    this._rsHover = false;
    this._rsAlpha = 0;
    zone.on('pointerover', () => { this._rsHover = true; });
    zone.on('pointerout', () => { this._rsHover = false; });
    zone.on('pointerdown', () => { if (this.phase === 'over') this._restartGame(); });
    zone.input.enabled = false;          // 只有 over 且鼠标在画面里时才吃点击

    this._restartUI = { g, icon, zone };

    // 鼠标是否在画布内：Phaser 的 pointer 不上报"离开画布"，只能听 DOM。
    // 场景 restart 会重跑 create，监听器必须在 shutdown 时摘掉，否则每次重开叠一层。
    const cv = this.game.canvas;
    this._rsIn = false;
    const onEnter = () => { this._rsIn = true; };
    const onLeave = () => { this._rsIn = false; this._rsHover = false; };
    cv.addEventListener('mouseenter', onEnter);
    cv.addEventListener('mousemove', onEnter);   // 鼠标本来就停在画面里时 enter 不会补发
    cv.addEventListener('mouseleave', onLeave);
    this.events.once('shutdown', () => {
      cv.removeEventListener('mouseenter', onEnter);
      cv.removeEventListener('mousemove', onEnter);
      cv.removeEventListener('mouseleave', onLeave);
    });
  },

  _tickRestartBtn() {
    const ui = this._restartUI;
    if (!ui) return;
    const show = this.phase === 'over' && this._rsIn;
    const target = show ? (this._rsHover ? 0.85 : 0.35) : 0;
    this._rsAlpha += (target - this._rsAlpha) * 0.15;
    if (Math.abs(target - this._rsAlpha) < 0.005) this._rsAlpha = target;
    ui.g.setAlpha(this._rsAlpha);
    ui.icon.setAlpha(this._rsAlpha);
    ui.zone.input.enabled = show;
  },

  // 重开 = 场景 restart，回到选流派界面（"即开即玩"，不做结算/关卡选择）。
  // restart 只重跑 create，实例字段是留着的：所有【跨 create 缓存的对象引用】
  // 都必须在这里清空，否则 fight.js 的 `this.barG = this.barG || ...` 会拿到
  // 一个已被 shutdown 销毁的 Graphics，血条从此画不出来。
  _restartGame() {
    this._won = false;
    this._lost = false;
    this.phase = 'select';
    this.barG = null;
    this.barTexts = null;
    this.qiList = null;
    this.selGroup = null;
    this.p1 = null; this.p2 = null; this.fighters = [];
    this._restartUI = null;
    window.GameHUD?.setObjective('选择流派，登台对决！');
    this.scene.restart();
  },
});
