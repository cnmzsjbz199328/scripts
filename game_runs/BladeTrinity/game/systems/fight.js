/* BladeTrinity — 开打 / 建角色 / 血条 / 舞台。 */
Object.assign(BladeTrinityScene.prototype, {

  // 选完自己流派进这里：把另两家流派排成擂台队列，依次打。
  _startGauntlet(p1Id) {
    if (!BT.SCHOOLS[p1Id]) p1Id = 'sword';
    this._p1Id = p1Id;
    this.round = 0;
    // 技能覆盖度计数（整局累计）：playtest 据此断言 bot 用没用全每一类技能。
    // arte = 玩家放了几次流派秘技；aiArte = 电脑放了几次（高档独占内容的验收口，
    // 见 arte.js _payArte —— 没有它就只能靠人眼数，而这招踩过无头计时坑）
    // realmSelfHit / realmDeprive：界内出手被弹回自己 / 界内会心被剥夺（见 realm.js）。
    // 这两个【越低越好】，和上面那些"用没用满"的覆盖度计数方向相反，别混着断言。
    this._usage = { attack: 0, charge: 0, defend: 0, crit: 0, blink: 0, jump: 0, arte: 0, aiArte: 0,
                    realmSelfHit: 0, realmDeprive: 0 };
    this.oppQueue = BT.ROSTER.filter((id) => id !== p1Id);   // 另两家，按 ROSTER 序
    this._applyTier();
    this._showStage(0);          // 重开也要回到第 1 场的室内道场
    this._startFight(p1Id, this.oppQueue[0]);
    this._roundToast();
  },

  // 擂台阶梯：选级 = 起始档，之后每过一场 +1 级（逐渐升级），到神级封顶。
  _applyTier() {
    const order = BT.TIERS.order;
    const start = this.selTier == null ? Math.max(0, order.indexOf(BT.TIER_DEFAULT)) : this.selTier;
    const idx = Math.min(order.length - 1, start + (this.round || 0));
    this.curTierId = order[idx];
    this.curTier = BT.TIERS[this.curTierId];
  },

  _startFight(p1Id, p2Id) {
    if (!BT.SCHOOLS[p1Id]) p1Id = 'sword';
    if (!BT.SCHOOLS[p2Id]) p2Id = 'water';
    this.phase = 'fight';
    if (this.selGroup) { this.selGroup.destroy(); this.selGroup = null; }

    this.p1 = this._makeFighter(p1Id, 268, false);
    this.p2 = this._makeFighter(p2Id, BT.GAME_W - 268, true);
    this.fighters = [this.p1, this.p2];

    this._buildBars();
    this._clearQi();
    window.__gameState = { player: this.p1.sprite };
    this._setFightObjective();
    this.aiNext = 0;
  },

  _setFightObjective() {
    const d = BT.SCHOOLS[this._p1Id].defense;
    const dk = d === 'counter' ? 'S 返击' : d === 'parry' ? 'S 受流' : 'S 完防';
    const n = this.oppQueue.length;
    const tier = (this.curTier && this.curTier.name) || '';
    // 流派秘技的操作提示只对【会这招的流派】显示，别把三派的键位堆给所有人看
    const arte = BT.ARTE && BT.ARTE[this._p1Id];
    const ak = arte ? `　出刀后按住 J「${arte.name}」` : '';
    window.GameHUD?.setObjective(
      `擂台 ${this.round + 1}/${n}【${tier}】：${BT.SCHOOLS[this.p2.id].name}　│　J 斩　${dk}　长按 L 蓄剑气　AD 移动${ak}`);
  },

  // 玩家胜一场、还有下一场：换上下一位对手，半回血，回满蓝，原地重开。
  _nextRound() {
    this.round++;
    this._applyTier();           // 阶梯 +1 级：第二场对手更强、点亮更多招式
    this._showStage(this.round); // 换景：第 2 场从室内道场移到雪山露天演武场
    const a = this.p1;
    a.hp = Math.min(a.maxHp, a.hp + Math.round(a.maxHp * BT.ROUND_HEAL));
    a.mp = a.maxMp;
    a.sprite.setPosition(268, BT.FLOOR_Y - 70).setVelocity(0, 0);
    a.state = 'idle'; a.stateUntil = 0; a.invuln = 0; a.atkHit = false; a.airborne = false;
    a.riposteUntil = 0; a.counterFired = false; a.counterGlowUntil = 0; a.counterReady = 0;
    this._clearOutlineHold(a); this._clearBodyFlash(a);
    a.facingLeft = false; a.sprite.setFlipX(true);
    a.sprite.play(`${a.id}_idle`, true);

    // 描边是独立 GameObject，得赶在 sprite 被 destroy（对象从 fighters 里消失）前回收
    this._clearOutlineHold(this.p2); this._clearBodyFlash(this.p2);
    this.p2.sprite.destroy();
    this.p2 = this._makeFighter(this.oppQueue[this.round], BT.GAME_W - 268, true);
    this.fighters = [this.p1, this.p2];

    this._clearQi();
    this._buildBars();
    this._setFightObjective();
    this._roundToast();
    this.phase = 'fight';
    this.aiNext = 0;
  },

  // 登台横幅：当前对手流派名 + 招牌
  _roundToast() {
    const s = BT.SCHOOLS[this.p2.id];
    const t = this.add.text(BT.GAME_W / 2, 150, `第 ${this.round + 1} 战　${s.title}`, {
      fontFamily: 'Segoe UI, monospace', fontSize: '30px', color: s.accent,
      fontStyle: 'bold', stroke: '#120a06', strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(70).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 220, yoyo: true, hold: 900,
      onComplete: () => t.destroy() });
  },

  _makeFighter(id, x, faceLeft) {
    const def = BT.SCHOOLS[id];
    const sp = this.physics.add.sprite(x, BT.FLOOR_Y - 70, id, BT.ATLAS[id].animations.idle.row *
      (BT.ATLAS[id].dimensions.width / BT.FRAME_W)).setScale(BT.SCALE);
    // 命中框贴身：图集里角色居中、脚底基线在 202/208（video-sprite 规格）。
    // setSize / setOffset 都传【纹理坐标】，Arcade 会自己按 sprite scale 缩放
    // （52×118 → 99×224，offset 84 → 160）。不要手动再乘 BT.SCALE，会双重缩放。
    // body 底 = 84+118 = 202 = 图集的脚底基线，所以 body 贴住世界下边界时脚正好踩台面。
    sp.body.setSize(52, 118).setOffset(BT.FRAME_W / 2 - 26, 84);
    sp.setCollideWorldBounds(true).setDepth(10);
    sp.setFlipX(!faceLeft);           // 素材朝左，朝右才翻转
    sp.play(`${id}_idle`);
    return {
      id, def, sprite: sp,
      hp: def.hp, maxHp: def.hp,
      mp: BT.MP.max, maxMp: BT.MP.max,          // 蓝：进场满管
      state: 'idle', stateUntil: 0, airborne: false,
      invuln: 0, atkStart: 0, atkFrom: 0, atkTo: 0, atkHit: false, atkCancelable: false, prevDx: null,
      facingLeft: faceLeft,
      guardFrom: 0, counterReady: 0, counterFired: false, counterGlowUntil: 0, flashEvt: null,
      riposteUntil: 0, guardAura: null,
      chargeFrom: 0, charging: false, mistReady: 0, riseReady: 0,
      aiRelease: 0, ultReady: 0,          // AI 奥义：松手时刻 / 下次可放时刻
      // AI 套路层（routine.js）：当前套路 / 下次可起套 / 撤步到期 / 惩罚窗口冷却
      rt: null, rtReady: 0, rtNext: 0, backstepUntil: 0, punishReady: 0,
      // AI 反应层（routine.js）：当前盯着的那记威胁 { id, at, acted } —— at 是观察时钟的
      // 起点，档位的 reactDelay 就是拿 now-at 来比的；guardMin/Max = 防御态的事件驱动边界
      threatSeen: null, guardMin: 0, guardMax: 0, guardRead: false, blockedAt: 0, reguardAt: 0,
      // 流派秘技（arte.js）：当前分身组 / 居合架式 / 下次可放时刻 / 玩家按住 J 的起点
      // arteArmed：AI 掷中秘技后【已上膛】的那一刀，出刀满 holdMs 转招（arte.js _aiTickArte）
      phantom: null, iai: null, iaiRelease: 0, arteReady: 0, jHeldFrom: 0, arteArmed: false,
    };
  },

  // ─────────── 血条 ───────────
  // 血条压在 y=52 以下：DOM 层的 HUD 目标文字占了画面顶部约 40px，
  // 画布内的文字画在 y=20 会和它重叠
  _buildBars() {
    // 换场会重建血条：先清掉上一场的名牌文字，避免叠字/泄漏
    if (this.barTexts) this.barTexts.forEach((t) => t.destroy());
    this.barG = this.barG || this.add.graphics().setScrollFactor(0).setDepth(60);
    const mk = (x, id, origin) => this.add.text(x, 76,
      `${BT.SCHOOLS[id].name}　${BT.SCHOOLS[id].blurb}`,
      { fontFamily: 'Segoe UI, monospace', fontSize: '15px', color: '#f2e7d5', fontStyle: 'bold' })
      .setOrigin(origin, 0).setScrollFactor(0).setDepth(61);
    this.barTexts = [mk(40, this.p1.id, 0), mk(BT.GAME_W - 40, this.p2.id, 1)];
    this._drawBars();
  },

  _drawBars() {
    const g = this.barG; g.clear();
    const W = 372, H = 20, y = 52;
    const bar = (x, yy, w0, h, frac, color, rightAlign) => {
      g.fillStyle(0x000000, 0.42); g.fillRect(x, yy, w0, h);
      const w = w0 * Phaser.Math.Clamp(frac, 0, 1);
      g.fillStyle(color, 1);
      g.fillRect(rightAlign ? x + w0 - w : x, yy, w, h);
      g.lineStyle(2, 0x1a1208, 0.85); g.strokeRect(x, yy, w0, h);
    };
    bar(40, y, W, H, this.p1.hp / this.p1.maxHp, BT.SCHOOLS[this.p1.id].barColor, false);
    bar(BT.GAME_W - 40 - W, y, W, H, this.p2.hp / this.p2.maxHp, BT.SCHOOLS[this.p2.id].barColor, true);
    // 蓝条：血条正下方一条细蓝槽，刻度分成 ultCost 段，一眼看出还剩几发奥义。
    // 【双方都画】——AI 已接入奥义（BT.AI.ultChance），右侧蓝槽是玩家的预警：
    // 对面攒满一格就可能起蓄（起蓄会把你轰飞），这条信息不给等于让玩家猜。
    // 剑神流还拿蓝当完全防御的燃料，自己这条空了就意味着"挡不动了"，更不能省。
    const my = y + H + 4, mh = 8, seg = BT.MP.ultCost / BT.MP.max;
    const tick = (x0) => {
      g.lineStyle(2, 0x0a1622, 0.9);
      for (let s = seg; s < 0.999; s += seg) { g.beginPath(); g.moveTo(x0 + W * s, my); g.lineTo(x0 + W * s, my + mh); g.strokePath(); }
    };
    bar(40, my, W, mh, this.p1.mp / this.p1.maxMp, 0x39c2ff, false);
    tick(40);
    bar(BT.GAME_W - 40 - W, my, W, mh, this.p2.mp / this.p2.maxMp, 0x39c2ff, true);
    tick(BT.GAME_W - 40 - W);
  },

  // ─────────── 舞台（背景三层贴图，见 BT.BG 的定标推导）───────────
  // 原先是全代码绘制的天空/远山/石台。换成道场实拍层的动机不是好看，而是：
  // 完全水平、零透视的台面给了眼睛一把精确的尺子，任何接地误差都藏不住
  // （倒地悬浮就是这么被看出来的）。前景木板压在角色脚上后，接触线不再可审。
  // 一场一景：两套背景【一次全建好】，靠 setVisible 切换，不在换场时重新 add.image。
  // 换场那一刻还有剑气/描边/落叶在跑，中途销毁重建整层背景会闪一帧空场。
  _buildStage() {
    const W = BT.GAME_W, H = BT.GAME_H, FY = BT.FLOOR_Y;
    this.bgSets = {};
    for (const [name, layers] of Object.entries(BT.BG_SETS)) {
      this.bgSets[name] = layers
        .filter((l) => this.textures.exists(l.animFrames ? `${l.key}_a0` : l.key))  // 缺图跳过该层，不去 404
        .map((l) => (l.animFrames ? this._bgAnimLayer(l, W) : this.add.image(W / 2, 0, l.key)
          // scaleX 可选：纵向按地面线定标，横向另给一个值（见 config.js 的注释）
          .setOrigin(0.5, 0).setScale(l.scaleX || l.scale, l.scale).setDepth(l.depth)));
    }
    this._showStage(0);
    // 台边警示：被逼到这里剑神流会破防。depth 25 压在前景（20）之上——
    // 它是玩法提示，不能被前景木板盖掉。
    const m = BT.DEFENSE.brace.edgeMargin;
    const g = this.add.graphics().setDepth(25);
    g.fillStyle(0xff8a3b, 0.16);
    g.fillRect(0, FY, m, H - FY); g.fillRect(W - m, FY, m, H - FY);
  },

  // 动态背景层：序列帧各自独立纹理，建一条 anim 循环播。
  // 只在这一层用 sprite（其余层是 image）——setVisible 切换的逻辑对两者通用。
  _bgAnimLayer(l, W) {
    const key = `${l.key}_anim`;
    if (!this.anims.exists(key)) {
      this.anims.create({
        key, frameRate: l.animFps || 6, repeat: -1,
        frames: Array.from({ length: l.animFrames }, (_, i) => ({ key: `${l.key}_a${i}` })),
      });
    }
    const sp = this.add.sprite(W / 2, 0, `${l.key}_a0`)
      .setOrigin(0.5, 0).setScale(l.scaleX || l.scale, l.scale).setDepth(l.depth);
    sp.play(key);
    return sp;
  },

  // 切到第 n 场的景（n 超出 BG_ORDER 就停在最后一套）
  _showStage(n) {
    if (!this.bgSets) return;
    const name = BT.BG_ORDER[Math.min(n, BT.BG_ORDER.length - 1)];
    for (const [key, imgs] of Object.entries(this.bgSets)) {
      imgs.forEach((im) => im.setVisible(key === name));
    }
    this.stageName = name;
    // 落叶属于室外：室内道场只留几片被风卷进来的，室外那场（枫树/银杏就在前景里）开满
    if (this._setLeafDensity) this._setLeafDensity(name === 'outdoor' ? 1 : 0.3);
  },
});
