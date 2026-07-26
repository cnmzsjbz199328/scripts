/* BladeTrinity — 场景核心：装载图集、建动画、探针、主循环调度。
 * 方法体分散在 systems/*.js（MIGRATION.md §4B 原型分割）。 */

class BladeTrinityScene extends Phaser.Scene {
  constructor() { super('BladeTrinityScene'); }

  preload() {
    // 三张图集都是 7 行 × 21 列，192×208/格（第 7 行 jump 起跳姿态）。
    // 帧数由图片尺寸自动切分，动画按 atlases.js 的 row/frameCount 取。
    for (const id of BT.ROSTER) {
      this.load.spritesheet(id, `assets/sprites/${id}.webp`,
        { frameWidth: BT.FRAME_W, frameHeight: BT.FRAME_H });
    }
    // 背景三层。manifest 由 tools/process-bg.mjs 生成（缺哪张就不在表里），
    // 据此跳过缺图的层，而不是让 Phaser 去 404。
    // 一场一景：两套背景全预载（BG_SETS），不能只载 BT.BG 那一套 —— 第 2 场会开天窗
    const have = window.BLADE_BG || [];
    for (const layers of Object.values(BT.BG_SETS)) {
      for (const l of layers) {
        if (l.animFrames) {
          // 动态层：序列帧各自是独立纹理（不拼图集——1012×569 横排 14 帧远超
          // 4096 的 GPU 纹理宽度上限，网格拼法又要多一层坐标换算，不值得）
          for (let i = 0; i < l.animFrames; i++) {
            const k = `${l.key}_a${i}`;
            if (have.includes(`${k}.webp`)) this.load.image(k, `assets/bg/${k}.webp`);
          }
        } else if (have.includes(`${l.key}.webp`)) {
          this.load.image(l.key, `assets/bg/${l.key}.webp`);
        }
      }
    }

    // 装载前景物理落叶资源 (3 种树叶 x 9 帧渐变)
    for (const sp of ['maple', 'oak', 'ginkgo']) {
      for (let i = 0; i < 9; i++) {
        this.load.image(`skill_${sp}_${i}`, `assets/leaves/skill_${sp}_${i}.png`);
      }
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
        // BT.CLIP 截掉行尾（如剑神 guard 后半段自己转身 180° 的镜像帧）
        const n = Math.min(BT.CLIP[key] || a.frameCount, a.frameCount);
        this.anims.create({
          key, frameRate: fps, repeat: cfg.loop ? -1 : 0,
          frames: Array.from({ length: n },
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
    // ?tier=shang|sheng|wang|di|shen —— playtest / 直链指定起始难度档（选人屏默认王级）
    const tp = new URLSearchParams(location.search).get('tier');
    if (tp && BT.TIERS.order.includes(tp)) this.selTier = BT.TIERS.order.indexOf(tp);
    this._buildSelect();
    if (this._refreshTier) this._refreshTier();
    this._buildRestartBtn();      // 结束后鼠标悬停才浮出的半透明 ↻（restart.js）
    if (this._initForegroundPhysics) this._initForegroundPhysics();
    if (window.GameHUD) window.GameHUD.onStart(() => { });
    window.__scene = this;

    // ⚠️「剥夺剑界」必须挂 POST_UPDATE，不能放在 update() 里。本体副本要和真身【严格同帧】，
    // 而 Arcade 物理是在 update() 之后才移动 body 的 —— 在 update() 里定位副本，渲染时
    // 真身已经又走了一帧，画面上就是"彩色副本和灰色真身错开一段"的重影（实测约 30px）。
    // 去饱和圆心同理，也要用物理结算后的位置。
    //
    // 幻剑的分身同挂这里，同一个理由：分身要贴着本体走（本体挥刀时有 130px 的前冲步），
    // 在 update() 里定位就恒定落后一个物理步，三个身位的间距会跟着速度忽宽忽窄。
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, () => {
      if (this.phase === 'fight' || this.realm) this._realmTick(this.time.now);
      if (this.phase === 'fight') for (const f of this.fighters) this._tickPhantom(f, this.time.now);
    });

    // 「剥夺剑界」表现层的验收钩子（机制未接，见 systems/realm.js 顶部）。
    // 给截图/人眼验收用：__realmDemo() 起界，__realmMirror() 打一记倒影劈砍。
    window.__realmDemo = (who) => {
      const f = who === 'p2' ? this.p2 : this.p1;
      if (f) this._realmStart(f, this.time.now);
      return !!this.realm;
    };
    window.__realmMirror = () => {
      const atk = this.realm && this.realm.owner === this.p1 ? this.p2 : this.p1;
      if (atk) this._mirrorStrike(atk);
    };

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
      // ── 敌方遥测：让 bot 能【读招反应】而非盲动（旧探针只给自己的状态）──
      const now = this.time.now;
      const eA = BT.ATTACK[e.id], eStart = (e.atkFrom || 0) - eA.from;
      const oppAttacking = e.state === 'attack';
      // 假动作段：北神 0~feint 有动作无判定，此时不该被骗去防御
      const oppFeint = oppAttacking && eA.feint > 0 && now < eStart + eA.feint;
      // 起手：出招了但命中判定还没到（防御的反应窗口）；active：正在命中窗口内
      const oppStartup = oppAttacking && now < (e.atkFrom || 0) && !oppFeint;
      const oppActive = oppAttacking && now >= (e.atkFrom || 0) && now <= (e.atkTo || 0);
      // 我方防御此刻是否可用（北神反击有冷却；其余看能否行动）
      // ⚠️ brace/parry 必须【落地】才起得了防：_controlPlayer 里那一支带 onGround 条件。
      // 探针漏掉这条就是在骗 bot —— 它腾空时被告知"可以防"，按下 S 什么也没发生，
      // 于是防御与会心两条演出在 playtest 里长期为 0（实测起手帧里有 6~8 帧玩家在空中）。
      const canAct = ['idle', 'walk', 'guard', 'jump'].includes(a.state);
      const onGround = sp.body.blocked.down;
      // canDefend 的语义是【此刻按防御键有意义吗】——bot 就是拿它决定要不要按 S 的。
      // 三派统一为长按态后这里不再分流派：条件就是"能行动且落地"。
      const canDefend = canAct && onGround;
      return {
        x: sp.x, y: sp.y, vx: sp.body.velocity.x, onGround: sp.body.blocked.down,
        hp: a.hp, maxHp: a.maxHp,
        mp: a.mp, maxMp: a.maxMp,
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
        // ── 敌方遥测（bot 反应式打法的依据）──
        oppState: e.state, oppDist: dist, oppHp: e.hp, oppMaxHp: e.maxHp,
        oppStartup, oppActive, oppFeint, oppCharging: !!e.charging,
        // 当前套路名（routine.js）：playtest 据此断言高档 AI 真的把套路打出来了
        oppRoutine: e.rt ? e.rt.id : null,
        // ── 我方能力现状 ──
        myDef: a.def.defense, canDefend, myReach: a.def.reach,
        tier: this.curTierId || null, tierName: (this.curTier && this.curTier.name) || null,
        // ── 技能覆盖度（整局累计触发次数）：playtest 断言 bot 用没用全 ──
        usage: this._usage ? Object.assign({}, this._usage) : null,
      };
    };
  }

  update(time, delta) {
    this._tickRestartBtn();       // 各 phase 都要跑：它自己按 phase 决定显不显
    if (this.phase === 'select') {
      if (Phaser.Input.Keyboard.JustDown(this.keys.A) ||
          Phaser.Input.Keyboard.JustDown(this.cursors.left)) this._selectMove(-1);
      if (Phaser.Input.Keyboard.JustDown(this.keys.D) ||
          Phaser.Input.Keyboard.JustDown(this.cursors.right)) this._selectMove(1);
      // ↑/↓（或 W/S）调难度档：往上=更难，往下=更易
      if (Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
          Phaser.Input.Keyboard.JustDown(this.keys.W)) this._tierMove(1);
      if (Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
          Phaser.Input.Keyboard.JustDown(this.keys.S)) this._tierMove(-1);
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
    if (this._updateForegroundPhysics) this._updateForegroundPhysics(time, delta);
    this._prevTime = time;
  }
}
