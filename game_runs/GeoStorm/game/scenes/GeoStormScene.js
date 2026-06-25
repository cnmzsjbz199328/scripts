/* GeoStorm — §4B 原型分割；方法体逐字保留。 */
class GeoStormScene extends Phaser.Scene {
  constructor() { super('GeoStormScene'); }


  preload() { this.load.image('blueprint', 'scene/panorama.png'); }


  create() {
    this.physics.world.setBounds(0, 0, GAME_W, GAME_H);
    this._makeTextures();

    this.add.image(0, 0, 'blueprint').setOrigin(0, 0).setDisplaySize(GAME_W, GAME_H).setDepth(-100);
    this.fog = this.add.rectangle(0, 0, GAME_W, GAME_H, PHASES[0].fog, 0).setOrigin(0, 0).setDepth(-60);
    this.pulse = this.add.circle(GAME_W / 2, GAME_H / 2, 40, GLOW, 0).setStrokeStyle(2, GLOW, 0.25).setDepth(-50);

    this.blocks = this.physics.add.staticGroup();
    this._renderTileLayer('obstacles', 2, true);

    this._makeAnims();

    this.player = this.physics.add.sprite(GAME_W / 2, GAME_H / 2, 'pt0');
    this.player.setCollideWorldBounds(true);
    this.player.body.setCircle(7, 3, 3);
    this.player.setDepth(20);
    this.player.play('geo_pulse');
    this.physics.add.collider(this.player, this.blocks);

    this.shots = this.physics.add.group({ allowGravity: false });
    this.shards = this.physics.add.group({ allowGravity: false, immovable: true });
    this.physics.add.overlap(this.player, this.shots, this._hit, null, this);
    this.physics.add.overlap(this.player, this.shards, this._collect, null, this);
    this.physics.add.collider(this.shots, this.blocks, (b) => b.destroy());

    this.maxHp = 3; this.hp = 3; this.score = 0;
    this.phase = 0; this.deaths = 0;
    this.invuln = false; this.gameStarted = false; this.gameOver = false; this.cardActive = false;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.kkeys = this.input.keyboard.addKeys('W,A,S,D');

    this._buildCardLayer();
    this._exposeState();

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        window.GameHUD.setHearts(this.hp, this.maxHp);
        window.GameHUD.setScore(this.score);
        this._showCard('几何风暴 · 最后的光点',
          PHASES[0].intro[1].replace('用方向键', '\n用方向键'),
          () => this._enterPhase(0, true));
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
    this.player.setVelocity((vx / len) * PLAYER_SPEED, (vy / len) * PLAYER_SPEED);

    this.shots.getChildren().forEach(s => {
      if (s.x < -60 || s.x > GAME_W + 60 || s.y < -60 || s.y > GAME_H + 60) s.destroy();
    });
  }


  // ── 暴露状态给 verify / autoplay（俯视走位建议）──
  _exposeState() {
    const self = this;
    window.__gameState = { player: this.player };
    const suggest = () => {
      const px = self.player.x, py = self.player.y;
      // 趋近最近碎片
      let sk = [0, 0], bd = 1e9;
      self.shards.getChildren().forEach(s => { if (s.active) { const d = Math.hypot(s.x - px, s.y - py); if (d < bd) { bd = d; sk = [(s.x - px) / (d || 1), (s.y - py) / (d || 1)]; } } });
      // 躲避来袭弹幕（朝玩家飞来的、140px 内）
      let av = [0, 0];
      self.shots.getChildren().forEach(s => {
        if (!s.active) return;
        const dx = px - s.x, dy = py - s.y, d = Math.hypot(dx, dy);
        if (d < 140 && d > 1) {
          const vx = s.body.velocity.x, vy = s.body.velocity.y;
          if (dx * vx + dy * vy > 0) { const w = (140 - d) / 140; av[0] += dx / d * w; av[1] += dy / d * w; }
        }
      });
      // 远离边缘
      const m = 64; let eb = [0, 0];
      if (px < m) eb[0] += 1; if (px > GAME_W - m) eb[0] -= 1;
      if (py < m) eb[1] += 1; if (py > GAME_H - m) eb[1] -= 1;
      const am = Math.hypot(av[0], av[1]);
      let mx, my;
      if (am > 0.25) { mx = av[0] * 2.4 + eb[0] * 0.7 + sk[0] * 0.3; my = av[1] * 2.4 + eb[1] * 0.7 + sk[1] * 0.3; }
      else { mx = sk[0] + eb[0] * 0.4; my = sk[1] + eb[1] * 0.4; }
      const mm = Math.hypot(mx, my) || 1;
      return [mx / mm, my / mm];
    };
    window.__probe = () => {
      const [mx, my] = suggest();
      return {
        x: self.player.x, y: self.player.y, topdown: true,
        hp: self.hp, maxHp: self.maxHp, score: self.score, goalScore: WIN_SCORE, phase: self.phase,
        deaths: self.deaths, deathBudget: DEATH_BUDGET,
        won: self.gameOver && self.score >= WIN_SCORE, lost: self.gameOver && self.score < WIN_SCORE,
        cardActive: self.cardActive, started: self.gameStarted,
        moveX: mx, moveY: my,
      };
    };
    window.__advanceCard = () => self._advanceCard();
  }
}
