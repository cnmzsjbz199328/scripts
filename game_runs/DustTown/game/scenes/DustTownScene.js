/* DustTown — §4B 原型分割；方法体逐字保留。 */
class DustTownScene extends Phaser.Scene {
  constructor() { super('DustTownScene'); }


  preload() {
    this.load.image('townmap', 'scene/panorama.png');
    const idx = TILEMAP_DATA.tileIndex || {};
    for (const [id, name] of Object.entries(idx)) this.load.image(`tile_${id}`, `assets/tiles/${name}.png`);
    this.load.spritesheet('sheriff', 'assets/sprites/DustSheriff.webp', { frameWidth: 192, frameHeight: 208 });
  }


  create() {
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);

    this._makeTextures();
    this.add.image(0, 0, 'townmap').setOrigin(0, 0).setDisplaySize(MAP_W, MAP_H).setDepth(-100);

    this.covers = this.physics.add.staticGroup();
    this._renderTileLayer('obstacles', 8, true);

    this._makeAnims();

    this.courtMark = this.add.circle(COURT.x, COURT.y, COURT.r, 0xe8c98a, 0.18).setDepth(2);
    this.courtFlag = this.add.image(COURT.x, COURT.y, 'court').setDepth(6);
    this.tweens.add({ targets: this.courtMark, scale: 1.25, alpha: 0.3, duration: 1400, yoyo: true, repeat: -1 });

    this.player = this.physics.add.sprite(SPAWN.x, SPAWN.y, 'sheriff', 0);
    this.player.setScale(0.3);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(64, 64).setOffset(64, 72);
    this.player.setDepth(20);
    this.player.play('sh_idle');
    this.physics.add.collider(this.player, this.covers);

    this.npcs = this.physics.add.staticGroup();
    NPCS.forEach((n, i) => {
      const s = this.npcs.create(n.x, n.y, 'npc');
      s.setDepth(15); s.setData('idx', i); s.setData('done', false);
      s.body.setCircle(14);
    });

    this.thugs = this.physics.add.group({ allowGravity: false });
    THUGS.forEach(t => this._addThug(t));
    this.physics.add.overlap(this.player, this.thugs, this._caught, null, this);
    this.physics.add.collider(this.thugs, this.covers);

    this._buildDialogue();
    this.prompt = this.add.text(0, 0, '按 E 倾听', {
      fontFamily: 'Segoe UI, monospace', fontSize: '14px', color: '#fff6e0',
      backgroundColor: '#00000088', padding: { x: 6, y: 2 },
    }).setOrigin(0.5, 1).setDepth(40).setVisible(false);

    this.maxHp = 4; this.hp = 4; this.score = 0;
    this.chapter = 0; this.deaths = 0; this.thugSpeed = CHAPTERS[0].thug;
    this.reachedCourt = false; this.invuln = false;
    this.gameStarted = false; this.gameOver = false; this.cardActive = false;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.kkeys = this.input.keyboard.addKeys('W,A,S,D');
    this.eKey = this.input.keyboard.addKey('E');
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this._buildCardLayer();
    this._exposeState();

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        window.GameHUD.setHearts(this.hp, this.maxHp);
        window.GameHUD.setScore(this.score);
        this._showCard('尘镇 · 新警长', CHAPTERS[0].intro[1], () => this._enterChapter(0, true));
      });
    }
  }


  update() {
    if (this.cardActive || !this.gameStarted || this.gameOver) return;

    let vx = 0, vy = 0;
    if (this.cursors.left.isDown || this.kkeys.A.isDown) vx = -1;
    else if (this.cursors.right.isDown || this.kkeys.D.isDown) vx = 1;
    if (this.cursors.up.isDown || this.kkeys.W.isDown) vy = -1;
    else if (this.cursors.down.isDown || this.kkeys.S.isDown) vy = 1;
    const len = Math.hypot(vx, vy) || 1;
    if (!this.invuln) this.player.setVelocity((vx / len) * PLAYER_SPEED, (vy / len) * PLAYER_SPEED);
    const moving = vx !== 0 || vy !== 0;

    if (moving) this.player.setRotation(Math.atan2(vy, vx) + Math.PI / 2);
    const anim = moving ? 'sh_walk' : 'sh_idle';
    if (this.player.anims.currentAnim?.key !== anim) this.player.play(anim, true);

    this.thugs.getChildren().forEach(t => {
      const home = t.getData('home'); const axis = t.getData('axis');
      const range = t.getData('range'); let dir = t.getData('dir');
      const pos = axis === 'x' ? t.x : t.y; const base = axis === 'x' ? home.x : home.y;
      if (pos > base + range) dir = -1; else if (pos < base - range) dir = 1;
      t.setData('dir', dir);
      if (axis === 'x') t.setVelocity(this.thugSpeed * dir, 0); else t.setVelocity(0, this.thugSpeed * dir);
    });

    const npc = this._nearNpc();
    if (npc) {
      this.prompt.setPosition(npc.x, npc.y - 22).setVisible(true);
      if (Phaser.Input.Keyboard.JustDown(this.eKey)) this._listen(npc);
    } else this.prompt.setVisible(false);

    if (this.score >= WIN_SCORE && !this.reachedCourt) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, COURT.x, COURT.y);
      if (d < COURT.r) { this.reachedCourt = true; this._win(); }
    }
  }


  // ── 暴露状态给 verify / autoplay（俯视调查走位）──
  _exposeState() {
    const self = this;
    window.__gameState = { player: this.player };
    const target = () => {
      if (self.score >= WIN_SCORE) return { x: COURT.x, y: COURT.y };
      const n = self._nearestUnvisited();
      return n ? { x: n.x, y: n.y } : { x: COURT.x, y: COURT.y };
    };
    const suggest = () => {
      const px = self.player.x, py = self.player.y;
      const tg = target();
      const td = Math.hypot(tg.x - px, tg.y - py) || 1;
      let sk = [(tg.x - px) / td, (tg.y - py) / td];
      // 躲打手
      let av = [0, 0];
      self.thugs.getChildren().forEach(t => {
        const dx = px - t.x, dy = py - t.y, d = Math.hypot(dx, dy);
        if (d < 100 && d > 1) { const w = (100 - d) / 100; av[0] += dx / d * w; av[1] += dy / d * w; }
      });
      // 躲木箱（静态）
      self.covers.getChildren().forEach(c => {
        const dx = px - c.x, dy = py - c.y, d = Math.hypot(dx, dy);
        if (d < 58 && d > 1) { const w = (58 - d) / 58; av[0] += dx / d * w * 0.8; av[1] += dy / d * w * 0.8; }
      });
      const am = Math.hypot(av[0], av[1]);
      let mx, my;
      if (am > 0.3) { mx = av[0] * 2.2 + sk[0] * 0.6; my = av[1] * 2.2 + sk[1] * 0.6; }
      else { mx = sk[0]; my = sk[1]; }
      const mm = Math.hypot(mx, my) || 1;
      return [mx / mm, my / mm];
    };
    window.__probe = () => {
      const [mx, my] = suggest();
      const npc = self._nearNpc();
      return {
        x: self.player.x, y: self.player.y, topdown: true,
        hp: self.hp, maxHp: self.maxHp, score: self.score, goalScore: WIN_SCORE, chapter: self.chapter,
        deaths: self.deaths, deathBudget: DEATH_BUDGET,
        won: self.gameOver && self.reachedCourt, lost: self.gameOver && !self.reachedCourt,
        cardActive: self.cardActive, started: self.gameStarted,
        moveX: mx, moveY: my, interact: !!npc,
      };
    };
    window.__advanceCard = () => self._advanceCard();
  }
}
