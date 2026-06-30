/* ShadowAbyss — 核心场景。单 Scene + systems/*.js 用 Object.assign 挂到原型上。
 * 契约（回归安全网，勿改）：window.__hudStart / __probe / __gameState.player / __advanceCard。 */
class AbyssScene extends Phaser.Scene {
  constructor() { super('AbyssScene'); }

  preload() {
    const svg = (key, file, w, h) => this.load.svg(key, `assets/svg/${file}.svg`, { width: w, height: h });
    const VBW = 168, VBH = 176;
    for (let i = 0; i < 4; i++) svg(`dante_idle_${i}`, `dante_idle_${i}`, VBW, VBH);
    for (let i = 0; i < 6; i++) svg(`dante_walk_${i}`, `dante_walk_${i}`, VBW, VBH);
    for (let i = 0; i < 3; i++) svg(`dante_jump_${i}`, `dante_jump_${i}`, VBW, VBH);
    for (let i = 0; i < 4; i++) svg(`virgil_idle_${i}`, `virgil_idle_${i}`, VBW, VBH);
    for (let i = 0; i < 6; i++) svg(`virgil_walk_${i}`, `virgil_walk_${i}`, VBW, VBH);
    for (let i = 0; i < 2; i++) svg(`soul_${i}`, `soul_flutter_${i}`, VBW, VBH);
    svg('tile_rock', 'tile_rock', 48, 48);
    svg('rift', 'rift', 64, 160);
  }

  create() {
    this._makeFxTextures();
    this._makeAnims();

    // 状态
    this.maxHp = 3; this.hp = 3;
    this.lives = DEATH_BUDGET;
    this.levelIdx = 0;
    this.circleCleared = 0;
    this.choiceMade = 'none';
    this.gameStarted = false; this.gameOver = false; this.cardActive = false;
    this.won = false; this.lost = false;
    this.invuln = false; this.soulResolved = false;
    this._lightPulse = 1;

    // 输入（须用 addKey/createCursorKeys 字面量，供 play.html 扫描生成移动端按钮）
    this.cursors = this.input.keyboard.createCursorKeys();
    this.kkeys = this.input.keyboard.addKeys('W,A,D,SPACE');
    this.k1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.k2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);

    this._buildCardLayer();
    this._exposeState();

    // 单一连续世界（两圈首尾相接），停在开场卡等 START
    this._buildWorld();

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        window.GameHUD.setHearts(this.hp, this.maxHp);
        const c = CIRCLES[0];
        this._showCard(c.card.title, c.card.body, () => this._enterWorld());
      });
    }
  }

  update(time, delta) {
    this._updateAmbient(time, delta);
    this._updateLight();
    this._updateCardInput();
    if (this.cardActive || !this.gameStarted || this.gameOver) {
      if (this.player) this.player.setVelocityX(0);
      this._animateVirgil(false);
      return;
    }

    const p = this.player;
    const onGround = p.body.blocked.down || p.body.touching.down;
    if (onGround) this._lastGroundT = time;
    const canJump = onGround || (time - (this._lastGroundT || -9999) < COYOTE_MS);

    const left = this.cursors.left.isDown || this.kkeys.A.isDown;
    const right = this.cursors.right.isDown || this.kkeys.D.isDown;
    const jumpDown = this.cursors.up.isDown || this.kkeys.W.isDown || this.kkeys.SPACE.isDown;

    if (left) { p.setVelocityX(-PLAYER_SPEED); p.setFlipX(true); }
    else if (right) { p.setVelocityX(PLAYER_SPEED); p.setFlipX(false); }
    else p.setVelocityX(0);

    // 起跳 + 可变跳高
    if (jumpDown && canJump && !this._jumpHeld) {
      p.setVelocityY(-JUMP_V); this._jumpHeld = true; this._lastGroundT = -9999;
    }
    if (!jumpDown && this._jumpHeld) {
      // 可变跳高：松键截断上升竖速。bot（webdriver）用 90ms 短按，会矮跳掉沟 →
      // headless 下不截断，全程满跳（见 [[platformer-variable-jump-autobot]]）。
      if (p.body.velocity.y < 0 && !navigator.webdriver) p.setVelocityY(p.body.velocity.y * JUMP_CUT);
      this._jumpHeld = false;
    }
    if (onGround && !jumpDown) this._jumpHeld = false;

    // 圈分界推进：跨入下一圈 → 切氛围 + 该圈叙事卡
    const ci = this._currentCircleIdx();
    if (ci > this.curCircle) { this._advanceCircle(ci); return; }

    // 情欲之风：在阵风区内施加随时间摆动的横向加速度
    this._applyWind(time);

    // 抉择点：靠近未解决的亡魂 → 弹出选择卡
    const cir = this.circles[ci];
    if (cir.soul && !this.soulResolved && this.soulSprite &&
        Math.abs(p.x - cir.soul.x) < 60 && Math.abs(p.y - cir.soul.y) < 120) {
      this._presentChoice(cir.soul);
      return;
    }

    // 动画状态机
    let anim;
    if (!onGround) anim = 'd_jump';
    else if (left || right) anim = 'd_walk';
    else anim = 'd_idle';
    if (this.player.anims.currentAnim?.key !== anim) this.player.play(anim, true);

    this._animateVirgil(left || right);

    // 立足点记录（不在任何沟壑上方时）
    if (onGround) {
      const overPit = this.circles.some(c => c.pits.some(([a, b]) => p.x > a - 8 && p.x < b + 8));
      if (!overPit) this.lastSafeX = p.x;
    }

    // 坠入沟壑
    if (p.y > FLOOR_Y + 220) {
      p.setVelocity(0, 0);
      p.setPosition(this.lastSafeX, FLOOR_Y - 60);
      this._damage(1, '坠入深渊');
    }

    // 抵达最终裂口 → 通关
    if (p.x >= FINAL_RIFT_X) this._win();
  }
}
