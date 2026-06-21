/* ShadowArena — 影斗：剪影格斗场（全 SVG）
 * 黎明明亮舞台 + 黑色剪影武者一对一对战。可选己方与对手角色。
 * 角色/投射物/舞台全部 SVG（assets/svg），Phaser load.svg → 纹理 → 帧动画。
 */

const GAME_W = 960;
const GAME_H = 540;
const FLOOR_Y = 452;           // 角色脚底基准线
const GRAVITY = 1500;

// 角色数据（外形由 SVG 区分；数值/必杀各异）
const CHARS = {
  samurai: { name: '武士', hp: 100, speed: 155, reach: 80, punch: 9, kick: 13, special: 'dash', spDmg: 22, accent: '#e6c862' },
  ninja:   { name: '影忍', hp: 88,  speed: 205, reach: 60, punch: 7, kick: 10, special: 'shuriken', spDmg: 14, accent: '#7fd0ff' },
  monk:    { name: '武僧', hp: 108, speed: 150, reach: 64, punch: 8, kick: 12, special: 'qi', spDmg: 18, accent: '#9fe6c4' },
  brawler: { name: '力士', hp: 132, speed: 120, reach: 72, punch: 12, kick: 16, special: 'shock', spDmg: 24, accent: '#ff9466' },
};
const ROSTER = ['samurai', 'ninja', 'monk', 'brawler'];
const POSE_KEYS = ['idle_0', 'idle_1', 'walk_0', 'walk_1', 'punch', 'kick', 'block', 'hurt', 'special_0', 'special_1', 'ko'];
const FRAME_W = 220, FRAME_H = 184, SCALE = 0.62;

class ShadowArenaScene extends Phaser.Scene {
  constructor() { super('ShadowArenaScene'); }

  preload() {
    this.load.svg('stage', 'assets/svg/stage.svg', { width: GAME_W, height: GAME_H });
    this.load.svg('shuriken', 'assets/svg/shuriken.svg', { width: 24, height: 24 });
    this.load.svg('qiwave', 'assets/svg/qiwave.svg', { width: 44, height: 36 });
    for (const id of ROSTER)
      for (const k of POSE_KEYS)
        this.load.svg(`${id}_${k}`, `assets/svg/${id}_${k}.svg`, { width: FRAME_W, height: FRAME_H });
  }

  create() {
    this.add.image(0, 0, 'stage').setOrigin(0, 0).setDepth(-100);
    for (const id of ROSTER) {
      if (!this.anims.exists(`${id}_idle`))
        this.anims.create({ key: `${id}_idle`, frames: [{ key: `${id}_idle_0` }, { key: `${id}_idle_1` }], frameRate: 3, repeat: -1 });
      if (!this.anims.exists(`${id}_walk`))
        this.anims.create({ key: `${id}_walk`, frames: [{ key: `${id}_walk_0` }, { key: `${id}_walk_1` }], frameRate: 8, repeat: -1 });
    }

    // 地面碰撞
    this.floor = this.add.rectangle(GAME_W / 2, FLOOR_Y + 40, GAME_W, 80, 0x000000, 0);
    this.physics.add.existing(this.floor, true);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,J,K,L,SPACE,ENTER');

    this.phase = 'select';
    this.projectiles = this.physics.add.group({ allowGravity: false });
    this._buildSelect();

    if (window.GameHUD) window.GameHUD.onStart(() => { /* 已在 create 显示选人 */ });
  }

