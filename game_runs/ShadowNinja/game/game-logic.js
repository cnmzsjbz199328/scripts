/* ShadowNinja — 影忍：将军府之夜（短篇完整游戏版）
 * 剪影潜行 (silhouette stealth side-scroller)，三幕结构 + 叙事过场 + 检查点。
 *
 * demo → 短篇完整游戏的结构升级：
 *  · 开场卡 →【一幕·外院回廊】教学 →【二幕·中庭望楼】探照灯 →【三幕·内牢深处】高潮 → 结局卡
 *  · 检查点：被照中退回本幕起点（满血），不从头来；死亡预算耗尽才真正失败
 *  · 每幕彩色雾气叠层区分氛围（暖灯笼 / 冷探照 / 红火盆）
 *  · 剧情卡为画布内浮层，自包含
 *  · 玩法纵深：计时铁闸(逼迫卡节奏，绝不夹人) + 屋脊平台(纵向掩体) + 救人后警报逃脱高潮(师弟跟随)
 *  · 暴露 window.__probe()/__advanceCard() 供 autoplay 白盒自测（坐标/血量/幕/目标/危险/铁闸）
 *
 * 角色：逐帧 SVG（svg-sprite rig，姿态可控的剪影忍者，优雅低姿潜行）。地面 tilemap solid + 程序化近黑瓦片。
 */

const GAME_W = 960;
const GAME_H = 540;
const TILE = 64;
const WORLD_W = (TILEMAP_DATA.width || 75) * TILE;   // 4800
const WORLD_H = (TILEMAP_DATA.height || 9) * TILE;    // 576
const FLOOR_TOP = WORLD_H - 2 * TILE;                 // 448
// 出生点须高于地面，让角色体自由下落、干净落在瓦片顶面；
// 若出生时已嵌入地面，堆叠瓦片会把体卡到行间缝隙、横向被瓦片侧面挡死。
const SPAWN_Y = FLOOR_TOP - 60;

const PLAYER_SPEED = 200;
const CROUCH_SPEED = 95;
const JUMP_V = 480;
// 站立 / 匍匐两套碰撞体（共享同一脚底，切换不抬高/下沉精灵，避免抖动）
const BODY_STAND = { w: 46, h: 110, ox: 66, oy: 62 };  // 站立：体高，够得着门钥
const BODY_PRONE = { w: 46, h: 30,  ox: 66, oy: 142 }; // 匍匐：体极矮、贴地，够不着高处门钥
// 门钥悬挂高度：匍匐时够不着，须站起 / 跳起
const KEY_STAND_Y = 398;  // 站立可取
const KEY_JUMP_Y  = 330;  // 须跳起才取
const WARM = 0xffd27a;
const DEATH_BUDGET = 5;   // 死亡预算（耗尽才真正失败），检查点让每幕重来更友好

// 忍者 SVG 帧（须与 scratch/gen_ninja_svg.mjs 的 VB / 帧数一致）
const NJ_VB = { w: 178, h: 190 };
const NJ_FRAMES = { idle: 5, run: 6, crouch: 5, jump: 3, hurt: 3 };
const NJ_SCALE = 0.62;

// ── 三幕定义（沿同一横向世界推进）────────────────────────────
// startX：本幕检查点（被照中退回此处）；fog：本幕氛围色叠层
const ACTS = [
  { name: '外院回廊', startX: 60,   fog: 0x1a0f05, fogA: 0.0,
    intro: ['第一幕 · 外院回廊',
      '纸灯笼在回廊间投下摇曳的暖光，一名武士提灯定线巡逻。\n月隐于云——按住 S / ↓ 匍匐贴地，灯笼的光锥便照不穿你伏低的身形。\n但门钥悬在高处：待武士转身、光锥扫开，起身一把取下，随即重新伏低。'] },
  { name: '中庭望楼', startX: 1500, fog: 0x06121e, fogA: 0.18,
    intro: ['第二幕 · 中庭望楼',
      '望楼上的探照灯笼开始来回扫射，光柱与立柱的阴影交错。\n守卫更密了。看准光柱扫过的节奏，匍匐穿行；取高处门钥时须起身、甚至纵身跳起，动作要快。\n它们是打开最深处那道铁锁的唯一指望。'] },
  { name: '内牢深处', startX: 3150, fog: 0x1e0606, fogA: 0.22,
    intro: ['第三幕 · 内牢深处',
      '火盆的幽光映着铁栅，这里守备最密。\n师弟就关在尽头的牢笼里。\n集齐门钥，避开最后的光网，潜抵牢前——把他带回家。'] },
];

