/* GeoStorm — 几何风暴：最后的光点（短篇完整游戏版）
 * 单屏几何弹幕闪避 (lineart top-down). 程序化脉冲光点 + 线条几何掩体。
 *
 * demo → 短篇完整游戏的结构升级（单屏用"分阶段"代替"分幕"）：
 *  · 开场卡 →【一阶·初醒微光】→【二阶·虚空渐起】→【三阶·终焉风暴】高潮 → 结局卡（按光碎片数推进）
 *  · 死亡预算：被击碎后重凝(清场+满血+无敌)，预算耗尽才真正湮灭
 *  · 每阶弹幕节奏/速度递增；暴露 window.__probe()(俯视 moveX/moveY 走位建议)供白盒自测
 */

const GAME_W = 960;
const GAME_H = 540;
const PLAYER_SPEED = 230;
const WIN_SCORE = 15;
const SHARDS_ON_FIELD = 4;
const DEATH_BUDGET = 5;

const INK = 0x14233a;
const GLOW = 0x18c2b0;
const SHARD_C = 0xffb020;

// 三阶段（按已收集光碎片推进）
const PHASES = [
  { name: '初醒微光', upTo: 5,  beat: 820, spd: 115, fog: 0x0a1422, fogA: 0.0,
    intro: ['第一阶 · 初醒微光',
      '我是宇宙诞生时画下的第一个光点。\n虚空正从四边吞噬线条——用方向键 / WASD 在弹幕缝隙间走位，\n拾起散落的光碎片，把几何宇宙一点点画回来。'] },
  { name: '虚空渐起', upTo: 10, beat: 640, spd: 150, fog: 0x0a1020, fogA: 0.14,
    intro: ['第二阶 · 虚空渐起',
      '虚空察觉了微光的复苏，弹幕更密、更快。\n飞旋的三角、平移的方块从四面涌来。\n躲到几何掩体之后，能挡下崩坏的弹幕。'] },
  { name: '终焉风暴', upTo: 15, beat: 500, spd: 185, fog: 0x140a18, fogA: 0.2,
    intro: ['第三阶 · 终焉风暴',
      '最后五枚光碎片，虚空倾尽全力。\n这是终焉的风暴——\n点亮它们，让崩解的线条逆向重连，把宇宙重新画亮！'] },
];

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

  _buildCardLayer() {
    this.cardBg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x07101e, 0.9).setOrigin(0, 0).setScrollFactor(0).setDepth(200).setVisible(false);
    this.cardTitle = this.add.text(GAME_W / 2, 160, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '30px', color: '#5fe6da', align: 'center', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardBody = this.add.text(GAME_W / 2, 290, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '18px', color: '#cbd5e1', align: 'center', lineSpacing: 10, wordWrap: { width: 720 } }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardHint = this.add.text(GAME_W / 2, 460, '— 按 SPACE 继续 —', { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#64748b' }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
  }

  _showCard(title, body, cb) {
    this.cardActive = true; this._pendingCardCb = cb;
    this.player.setVelocity(0, 0);
    this.cardTitle.setText(title); this.cardBody.setText(body);
    [this.cardBg, this.cardTitle, this.cardBody, this.cardHint].forEach(o => o.setVisible(true));
    this.input.keyboard.once('keydown-SPACE', () => this._advanceCard());
    this.input.keyboard.once('keydown-ENTER', () => this._advanceCard());
    this.input.once('pointerdown', () => this._advanceCard());
  }

  _advanceCard() {
    if (!this.cardActive) return;
    this.cardActive = false;
    [this.cardBg, this.cardTitle, this.cardBody, this.cardHint].forEach(o => o.setVisible(false));
    const cb = this._pendingCardCb; this._pendingCardCb = null;
    if (cb) cb();
  }

  _enterPhase(idx, isStart) {
    this.phase = idx;
    const ph = PHASES[idx];
    this.beat = ph.beat; this.spd = ph.spd;
    if (isStart) this.gameStarted = true;
    // 清场 + 短暂无敌，避免恢复即被击
    this.shots.clear(true, true);
    this.player.setVelocity(0, 0).setPosition(GAME_W / 2, GAME_H / 2);
    this.invuln = true; this.player.setAlpha(0.5);
    this.time.delayedCall(900, () => { this.invuln = false; this.player.setAlpha(1); });
    this.tweens.add({ targets: this.fog, fillAlpha: ph.fogA, duration: 600 });
    this.fog.setFillStyle(ph.fog, this.fog.fillAlpha);
    if (this.shotTimer) this.shotTimer.remove();
    this.shotTimer = this.time.addEvent({ delay: this.beat, loop: true, callback: this._spawnWave, callbackScope: this });
    // 维持场上碎片数
    while (this.shards.countActive(true) < SHARDS_ON_FIELD) this._spawnShard();
    this._updateObjective();
    this.cameras.main.flash(280, 95, 230, 218, false);
  }

  _updateObjective() {
    const ph = PHASES[this.phase];
    window.GameHUD?.setObjective(`【${'一二三'[this.phase]}阶·${ph.name}】 走位躲弹(可躲掩体后)，点亮光碎片 ${this.score}/${WIN_SCORE}`);
  }

  _renderTileLayer(layerName, depth, collision) {
    const data = (TILEMAP_DATA.layers || {})[layerName];
    if (!data) return;
    const W = TILEMAP_DATA.width, TW = TILEMAP_DATA.tileWidth, TH = TILEMAP_DATA.tileHeight;
    data.forEach((id, i) => {
      if (!id) return;
      const x = (i % W) * TW + TW / 2;
      const y = Math.floor(i / W) * TH + TH / 2;
      const sp = this.add.image(x, y, `tile_${id}`).setDisplaySize(TW, TH).setDepth(depth);
      if (collision) { this.blocks.add(sp); sp.body.setSize(TW, TH); }
    });
  }

  _makeAnims() {
    const frames = ['pt0', 'pt1', 'pt2', 'pt1'];
    if (!this.anims.exists('geo_pulse'))
      this.anims.create({ key: 'geo_pulse', frames: frames.map(k => ({ key: k })), frameRate: 8, repeat: -1 });
  }

  _makeTextures() {
    const pt = (key, glowR, coreR) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(GLOW, 0.22); g.fillCircle(11, 11, glowR);
      g.fillStyle(GLOW, 1); g.fillTriangle(11, 3, 4, 18, 18, 18);
      g.fillStyle(0xffffff, 1); g.fillCircle(11, 12, coreR);
      g.generateTexture(key, 22, 22); g.destroy();
    };
    pt('pt0', 9, 2.2); pt('pt1', 11, 3.0); pt('pt2', 7, 1.8);

    let g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xc7d8ea, 1); g.fillRect(0, 0, 64, 64);
    g.lineStyle(3, INK, 1); g.strokeRect(2, 2, 60, 60);
    g.lineStyle(2, INK, 0.7);
    g.beginPath(); g.moveTo(32, 10); g.lineTo(54, 32); g.lineTo(32, 54); g.lineTo(10, 32); g.closePath(); g.strokePath();
    g.generateTexture('tile_1', 64, 64); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(3, INK, 1); g.strokeTriangle(11, 2, 2, 20, 20, 20);
    g.fillStyle(INK, 0.12); g.fillTriangle(11, 2, 2, 20, 20, 20);
    g.generateTexture('s_tri', 22, 22); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(3, INK, 1); g.strokeRect(2, 2, 16, 16);
    g.fillStyle(INK, 0.12); g.fillRect(2, 2, 16, 16);
    g.generateTexture('s_sq', 20, 20); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(3, INK, 1);
    g.beginPath(); g.moveTo(12, 1); g.lineTo(23, 12); g.lineTo(12, 23); g.lineTo(1, 12); g.closePath(); g.strokePath();
    g.generateTexture('s_dia', 24, 24); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(SHARD_C, 0.3); g.fillCircle(8, 8, 8);
    g.fillStyle(SHARD_C, 1); g.fillTriangle(8, 1, 2, 14, 14, 14);
    g.fillStyle(0xffffff, 1); g.fillCircle(8, 9, 2);
    g.generateTexture('shard', 16, 16); g.destroy();
  }

  _spawnShard() {
    // 避开掩体与边缘
    let x, y, tries = 0;
    do { x = Phaser.Math.Between(70, GAME_W - 70); y = Phaser.Math.Between(70, GAME_H - 70); tries++; }
    while (tries < 12 && this.blocks.getChildren().some(b => Math.abs(b.x - x) < 50 && Math.abs(b.y - y) < 50));
    const s = this.shards.create(x, y, 'shard'); s.setDepth(12);
    this.tweens.add({ targets: s, scale: 1.25, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  _spawnWave() {
    if (!this.gameStarted || this.gameOver || this.cardActive) return;
    const n = 1 + this.phase + Math.floor((this.score % 5) / 3);
    const tex = ['s_tri', 's_sq', 's_dia'];
    for (let i = 0; i < n; i++) {
      const edge = Phaser.Math.Between(0, 3);
      let x, y;
      if (edge === 0) { x = Phaser.Math.Between(0, GAME_W); y = -20; }
      else if (edge === 1) { x = GAME_W + 20; y = Phaser.Math.Between(0, GAME_H); }
      else if (edge === 2) { x = Phaser.Math.Between(0, GAME_W); y = GAME_H + 20; }
      else { x = -20; y = Phaser.Math.Between(0, GAME_H); }
      const s = this.shots.create(x, y, Phaser.Utils.Array.GetRandom(tex));
      s.setDepth(14); s.body.setCircle(8, (s.width - 16) / 2, (s.height - 16) / 2);
      let ang;
      if (Phaser.Math.Between(0, 1) === 0) ang = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
      else ang = Phaser.Math.Angle.Between(x, y, GAME_W - x, GAME_H - y);
      const spd = this.spd + this.score * 3 + Phaser.Math.Between(-20, 35);
      this.physics.velocityFromRotation(ang, spd, s.body.velocity);
      s.setAngularVelocity(Phaser.Math.Between(-180, 180));
    }
  }

  _collect(player, shard) {
    if (!this.gameStarted || this.gameOver || this.cardActive) return;
    shard.destroy(); this.score++;
    window.GameHUD?.setScore(this.score);
    const f = this.add.circle(shard.x, shard.y, 6, SHARD_C, 0.9).setDepth(30);
    this.tweens.add({ targets: f, scale: 3.5, alpha: 0, duration: 350, onComplete: () => f.destroy() });
    this.pulse.setPosition(this.player.x, this.player.y).setScale(0.3);
    this.tweens.add({ targets: this.pulse, scale: 3, duration: 400, ease: 'Quad.out' });

    if (this.score >= WIN_SCORE) { this._win(); return; }
    // 阶段推进
    const newPhase = this.score < 5 ? 0 : this.score < 10 ? 1 : 2;
    if (newPhase > this.phase) {
      this.gameStarted = false;
      const ph = PHASES[newPhase];
      this._showCard(ph.intro[0], ph.intro[1], () => this._enterPhase(newPhase, true));
      return;
    }
    this._updateObjective();
    this._spawnShard();
  }

  _hit(player, shot) {
    if (!this.gameStarted || this.gameOver || this.invuln || this.cardActive) return;
    shot.destroy();
    this.hp = Math.max(0, this.hp - 1);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this.invuln = true; this.player.setAlpha(0.35); this.cameras.main.shake(120, 0.008);
    this.time.delayedCall(900, () => { this.invuln = false; this.player.setAlpha(1); });
    if (this.hp <= 0) {
      this.deaths++;
      if (this.deaths >= DEATH_BUDGET) { this._lose(); return; }
      this.gameStarted = false;
      this.hp = this.maxHp; window.GameHUD?.setHearts(this.hp, this.maxHp);
      this._showCard('光点重凝',
        `光点被弹幕击碎，又在蓝图中央重新凝聚。\n（第 ${this.deaths}/${DEATH_BUDGET} 次，已点亮的光碎片仍在）`,
        () => this._enterPhase(this.phase, true));
    }
  }

  _win() {
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0); if (this.shotTimer) this.shotTimer.remove();
    this.shots.clear(true, true);
    this._showCard('重 绘',
      '第 15 枚光碎片归位，崩解的线条逆向重连，\n浅蓝蓝图重新铺满璀璨的几何秩序，虚空退散——\n宇宙，被这最后一个光点重新画亮。',
      () => window.GameHUD?.showGameOver(true, '十五枚光碎片归位，几何宇宙被重新画亮。'));
  }

  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0); if (this.shotTimer) this.shotTimer.remove();
    window.GameHUD?.showGameOver(false, '光点被虚空彻底击碎，蓝图上最后一抹亮光熄灭……');
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

const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#dce8f2',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: GeoStormScene,
};

new Phaser.Game(config);