  // ─────────── 选人界面 ───────────
  _buildSelect() {
    this.selStep = 0;            // 0=选己方 1=选对手
    this.selCursor = [0, 1];     // 默认己方=武士 对手=影忍
    this.pick = [null, null];

    this.selGroup = this.add.container(0, 0).setDepth(50);
    const title = this.add.text(GAME_W / 2, 60, '选择你的武者', { fontFamily: 'Segoe UI, monospace', fontSize: '30px', color: '#3a2a1a', fontStyle: 'bold' }).setOrigin(0.5);
    const tip = this.add.text(GAME_W / 2, 500, 'A / D 选择   ·   SPACE / J 确认', { fontFamily: 'Segoe UI, monospace', fontSize: '18px', color: '#5a4632' }).setOrigin(0.5);
    this.selTitle = title;
    this.selGroup.add([title, tip]);

    // 四个角色立绘 + 名字
    this.selSprites = []; this.selNames = [];
    const gap = GAME_W / 4;
    ROSTER.forEach((id, i) => {
      const x = gap * i + gap / 2;
      const s = this.add.image(x, 300, `${id}_idle_0`).setScale(0.92);
      const n = this.add.text(x, 400, CHARS[id].name, { fontFamily: 'Segoe UI, monospace', fontSize: '22px', color: '#2a1c10', fontStyle: 'bold' }).setOrigin(0.5);
      const sp = this.add.text(x, 428, this._spName(CHARS[id].special), { fontFamily: 'Segoe UI, monospace', fontSize: '14px', color: '#6a5236' }).setOrigin(0.5);
      this.selSprites.push(s); this.selNames.push(n);
      this.selGroup.add([s, n, sp]);
    });

    // 两个选择光标框
    this.selBoxP1 = this.add.rectangle(0, 300, 180, 230).setStrokeStyle(5, 0x2563eb).setDepth(49);
    this.selBoxP2 = this.add.rectangle(0, 300, 168, 218).setStrokeStyle(5, 0xdc2626).setDepth(49).setVisible(false);
    this.selGroup.add([this.selBoxP1, this.selBoxP2]);
    this._refreshSelect();
  }

  _spName(t) { return { dash: '必杀·居合突进', shuriken: '必杀·手里剑', qi: '必杀·气功波', shock: '必杀·震地' }[t]; }

  _refreshSelect() {
    const gap = GAME_W / 4;
    const cx = i => gap * i + gap / 2;
    this.selBoxP1.setPosition(cx(this.selCursor[0]), 300);
    this.selBoxP2.setPosition(cx(this.selCursor[1]), 300);
    this.selBoxP2.setVisible(this.selStep >= 1);
    this.selTitle.setText(this.selStep === 0 ? '选择你的武者 (P1)' : '选择对手 (P2)');
    this.selSprites.forEach((s, i) => s.setAlpha(i === this.selCursor[this.selStep] ? 1 : 0.45));
  }

  _selectMove(dir) {
    if (this.phase !== 'select') return;
    this.selCursor[this.selStep] = Phaser.Math.Wrap(this.selCursor[this.selStep] + dir, 0, ROSTER.length);
    this._refreshSelect();
  }

  _selectConfirm() {
    if (this.phase !== 'select') return;
    this.pick[this.selStep] = ROSTER[this.selCursor[this.selStep]];
    if (this.selStep === 0) { this.selStep = 1; this._refreshSelect(); }
    else { this._startFight(this.pick[0], this.pick[1]); }
  }

  // ─────────── 对战 ───────────
  _startFight(p1Id, p2Id) {
    if (!CHARS[p1Id]) p1Id = 'samurai';
    if (!CHARS[p2Id]) p2Id = 'ninja';
    this.phase = 'fight';
    this.selGroup.destroy();

    this.p1 = this._makeFighter(p1Id, 250, false, false);
    this.p2 = this._makeFighter(p2Id, GAME_W - 250, true, true);
    this.fighters = [this.p1, this.p2];

    this.physics.add.collider(this.p1.sprite, this.floor);
    this.physics.add.collider(this.p2.sprite, this.floor);

    this._buildBars();
    window.__gameState = { player: this.p1.sprite };
    window.GameHUD?.setObjective(`${CHARS[p1Id].name} VS ${CHARS[p2Id].name}　—　击倒对手！(J 拳 K 腿 S 防 L 必杀)`);
    this.aiNext = 0;
  }

