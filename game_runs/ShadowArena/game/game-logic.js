/* ShadowArena — 影斗：剪影格斗场（全 SVG · 多帧飘逸版）
 * 黎明明亮舞台 + 黑色剪影武者一对一对战。可选己方与对手角色。
 * 招式为多帧关键帧序列(预备→发力→过头→收招)，配刀光弧 / 残影拖尾 / 前冲步。
 */

const GAME_W = 960;
const GAME_H = 540;
const FLOOR_Y = 452;
const GRAVITY = 1500;

const CHARS = {
  samurai: { name: '武士', hp: 100, speed: 155, reach: 84, punch: 9, kick: 13, special: 'dash', spDmg: 22, accent: '#e6c862', sword: true },
  ninja:   { name: '影忍', hp: 88,  speed: 205, reach: 60, punch: 7, kick: 10, special: 'shuriken', spDmg: 14, accent: '#7fd0ff' },
  monk:    { name: '武僧', hp: 108, speed: 150, reach: 66, punch: 8, kick: 12, special: 'qi', spDmg: 18, accent: '#9fe6c4' },
  brawler: { name: '力士', hp: 132, speed: 120, reach: 74, punch: 12, kick: 16, special: 'shock', spDmg: 24, accent: '#ff9466' },
};
const ROSTER = ['samurai', 'ninja', 'monk', 'brawler'];
// 各动作帧数（与生成器 SEQ 对应）
const ACT = {
  idle: { n: 4, fps: 4, loop: true },
  walk: { n: 6, fps: 10, loop: true },
  punch: { n: 11, fps: 34, loop: false, dur: 330, from: 110, to: 215, lunge: 120 },
  kick: { n: 11, fps: 30, loop: false, dur: 360, from: 150, to: 280, lunge: 60 },
  block: { n: 2, fps: 3, loop: true },
  hurt: { n: 3, fps: 14, loop: false, dur: 230 },
  special: { n: 6, fps: 15, loop: false, dur: 440 },
  ko: { n: 3, fps: 8, loop: false },
};
const FRAME_W = 236, FRAME_H = 188, SCALE = 0.62;

class ShadowArenaScene extends Phaser.Scene {
  constructor() { super('ShadowArenaScene'); }

  preload() {
    this.load.svg('stage', 'assets/svg/stage.svg', { width: GAME_W, height: GAME_H });
    this.load.svg('shuriken', 'assets/svg/shuriken.svg', { width: 24, height: 24 });
    this.load.svg('qiwave', 'assets/svg/qiwave.svg', { width: 44, height: 36 });
    for (const id of ROSTER)
      for (const [act, a] of Object.entries(ACT))
        for (let i = 0; i < a.n; i++)
          this.load.svg(`${id}_${act}_${i}`, `assets/svg/${id}_${act}_${i}.svg`, { width: FRAME_W, height: FRAME_H });
  }

