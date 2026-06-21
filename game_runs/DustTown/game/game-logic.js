/* DustTown — 尘镇：新警长（短篇完整游戏版）
 * 西部俯视叙事探索 (western top-down-rpg). scene/panorama.png 作小镇地图。
 *
 * demo → 短篇完整游戏的结构升级（叙事 RPG 用"章节"推进）：
 *  · 开场卡 →【一章·尘土主街】走访 →【二章·后巷】打手凶悍 →【三章·法庭广场】护卫高潮 → 结局卡
 *  · 死亡预算：被打倒退回镇口(证词保留)，预算耗尽才落败
 *  · 章节递进：打手提速/增援；证词即叙事(对话框逐条揭示卡特帮黑幕)
 *  · 暴露 window.__probe()(俯视 moveX/moveY 走位 + interact 倾听)供白盒自测
 */

const GAME_W = 960;
const GAME_H = 540;
const MAP_W = 1280;
const MAP_H = 1280;
const PLAYER_SPEED = 190;
const WIN_SCORE = 5;
const DEATH_BUDGET = 4;
const SPAWN = { x: 70, y: 70 };

const NPCS = [
  { name: '杂货店老板', x: 300, y: 300, line: '卡特帮每月来收“保护费”……前任警长就是在查账本时不见的。' },
  { name: '牧师',       x: 820, y: 270, line: '我在教堂后看见他们半夜埋了样东西，愿主宽恕我没敢声张。' },
  { name: '铁匠',       x: 340, y: 820, line: '他们逼我改枪管。枪身刻着卡特的狼头记号，错不了。' },
  { name: '酒馆女招待', x: 900, y: 880, line: '头目卡特喝醉时漏的嘴——前警长的徽章还锁在他保险柜里。' },
  { name: '受惊的男孩', x: 620, y: 560, line: '那天夜里……是我看见谁开的枪。我可以作证，警长女士。' },
];
const THUGS = [
  { x: 520, y: 420, axis: 'x', range: 220 },
  { x: 760, y: 700, axis: 'y', range: 200 },
  { x: 380, y: 980, axis: 'x', range: 180 },
];
// 三章护卫增援（按章激活）：二章 +1、三章法庭前 +2
const REINFORCE = [
  { x: 900, y: 520, axis: 'y', range: 220, ch: 1 },
  { x: 1080, y: 320, axis: 'y', range: 180, ch: 2 },
  { x: 980, y: 220, axis: 'x', range: 160, ch: 2 },
];
const COURT = { x: 1120, y: 160, r: 70 };

