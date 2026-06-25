/* MoonRonin — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
class MoonRoninScene extends Phaser.Scene {
  constructor() { super('MoonRoninScene'); }


  preload() {
    this.load.image('manor', 'scene/panorama.png');
    this.load.svg('tile_1', 'assets/svg/tile_roof.svg', { width: 64, height: 64 });
    this.load.svg('tile_2', 'assets/svg/tile_beam.svg', { width: 64, height: 64 });
    for (let i = 0; i < 3; i++) this.load.svg(`r_idle_${i}`, `assets/svg/ronin_idle_${i}.svg`, { width: 164, height: 150 });
    for (let i = 0; i < 6; i++) this.load.svg(`r_run_${i}`, `assets/svg/ronin_run_${i}.svg`, { width: 164, height: 150 });
    for (let i = 0; i < 3; i++) this.load.svg(`r_jump_${i}`, `assets/svg/ronin_jump_${i}.svg`, { width: 164, height: 150 });
    for (let i = 0; i < 3; i++) this.load.svg(`r_slash_${i}`, `assets/svg/ronin_slash_${i}.svg`, { width: 164, height: 150 });
    this.load.svg('orb', 'assets/svg/orb.svg', { width: 24, height: 24 });
    for (let i = 0; i < 2; i++) this.load.svg(`crow_${i}`, `assets/svg/crow_${i}.svg`, { width: 28, height: 22 });
  }


  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H + 400);
    this.physics.world.setBoundsCollision(true, true, true, false);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    this.bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'manor')
      .setOrigin(0, 0).setScrollFactor(0).setTileScale(GAME_H / 864, GAME_H / 864).setDepth(-100);
    // 夜色暗幕（盖在全景背景上）+ 跟随鹭的月光晕（反相位图遮罩在暗幕上挖洞）
    this.fog = this.add.rectangle(0, 0, GAME_W, GAME_H, ACTS[0].fog, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-50);
    this._makeLightTexture();
    this.light = this.add.image(GAME_W / 2, GAME_H / 2, 'moonlight')
      .setScrollFactor(0).setVisible(false);
    this._lightR = LIGHT_MIN; this._lightPulse = 1;

    // 鹭身周的月辉光环：additive 叠加在前景（深度 19，紧贴玩家 20 之下），随月光成长
    this._makeGlowTexture();
    this.glow = this.add.image(0, 0, 'moonglow')
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(19);
    this._glowR = GLOW_MIN_R; this._glowA = GLOW_MIN_A;
    const lightMask = this.light.createBitmapMask();
    lightMask.invertAlpha = true;   // 光晕处擦除暗幕 → 露出背后的庙宇剪影
    this.fog.setMask(lightMask);

    this.solids = this.physics.add.staticGroup();
    this._renderTileLayer('solid', 0, true);

    this._makeAnims();

    this.player = this.physics.add.sprite(ACTS[0].startX, SPAWN_Y, 'r_idle_0');
    this.player.setScale(0.72);
    this.player.body.setSize(40, 104).setOffset(40, 36);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(20);
    this.physics.add.collider(this.player, this.solids);
    this.player.play('ro_idle');
    this.lastSafeX = ACTS[0].startX;

    this.orbs = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const o of ORBS) {
      const s = this.orbs.create(o.x, o.y, 'orb'); s.setDepth(15);
      this.tweens.add({ targets: s, y: o.y - 12, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: s, scale: 1.2, duration: 700, yoyo: true, repeat: -1 });
    }
    this.physics.add.overlap(this.player, this.orbs, this._collect, null, this);

    this.crows = this.physics.add.group({ allowGravity: false });
    for (const c of CROWS) {
      const s = this.crows.create(c.x, c.y, 'crow_0'); s.setDepth(18);
      s.body.setSize(20, 14); s.setImmovable(true);
      s.setData('home', c.y); s.setData('range', c.range); s.setData('dir', 1);
      s.play('crow_fly');
    }
    this.physics.add.overlap(this.player, this.crows, this._hitCrow, null, this);

    this.endGlow = this.add.rectangle(END_X + 80, GAME_H / 2, 26, GAME_H, 0xffe9a8, 0.14).setDepth(2);

    this.maxHp = 3; this.hp = 3; this.score = 0;
    this.actIdx = 0; this.deaths = 0;
    this.reachedEnd = false; this.invuln = false; this.slashUntil = 0;
    this.gameStarted = false; this.gameOver = false; this.cardActive = false;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.kkeys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    this.jKey = this.input.keyboard.addKey('J');
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(180, 200);

    this._buildCardLayer();
    this._exposeState();

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        window.GameHUD.setHearts(this.hp, this.maxHp);
        window.GameHUD.setScore(this.score);
        this._showCard('月影 · 屋脊浪人',
          '密信在怀，府门重重。\n踏过将军府的层层屋脊，越过庭院缺口，聚齐 ' + GOAL_SCORE + ' 缕月光，奔向府墙尽头。\n\n奔跑 ← → / A D    ·    起跳 ↑ / W / 空格    ·    挥刀 J    ·    继续 SPACE',
          () => this._enterAct(0, true));
      });
    }
  }


  update(time) {
    if (this.bg) this.bg.tilePositionX = this.cameras.main.scrollX * 0.3;
    this._updateLight();
    if (this.cardActive || !this.gameStarted || this.gameOver) return;

    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    const left = this.cursors.left.isDown || this.kkeys.A.isDown;
    const right = this.cursors.right.isDown || this.kkeys.D.isDown;
    const jump = this.cursors.up.isDown || this.kkeys.W.isDown || this.kkeys.SPACE.isDown;

    if (left) { this.player.setVelocityX(-PLAYER_SPEED); this.player.setFlipX(true); }
    else if (right) { this.player.setVelocityX(PLAYER_SPEED); this.player.setFlipX(false); }
    else this.player.setVelocityX(0);
    if (jump && onGround) this.player.setVelocityY(-JUMP_V);

    if (Phaser.Input.Keyboard.JustDown(this.jKey) && time >= this.slashUntil) this._slash(time);

    let anim;
    if (time < this.slashUntil) anim = 'ro_slash';
    else if (!onGround) anim = 'ro_jump';
    else if (left || right) anim = 'ro_run';
    else anim = 'ro_idle';
    if (anim !== 'ro_slash' && this.player.anims.currentAnim?.key !== anim) this.player.play(anim, true);

    this.crows.getChildren().forEach(c => {
      const home = c.getData('home'), range = c.getData('range');
      let dir = c.getData('dir');
      if (c.y > home + range) dir = -1; else if (c.y < home - range) dir = 1;
      c.setData('dir', dir); c.setVelocityY(50 * dir);
    });

    if (onGround) this.lastSafeX = this.player.x;

    // 幕推进
    const nextIdx = this.actIdx + 1;
    if (nextIdx < ACTS.length && this.player.x >= ACTS[nextIdx].startX) {
      const act = ACTS[nextIdx];
      this.gameStarted = false;
      this._showCard(act.intro[0], act.intro[1], () => this._enterAct(nextIdx, true));
      return;
    }

    // 坠入缺口
    if (this.player.y > WORLD_H + 120) {
      this.player.setVelocity(0, 0);
      this.player.setPosition(this.lastSafeX, SPAWN_Y);
      this._damage(1);
    }

    // 抵达府墙尽头
    if (!this.reachedEnd && this.player.x > END_X) {
      if (this.score >= GOAL_SCORE) { this.reachedEnd = true; this._win(); }
      else window.GameHUD?.setObjective(`府墙还需 ${GOAL_SCORE - this.score} 缕月光才能跃下`);
    }
  }
}
