/* ShadowLeap — §4B 原型分割；方法体逐字保留。 */
class ShadowLeapScene extends Phaser.Scene {
  constructor() { super('ShadowLeapScene'); }


  preload() {
    this.load.image('panorama', 'scene/panorama.png');
    const idx = TILEMAP_DATA.tileIndex || {};
    for (const [id, name] of Object.entries(idx)) this.load.image(`tile_${id}`, `assets/tiles/${name}.png`);
    this.load.spritesheet('shadowboy', 'assets/sprites/ShadowBoy.webp', { frameWidth: 192, frameHeight: 208 });
  }


  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H + 200);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    this._makeFxTextures();

    this.bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'panorama')
      .setOrigin(0, 0).setScrollFactor(0).setTileScale(GAME_H / 864, GAME_H / 864).setDepth(-100);
    this.fog = this.add.rectangle(0, 0, GAME_W, GAME_H, ACTS[0].fog, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-50);

    this.solids = this.physics.add.staticGroup();
    this._renderTileLayer('solid', DEPTH.GROUND, true);
    // 补地砖收窄过宽沟壑（行 7、8）
    for (const c of GAP_FILL_COLS) for (const r of [7, 8]) {
      const sp = this.add.image(c * TILE + TILE / 2, r * TILE + TILE / 2, 'tile_1').setDisplaySize(TILE, TILE).setDepth(DEPTH.GROUND);
      this.solids.add(sp); sp.body.setSize(TILE, TILE);
    }

    this._makeAnims();

    this.player = this.physics.add.sprite(ACTS[0].startX, SPAWN_Y, 'shadowboy', 0);
    this.player.setScale(0.42);
    this.player.body.setSize(70, 150).setOffset(60, 55);
    this.player.setDepth(DEPTH.YSORT);
    this.physics.add.collider(this.player, this.solids);
    this.player.play('sb_idle');
    this.lastSafeX = ACTS[0].startX;

    this.motes = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const m of MOTES) {
      const s = this.motes.create(m.x, m.y, 'mote'); s.setDepth(15);
      this.tweens.add({ targets: s, y: m.y - 12, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.physics.add.overlap(this.player, this.motes, this._collectMote, null, this);

    this.traps = this.physics.add.staticGroup();
    for (const tx of TRAPS) {
      const s = this.traps.create(tx, FLOOR_TOP - 10, 'trap');
      s.body.setSize(34, 16).setOffset(3, 12); s.setDepth(16);
    }
    this.physics.add.overlap(this.player, this.traps, (p, h) => this._hitHazard(p, h, 'trap'), null, this);

    this.rocks = this.physics.add.group();
    this.physics.add.collider(this.rocks, this.solids, (rock) => {
      this.tweens.add({ targets: rock, alpha: 0, duration: 200, onComplete: () => rock.destroy() });
    });
    this.physics.add.overlap(this.player, this.rocks, (p, r) => this._hitHazard(p, r, 'rock'), null, this);

    this.goal = this.physics.add.staticImage(GOAL_X, FLOOR_TOP - 60, 'goal').setDepth(15);
    this.goalGlow = this.add.circle(GOAL_X, FLOOR_TOP - 60, 60, 0xfff0c0, 0.18).setDepth(14);
    this.tweens.add({ targets: this.goalGlow, scale: 1.3, alpha: 0.32, duration: 1400, yoyo: true, repeat: -1 });
    this.physics.add.overlap(this.player, this.goal, this._reachGoal, null, this);

    this.maxHp = 3; this.hp = 3; this.score = 0;
    this.actIdx = 0; this.deaths = 0;
    this.reachedGoal = false; this.invuln = false;
    this.gameStarted = false; this.gameOver = false; this.cardActive = false;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.kkeys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(180, 200);

    this.rockTimer = this.time.addEvent({ delay: 1800, loop: true, callback: this._dropRock, callbackScope: this });

    this._buildCardLayer();
    this._exposeState();

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        window.GameHUD.setHearts(this.hp, this.maxHp);
        window.GameHUD.setScore(this.score);
        this._showCard('影跃 · 迷雾森林',
          '迷雾夺走了妹妹，深处那团光是唯一的线索。\n奔跑、跳跃，越过沟壑与陷阱，聚齐 ' + GOAL_SCORE + ' 点微光，抵达光源。\n\n奔跑 ← → / A D    ·    跳 ↑ / W / 空格    ·    继续 SPACE',
          () => this._enterAct(0, true));
      });
    }
  }


  update() {
    if (this.bg) this.bg.tilePositionX = this.cameras.main.scrollX * 0.35;
    if (this.cardActive || !this.gameStarted || this.gameOver) return;

    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    const left = this.cursors.left.isDown || this.kkeys.A.isDown;
    const right = this.cursors.right.isDown || this.kkeys.D.isDown;
    const jump = this.cursors.up.isDown || this.kkeys.W.isDown || this.kkeys.SPACE.isDown;

    if (left) { this.player.setVelocityX(-PLAYER_SPEED); this.player.setFlipX(true); }
    else if (right) { this.player.setVelocityX(PLAYER_SPEED); this.player.setFlipX(false); }
    else this.player.setVelocityX(0);
    if (jump && onGround) this.player.setVelocityY(-JUMP_V);

    let target;
    if (!onGround) target = 'sb_jump';
    else if (left || right) target = 'sb_run';
    else target = 'sb_idle';
    if (this.player.anims.currentAnim?.key !== target) this.player.play(target, true);

    if (onGround) {
      const overPit = PITS.some(p => this.player.x > p[0] - 10 && this.player.x < p[1] + 10);
      if (!overPit) this.lastSafeX = this.player.x;
    }

    // 幕推进
    const nextIdx = this.actIdx + 1;
    if (nextIdx < ACTS.length && this.player.x >= ACTS[nextIdx].startX) {
      const act = ACTS[nextIdx];
      this.gameStarted = false;
      this._showCard(act.intro[0], act.intro[1], () => this._enterAct(nextIdx, true));
      return;
    }

    // 坠入沟壑
    if (this.player.y > WORLD_H + 80) {
      this.player.setVelocity(0, 0);
      this.player.setPosition(this.lastSafeX, SPAWN_Y);
      this._damage(1);
    }

    this.rocks.getChildren().forEach(r => { if (r.y > GAME_H + 200) r.destroy(); });

    if (!this.reachedGoal && this.player.x > GOAL_X - 30 && this.score < GOAL_SCORE)
      window.GameHUD?.setObjective(`光源还需 ${GOAL_SCORE - this.score} 点微光才能点亮`);
  }


  _exposeState() {
    const self = this;
    window.__gameState = { player: this.player };
    const nextGoalX = () => {
      if (self.score < GOAL_SCORE) {
        let best = GOAL_X, bestD = Infinity;
        self.motes.getChildren().forEach(o => { if (o.active) { const d = o.x - self.player.x; if (d > 20 && d < bestD) { bestD = d; best = o.x; } } });
        return best;
      }
      return GOAL_X;
    };
    // 前方有沟壑边缘 或 捕兽夹 → 起跳
    const needJump = () => {
      const p = self.player;
      const onGround = p.body.blocked.down || p.body.touching.down;
      if (!onGround) return false;
      for (const [a] of PITS) if (p.x > a - 95 && p.x < a - 12) return true;     // 沟壑边缘附近起跳
      for (const tx of TRAPS) if (tx - p.x > 8 && tx - p.x < 78) return true;   // 捕兽夹前起跳越过
      return false;
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