const CHAPTERS = [
  { name: '尘土主街', upTo: 2, thug: 80,
    intro: ['第一章 · 尘土主街',
      '新警长杰西·摩根接管了枯井镇。前任警长离奇失踪，卡特帮盘踞已久。\nWASD / 方向键 走动，走到镇民身边按 E 倾听证词。\n挨家走访，撬开颤抖的镇民紧闭的嘴。'] },
  { name: '后巷', upTo: 4, thug: 110,
    intro: ['第二章 · 后巷',
      '卡特帮察觉了杰西的调查，打手在街巷里游荡得更凶。\n关键证人藏在危险的后巷深处——\n撞上打手就是一顿毒打，绕开他们的巡逻线。'] },
  { name: '法庭广场', upTo: 5, thug: 140,
    intro: ['第三章 · 法庭广场',
      '最后一份证词到手，但卡特帮已在法庭前布下重兵。\n带着铁证，突破护卫，推开法庭大门——\n把真相，钉上法庭的门。'] },
];

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

  _addThug(t) {
    const s = this.thugs.create(t.x, t.y, 'thug');
    s.setDepth(16); s.body.setCircle(13, 3, 3); s.setImmovable(true);
    s.setData('home', { x: t.x, y: t.y }); s.setData('axis', t.axis); s.setData('range', t.range); s.setData('dir', 1);
    return s;
  }

  _buildCardLayer() {
    this.cardBg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x140c05, 0.9).setOrigin(0, 0).setScrollFactor(0).setDepth(200).setVisible(false);
    this.cardTitle = this.add.text(GAME_W / 2, 160, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '30px', color: '#e8c84a', align: 'center', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardBody = this.add.text(GAME_W / 2, 290, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '18px', color: '#e9dcc4', align: 'center', lineSpacing: 10, wordWrap: { width: 720 } }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardHint = this.add.text(GAME_W / 2, 460, '— 按 SPACE 继续 —', { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#8a7a55' }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
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

  _enterChapter(idx, isStart) {
    this.chapter = idx;
    const ch = CHAPTERS[idx];
    this.thugSpeed = ch.thug;
    if (isStart) this.gameStarted = true;
    // 章节增援
    REINFORCE.filter(r => r.ch === idx).forEach(r => this._addThug(r));
    // 回到安全（镇口附近）+ 短暂无敌
    this.player.setVelocity(0, 0);
    this.invuln = true; this.player.setTint(0xffe0a0);
    this.time.delayedCall(800, () => { this.invuln = false; this.player.clearTint(); });
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this._updateObjective();
    this.cameras.main.flash(280, 232, 200, 120, false);
  }

  _updateObjective() {
    const ch = CHAPTERS[this.chapter];
    const tail = this.score >= WIN_SCORE
      ? '证词已集齐 → 突破护卫，冲进法庭(金色旗标) →'
      : `走访镇民按 E 倾听，收集证词 ${this.score}/${WIN_SCORE}`;
    window.GameHUD?.setObjective(`【第${'一二三'[this.chapter]}章·${ch.name}】 ${tail}`);
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
      if (collision) { this.covers.add(sp); sp.body.setSize(TW, TH); }
    });
  }

  _makeAnims() {
    const def = (key, row, fps, loop) => {
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers('sheriff', { start: row * 9, end: row * 9 + 8 }), frameRate: fps, repeat: loop ? -1 : 0 });
    };
    def('sh_idle', 0, 8, true);
    def('sh_walk', 1, 12, true);
  }

  _makeTextures() {
    let g;
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x6b5536, 1); g.fillCircle(14, 14, 12);
    g.fillStyle(0xcdb182, 1); g.fillCircle(14, 11, 5);
    g.generateTexture('npc', 28, 28); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x2a1410, 1); g.fillCircle(15, 15, 13);
    g.fillStyle(0x7a2a1a, 1); g.fillCircle(15, 15, 7);
    g.fillStyle(0x000000, 1); g.fillCircle(15, 12, 2.5);
    g.generateTexture('thug', 30, 30); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x6b4a26, 1); g.fillRect(12, 6, 4, 32);
    g.fillStyle(0xe8c84a, 1); g.fillTriangle(16, 6, 16, 22, 30, 14);
    g.generateTexture('court', 28, 40); g.destroy();
  }

  _buildDialogue() {
    const w = 760, h = 96, x = (GAME_W - w) / 2, y = GAME_H - h - 18;
    this.dlgBg = this.add.graphics().setScrollFactor(0).setDepth(50).setVisible(false);
    this.dlgBg.fillStyle(0x1a120a, 0.92); this.dlgBg.fillRoundedRect(x, y, w, h, 10);
    this.dlgBg.lineStyle(2, 0xe8c84a, 0.8); this.dlgBg.strokeRoundedRect(x, y, w, h, 10);
    this.dlgName = this.add.text(x + 18, y + 12, '', { fontFamily: 'Segoe UI, monospace', fontSize: '16px', color: '#e8c84a', fontStyle: 'bold' }).setScrollFactor(0).setDepth(51).setVisible(false);
    this.dlgText = this.add.text(x + 18, y + 40, '', { fontFamily: 'Segoe UI, monospace', fontSize: '15px', color: '#f3ead6', wordWrap: { width: w - 36 } }).setScrollFactor(0).setDepth(51).setVisible(false);
  }

  _showDialogue(name, line) {
    this.dlgBg.setVisible(true);
    this.dlgName.setText(name).setVisible(true);
    this.dlgText.setText(line).setVisible(true);
    if (this._dlgTimer) this._dlgTimer.remove();
    this._dlgTimer = this.time.delayedCall(4200, () => this._hideDialogue());
  }
  _hideDialogue() { this.dlgBg.setVisible(false); this.dlgName.setVisible(false); this.dlgText.setVisible(false); }

  _nearNpc() {
    let best = null, bestD = 60;
    this.npcs.getChildren().forEach(n => {
      if (n.getData('done')) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y);
      if (d < bestD) { bestD = d; best = n; }
    });
    return best;
  }

  _caught(player, thug) {
    if (!this.gameStarted || this.gameOver || this.invuln || this.cardActive) return;
    this.hp = Math.max(0, this.hp - 1);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    const ang = Phaser.Math.Angle.Between(thug.x, thug.y, this.player.x, this.player.y);
    this.player.setVelocity(Math.cos(ang) * 220, Math.sin(ang) * 220);
    this.invuln = true; this.player.setTint(0xff6644); this.cameras.main.shake(120, 0.006);
    this.time.delayedCall(800, () => { this.invuln = false; this.player.clearTint(); });
    if (this.hp <= 0) {
      this.deaths++;
      if (this.deaths >= DEATH_BUDGET) { this._lose(); return; }
      this.gameStarted = false;
      this.hp = this.maxHp; window.GameHUD?.setHearts(this.hp, this.maxHp);
      this._showCard('被打倒了',
        `打手把杰西打翻在尘土里……她抹掉嘴角的血，退回镇口。\n（第 ${this.deaths}/${DEATH_BUDGET} 次，已收集的证词仍在）`,
        () => { this.player.setPosition(SPAWN.x, SPAWN.y); this.gameStarted = true; this.invuln = true; this.player.setTint(0xffe0a0); this.time.delayedCall(800, () => { this.invuln = false; this.player.clearTint(); }); });
    }
  }

  _win() {
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    this._showCard('真相 · 落槌',
      '杰西推开法庭大门，把铁证拍在桌上。卡特帮的末日来临，\n枯井镇的人们第一次敢在阳光下抬起头——\n正义，回到了这片尘土。',
      () => window.GameHUD?.showGameOver(true, '铁证钉上法庭的门，卡特帮覆灭，正义回到枯井镇。'));
  }

  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(false, '杰西一次次被打倒在后巷，警徽滚落进尘土……枯井镇重归沉默。');
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

  _listen(npc) {
    npc.setData('done', true); npc.setTint(0x88cc88);
    this.score++; window.GameHUD?.setScore(this.score);
    const data = NPCS[npc.getData('idx')];
    this._showDialogue(data.name, data.line);
    this.prompt.setVisible(false);
    // 章节推进：一章 0-1 份、二章 2-4 份、三章 集齐 5 份(法庭高潮)
    const newCh = this.score < 2 ? 0 : this.score < WIN_SCORE ? 1 : 2;
    if (newCh > this.chapter) {
      this.gameStarted = false;
      const ch = CHAPTERS[newCh];
      this.time.delayedCall(900, () => this._showCard(ch.intro[0], ch.intro[1], () => this._enterChapter(newCh, true)));
      return;
    }
    this._updateObjective();
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

  _nearestUnvisited() {
    let best = null, bestD = 1e9;
    this.npcs.getChildren().forEach(n => {
      if (n.getData('done')) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y);
      if (d < bestD) { bestD = d; best = n; }
    });
    return best;
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#2a1a0e',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: DustTownScene,
};

new Phaser.Game(config);