  _makeFighter(id, x, faceLeft, isAI) {
    const def = CHARS[id];
    const sp = this.physics.add.sprite(x, FLOOR_Y - 60, `${id}_idle_0`).setScale(SCALE);
    sp.body.setSize(46, 118).setOffset(FRAME_W / 2 - 23, 56);
    sp.setCollideWorldBounds(true);
    sp.setFlipX(faceLeft);
    sp.setDepth(10);
    sp.play(`${id}_idle`);
    return {
      id, def, sprite: sp, isAI,
      hp: def.hp, maxHp: def.hp,
      state: 'idle', stateUntil: 0, invuln: 0, atkHit: false, facingLeft: faceLeft,
    };
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
    // P1 左→右
    g.fillStyle(0x000000, 0.35); g.fillRect(40, y, W, H);
    g.fillStyle(0x2563eb, 1); g.fillRect(40, y, W * Phaser.Math.Clamp(this.p1.hp / this.p1.maxHp, 0, 1), H);
    g.lineStyle(2, 0x1a1208, 0.8); g.strokeRect(40, y, W, H);
    // P2 右→左
    g.fillStyle(0x000000, 0.35); g.fillRect(GAME_W - 40 - W, y, W, H);
    const w2 = W * Phaser.Math.Clamp(this.p2.hp / this.p2.maxHp, 0, 1);
    g.fillStyle(0xdc2626, 1); g.fillRect(GAME_W - 40 - w2, y, w2, H);
    g.lineStyle(2, 0x1a1208, 0.8); g.strokeRect(GAME_W - 40 - W, y, W, H);
  }

  _setState(f, st, dur) {
    f.state = st; f.stateUntil = this.time.now + dur; f.atkHit = false;
    if (st === 'idle') f.sprite.play(`${f.id}_idle`, true);
    else if (st === 'walk') f.sprite.play(`${f.id}_walk`, true);
    else { f.sprite.anims.stop(); f.sprite.setTexture(`${f.id}_${st === 'special' ? 'special_1' : st}`); }
  }

  _canAct(f) { return f.state === 'idle' || f.state === 'walk' || f.state === 'block'; }

  _attack(f, kind) {
    if (!this._canAct(f)) return;
    if (kind === 'special') { this._special(f); return; }
    this._setState(f, kind, kind === 'punch' ? 300 : 380);
    f.sprite.setVelocityX(0);
  }

  _special(f) {
    const sp = f.def.special, dir = f.facingLeft ? -1 : 1;
    this._setState(f, 'special', 520);
    if (sp === 'dash') {
      f.sprite.setVelocityX(420 * dir);
      this.time.delayedCall(260, () => { if (f.state === 'special') f.sprite.setVelocityX(0); });
    } else if (sp === 'shock') {
      this.time.delayedCall(180, () => this._shock(f, dir));
    } else {
      // 投射物
      this.time.delayedCall(160, () => this._spawnProjectile(f, dir, sp));
    }
  }

