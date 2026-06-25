/* Coalesce — §4B 原型分割；方法体逐字保留。 */
class CoalesceScene extends Phaser.Scene {
  constructor() { super('CoalesceScene'); }


  create() {
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    this.vol = 4;
    this.hp = MAX_HP;
    this.act = 0;
    this.invuln = 0;
    this.gameStarted = false;
    this.gameOver = false;
    this.cardActive = false;
    this._pendingCardCb = null;
    this._t = 0;
    this.checkpoint = CHECKPOINTS[0];
    this._coyote = 0; this._jumpBuf = 0; this._jumpHeld = false;

    this._drawWorld();
    this.gfx = this.add.graphics().setDepth(10);
    this.hudGfx = this.add.graphics().setScrollFactor(0).setDepth(30);
    this.cardGfx = null;

    // 玩家（自管 AABB；贴左出生）
    this.player = { x: 80, y: FLOOR_Y - 40, vx: 0, vy: 0, r: this._rFor(this.vol), onGround: false };
    this.damBroken = false;

    this.drops = DROPS.map(d => ({ ...d, taken: false, ph: Math.random() * 6.28 }));

    this.cursors = this.input.keyboard.createCursorKeys();
    this.kkeys = this.input.keyboard.addKeys('W,A,S,D,SPACE,ENTER');

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        window.GameHUD.setHearts(this.hp, MAX_HP);
        window.GameHUD.setScore(Math.min(this.vol, WIN_VOL));
        this.gameStarted = true;
        this._enterAct(0, false);
      });
    }

    this._auto = !!(navigator.webdriver);
    this._exposeState();
  }


  update(_t, dms) {
    const dt = Math.min(dms, 50) / 1000;
    this._t += dt;
    if (this.invuln > 0) this.invuln -= dt;

    const playing = this.gameStarted && !this.gameOver && !this.cardActive;
    if (!playing) { this.player.vx = 0; this._render(); return; }

    // 输入
    let left, right, up, down;
    if (this._auto) {
      const a = this._autoInput();
      left = a.left; right = a.right; up = a.up; down = a.down;
    } else {
      left = this.cursors.left.isDown || this.kkeys.A.isDown;
      right = this.cursors.right.isDown || this.kkeys.D.isDown;
      up = this.cursors.up.isDown || this.kkeys.W.isDown || this.kkeys.SPACE.isDown;
      down = this.cursors.down.isDown || this.kkeys.S.isDown;
    }

    const p = this.player;
    p.vx = (right ? MOVE_SPD : 0) - (left ? MOVE_SPD : 0);

    // 起跳：coyote 宽限 + 落地前缓冲 + 可变跳高（越小跳越高，短按矮跳）
    const jumpPressed = up && !this._jumpHeld;
    const jumpReleased = !up && this._jumpHeld;
    this._jumpHeld = up;
    this._coyote = p.onGround ? COYOTE : Math.max(0, this._coyote - dt);
    this._jumpBuf = jumpPressed ? JUMP_BUF : Math.max(0, this._jumpBuf - dt);
    if (this._jumpBuf > 0 && this._coyote > 0) {
      p.vy = -Phaser.Math.Clamp(720 - p.r * 7, 360, 600);
      p.onGround = false; this._coyote = 0; this._jumpBuf = 0;
    }
    if (jumpReleased && p.vy < 0) p.vy *= JUMP_CUT;

    if (down) { this._setVol(this.vol - SHRINK_RATE * dt); if (Math.random() < 0.25) this._splash(p.x, p.y + p.r * 0.5, WATER, 1); }

    this._physics(dt);

    // 吸墨滴
    for (const d of this.drops) {
      if (d.taken) continue;
      if (Math.hypot(d.x - p.x, d.y - p.y) < p.r + 9) { d.taken = true; this._setVol(this.vol + 1); this._splash(d.x, d.y, FOOD, 4); }
    }

    // 浊墨水洼
    for (const h of HAZARDS) {
      if (p.x + p.r > h.x - h.w / 2 && p.x - p.r < h.x + h.w / 2 && p.y + p.r > h.y - h.h && p.y - p.r < h.y + h.h) { this._hurt('murky'); break; }
    }

    // 撞坝（够大 + 接触）
    if (!this.damBroken && p.r >= BREAK_R) {
      if (p.x + p.r > DAM.x - 4 && p.x - p.r < DAM.x + DAM.w + 4 && p.y + p.r > DAM.y && p.y - p.r < DAM.y + DAM.h) {
        this.damBroken = true;
        this._splash(DAM.x + DAM.w / 2, DAM.y + DAM.h / 2, DAM_C, 24);
        this._splash(DAM.x + DAM.w / 2, DAM.y + DAM.h / 2, WATER, 20);
        this.time.delayedCall(450, () => this._win());
      }
    }

    // 掉出世界 → 损血回检查点
    if (p.y > GAME_H + 40) this._hurt('fall');

    // 段落推进
    if (this.act < ACTS.length - 1 && p.x > ACTS[this.act + 1].x) {
      const next = this.act + 1;
      this.gameStarted = false;
      this._showCard(ACTS[next].intro[0], ACTS[next].intro[1], () => { this.gameStarted = true; this._enterAct(next, false); });
    }
    this.checkpoint = this._checkpointFor(p.x);

    // 相机跟随
    this.cameras.main.scrollX = Phaser.Math.Clamp(p.x - GAME_W / 2, 0, WORLD_W - GAME_W);

    this._render();
  }


  _exposeState() {
    const self = this;
    window.__gameState = { player: this.player };

    window.__probe = () => {
      const p = self.player;
      const x = p.x;
      const needJump = p.onGround && inZone(x, AUTO_JUMP_ZONES);
      const crouch = inZone(x, [AUTO_SLIT]);
      return {
        x: p.x, y: p.y, topdown: false,
        nextGoalX: DAM.x, cellX: WORLD_W,
        onGround: p.onGround, needJump, crouch,
        dangerNow: false, dangerAhead: false,
        hp: self.hp, maxHp: MAX_HP,
        score: Math.min(self.vol, WIN_VOL), goalScore: WIN_VOL, act: self.act, phase: self.act,
        deaths: MAX_HP - self.hp, deathBudget: MAX_HP,
        won: self.gameOver && self.damBroken,
        lost: self.gameOver && !self.damBroken,
        cardActive: self.cardActive, started: self.gameStarted,
      };
    };
    window.__advanceCard = () => self._advanceCard();
  }
}
