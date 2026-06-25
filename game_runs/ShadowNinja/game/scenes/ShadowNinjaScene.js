/* ShadowNinja — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
class ShadowNinjaScene extends Phaser.Scene {
  constructor() { super('ShadowNinjaScene'); }


  preload() {
    this.load.image('manor', 'scene/panorama.png');
    // 忍者改用逐帧 SVG（svg-sprite rig，姿态可控、剪影风统一）
    for (const [act, n] of Object.entries(NJ_FRAMES))
      for (let i = 0; i < n; i++)
        this.load.svg(`nj_${act}_${i}`, `assets/svg/nj_${act}_${i}.svg`, { width: NJ_VB.w, height: NJ_VB.h });
    // 环境元素：svg-ambient skill 生成的逐帧 SVG（流云/火盆/破幡），构建产物随包自带
    for (const [name, n] of Object.entries(AMB_FRAMES))
      for (let i = 0; i < n; i++)
        this.load.svg(`amb_${name}_${i}`, `assets/svg/amb_${name}_${i}.svg`, { width: 128, height: 128 });
  }


  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H + 200);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    this._makeTextures();

    this.bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'manor')
      .setOrigin(0, 0).setScrollFactor(0).setTileScale(GAME_H / 864, GAME_H / 864).setDepth(-100);

    // 每幕氛围雾气叠层（固定屏幕，按幕切色）
    this.fog = this.add.rectangle(0, 0, GAME_W, GAME_H, ACTS[0].fog, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-50);

    // 瓦片地面（程序化近黑瓦片 + 碰撞）
    this.solids = this.physics.add.staticGroup();
    this._renderTileLayer('solid', 0, true);

    this._makeAnims();
    this._addAmbient();

    // 玩家忍者（贴左出生 + 世界边界）
    this.player = this.physics.add.sprite(ACTS[0].startX, SPAWN_Y, 'nj_idle_0');
    this.player.setScale(NJ_SCALE);
    this.player.body.setSize(BODY_STAND.w, BODY_STAND.h).setOffset(BODY_STAND.ox, BODY_STAND.oy); // 站立体，脚底≈帧底
    this._postureProne = false;
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(20);
    this.physics.add.collider(this.player, this.solids);
    this.player.play('nj_idle');

    // 门钥
    this.keys2 = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const k of KEYS) {
      const s = this.keys2.create(k.x, k.y, 'key'); s.setDepth(15);
      s.setData('jump', !!k.jump);
      this.tweens.add({ targets: s, y: k.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.physics.add.overlap(this.player, this.keys2, this._collect, null, this);

    // 守卫
    this.guards = [];
    for (const gd of GUARDS) {
      const s = this.physics.add.sprite(gd.x, FLOOR_TOP - 34, 'guard');
      s.setDepth(18); s.body.setSize(22, 46).setAllowGravity(false);
      s.setData('minX', gd.x - gd.range); s.setData('maxX', gd.x + gd.range);
      s.setData('dir', 1); s.setVelocityX(70);
      this.guards.push(s);
    }

    this.lights = LIGHTS.map((lx, i) => ({ x: lx, phase: i * 1.3 }));
    this.coneGfx = this.add.graphics().setDepth(9);

    // 屋脊平台（可跳上的掩体）
    this.platforms = this.physics.add.staticGroup();
    for (const pf of PLATFORMS) {
      const img = this.platforms.create(pf.x, pf.y, 'rooftop').setDepth(12);
      img.setDisplaySize(pf.w, 48).refreshBody();
    }
    this.physics.add.collider(this.player, this.platforms);
    // 平台上的可选奖励钥匙（bot 不取，纯人类奖励）
    const bonus = this.keys2.create(PLATFORMS[0].x, PLATFORMS[0].y - 34, 'key').setDepth(15);
    bonus.setData('bonus', true);
    this.tweens.add({ targets: bonus, y: bonus.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // 计时铁闸（周期开合的栅栏，逼迫卡节奏）
    this.gates = this.physics.add.staticGroup();
    this.gateList = GATES.map(gd => {
      const img = this.gates.create(gd.x, FLOOR_TOP - 67, 'gate').setDepth(14);
      img.refreshBody();
      return Object.assign({ img, openNow: false, isOpen: false }, gd);
    });
    this.physics.add.collider(this.player, this.gates);

    // 牢笼（救人点）
    this.goal = this.physics.add.staticImage(CELL_X, FLOOR_TOP - 36, 'cell').setDepth(15);
    this.physics.add.overlap(this.player, this.goal, this._reachCell, null, this);

    // 府门（逃脱终点，救人后才出现/生效）
    this.exit = this.physics.add.staticImage(EXIT_X, FLOOR_TOP - 50, 'cell').setDepth(15)
      .setTint(0x9ec5ff).setVisible(false);
    this.physics.add.overlap(this.player, this.exit, this._reachExit, null, this);

    // 师弟跟随影（救出后陪伴，纯装饰）
    this.friend = this.add.sprite(0, 0, 'nj_idle_0').setScale(NJ_SCALE).setDepth(19)
      .setAlpha(0).setTint(0x2a3a52);

    // 状态
    this.maxHp = 3; this.hp = 3; this.score = 0;
    this.actIdx = 0; this.deaths = 0;
    this.reachedCell = false; this.invuln = false; this.crouch = false;
    this.rescued = false; this.escaping = false; this.escaped = false;
    this.gameStarted = false; this.gameOver = false; this.cardActive = false;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.kkeys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(180, 200);

    this._buildCardLayer();
    this._exposeState();

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        window.GameHUD.setHearts(this.hp, this.maxHp);
        window.GameHUD.setScore(this.score);
        // 开场卡：进入第一幕
        this._showCard('影忍 · 将军府之夜',
          '今夜，是救出师弟的唯一机会。\n按住 ↓/S 匍匐前进，可隐于光照之下——但身姿太低，够不着高悬的门钥。\n须趁光照扫开的间隙起身、甚至纵身跳起，才能取下门钥。集齐 ' + GOAL_SCORE + ' 把，直抵牢笼。\n\n移动 ← → / A D   ·   匍匐 ↓ / S   ·   起跳 ↑ / W / SPACE   ·   继续 SPACE',
          () => this._enterAct(0, true));
      });
    }
  }


  update(time) {
    if (this.bg) this.bg.tilePositionX = this.cameras.main.scrollX * 0.3;
    this._drawCones(time);
    if (this.gateList) this._updateGates(time);
    if (this.rescued) this._followFriend();
    if (this.cardActive || !this.gameStarted || this.gameOver) return;

    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    this.crouch = (this.cursors.down.isDown || this.kkeys.S.isDown) && onGround;
    this._applyPosture(this.crouch);

    const spd = this.crouch ? CROUCH_SPEED : PLAYER_SPEED;
    const left = this.cursors.left.isDown || this.kkeys.A.isDown;
    const right = this.cursors.right.isDown || this.kkeys.D.isDown;
    const jump = (this.cursors.up.isDown || this.kkeys.W.isDown || this.kkeys.SPACE.isDown) && !this.crouch;

    if (left) { this.player.setVelocityX(-spd); this.player.setFlipX(true); }
    else if (right) { this.player.setVelocityX(spd); this.player.setFlipX(false); }
    else this.player.setVelocityX(0);
    if (jump && onGround) this.player.setVelocityY(-JUMP_V);

    let anim;
    if (!onGround) anim = 'nj_jump';
    else if (this.crouch) anim = 'nj_crouch';
    else if (left || right) anim = 'nj_run';
    else anim = 'nj_idle';
    if (this.player.anims.currentAnim?.key !== anim) this.player.play(anim, true);

    this.guards.forEach(s => {
      let dir = s.getData('dir');
      if (s.x >= s.getData('maxX')) dir = -1; else if (s.x <= s.getData('minX')) dir = 1;
      s.setData('dir', dir); s.setVelocityX(70 * dir); s.setFlipX(dir < 0);
    });

    // 幕推进：跨过下一幕检查点 → 过场卡
    const nextIdx = this.actIdx + 1;
    if (nextIdx < ACTS.length && this.player.x >= ACTS[nextIdx].startX) {
      const act = ACTS[nextIdx];
      this.gameStarted = false; // 暂停直到卡片推进
      this._showCard(act.intro[0], act.intro[1], () => this._enterAct(nextIdx, true));
      return;
    }

    // 危险判定（蹲伏 = 隐身，不被察觉）
    if (!this.crouch && !this.invuln) {
      if (this._dangerAt(this.player.x, this.player.y, time)) this._spotted();
    }
  }
}
