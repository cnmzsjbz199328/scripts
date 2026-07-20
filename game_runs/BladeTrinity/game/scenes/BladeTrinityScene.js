/* BladeTrinity — 场景核心：装载图集、建动画、探针、主循环调度。
 * 方法体分散在 systems/*.js（MIGRATION.md §4B 原型分割）。 */

class BladeTrinityScene extends Phaser.Scene {
  constructor() { super('BladeTrinityScene'); }

  preload() {
    // 三张图集都是 6 行 × 21 列，192×208/格
    for (const id of BT.ROSTER) {
      this.load.spritesheet(id, `assets/sprites/${id}.webp`,
        { frameWidth: BT.FRAME_W, frameHeight: BT.FRAME_H });
    }
  }

  create() {
    this._buildStage();

    // ── 建动画：帧号 = row * 列数 + i（不足 21 列的行尾部是透明填充，不要越界取）──
    for (const id of BT.ROSTER) {
      const atlas = BT.ATLAS[id];
      const cols = atlas.dimensions.width / BT.FRAME_W;
      for (const [act, a] of Object.entries(atlas.animations)) {
        const key = `${id}_${act}`;
        if (this.anims.exists(key)) continue;
        const cfg = BT.ANIM[act] || { fps: 12, loop: false };
        const fps = act === 'attack' ? BT.ATTACK[id].fps : cfg.fps;
        this.anims.create({
          key, frameRate: fps, repeat: cfg.loop ? -1 : 0,
          frames: Array.from({ length: a.frameCount },
            (_, i) => ({ key: id, frame: a.row * cols + i })),
        });
      }
    }

    // 地面直接用世界下边界，不建 collider。
    // 命中框底部（offset 160 + 高 224 = 384 ≈ 脚底基线 202×1.9）正好等于脚底，
    // 所以 body 贴住下边界时脚就踩在台面上；blocked.down 也照常可用于跳跃判定。
    this.physics.world.setBounds(0, 0, BT.GAME_W, BT.FLOOR_Y);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,J,K,L,SPACE,ENTER');

    this.phase = 'select';
    this._buildSelect();
    if (window.GameHUD) window.GameHUD.onStart(() => { });
    window.__scene = this;

    // ── game-playtest 探针 ──
    // 沿用 ShadowArena 的格斗版契约：select 阶段逐 tick 自动选人开打，
    // fight 阶段报 inRange/attack 让俯视 bot 能逼近并出招。
    window.__probe = () => {
      if (this.phase === 'select') {
        this._selectConfirm();
        return {
          x: 0, y: 0, vx: 0, onGround: true, hp: 1, maxHp: 1,
          score: 0, goalScore: 1, act: 0, deaths: 0, deathBudget: 1,
          won: false, lost: false, cardActive: false, started: false,
          nextGoalX: 0, worldW: BT.GAME_W, cellX: BT.GAME_W,
          moveX: 0, moveY: 0, attack: false, dangerNow: false, dangerAhead: false,
        };
      }
      const a = this.p1, e = this.p2;
      if (!a || !e) return null;
      const sp = a.sprite, dx = e.sprite.x - sp.x, dist = Math.abs(dx);
      const inRange = dist < a.def.reach + 6;
      return {
        x: sp.x, y: sp.y, vx: sp.body.velocity.x, onGround: sp.body.blocked.down,
        hp: a.hp, maxHp: a.maxHp,
        score: e.maxHp - e.hp, goalScore: e.maxHp,
        act: 1, deaths: 0, deathBudget: 1,
        won: !!this._won, lost: !!this._lost,
        cardActive: false, started: this.phase === 'fight',
        nextGoalX: e.sprite.x, worldW: BT.GAME_W, cellX: BT.GAME_W,
        moveX: inRange ? 0 : Math.sign(dx), moveY: 0, attack: inRange,
        dangerNow: false, dangerAhead: false,
      };
    };
  }

  update(time) {
    if (this.phase === 'select') {
      if (Phaser.Input.Keyboard.JustDown(this.keys.A) ||
          Phaser.Input.Keyboard.JustDown(this.cursors.left)) this._selectMove(-1);
      if (Phaser.Input.Keyboard.JustDown(this.keys.D) ||
          Phaser.Input.Keyboard.JustDown(this.cursors.right)) this._selectMove(1);
      if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
          Phaser.Input.Keyboard.JustDown(this.keys.J) ||
          Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) this._selectConfirm();
      return;
    }
    if (this.phase === 'over') { this._fighterPhysics(); return; }
    if (this.phase !== 'fight') return;

    this._faceEachOther();
    this._controlPlayer(time);
    this._controlAI(time);
    for (const f of this.fighters) this._tickDefense(f, time);
    for (const f of this.fighters) this._resolveMelee(f);
    for (const f of this.fighters) {
      if (!['attack', 'hurt', 'stun'].includes(f.state) || time <= f.stateUntil) continue;
      // 起身反击：AI 的受击硬直一结束就立刻可以决策，不等随机间隔。
      // 没有这条，对手连打时 AI 每次刚能动又被打回硬直 —— playtest 里
      // 表现为 bot 满血 8 秒通关。
      if (f === this.p2 && f.state === 'hurt') this.aiNext = 0;
      this._setState(f, 'idle');
    }
    this._fighterPhysics();
  }
}