  _shock(f, dir) {
    const x = f.sprite.x + dir * 60;
    const ring = this.add.circle(x, FLOOR_Y - 6, 12, 0xff9466, 0.5).setDepth(20);
    this.tweens.add({ targets: ring, radius: 90, scale: 1, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
    const opp = this._opp(f);
    if (Math.abs(opp.sprite.x - x) < 110 && (opp.sprite.body.blocked.down)) this._hit(f, opp, f.def.spDmg, dir);
  }

  _spawnProjectile(f, dir, kind) {
    const tex = kind === 'shuriken' ? 'shuriken' : 'qiwave';
    const pr = this.projectiles.create(f.sprite.x + dir * 40, f.sprite.y - 8, tex).setDepth(20);
    pr.setVelocityX((kind === 'shuriken' ? 460 : 300) * dir);
    pr.body.setAllowGravity(false);
    pr.setData('owner', f); pr.setData('dmg', f.def.spDmg); pr.setData('dir', dir);
    if (kind === 'shuriken') pr.setAngularVelocity(720); else pr.setFlipX(dir < 0);
  }

  _opp(f) { return f === this.p1 ? this.p2 : this.p1; }

  _hit(attacker, target, dmg, dir) {
    if (this.time.now < target.invuln || target.state === 'ko') return;
    let dealt = dmg;
    const blocking = target.state === 'block' && (target.facingLeft !== (dir > 0)); // 面朝来袭方向
    if (blocking) dealt = Math.round(dmg * 0.2);
    target.hp = Math.max(0, target.hp - dealt);
    target.invuln = this.time.now + 350;
    this._drawBars();
    // 击退 + 受击特效
    target.sprite.setVelocity(dir * (blocking ? 80 : 200), -120);
    const fx = this.add.circle(target.sprite.x, target.sprite.y - 30, blocking ? 8 : 14, blocking ? 0x9fd0ff : 0xff5544, 0.85).setDepth(30);
    this.tweens.add({ targets: fx, scale: 2.2, alpha: 0, duration: 240, onComplete: () => fx.destroy() });
    this.cameras.main.shake(blocking ? 60 : 120, blocking ? 0.003 : 0.007);
    if (!blocking) this._setState(target, 'hurt', 300);
    if (target.hp <= 0) this._ko(target, attacker);
  }

  _ko(loser, winner) {
    loser.state = 'ko'; loser.stateUntil = Infinity;
    loser.sprite.anims.stop(); loser.sprite.setTexture(`${loser.id}_ko`); loser.sprite.setVelocityX(0);
    this.phase = 'over';
    const win = loser === this.p2;
    this.time.delayedCall(900, () => {
      window.GameHUD?.showGameOver(win,
        win ? `${CHARS[this.p1.id].name} 击败了 ${CHARS[this.p2.id].name}！晨光大盛，胜者的黑影在金色天光中挺立。`
            : `${CHARS[this.p2.id].name} 技高一筹，${CHARS[this.p1.id].name} 单膝跪地……再战一场？`);
    });
  }

  // ─────────── 每帧 ───────────
  update(time) {
    if (this.phase === 'select') {
      if (Phaser.Input.Keyboard.JustDown(this.keys.A) || Phaser.Input.Keyboard.JustDown(this.cursors.left)) this._selectMove(-1);
      if (Phaser.Input.Keyboard.JustDown(this.keys.D) || Phaser.Input.Keyboard.JustDown(this.cursors.right)) this._selectMove(1);
      if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.J) || Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) this._selectConfirm();
      return;
    }
    if (this.phase === 'over') { this._fighterPhysics(); return; }
    if (this.phase !== 'fight') return;

    // 朝向：始终面对对手
    this._faceEachOther();

    this._controlPlayer(time);
    this._controlAI(time);

    // 攻击命中判定（拳/腿/突进 的活跃窗口）
    for (const f of this.fighters) this._resolveMelee(f);

    // 状态超时 → 回到 idle
    for (const f of this.fighters) {
      if (['punch', 'kick', 'block', 'hurt', 'special'].includes(f.state) && time > f.stateUntil) this._setState(f, 'idle', 0);
    }

    this._projectiles();
    this._fighterPhysics();
  }

  _faceEachOther() {
    if (this.p1.sprite.x <= this.p2.sprite.x) { this.p1.facingLeft = false; this.p2.facingLeft = true; }
    else { this.p1.facingLeft = true; this.p2.facingLeft = false; }
    this.p1.sprite.setFlipX(this.p1.facingLeft);
    this.p2.sprite.setFlipX(this.p2.facingLeft);
  }

