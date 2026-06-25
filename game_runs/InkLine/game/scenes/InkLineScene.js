/* InkLine — §4B 原型分割；方法体逐字保留。 */
class InkLineScene extends Phaser.Scene {
  constructor() { super('InkLineScene'); }


  preload() { this.load.image('paper', 'scene/panorama.png'); }


  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H + 200);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    this._makeTextures();

    this.bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'paper')
      .setOrigin(0, 0).setScrollFactor(0).setTileScale(GAME_H / 864, GAME_H / 864).setDepth(-100);
    this.wash = this.add.rectangle(0, 0, GAME_W, GAME_H, ACTS[0].wash, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-50);

    this.solids = this.physics.add.staticGroup();
    this._renderTileLayer('solid', 0, true);
    for (const c of GAP_FILL_COLS) for (const r of [7, 8]) {  // 补地砖收窄沟壑
      const sp = this.add.image(c * TILE + TILE / 2, r * TILE + TILE / 2, 'tile_1').setDisplaySize(TILE, TILE).setDepth(0);
      this.solids.add(sp); sp.body.setSize(TILE, TILE);
    }

    this._makeAnims();

    this.player = this.physics.add.sprite(ACTS[0].startX, SPAWN_Y, 'blobf0');
    this.player.setCollideWorldBounds(true);
    this.player.body.setCircle(12, 3, 3);
    this.player.setDepth(20);
    this.physics.add.collider(this.player, this.solids);
    this.player.play('ink_idle');
    this.lastSafeX = ACTS[0].startX;

    this.drops = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const d of DROPS) {
      const s = this.drops.create(d.x, d.y, 'drop'); s.setDepth(15);
      this.tweens.add({ targets: s, y: d.y - 10, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.physics.add.overlap(this.player, this.drops, this._collect, null, this);

    this.spikes = this.physics.add.staticGroup();
    for (const sx of SPIKES) {
      const s = this.spikes.create(sx, FLOOR_TOP - 8, 'spike');
      s.body.setSize(30, 14).setOffset(3, 12); s.setDepth(16);
    }
    this.physics.add.overlap(this.player, this.spikes, this._hit, null, this);

    // 橡皮怪（按幕激活）
    this.erasers = this.physics.add.group({ allowGravity: false });
    for (const e of ERASERS) {
      const s = this.erasers.create(e.x, FLOOR_TOP - 18, 'eraser');
      s.setDepth(17); s.body.setSize(34, 30);
      s.setData('minX', e.x - e.range); s.setData('maxX', e.x + e.range); s.setData('act', e.act);
      s.setVelocityX(60); s.setImmovable(true); s.setVisible(false); s.body.enable = false;
    }
    this.physics.add.overlap(this.player, this.erasers, this._hit, null, this);

    this.goal = this.physics.add.staticImage(GOAL_X, FLOOR_TOP - 50, 'nib').setDepth(15);
    this.goalGlow = this.add.circle(GOAL_X, FLOOR_TOP - 50, 46, 0x6fd0c8, 0.18).setDepth(14);
    this.tweens.add({ targets: this.goalGlow, scale: 1.3, alpha: 0.34, duration: 1300, yoyo: true, repeat: -1 });
    this.physics.add.overlap(this.player, this.goal, this._reachGoal, null, this);

    this.maxHp = 3; this.hp = 3; this.score = 0;
    this.actIdx = 0; this.deaths = 0;
    this.reachedGoal = false; this.invuln = false;
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
        this._showCard('一线 · 未完成的画',
          '一根想画完自己世界的线。\n奔跑、跳跃，越过断线与尖刺，聚齐 ' + GOAL_SCORE + ' 滴墨，抵达画纸尽头的笔尖。\n\n移动 ← → / A D    ·    跳 ↑ / W / 空格    ·    继续 SPACE',
          () => this._enterAct(0, true));
      });
    }
  }


  update() {
    if (this.bg) this.bg.tilePositionX = this.cameras.main.scrollX * 0.3;
    if (this.cardActive || !this.gameStarted || this.gameOver) return;

    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    const left = this.cursors.left.isDown || this.kkeys.A.isDown;
    const right = this.cursors.right.isDown || this.kkeys.D.isDown;
    const jump = this.cursors.up.isDown || this.kkeys.W.isDown || this.kkeys.SPACE.isDown;

    if (left) { this.player.setVelocityX(-PLAYER_SPEED); this.player.setFlipX(true); }
    else if (right) { this.player.setVelocityX(PLAYER_SPEED); this.player.setFlipX(false); }
    else this.player.setVelocityX(0);
    if (jump && onGround) this.player.setVelocityY(-JUMP_V);

    const anim = (left || right || !onGround) ? 'ink_move' : 'ink_idle';
    if (this.player.anims.currentAnim?.key !== anim) this.player.play(anim, true);

    this.erasers.getChildren().forEach(e => {
      if (!e.body.enable) return;
      if (e.x <= e.getData('minX')) e.setVelocityX(60);
      else if (e.x >= e.getData('maxX')) e.setVelocityX(-60);
    });

    if (onGround) {
      const overPit = PITS.some(p => this.player.x > p[0] - 10 && this.player.x < p[1] + 10);
      if (!overPit) this.lastSafeX = this.player.x;
    }

    const nextIdx = this.actIdx + 1;
    if (nextIdx < ACTS.length && this.player.x >= ACTS[nextIdx].startX) {
      const act = ACTS[nextIdx];
      this.gameStarted = false;
      this._showCard(act.intro[0], act.intro[1], () => this._enterAct(nextIdx, true));
      return;
    }

    if (this.player.y > WORLD_H + 80) {
      this.player.setVelocity(0, 0);
      this.player.setPosition(this.lastSafeX, SPAWN_Y);
      this._damage(1);
    }
  }


  _exposeState() {
    const self = this;
    window.__gameState = { player: this.player };
    const nextGoalX = () => {
      if (self.score < GOAL_SCORE) {
        let best = GOAL_X, bestD = Infinity;
        self.drops.getChildren().forEach(o => { if (o.active) { const d = o.x - self.player.x; if (d > 20 && d < bestD) { bestD = d; best = o.x; } } });
        return best;
      }
      return GOAL_X;
    };
    const needJump = () => {
      const p = self.player;
      const onGround = p.body.blocked.down || p.body.touching.down;
      if (!onGround) return false;
      for (const [a] of PITS) if (p.x > a - 95 && p.x < a - 12) return true;
      for (const sx of SPIKES) if (sx - p.x > 8 && sx - p.x < 76) return true;
      // 前方有橡皮怪 → 跳过
      let jump = false;
      self.erasers.getChildren().forEach(e => { if (e.body.enable && e.x - p.x > 8 && e.x - p.x < 76) jump = true; });
      return jump;
    };
    window.__probe = () => {
      const p = self.player;
      const onGround = p.body.blocked.down || p.body.touching.down;
      return {
        x: p.x, y: p.y, vx: p.body.velocity.x, onGround,
        hp: self.hp, maxHp: self.maxHp, act: self.actIdx, score: self.score, goalScore: GOAL_SCORE,
        deaths: self.deaths, deathBudget: DEATH_BUDGET,
        won: self.gameOver && self.reachedGoal, lost: self.gameOver && !self.reachedGoal,
        cardActive: self.cardActive, started: self.gameStarted,
        nextGoalX: nextGoalX(), worldW: WORLD_W, goalX: GOAL_X,
        needJump: needJump(),
      };
    };
    window.__advanceCard = () => self._advanceCard();
  }
}