  create() {
    this.add.image(0, 0, 'stage').setOrigin(0, 0).setDepth(-100);
    for (const id of ROSTER) {
      for (const [act, a] of Object.entries(ACT)) {
        const key = `${id}_${act}`;
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key, frameRate: a.fps, repeat: a.loop ? -1 : 0,
          frames: Array.from({ length: a.n }, (_, i) => ({ key: `${id}_${act}_${i}` })),
        });
      }
    }

    this.floor = this.add.rectangle(GAME_W / 2, FLOOR_Y + 40, GAME_W, 80, 0x000000, 0);
    this.physics.add.existing(this.floor, true);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,J,K,L,SPACE,ENTER');

    this.phase = 'select';
    this.projectiles = this.physics.add.group({ allowGravity: false });
    this._buildSelect();
    if (window.GameHUD) window.GameHUD.onStart(() => {});
  }

  // ─────────── 选人 ───────────
  _buildSelect() {
    this.selStep = 0; this.selCursor = [0, 1]; this.pick = [null, null];
    this.selGroup = this.add.container(0, 0).setDepth(50);
    this.selTitle = this.add.text(GAME_W / 2, 60, '选择你的武者 (P1)', { fontFamily: 'Segoe UI, monospace', fontSize: '30px', color: '#3a2a1a', fontStyle: 'bold' }).setOrigin(0.5);
    const tip = this.add.text(GAME_W / 2, 502, 'A / D 选择   ·   SPACE / J 确认', { fontFamily: 'Segoe UI, monospace', fontSize: '18px', color: '#5a4632' }).setOrigin(0.5);
    this.selGroup.add([this.selTitle, tip]);
    this.selSprites = [];
    const gap = GAME_W / 4;
    ROSTER.forEach((id, i) => {
      const x = gap * i + gap / 2;
      const s = this.add.image(x, 296, `${id}_idle_0`).setScale(0.9);
      const n = this.add.text(x, 398, CHARS[id].name, { fontFamily: 'Segoe UI, monospace', fontSize: '22px', color: '#2a1c10', fontStyle: 'bold' }).setOrigin(0.5);
      const sp = this.add.text(x, 426, this._spName(CHARS[id].special), { fontFamily: 'Segoe UI, monospace', fontSize: '14px', color: '#6a5236' }).setOrigin(0.5);
      this.selSprites.push(s); this.selGroup.add([s, n, sp]);
    });
    this.selBoxP1 = this.add.rectangle(0, 296, 184, 232).setStrokeStyle(5, 0x2563eb).setDepth(49);
    this.selBoxP2 = this.add.rectangle(0, 296, 170, 220).setStrokeStyle(5, 0xdc2626).setDepth(49).setVisible(false);
    this.selGroup.add([this.selBoxP1, this.selBoxP2]);
    this._refreshSelect();
  }
  _spName(t) { return { dash: '必杀·居合突进', shuriken: '必杀·手里剑', qi: '必杀·气功波', shock: '必杀·震地' }[t]; }
  _refreshSelect() {
    const gap = GAME_W / 4, cx = i => gap * i + gap / 2;
    this.selBoxP1.setPosition(cx(this.selCursor[0]), 296);
    this.selBoxP2.setPosition(cx(this.selCursor[1]), 296).setVisible(this.selStep >= 1);
    this.selTitle.setText(this.selStep === 0 ? '选择你的武者 (P1)' : '选择对手 (P2)');
    this.selSprites.forEach((s, i) => s.setAlpha(i === this.selCursor[this.selStep] ? 1 : 0.45));
  }
  _selectMove(d) { if (this.phase === 'select') { this.selCursor[this.selStep] = Phaser.Math.Wrap(this.selCursor[this.selStep] + d, 0, ROSTER.length); this._refreshSelect(); } }
  _selectConfirm() {
    if (this.phase !== 'select') return;
    this.pick[this.selStep] = ROSTER[this.selCursor[this.selStep]];
    if (this.selStep === 0) { this.selStep = 1; this._refreshSelect(); }
    else this._startFight(this.pick[0], this.pick[1]);
  }

  // ─────────── 对战 ───────────
  _startFight(p1Id, p2Id) {
    if (!CHARS[p1Id]) p1Id = 'samurai';
    if (!CHARS[p2Id]) p2Id = 'ninja';
    this.phase = 'fight';
    this.selGroup.destroy();
    this.p1 = this._makeFighter(p1Id, 250, false);
    this.p2 = this._makeFighter(p2Id, GAME_W - 250, true);
    this.fighters = [this.p1, this.p2];
    this.physics.add.collider(this.p1.sprite, this.floor);
    this.physics.add.collider(this.p2.sprite, this.floor);
    this._buildBars();
    window.__gameState = { player: this.p1.sprite };
    window.GameHUD?.setObjective(`${CHARS[p1Id].name} VS ${CHARS[p2Id].name}　—　击倒对手！(J 拳 K 腿 S 防 L 必杀)`);
    this.aiNext = 0;
  }

  _makeFighter(id, x, faceLeft) {
    const def = CHARS[id];
    const sp = this.physics.add.sprite(x, FLOOR_Y - 60, `${id}_idle_0`).setScale(SCALE);
    sp.body.setSize(46, 112).setOffset(FRAME_W / 2 - 23, 58);
    sp.setCollideWorldBounds(true); sp.setFlipX(faceLeft); sp.setDepth(10);
    sp.play(`${id}_idle`);
    return { id, def, sprite: sp, hp: def.hp, maxHp: def.hp, state: 'idle', stateUntil: 0, invuln: 0, atkFrom: 0, atkTo: 0, atkHit: false, facingLeft: faceLeft };
  }

  _buildBars() {
    this.barG = this.add.graphics().setScrollFactor(0).setDepth(60);
    this.add.text(40, 22, CHARS[this.p1.id].name, { fontFamily: 'Segoe UI, monospace', fontSize: '18px', color: '#1a1208', fontStyle: 'bold' }).setScrollFactor(0).setDepth(61);
    this.add.text(GAME_W - 40, 22, CHARS[this.p2.id].name, { fontFamily: 'Segoe UI, monospace', fontSize: '18px', color: '#1a1208', fontStyle: 'bold' }).setOrigin(1, 0).setScrollFactor(0).setDepth(61);
    this._drawBars();
  }
  _drawBars() {
    const g = this.barG; g.clear();
    const W = 380, H = 22, y = 46;
    g.fillStyle(0x000000, 0.35); g.fillRect(40, y, W, H);
    g.fillStyle(0x2563eb, 1); g.fillRect(40, y, W * Phaser.Math.Clamp(this.p1.hp / this.p1.maxHp, 0, 1), H);
    g.lineStyle(2, 0x1a1208, 0.8); g.strokeRect(40, y, W, H);
    g.fillStyle(0x000000, 0.35); g.fillRect(GAME_W - 40 - W, y, W, H);
    const w2 = W * Phaser.Math.Clamp(this.p2.hp / this.p2.maxHp, 0, 1);
    g.fillStyle(0xdc2626, 1); g.fillRect(GAME_W - 40 - w2, y, w2, H);
    g.lineStyle(2, 0x1a1208, 0.8); g.strokeRect(GAME_W - 40 - W, y, W, H);
  }

  _setState(f, st) {
    if (f.state === st && (st === 'idle' || st === 'walk' || st === 'block')) return;
    f.state = st;
    const a = ACT[st];
    f.stateUntil = a.dur ? this.time.now + a.dur : (a.loop ? 0 : this.time.now + (a.n / a.fps) * 1000);
    f.sprite.play(`${f.id}_${st}`, true);
  }
  _canAct(f) { return f.state === 'idle' || f.state === 'walk' || f.state === 'block'; }

  // 残影拖尾
  _ghost(f) {
    const g = this.add.image(f.sprite.x, f.sprite.y, f.sprite.texture.key)
      .setScale(SCALE).setFlipX(f.sprite.flipX).setDepth(9).setAlpha(0.4).setTint(0x4a6090);
    this.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
  }
  // 刀光弧
  _swordArc(f, dir) {
    const g = this.add.graphics().setDepth(24);
    g.lineStyle(7, 0xfff0c0, 0.6);
    g.beginPath();
    g.arc(f.sprite.x + dir * 10, f.sprite.y - 26, 62, dir > 0 ? rad(-55) : rad(125), dir > 0 ? rad(70) : rad(235), false);
    g.strokePath();
    g.lineStyle(3, 0xffffff, 0.8); g.beginPath();
    g.arc(f.sprite.x + dir * 10, f.sprite.y - 26, 62, dir > 0 ? rad(-55) : rad(125), dir > 0 ? rad(70) : rad(235), false);
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
    function rad(d) { return d * Math.PI / 180; }
  }

  _attack(f, kind) {
    if (!this._canAct(f)) return;
    if (kind === 'special') return this._special(f);
    const a = ACT[kind], dir = f.facingLeft ? -1 : 1;
    this._setState(f, kind);
    f.atkHit = false; f.atkFrom = this.time.now + a.from; f.atkTo = this.time.now + a.to;
    // 前冲步 + 残影
    this.time.delayedCall(a.from - 20, () => { if (f.state === kind) { f.sprite.setVelocityX(a.lunge * dir); this._ghost(f); } });
    this.time.delayedCall(a.from + 30, () => { if (f.state === kind) this._ghost(f); });
    if (f.def.sword && kind === 'punch') this.time.delayedCall(a.from, () => { if (f.state === kind) this._swordArc(f, dir); });
  }

  _special(f) {
    const sp = f.def.special, dir = f.facingLeft ? -1 : 1;
    this._setState(f, 'special');
    f.atkHit = false;
    // 残影连发，强调速度感
    for (const t of [180, 240, 300]) this.time.delayedCall(t, () => { if (f.state === 'special') this._ghost(f); });
    if (sp === 'dash') {
      f.atkFrom = this.time.now + 160; f.atkTo = this.time.now + 420;
      this.time.delayedCall(150, () => { if (f.state === 'special') { f.sprite.setVelocityX(440 * dir); this._swordArc(f, dir); } });
      this.time.delayedCall(420, () => { if (f.state === 'special') f.sprite.setVelocityX(0); });
    } else if (sp === 'shock') {
      this.time.delayedCall(220, () => this._shock(f, dir));
    } else {
      this.time.delayedCall(210, () => this._spawnProjectile(f, dir, sp));
    }
  }

  _shock(f, dir) {
    const x = f.sprite.x + dir * 60;
    const ring = this.add.circle(x, FLOOR_Y - 6, 12, 0xff9466, 0.5).setDepth(20);
    this.tweens.add({ targets: ring, radius: 95, scale: 1, alpha: 0, duration: 340, onComplete: () => ring.destroy() });
    const opp = this._opp(f);
    if (Math.abs(opp.sprite.x - x) < 115 && opp.sprite.body.blocked.down) this._hit(f, opp, f.def.spDmg, dir);
  }
  _spawnProjectile(f, dir, kind) {
    const tex = kind === 'shuriken' ? 'shuriken' : 'qiwave';
    const pr = this.projectiles.create(f.sprite.x + dir * 44, f.sprite.y - 8, tex).setDepth(20);
    pr.setVelocityX((kind === 'shuriken' ? 470 : 300) * dir);
    pr.body.setAllowGravity(false);
    pr.setData('owner', f); pr.setData('dmg', f.def.spDmg); pr.setData('dir', dir);
    if (kind === 'shuriken') pr.setAngularVelocity(760); else pr.setFlipX(dir < 0);
  }
  _opp(f) { return f === this.p1 ? this.p2 : this.p1; }

  _hit(attacker, target, dmg, dir) {
    if (this.time.now < target.invuln || target.state === 'ko') return;
    let dealt = dmg;
    const blocking = target.state === 'block' && (target.facingLeft !== (dir > 0));
    if (blocking) dealt = Math.round(dmg * 0.2);
    target.hp = Math.max(0, target.hp - dealt);
    target.invuln = this.time.now + 320;
    this._drawBars();
    target.sprite.setVelocity(dir * (blocking ? 80 : 210), -130);
    const fx = this.add.circle(target.sprite.x + dir * 8, target.sprite.y - 34, blocking ? 9 : 15, blocking ? 0x9fd0ff : 0xff5544, 0.9).setDepth(30);
    this.tweens.add({ targets: fx, scale: 2.4, alpha: 0, duration: 240, onComplete: () => fx.destroy() });
    this.cameras.main.shake(blocking ? 60 : 130, blocking ? 0.003 : 0.008);
    if (!blocking) this._setState(target, 'hurt');
    if (target.hp <= 0) this._ko(target);
  }

  _ko(loser) {
    loser.state = 'ko'; loser.stateUntil = Infinity;
    loser.sprite.play(`${loser.id}_ko`, true); loser.sprite.setVelocityX(0);
    this.phase = 'over';
    const win = loser === this.p2;
    this.time.delayedCall(950, () => {
      window.GameHUD?.showGameOver(win,
        win ? `${CHARS[this.p1.id].name} 击败了 ${CHARS[this.p2.id].name}！晨光大盛，胜者的黑影在金色天光中挺立。`
            : `${CHARS[this.p2.id].name} 技高一筹，${CHARS[this.p1.id].name} 单膝跪地……再战一场？`);
    });
  }

  update(time) {
    if (this.phase === 'select') {
      if (Phaser.Input.Keyboard.JustDown(this.keys.A) || Phaser.Input.Keyboard.JustDown(this.cursors.left)) this._selectMove(-1);
      if (Phaser.Input.Keyboard.JustDown(this.keys.D) || Phaser.Input.Keyboard.JustDown(this.cursors.right)) this._selectMove(1);
      if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.J) || Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) this._selectConfirm();
      return;
    }
    if (this.phase === 'over') { this._fighterPhysics(); return; }
    if (this.phase !== 'fight') return;

    this._faceEachOther();
    this._controlPlayer();
    this._controlAI(time);
    for (const f of this.fighters) this._resolveMelee(f);
    for (const f of this.fighters)
      if (['punch', 'kick', 'hurt', 'special'].includes(f.state) && time > f.stateUntil) this._setState(f, 'idle');
    this._projectiles();
    this._fighterPhysics();
  }

  _faceEachOther() {
    const left = this.p1.sprite.x > this.p2.sprite.x;
    this.p1.facingLeft = left; this.p2.facingLeft = !left;
    // 仅在可行动时翻转，避免攻击中朝向突变
    if (this._canAct(this.p1)) this.p1.sprite.setFlipX(this.p1.facingLeft);
    if (this._canAct(this.p2)) this.p2.sprite.setFlipX(this.p2.facingLeft);
  }

  _controlPlayer() {
    const f = this.p1, sp = f.sprite, onGround = sp.body.blocked.down;
    if (Phaser.Input.Keyboard.JustDown(this.keys.J)) return this._attack(f, 'punch');
    if (Phaser.Input.Keyboard.JustDown(this.keys.K)) return this._attack(f, 'kick');
    if (Phaser.Input.Keyboard.JustDown(this.keys.L)) return this._attack(f, 'special');
    if (this.keys.S.isDown && onGround && this._canAct(f)) { if (f.state !== 'block') this._setState(f, 'block'); sp.setVelocityX(0); return; }
    if (f.state === 'block') this._setState(f, 'idle');
    if (!this._canAct(f)) return;
    const left = this.keys.A.isDown || this.cursors.left.isDown;
    const right = this.keys.D.isDown || this.cursors.right.isDown;
    if (left) sp.setVelocityX(-f.def.speed);
    else if (right) sp.setVelocityX(f.def.speed);
    else sp.setVelocityX(0);
    if ((this.keys.W.isDown || this.cursors.up.isDown) && onGround) sp.setVelocityY(-580);
    this._setState(f, (left || right) && onGround ? 'walk' : 'idle');
  }

  _controlAI(time) {
    const f = this.p2, sp = f.sprite, opp = this.p1;
    if (!this._canAct(f)) return;
    const dx = opp.sprite.x - sp.x, dist = Math.abs(dx), dir = dx > 0 ? 1 : -1;
    if (dist > f.def.reach - 8) {
      sp.setVelocityX(f.def.speed * 0.85 * dir);
      this._setState(f, 'walk');
    } else {
      sp.setVelocityX(0);
      if (time > this.aiNext) {
        this.aiNext = time + Phaser.Math.Between(450, 1000);
        const r = Math.random();
        if (r < 0.18) this._setState(f, 'block');
        else if (r < 0.42) this._attack(f, 'special');
        else if (r < 0.72) this._attack(f, 'punch');
        else this._attack(f, 'kick');
      } else this._setState(f, 'idle');
    }
  }

  _resolveMelee(f) {
    if (!((f.state === 'punch') || (f.state === 'kick') || (f.state === 'special' && f.def.special === 'dash'))) return;
    if (f.atkHit || this.time.now < f.atkFrom || this.time.now > f.atkTo) return;
    const opp = this._opp(f), dir = f.facingLeft ? -1 : 1;
    const dx = opp.sprite.x - f.sprite.x;
    const reach = f.state === 'special' ? f.def.reach + 46 : f.state === 'kick' ? f.def.reach + 14 : f.def.reach;
    const dmg = f.state === 'punch' ? f.def.punch : f.state === 'kick' ? f.def.kick : f.def.spDmg;
    if (Math.sign(dx) === dir && Math.abs(dx) <= reach && Math.abs(opp.sprite.y - f.sprite.y) < 72) {
      f.atkHit = true; this._hit(f, opp, dmg, dir);
    }
  }

  _projectiles() {
    this.projectiles.getChildren().forEach(pr => {
      if (pr.x < -40 || pr.x > GAME_W + 40) { pr.destroy(); return; }
      const owner = pr.getData('owner'), opp = this._opp(owner);
      if (opp.state !== 'ko' && Math.abs(pr.x - opp.sprite.x) < 36 && Math.abs(pr.y - opp.sprite.y) < 72) {
        this._hit(owner, opp, pr.getData('dmg'), pr.getData('dir'));
        const burst = this.add.circle(pr.x, pr.y, 10, 0xffffff, 0.8).setDepth(31);
        this.tweens.add({ targets: burst, scale: 2.5, alpha: 0, duration: 220, onComplete: () => burst.destroy() });
        pr.destroy();
      }
    });
  }

  _fighterPhysics() {
    if (!this.p1 || !this.p2) return;
    const a = this.p1.sprite, b = this.p2.sprite;
    if (Math.abs(a.x - b.x) < 46 && Math.abs(a.y - b.y) < 80) {
      const push = (46 - Math.abs(a.x - b.x)) / 2, s = a.x < b.x ? 1 : -1;
      a.x -= push * s; b.x += push * s;
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: 'game-container',
  backgroundColor: '#bfe0f0',
  physics: { default: 'arcade', arcade: { gravity: { y: GRAVITY }, debug: false } },
  scene: ShadowArenaScene,
};

new Phaser.Game(config);