  _controlPlayer(time) {
    const f = this.p1, sp = f.sprite, onGround = sp.body.blocked.down;
    // 攻击输入
    if (Phaser.Input.Keyboard.JustDown(this.keys.J)) return this._attack(f, 'punch');
    if (Phaser.Input.Keyboard.JustDown(this.keys.K)) return this._attack(f, 'kick');
    if (Phaser.Input.Keyboard.JustDown(this.keys.L)) return this._attack(f, 'special');
    // 防御：按住 S 保持格挡
    if (this.keys.S.isDown && onGround && this._canAct(f)) {
      if (f.state !== 'block') this._setState(f, 'block', 1e9);
      sp.setVelocityX(0); return;
    }
    if (f.state === 'block') this._setState(f, 'idle', 0);
    if (!this._canAct(f)) return;
    // 移动
    const left = this.keys.A.isDown || this.cursors.left.isDown;
    const right = this.keys.D.isDown || this.cursors.right.isDown;
    if (left) sp.setVelocityX(-f.def.speed);
    else if (right) sp.setVelocityX(f.def.speed);
    else sp.setVelocityX(0);
    if ((this.keys.W.isDown || this.cursors.up.isDown) && onGround) sp.setVelocityY(-560);
    // 动画
    const moving = (left || right) && onGround;
    this._setState(f, moving ? 'walk' : 'idle', 0);
  }

  _controlAI(time) {
    const f = this.p2, sp = f.sprite, opp = this.p1, onGround = sp.body.blocked.down;
    if (!this._canAct(f)) return;
    const dx = opp.sprite.x - sp.x, dist = Math.abs(dx), dir = dx > 0 ? 1 : -1;
    if (dist > f.def.reach - 8) {
      sp.setVelocityX(f.def.speed * 0.8 * dir);
      this._setState(f, 'walk', 0);
    } else {
      sp.setVelocityX(0);
      if (time > this.aiNext) {
        this.aiNext = time + Phaser.Math.Between(500, 1100);
        const r = Math.random();
        if (r < 0.18) this._setState(f, 'block', Phaser.Math.Between(350, 700));
        else if (r < 0.40 && f.def.special !== 'dash') this._attack(f, 'special');
        else if (r < 0.45) this._attack(f, 'special');
        else if (r < 0.72) this._attack(f, 'punch');
        else this._attack(f, 'kick');
      } else this._setState(f, 'idle', 0);
    }
  }

  _resolveMelee(f) {
    // 近战命中：拳、腿、以及武士的居合突进(dash)。投射/震地另行判定。
    if (!((f.state === 'punch') || (f.state === 'kick') || (f.state === 'special' && f.def.special === 'dash'))) return;
    if (f.atkHit) return;
    // 活跃窗口：状态进行到一定时间后判定一次
    const opp = this._opp(f);
    const dir = f.facingLeft ? -1 : 1;
    const dx = opp.sprite.x - f.sprite.x;
    const reach = f.state === 'special' ? f.def.reach + 40 : f.def.reach;
    const dmg = f.state === 'punch' ? f.def.punch : f.state === 'kick' ? f.def.kick : f.def.spDmg;
    if (Math.sign(dx) === dir && Math.abs(dx) <= reach && Math.abs(opp.sprite.y - f.sprite.y) < 70) {
      f.atkHit = true;
      this._hit(f, opp, dmg, dir);
    }
  }

  _projectiles() {
    this.projectiles.getChildren().forEach(pr => {
      if (pr.x < -40 || pr.x > GAME_W + 40) { pr.destroy(); return; }
      const owner = pr.getData('owner'), opp = this._opp(owner);
      if (opp.state !== 'ko' && Math.abs(pr.x - opp.sprite.x) < 34 && Math.abs(pr.y - opp.sprite.y) < 70) {
        this._hit(owner, opp, pr.getData('dmg'), pr.getData('dir'));
        const burst = this.add.circle(pr.x, pr.y, 10, 0xffffff, 0.8).setDepth(31);
        this.tweens.add({ targets: burst, scale: 2.5, alpha: 0, duration: 220, onComplete: () => burst.destroy() });
        pr.destroy();
      }
    });
  }

  _fighterPhysics() {
    // 防止角色越过对方重叠太多（软分离）
    if (!this.p1 || !this.p2) return;
    const a = this.p1.sprite, b = this.p2.sprite;
    if (Math.abs(a.x - b.x) < 44 && Math.abs(a.y - b.y) < 80) {
      const push = (44 - Math.abs(a.x - b.x)) / 2;
      const s = a.x < b.x ? 1 : -1;
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