const GOAL_SCORE = 5;

// 巡逻守卫（灯笼光锥，蹲伏可避）
const GUARDS = [
  { x: 900,  range: 210 },                        // 一幕：单个，教学
  { x: 2050, range: 230 }, { x: 2850, range: 200 }, // 二幕
  { x: 3650, range: 200 }, { x: 4250, range: 170 }, // 三幕
];
// 望楼探照灯（扫射光柱，蹲伏可避）：二幕起
const LIGHTS = [1900, 2950, 3850];
// 门钥（5 把必拾，均在牢笼之前）。均悬于高处——匍匐够不着，须趁安全间隙起身/跳起。
// 刻意置于守卫光锥 / 探照光柱覆盖处：起身即暴露，必须卡准光照扫开的节奏。
const KEYS = [
  { x: 860,  y: KEY_STAND_Y },              // 一幕：武士灯笼旁，待其转身、起身速取（教学）
  { x: 1900, y: KEY_STAND_Y },              // 二幕：探照光柱下，趁扫开间隙起身
  { x: 2850, y: KEY_JUMP_Y, jump: true },   // 二幕：高悬铁闸前，须跳起够取
  { x: 3650, y: KEY_STAND_Y },              // 三幕：守卫巡线上起身取
  { x: 3850, y: KEY_JUMP_Y, jump: true },   // 三幕高潮：光网下纵身跃取
];
// 计时铁闸（周期开合，逼迫卡节奏等待——令"一路狂奔"行不通）。
// 开窗均 >=1.4s，保证停在门前的玩家/ bot 总能在一个开窗内稳过，绝不软锁。
const GATES = [
  { x: 1250, period: 2900, open: 1050, phase: 0 },
  { x: 2350, period: 3000, open: 1050, phase: 1400 },
  { x: 2900, period: 2800, open: 1000, phase: 700 },
  { x: 3550, period: 3000, open: 1050, phase: 1900 },
  { x: 4450, period: 2800, open: 1150, phase: 300 },  // 逃脱段
];
// 屋脊平台（剪影屋顶，可跳上作掩体；附 1 把可选奖励钥匙）
const PLATFORMS = [
  { x: 1700, y: FLOOR_TOP - 96,  w: 240 },
  { x: 3050, y: FLOOR_TOP - 116, w: 220 },
];
const CELL_X = 4150;            // 牢笼：集齐钥匙后到此救出师弟
const EXIT_X = WORLD_W - 60;    // 府门：救人后冲到此处逃离（高潮）

class ShadowNinjaScene extends Phaser.Scene {
  constructor() { super('ShadowNinjaScene'); }

  preload() {
    this.load.image('manor', 'scene/panorama.png');
    // 忍者改用逐帧 SVG（svg-sprite rig，姿态可控、剪影风统一）
    for (const [act, n] of Object.entries(NJ_FRAMES))
      for (let i = 0; i < n; i++)
        this.load.svg(`nj_${act}_${i}`, `assets/svg/nj_${act}_${i}.svg`, { width: NJ_VB.w, height: NJ_VB.h });
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H + 200);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    this._makeTextures();

