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
    // 背景三层。manifest 由 tools/process-bg.mjs 生成（缺哪张就不在表里），
    // 据此跳过缺图的层，而不是让 Phaser 去 404。
    const have = window.BLADE_BG || [];
    for (const l of BT.BG) {
      if (have.includes(`${l.key}.webp`)) this.load.image(l.key, `assets/bg/${l.key}.webp`);
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
      const fighting = this.phase === 'fight';   // interlude/over 时 bot 应待机
      const sp = a.sprite, dx = e.sprite.x - sp.x, dist = Math.abs(dx);
      const inRange = fighting && dist < a.def.reach + 6;
      return {
        x: sp.x, y: sp.y, vx: sp.body.velocity.x, onGround: sp.body.blocked.down,
        hp: a.hp, maxHp: a.maxHp,
        score: e.maxHp - e.hp, goalScore: e.maxHp,
        // act = 当前第几场擂台；deathBudget/deaths 沿用单命契约（玩家倒下即 lost）
        act: (this.round || 0) + 1, deaths: 0, deathBudget: 1,
        won: !!this._won, lost: !!this._lost,
        cardActive: false, started: fighting,
        // nextGoalX 填对手坐标。试过改成"自己的交战位置"（reach*0.8 处）让 bot
        // 停在射程边缘，六局全输 —— bot 站住不动后反而被 AI 压着打。
        nextGoalX: fighting ? e.sprite.x : sp.x, worldW: BT.GAME_W, cellX: BT.GAME_W,
        // attack 保持"在射程内就报 true"：Phaser 的 JustDown 事件会留到下一次
        // update 才被读取，密集按反而更容易卡到可行动的那一帧。
        // 试过改成只在 _canAct 时上报，bot 胜率反而从 3/5 掉到 2/6。
        moveX: !fighting ? 0 : inRange ? 0 : Math.sign(dx), moveY: 0, attack: inRange,
        dangerNow: false, dangerAhead: false,
      };
    };
  }

  update(time, delta) {
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
    // over / interlude：战斗逻辑停摆，只让物理把倒地/站立姿态收干净
    if (this.phase === 'over' || this.phase === 'interlude') { this._fighterPhysics(); return; }
    if (this.phase !== 'fight') return;

    // 蓝随时间回复（用户定：计时回复，不靠打中/防御）
    for (const f of this.fighters) f.mp = Math.min(f.maxMp, f.mp + BT.MP.regen * delta / 1000);
    this._drawBars();

    this._faceEachOther();
    this._controlPlayer(time);
    // 供 _resolveMelee 做时间轴扫掠用（低帧率下窗口可能整个夹在两帧之间）
    if (this._prevTime === undefined) this._prevTime = time;
    this._controlAI(time);
    for (const f of this.fighters) this._tickDefense(f, time);
    for (const f of this.fighters) this._resolveMelee(f);
    for (const f of this.fighters) this._tickSwingQi(f, time);   // 轨迹驱动：剑气贴刀相位→脱手
    this._tickQi(time, delta);          // 剑气飞行 + 命中/反弹/穿过结算
    for (const f of this.fighters) {
      if (!['attack', 'hurt', 'stun'].includes(f.state) || time <= f.stateUntil) continue;
      // 起身反击：AI 的受击硬直一结束就立刻可以决策，不等随机间隔。
      // 没有这条，对手连打时 AI 每次刚能动又被打回硬直 —— playtest 里
      // 表现为 bot 满血 8 秒通关。
      if (f === this.p2 && f.state === 'hurt') this.aiNext = 0;
      this._setState(f, 'idle');
    }
    this._fighterPhysics();
    this._prevTime = time;
  }
}