    this.bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'manor')
      .setOrigin(0, 0).setScrollFactor(0).setTileScale(GAME_H / 864, GAME_H / 864).setDepth(-100);

    // 每幕氛围雾气叠层（固定屏幕，按幕切色）
    this.fog = this.add.rectangle(0, 0, GAME_W, GAME_H, ACTS[0].fog, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-50);

    // 瓦片地面（程序化近黑瓦片 + 碰撞）
    this.solids = this.physics.add.staticGroup();
    this._renderTileLayer('solid', 0, true);

    this._makeAnims();

    // 玩家忍者（贴左出生 + 世界边界）
    this.player = this.physics.add.sprite(ACTS[0].startX, SPAWN_Y, 'nj_idle_0');
    this.player.setScale(NJ_SCALE);
    this.player.body.setSize(BODY_STAND.w, BODY_STAND.h).setOffset(BODY_STAND.ox, BODY_STAND.oy); // 站立体，脚底≈帧底
    this._postureProne = false;
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(20);
    this.physics.add.collider(this.player, this.solids);
    this.player.play('nj_idle');

    // 门钥
    this.keys2 = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const k of KEYS) {
      const s = this.keys2.create(k.x, k.y, 'key'); s.setDepth(15);
      s.setData('jump', !!k.jump);
      this.tweens.add({ targets: s, y: k.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.physics.add.overlap(this.player, this.keys2, this._collect, null, this);

    // 守卫
    this.guards = [];
    for (const gd of GUARDS) {
      const s = this.physics.add.sprite(gd.x, FLOOR_TOP - 34, 'guard');
      s.setDepth(18); s.body.setSize(22, 46).setAllowGravity(false);
      s.setData('minX', gd.x - gd.range); s.setData('maxX', gd.x + gd.range);
      s.setData('dir', 1); s.setVelocityX(70);
      this.guards.push(s);
    }

    this.lights = LIGHTS.map((lx, i) => ({ x: lx, phase: i * 1.3 }));
    this.coneGfx = this.add.graphics().setDepth(9);

    // 屋脊平台（可跳上的掩体）
    this.platforms = this.physics.add.staticGroup();
    for (const pf of PLATFORMS) {
      const img = this.platforms.create(pf.x, pf.y, 'rooftop').setDepth(12);
      img.setDisplaySize(pf.w, 48).refreshBody();
    }
    this.physics.add.collider(this.player, this.platforms);
    // 平台上的可选奖励钥匙（bot 不取，纯人类奖励）
    const bonus = this.keys2.create(PLATFORMS[0].x, PLATFORMS[0].y - 34, 'key').setDepth(15);
    bonus.setData('bonus', true);
    this.tweens.add({ targets: bonus, y: bonus.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // 计时铁闸（周期开合的栅栏，逼迫卡节奏）
    this.gates = this.physics.add.staticGroup();
    this.gateList = GATES.map(gd => {
      const img = this.gates.create(gd.x, FLOOR_TOP - 67, 'gate').setDepth(14);
      img.refreshBody();
      return Object.assign({ img, openNow: false, isOpen: false }, gd);
    });
    this.physics.add.collider(this.player, this.gates);

    // 牢笼（救人点）
    this.goal = this.physics.add.staticImage(CELL_X, FLOOR_TOP - 36, 'cell').setDepth(15);
    this.physics.add.overlap(this.player, this.goal, this._reachCell, null, this);

    // 府门（逃脱终点，救人后才出现/生效）
    this.exit = this.physics.add.staticImage(EXIT_X, FLOOR_TOP - 50, 'cell').setDepth(15)
      .setTint(0x9ec5ff).setVisible(false);
    this.physics.add.overlap(this.player, this.exit, this._reachExit, null, this);

    // 师弟跟随影（救出后陪伴，纯装饰）
    this.friend = this.add.sprite(0, 0, 'nj_idle_0').setScale(NJ_SCALE).setDepth(19)
      .setAlpha(0).setTint(0x2a3a52);

    // 状态
    this.maxHp = 3; this.hp = 3; this.score = 0;
    this.actIdx = 0; this.deaths = 0;
    this.reachedCell = false; this.invuln = false; this.crouch = false;
    this.rescued = false; this.escaping = false; this.escaped = false;
    this.gameStarted = false; this.gameOver = false; this.cardActive = false;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.kkeys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(180, 200);

    this._buildCardLayer();
    this._exposeState();

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        window.GameHUD.setHearts(this.hp, this.maxHp);
        window.GameHUD.setScore(this.score);
        // 开场卡：进入第一幕
        this._showCard('影忍 · 将军府之夜',
          '今夜，是救出师弟的唯一机会。\n按住 ↓/S 匍匐前进，可隐于光照之下——但身姿太低，够不着高悬的门钥。\n须趁光照扫开的间隙起身、甚至纵身跳起，才能取下门钥。集齐 ' + GOAL_SCORE + ' 把，直抵牢笼。\n\n移动 ← → / A D   ·   匍匐 ↓ / S   ·   起跳 ↑ / W / SPACE   ·   继续 SPACE',
          () => this._enterAct(0, true));
      });
    }
  }

  // ── 叙事卡浮层 ──────────────────────────────────────────────
  _buildCardLayer() {
    this.cardBg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x05070d, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(200).setVisible(false);
    this.cardTitle = this.add.text(GAME_W / 2, 170, '', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '30px', color: '#ffd27a',
      align: 'center', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardBody = this.add.text(GAME_W / 2, 300, '', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '18px', color: '#cbd5e1',
      align: 'center', lineSpacing: 10, wordWrap: { width: 720 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardHint = this.add.text(GAME_W / 2, 470, '— 按 SPACE 继续 —', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#64748b' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
  }

  _showCard(title, body, cb) {
    this.cardActive = true;
    this._pendingCardCb = cb;
    this.player.setVelocity(0, 0);
    this.cardTitle.setText(title); this.cardBody.setText(body);
    [this.cardBg, this.cardTitle, this.cardBody, this.cardHint].forEach(o => o.setVisible(true));
    // 一次性推进：SPACE / ENTER / 指针
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

  // ── 进入某一幕（检查点 + 满血 + 氛围切换）────────────────────
  _enterAct(idx, isStart) {
    this.actIdx = idx;
    const act = ACTS[idx];
    this.checkpointX = act.startX;
    this.hp = this.maxHp;
    if (isStart) this.gameStarted = true;
    this.player.setVelocity(0, 0);
    this.player.setPosition(act.startX, SPAWN_Y);
    this.invuln = true; this.time.delayedCall(700, () => { this.invuln = false; });
    this.tweens.add({ targets: this.fog, fillAlpha: act.fogA, duration: 600 });
    this.fog.setFillStyle(act.fog, this.fog.fillAlpha); // 立即切色，alpha 由 tween 接管
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this._updateObjective();
    this.cameras.main.flash(300, 255, 210, 122, false);
  }

  _updateObjective() {
    if (this.escaping) { window.GameHUD?.setObjective('⚠ 警报大作！带师弟趁铁闸冲向府门逃离 →'); return; }
    const act = ACTS[this.actIdx];
    const tail = this.score >= GOAL_SCORE
      ? '门钥已集齐 → 潜抵尽头的牢笼救出师弟'
      : `拾门钥（${this.score}/${GOAL_SCORE}）：匍匐避光潜行，趁安全间隙起身/跳起取钥`;
    window.GameHUD?.setObjective(`【第${'一二三'[this.actIdx]}幕·${act.name}】 ${tail}`);
  }

  _updateGates(time) {
    const px = this.player.x;
    for (const g of this.gateList) {
      const timed = ((time + g.phase) % g.period) < g.open;  // 计时开窗
      const inDoorway = Math.abs(px - g.x) < 36;             // 玩家正在门口
      // 只有计时才能"开"；"关"在玩家离开门口前延迟——闸门绝不夹人/软锁，
      // 但关闭中的闸门仍实打实阻挡（计时挑战保留）。
      if (timed) g.isOpen = true;
      else if (!inDoorway) g.isOpen = false;
      g.openNow = g.isOpen;
      g.img.body.enable = !g.isOpen;
      g.img.setAlpha(g.isOpen ? 0.12 : 1);
    }
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
      if (collision) { this.solids.add(sp); sp.body.setSize(TW, TH); }
    });
  }

  _makeAnims() {
    const def = (act, fps, loop) => {
      const key = `nj_${act}`;
      if (this.anims.exists(key)) return;
      const frames = Array.from({ length: NJ_FRAMES[act] }, (_, i) => ({ key: `nj_${act}_${i}` }));
      this.anims.create({ key, frames, frameRate: fps, repeat: loop ? -1 : 0 });
    };
    def('idle', 7, true);
    def('run', 14, true);
    def('crouch', 7, true);
    def('jump', 8, false);
    def('hurt', 12, false);
  }

  _makeTextures() {
    let g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x05060c, 1); g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x0b0d16, 1);
    for (let i = 0; i < 18; i++) g.fillRect((i * 37) % 64, (i * 53) % 64, 3, 3);
    g.lineStyle(1, 0x10131f, 0.6); g.strokeRect(0, 0, 64, 64);
    g.generateTexture('tile_1', 64, 64); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x05060c, 1); g.fillCircle(14, 10, 8); g.fillRoundedRect(7, 16, 16, 24, 5);
    g.fillRect(7, 37, 6, 12); g.fillRect(16, 37, 6, 12);
    g.fillStyle(0x3a2a14, 1); g.fillRect(27, 18, 3, 14);
    g.fillStyle(WARM, 1); g.fillCircle(29, 34, 5);
    g.generateTexture('guard', 34, 50); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(WARM, 1); g.fillCircle(6, 6, 5);
    g.fillStyle(0x000000, 1); g.fillCircle(6, 6, 2);
    g.fillStyle(WARM, 1); g.fillRect(9, 5, 8, 3); g.fillRect(14, 8, 3, 4);
    g.generateTexture('key', 18, 18); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x05060c, 1); g.fillRect(0, 0, 60, 70);
    g.fillStyle(0x1a1410, 1); g.fillRect(6, 8, 48, 56);
    g.lineStyle(3, 0x000000, 1);
    for (let i = 0; i <= 48; i += 12) { g.beginPath(); g.moveTo(6 + i, 8); g.lineTo(6 + i, 64); g.strokePath(); }
    g.fillStyle(WARM, 0.7); g.fillCircle(30, 40, 6);
    g.generateTexture('cell', 60, 70); g.destroy();

    // 计时铁闸（栅栏剪影）
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x0a0c12, 1); g.fillRect(0, 0, 22, 134);
    g.fillStyle(0x171c27, 1);
    g.fillRect(0, 0, 22, 10); g.fillRect(0, 64, 22, 8);
    for (let i = 3; i < 22; i += 7) g.fillRect(i, 8, 3, 122);
    g.generateTexture('gate', 22, 134); g.destroy();

    // 屋脊（坡顶剪影，128×48）
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x05060c, 1);
    g.fillRect(0, 16, 128, 32);
    g.beginPath(); g.moveTo(0, 16); g.lineTo(64, 0); g.lineTo(128, 16); g.closePath(); g.fillPath();
    g.fillStyle(0x10131f, 1); g.fillRect(0, 14, 128, 4);
    g.generateTexture('rooftop', 128, 48); g.destroy();
  }

  _collect(player, key) {
    if (!this.gameStarted || this.gameOver || this.cardActive) return;
    key.destroy(); this.score++;
    window.GameHUD?.setScore(this.score);
    const f = this.add.circle(key.x, key.y, 5, WARM, 0.9).setDepth(30);
    this.tweens.add({ targets: f, scale: 3, alpha: 0, duration: 320, onComplete: () => f.destroy() });
    this._updateObjective();
  }

  _spotted() {
    if (this.invuln || this.gameOver || this.cardActive) return;
    this.hp = Math.max(0, this.hp - 1);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this.invuln = true;
    this.cameras.main.flash(180, 255, 120, 60); this.cameras.main.shake(140, 0.008);
    this.player.setVelocity(0, 0);
    if (this.hp <= 0) {
      this.deaths++;
      if (this.deaths >= DEATH_BUDGET) { this._lose(); return; }
      // 血量耗尽才退回本幕检查点，满血重来
      this._showCard('被发现了！',
        `警钟在回廊间回荡……影闪身退回阴影。\n（第 ${this.deaths}/${DEATH_BUDGET} 次失手，退回本幕起点重来）`,
        () => this._enterAct(this.actIdx, false));
    } else {
      // 被擦到：仅小幅击退 + 无敌帧，不退回检查点（避免反复回弹卡死）
      const back = Math.max(ACTS[this.actIdx].startX, this.player.x - 150);
      this.player.setPosition(back, SPAWN_Y);
      this.time.delayedCall(900, () => { this.invuln = false; });
    }
  }

  _reachCell() {
    if (!this.gameStarted || this.gameOver || this.rescued || this.cardActive) return;
    if (this.score >= GOAL_SCORE) this._startEscape();
    else window.GameHUD?.setObjective(`牢锁还需 ${GOAL_SCORE - this.score} 把门钥`);
  }

  // 高潮：救出师弟 → 警报 → 限时逃向府门
  _startEscape() {
    this.rescued = true; this.reachedCell = true;
    this.friend.setAlpha(0.85).setPosition(this.player.x - 34, this.player.y);
    this.exit.setVisible(true);
    this._showCard('救出师弟！',
      '铁锁应声而开，师弟跌出牢笼。\n开锁声惊动了守卫——警钟骤响，整座将军府正在苏醒！\n趁铁闸尚能穿过，带他冲向府门，逃离这里！',
      () => {
        this.escaping = true; this.gameStarted = true; this._updateObjective();
        this.cameras.main.shake(400, 0.012);
        // 警报：逃脱段增设扫射探照灯（蹲伏可避），避开铁闸候门点以免不公
        this.lights.push({ x: 4180, phase: 0.4 }, { x: 4620, phase: 1.2 });
      });
  }

  _reachExit() {
    if (!this.escaping || this.gameOver || this.cardActive) return;
    this._win();
  }

  _win() {
    this.gameOver = true; this.escaped = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    this._showCard('归 家',
      '两道黑影翻出府门，融入夜色，将军府的灯火在身后渐渐远去——\n师兄弟，平安归家。',
      () => window.GameHUD?.showGameOver(true, '师弟重获自由，师兄弟平安归家。'));
  }

  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(false, '一次次失手惊动了整座将军府，警钟长鸣，今夜的营救……功亏一篑。');
  }

  update(time) {
    if (this.bg) this.bg.tilePositionX = this.cameras.main.scrollX * 0.3;
    this._drawCones(time);
    if (this.gateList) this._updateGates(time);
    if (this.rescued) this._followFriend();
    if (this.cardActive || !this.gameStarted || this.gameOver) return;

    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    this.crouch = (this.cursors.down.isDown || this.kkeys.S.isDown) && onGround;
    this._applyPosture(this.crouch);

    const spd = this.crouch ? CROUCH_SPEED : PLAYER_SPEED;
    const left = this.cursors.left.isDown || this.kkeys.A.isDown;
    const right = this.cursors.right.isDown || this.kkeys.D.isDown;
    const jump = (this.cursors.up.isDown || this.kkeys.W.isDown || this.kkeys.SPACE.isDown) && !this.crouch;

    if (left) { this.player.setVelocityX(-spd); this.player.setFlipX(true); }
    else if (right) { this.player.setVelocityX(spd); this.player.setFlipX(false); }
    else this.player.setVelocityX(0);
    if (jump && onGround) this.player.setVelocityY(-JUMP_V);

    let anim;
    if (!onGround) anim = 'nj_jump';
    else if (this.crouch) anim = 'nj_crouch';
    else if (left || right) anim = 'nj_run';
    else anim = 'nj_idle';
    if (this.player.anims.currentAnim?.key !== anim) this.player.play(anim, true);

    this.guards.forEach(s => {
      let dir = s.getData('dir');
      if (s.x >= s.getData('maxX')) dir = -1; else if (s.x <= s.getData('minX')) dir = 1;
      s.setData('dir', dir); s.setVelocityX(70 * dir); s.setFlipX(dir < 0);
    });

    // 幕推进：跨过下一幕检查点 → 过场卡
    const nextIdx = this.actIdx + 1;
    if (nextIdx < ACTS.length && this.player.x >= ACTS[nextIdx].startX) {
      const act = ACTS[nextIdx];
      this.gameStarted = false; // 暂停直到卡片推进
      this._showCard(act.intro[0], act.intro[1], () => this._enterAct(nextIdx, true));
      return;
    }

    // 危险判定（蹲伏 = 隐身，不被察觉）
    if (!this.crouch && !this.invuln) {
      if (this._dangerAt(this.player.x, this.player.y, time)) this._spotted();
    }
  }

  // 站立 / 匍匐碰撞体切换（共享脚底，不抖动）。匍匐体极矮 → 够不着高处门钥。
  _applyPosture(prone) {
    if (prone === this._postureProne) return;
    this._postureProne = prone;
    const b = prone ? BODY_PRONE : BODY_STAND;
    this.player.body.setSize(b.w, b.h).setOffset(b.ox, b.oy);
  }

  _followFriend() {
    const f = this.friend, p = this.player;
    const tx = p.x - (p.flipX ? -36 : 36);
    f.x += (tx - f.x) * 0.16; f.y += (p.y - f.y) * 0.22;
    f.setFlipX(p.flipX);
    const key = p.anims.currentAnim?.key || 'nj_idle';
    if (f.anims.currentAnim?.key !== key) f.play(key, true);
  }

  // 给定世界坐标在 time 时刻是否处于任一光锥/光柱内（蹲伏可避）
  _dangerAt(px, py, time) {
    for (const s of this.guards) if (this._coneHit(s, px, py)) return true;
    for (const l of this.lights) if (this._beamHit(l, time, px, py)) return true;
    return false;
  }

  _guardCone(s) {
    const dir = s.getData('dir') ?? 1;
    const ex = s.x + dir * 10, ey = s.y - 6;
    const len = 230, half = 60;
    return new Phaser.Geom.Triangle(ex, ey, ex + dir * len, ey - half, ex + dir * len, ey + half);
  }
  _beamTri(l, time) {
    const sx = l.x, sy = 40;
    const sweep = Math.sin(time / 700 + l.phase) * 120;
    const cx = sx + sweep, spread = 70;
    return new Phaser.Geom.Triangle(sx, sy, cx - spread, FLOOR_TOP, cx + spread, FLOOR_TOP);
  }
  _coneHit(s, px, py) { return Phaser.Geom.Triangle.ContainsPoint(this._guardCone(s), new Phaser.Geom.Point(px, py)); }
  _beamHit(l, time, px, py) { return Phaser.Geom.Triangle.ContainsPoint(this._beamTri(l, time), new Phaser.Geom.Point(px, py)); }

  _drawCones(time) {
    const g = this.coneGfx; g.clear();
    this.guards.forEach(s => {
      const t = this._guardCone(s);
      g.fillStyle(WARM, 0.12); g.fillTriangleShape(t);
      g.lineStyle(1, WARM, 0.25); g.strokeTriangleShape(t);
    });
    // 探照灯仅在已进入的幕（二幕起）显示，避免一幕教学被干扰
    if (this.actIdx >= 1) {
      this.lights.forEach(l => { g.fillStyle(0xfff0c0, 0.10); g.fillTriangleShape(this._beamTri(l, time)); });
    }
  }

  // ── 暴露状态给 verify / autoplay 白盒自测 ───────────────────
  _exposeState() {
    const self = this;
    window.__gameState = { player: this.player };
    // 最近的必拾门钥（未集齐时），bot 据此对位、起身/跳起拾取
    const nearestKey = () => {
      if (self.score >= GOAL_SCORE) return null;
      let best = null, bestD = Infinity;
      self.keys2.getChildren().forEach(k => {
        if (k.active && !k.getData('bonus')) {
          const d = k.x - self.player.x;
          if (d > -24 && Math.abs(d) < bestD) { bestD = Math.abs(d); best = k; }
        }
      });
      return best;
    };
    // 下一目标 x：未集齐则最近未拾门钥，否则牢笼
    const nextGoalX = () => {
      if (self.escaping) return EXIT_X;
      const k = nearestKey();
      return k ? k.x : CELL_X;
    };
    // 前方是否有"关闭中的铁闸"挡路（bot 据此停下等待开启）
    const gateWaitX = () => {
      if (!self.gateList) return null;
      for (const g of self.gateList) {
        const d = g.x - self.player.x;
        if (d > 6 && d < 170 && !g.openNow) return g.x;
      }
      return null;
    };
    window.__probe = () => {
      const p = self.player, t = self.time.now;
      const onGround = p.body.blocked.down || p.body.touching.down;
      const nk = nearestKey();
      return {
        x: p.x, y: p.y, vx: p.body.velocity.x, onGround,
        hp: self.hp, maxHp: self.maxHp, act: self.actIdx, score: self.score, goalScore: GOAL_SCORE,
        deaths: self.deaths, deathBudget: DEATH_BUDGET,
        won: self.gameOver && self.escaped, lost: self.gameOver && !self.escaped,
        cardActive: self.cardActive, started: self.gameStarted,
        rescued: self.rescued, escaping: self.escaping,
        nextGoalX: nextGoalX(), worldW: WORLD_W, cellX: CELL_X, exitX: EXIT_X,
        // 站立时此刻是否危险 / 前方一步是否危险（蹲伏可免）
        dangerNow: self._dangerAt(p.x, p.y, t),
        dangerAhead: self._dangerAt(p.x + 90, p.y, t) || self._dangerAt(p.x + 160, p.y, t),
        gateWaitX: gateWaitX(),   // 非 null = 前方铁闸关闭，应停下等待
        crouch: self.crouch,
        // 起身够钥机制：匍匐够不着高悬门钥，须对位后趁安全间隙起身/跳起拾取
        keyX: nk ? nk.x : null,
        keyNeedJump: nk ? !!nk.getData('jump') : false,
        atKey: nk ? Math.abs(nk.x - p.x) < 16 : false,  // 已对准门钥正下方
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
  backgroundColor: '#0a0e1a',
  physics: { default: 'arcade', arcade: { gravity: { y: 1100 }, debug: false } },
  scene: ShadowNinjaScene,
};

new Phaser.Game(config);
