/* BladeTrinity — 蓄力奥义 + 剑气弹幕。
 *
 * 玩法闭环：按住 L 蓄力（边蓄边扣蓝、起浪弹开近敌、头顶弹出招式名）→ 松手放出
 * 【等比】剑气月牙 → 剑气脱离角色飞行、越飞越大越淡 → 命中/被防/被反弹。
 *
 * 风险不在"蓄力被打断"（起浪把近敌推开了），而在"这一发打空 = 蓝白花"：剑气有
 * 飞行时间，对手能闪能防能反弹。三防御各有不同结果，见 _qiVsTarget。
 *
 * ⚠️ 特效目前是占位（竖椭圆气团 + 系统字大字）。月牙「前厚后稀疏」与艺术体子集
 * 是后一轮的事——本文件只负责机制正确、数值可调。
 */
Object.assign(BladeTrinityScene.prototype, {

  // ─────────── 蓄力 ───────────
  // 供 loop.js 的 _controlPlayer 在最前面调用：蓄力中/起手独占操作，返回 true。
  _handleCharge(f, time) {
    if (f.charging) { this._tickCharge(f, time); return true; }
    if (Phaser.Input.Keyboard.JustDown(this.keys.L) && this._canAct(f) && f.mp > 4) {
      this._startCharge(f, time);
      return true;
    }
    return false;
  },

  // AI 侧起蓄：没有键盘，蓄力时长在这里定死，_tickCharge 到点自动松手。
  // 调用方（loop.js _controlAI）负责冷却/距离/蓝量的准入判断。
  _startAICharge(f, time) {
    f.aiRelease = time + Phaser.Math.Between(BT.AI.chargeMin, BT.AI.chargeMax);
    // 冷却按难度档覆盖：会 zoneOut 的档位自己会创造距离，不再受 ultMinDist 制约，
    // 沿用 3400 会变成每 4 秒一次轰飞（见 BT.TIERS 的 ultCd 注释）。
    f.ultReady = time + (this._tierCfg().ultCd || BT.AI.ultCd);
    this._startCharge(f, time);
  },

  _startCharge(f, time) {
    f.charging = true;
    f.chargeFrom = time;
    f.state = 'charge';           // 不在 _canAct 白名单 → 蓄力中不可被自身其它输入打断
    f.stateUntil = 0;
    f.sprite.setVelocityX(0);
    f.sprite.play(`${f.id}_guard`, true);     // 无专用蓄力帧，借 guard 姿势占位
    this._chargeWave(f);                       // 起浪弹开近敌（无伤，只解贴身）
    this._showUltName(f);                       // 招式名一次性弹出（占位字体）
    window.GameAudio && GameAudio.play && GameAudio.play('charge');
  },

  _tickCharge(f, time) {
    // 被打断：受击等把 state 从 'charge' 改走 → 蓄力作废，已扣的蓝不退（这就是代价）
    if (f.state !== 'charge') { this._endCharge(f); return; }
    const dt = this._prevTime ? time - this._prevTime : 16;
    f.mp = Math.max(0, f.mp - BT.MP.drainRate * dt);
    f.sprite.setVelocityX(0);
    this._drawAura(f, time);
    if (f.ultText) f.ultText.setPosition(f.sprite.x, f.sprite.y - 150);
    // 松手条件按操控方分流：玩家看 L 键，AI 看 _startAICharge 定下的 aiRelease 时刻。
    const released = f === this.p1 ? !this.keys.L.isDown : time >= f.aiRelease;
    if (released || f.mp <= 0) this._releaseCharge(f, time);
  },

  _releaseCharge(f, time) {
    const frac = Phaser.Math.Clamp((time - f.chargeFrom) / BT.CHARGE.fullMs, 0, 1);
    this._endCharge(f);
    // 低于 minFrac：只起浪弹开过、不出剑气（当脱身用，蓝照扣）
    if (frac < BT.CHARGE.minFrac) {
      f.state = 'idle'; f.stateUntil = 0;
      f.sprite.play(`${f.id}_idle`, true);
      return;
    }
    // 【动作与剑气咬合】：松手播本流派自己的挥砍动画（身体真的斩出去，带各自的
    // 上段/横扫/上挑轨迹），并在挥砍生效帧把剑气甩出——不再是"挥完弹个月牙"。
    const a = BT.ATTACK[f.id];
    f.state = 'attack';
    f.stateUntil = this.time.now + a.dur;
    f.atkHit = true;                          // 屏蔽近战判定：这一挥只出剑气，不额外近战命中
    // ⚠️ 这一挥【不是平A的收招】，不许被 AI 的收招接续掐掉：它没设 atkFrom/atkTo，
    // 沿用陈旧值会让 _aiCancelWindow 下一帧就判定"收招已结束"，_tickSwingQi 随即
    // _clearSwing，蓄力扣了蓝一道剑气都不出（见 routine.js _aiCancelWindow 注释）。
    f.atkCancelable = false;
    if (this._usage && f === this.p1) this._usage.charge++;
    f.sprite.play(`${f.id}_attack`, true);
    // 有逐帧刀线标定 + 生成段 → 两阶段轨迹驱动（丝带蓄成 → 分段脱手飞行月牙，见 _tickSwingQi）。
    // 北神有两段=二段斩。没标定 → 旧法：from-40 弹一个静态月牙。
    const segs = BT.QI_SEGS && BT.QI_SEGS[f.id];
    if (BT.BLADE_MARKS && BT.BLADE_MARKS[f.id] && segs && segs.length) {
      f.qiSwing = {
        frac, segs, fired: segs.map(() => false), t0: this.time.now,
        g: this.add.graphics().setDepth(26),
        gGlow: this.add.graphics().setDepth(25).setBlendMode(Phaser.BlendModes.ADD),
      };
    } else {
      this.time.delayedCall(Math.max(0, a.from - 40), () => {
        if (f.state === 'attack') this._fireQi(f, frac);   // 被打断（state 改走）则不放
      });
    }
  },

  // 轨迹驱动挥砍相位（每帧 scene.update 调）。两阶段：①当前所在段 → 画蓄成丝带（纯特效）；
  // ②某段推进到止帧 → 发射该段飞行剑气进 qiList（一段一道，北神二段=两道相继）。被打断→清特效。
  _tickSwingQi(f, time) {
    const sw = f.qiSwing; if (!sw) return;
    if (f.state !== 'attack') { this._clearSwing(f); return; }
    const marks = BT.BLADE_MARKS[f.id];
    const fr = f.sprite.anims.currentFrame;
    // 相位取【播放帧】与【时间推算帧】的较大者。
    // ⚠️ 只看播放帧会在低帧率机器上把整发剑气吞掉：Phaser 的动画每个渲染 tick
    // 最多推进一帧，所以 15fps 的机器上 28fps 的 attack 行只能跑到 ~12fps ——
    // sword 的生成段止帧是第 12 帧，而 attack 状态 780ms 就结束，剑气永远发不出来
    // （headless 采样实测：780ms 内只走到第 6 帧，剑气 0 道）。
    // 时间推算帧按 BT.ATTACK.fps 走墙钟，与渲染帧率无关；60fps 下两者一致，
    // 掉帧时由它兜底 —— 蓄力扣了蓝就必须有剑气出来，这条不能看机器脸色。
    // idx0：动画不是从第 0 帧起播时的起始相位（北神反手斩直接从生成段起帧开播，
    // 见 defense.js _counterSwing）。时间推算帧要从它起算，否则永远追不上真实相位。
    const fps = BT.ATTACK[f.id].fps;
    const idxT = (sw.idx0 || 0) + Math.floor((time - sw.t0) / 1000 * fps);
    const idx = Math.max(fr ? fr.index - 1 : 0, idxT);
    sw.g.clear(); sw.gGlow.clear();
    // 各段推进到止帧 → 脱手发射
    for (let si = 0; si < sw.segs.length; si++) {
      if (!sw.fired[si] && idx >= sw.segs[si][1]) {
        this._fireSegQi(f, marks, sw.segs[si], sw.frac, sw.segs.length);
        sw.fired[si] = true;
      }
    }
    // 当前正在攒（未发射）的段 → 丝带随刀生长到当前帧
    for (let si = 0; si < sw.segs.length; si++) {
      const sg = sw.segs[si];
      if (!sw.fired[si] && idx >= sg[0] && idx <= sg[1]) {
        this._drawTrailRibbon(f, marks, sg, idx, sw.g, sw.gGlow, sw.frac);
        break;
      }
    }
  },

  // 段末发射一枚飞行剑气进 qiList：扫该段刀尖取纵横跨度/中心/前端，飞行月牙+命中判定复用 _tickQi。
  _fireSegQi(f, marks, seg, frac, nSegs) {
    if (!this.qiList) this.qiList = [];
    const dir = f.facingLeft ? -1 : 1, sx = f.sprite.x, sy = f.sprite.y;
    let yMin = Infinity, yMax = -Infinity, xMin = Infinity, xMax = -Infinity;
    for (let fr = seg[0]; fr <= seg[1]; fr++) {
      const m = marks[fr]; if (!m) continue;
      yMin = Math.min(yMin, m[1]); yMax = Math.max(yMax, m[1]);
      xMin = Math.min(xMin, m[0]); xMax = Math.max(xMax, m[0]);
    }
    if (!isFinite(yMin)) return;
    // 出生点在【刀尖前端】。但刀尖能伸到 170px 开外，贴脸放时会直接生成在对手【身后】，
    // 剑气朝前飞走、一次判定都不过 —— 北神反手斩就是这个场景（挡下时对方就在面前），
    // 实测必定打空。所以把前伸量压到"对手身前一点"，让首帧扫掠区间就能罩住他。
    // 蓄力奥义一般不撞这条（起手 _chargeWave 先把人轰远了），但同样受保护。
    let fwd = xMax * BT.SCALE;
    const opp = this._opp(f);
    if (opp && opp.state !== 'down') {
      const gap = (opp.sprite.x - sx) * dir;                     // 对手在正前方多远（负=在背后）
      if (gap > 0 && gap < fwd) fwd = Math.max(30, gap - 20);
    }
    const cx = sx + dir * fwd, cy = sy + ((yMin + yMax) / 2) * BT.SCALE;   // 前端·中心高度
    const spanV = (yMax - yMin) * BT.SCALE, spanH = (xMax - xMin) * BT.SCALE;
    this._qiBurst(cx, cy, BT.SCHOOLS[f.id].barColor);
    this.qiList.push({
      x: cx, prevX: cx, y: cy, dir, owner: f, school: f.id, frac,
      fromBlade: true, flyStyle: seg[2], spanV, spanH,
      born: this.time.now, age: 0, reflected: false, lastHit: null,
      dmg: Math.max(1, Math.round(BT.QI.dmg[f.id] * frac / nSegs)),
      r: Math.max(spanH, spanV) * 0.28 + 20,             // 命中横向半宽
      hitH: Math.max(BT.QI.hitH, spanV * 0.5 + 20),      // 纵向容差随月牙高
      history: [], parts: [],
      gGlow: this.add.graphics().setDepth(25).setBlendMode(Phaser.BlendModes.ADD),
      g: this.add.graphics().setDepth(26),
    });
    window.GameAudio && GameAudio.play && GameAudio.play('slash');
  },

  // 蓄成丝带：段内 [seg起, 当前帧] 刀尖轨迹 → Catmull-Rom 圆滑丝带；外缘=刀尖轨迹、内缘向刀根内缩
  // trailW。头端(当前刀尖)白热、尾端淡——刀在前气在后。
  _drawTrailRibbon(f, marks, seg, headIdx, g, gl, frac) {
    const dir = f.facingLeft ? -1 : 1, sx = f.sprite.x, sy = f.sprite.y;
    const w = (BT.SCHOOLS[f.id].qi && BT.SCHOOLS[f.id].qi.trailW) || 0.4;
    const tip = [], inner = [], hi = Math.min(headIdx, seg[1]);
    for (let fr = seg[0]; fr <= hi; fr++) {
      const m = marks[fr]; if (!m) continue;
      const tx = sx + dir * m[0] * BT.SCALE, ty = sy + m[1] * BT.SCALE;
      const bx = sx + dir * m[2] * BT.SCALE, by = sy + m[3] * BT.SCALE;
      tip.push({ x: tx, y: ty });
      inner.push({ x: tx + (bx - tx) * w, y: ty + (by - ty) * w });
    }
    if (tip.length < 2) return;
    const out = this._smoothPath(tip, 12), inr = this._smoothPath(inner, 12);
    const n = Math.min(out.length, inr.length), s = BT.SCHOOLS[f.id], fr2 = 0.4 + 0.6 * frac;
    gl.lineStyle(7, s.barColor, 0.3 * fr2); gl.strokePoints(out.slice(0, n), false);   // 外缘发光
    for (let j = 0; j < n - 1; j++) {
      const headness = (j + 1) / (n - 1), al = 0.5 * (0.08 + 0.92 * headness) * fr2;
      g.fillStyle(s.barColor, al); g.fillPoints([out[j], out[j + 1], inr[j + 1], inr[j]], true);
      if (headness > 0.82) { g.fillStyle(0xffffff, al * 1.6); g.fillPoints([out[j], out[j + 1], inr[j + 1], inr[j]], true); }
    }
    const h0 = Math.max(0, Math.floor(n * 0.8));
    g.lineStyle(2.5, 0xffffff, 0.85 * fr2); g.strokePoints(out.slice(h0, n), false);   // 白热前刃
  },

  // Catmull-Rom 样条：过所有控制点的圆滑曲线（每段 spp 采样），把折线刀尖轨迹变圆弧。
  _smoothPath(pts, spp) {
    const n = pts.length;
    if (n < 3) return pts.slice();
    const out = [];
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      for (let sN = (i === 0 ? 0 : 1); sN <= spp; sN++) {
        const t = sN / spp, t2 = t * t, t3 = t2 * t;
        out.push({
          x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        });
      }
    }
    return out;
  },

  _clearSwing(f) {
    const sw = f.qiSwing; if (!sw) return;
    sw.g.destroy(); sw.gGlow.destroy(); f.qiSwing = null;
  },

  _endCharge(f) {
    f.charging = false;
    this._clearOutlineHold(f);        // 蓄力描边收掉（防御描边会在需要时自己重建）
    if (f.ultText) { f.ultText.destroy(); f.ultText = null; }
  },

  // 蓄力起手一弹：①人物外轮廓炸开描边（动漫式蓄力起势）②把对手【轰到擂台最远端】，
  // 给剑气腾出满场飞行空间。轰飞无伤，但必须把对手打进 hurt 硬直+无敌——否则下一帧
  // _controlAI 会立刻用自己的移动速度覆盖掉这记击退（无阻力 → 一帧推 ≈4px，等于没推）。
  _chargeWave(f) {
    this._outlinePulse(f);                              // 描边一弹（视觉）
    this.cameras.main.shake(120, 0.006);
    const opp = this._opp(f);
    if (!opp || opp.state === 'down') return;
    const dir = opp.sprite.x >= f.sprite.x ? 1 : -1;    // 从蓄力者指向对手——朝远处轰
    const c = BT.CHARGE;
    // ⚠️ 走 _knockback。轰飞的上挑 waveLift=360 在场中央是"被抛出去"的抛物线（43px 高），
    // 但对手【已经背靠台边】时横向那 1250px/s 被世界边界整个吃掉，只剩下一记 43px 的
    // 原地垂直弹跳 —— 这是墙角"跳一下"里最扎眼的一档。退不动就别抛，改砸：
    // 平推贴墙 + 加倍震屏，读作"被轰在墙上"而不是"原地蹦了一下"。
    const pinned = this._knockback(opp, dir * c.wavePush, -c.waveLift);
    if (pinned) this.cameras.main.shake(180, 0.012);
    this._setState(opp, 'hurt', c.waveStun);            // 进硬直：AI 这段不夺控制，速度得以保留
    opp.invuln = this.time.now + c.waveStun;            // 轰飞途中无敌，别被别的判定截断
    this._ghost(opp);                                   // 起飞留一记残影
  },

  // 动漫式「描边一弹」：起手瞬间，人物外轮廓向外炸开——白热描边 + 一层流派色余韵。
  //
  // ⚠️ 与防御描边同法：【八向偏移】的剪影副本，半径从 r0 tween 到 r1。
  // 老写法是"放大一份剪影压在身后"，在白衣角色 + 暖色道场背景下 ADD 上去看不见
  // （运行时属性全对，纯粹是肉眼分辨不出），一并换掉。见 defense.js _guardAura。
  _outlinePulse(f) {
    const s = BT.SCHOOLS[f.id], frame = f.sprite.frame.name, N = 8;
    const ring = (tint, r0, r1, alpha, dur, blend) => {
      const parts = [];
      for (let i = 0; i < N; i++) {
        const img = this.add.image(f.sprite.x, f.sprite.y, f.id, frame)
          .setScale(BT.SCALE).setFlipX(f.sprite.flipX)
          .setDepth(f.sprite.depth - 1).setTint(tint).setAlpha(alpha);
        if (blend) img.setBlendMode(blend);
        parts.push(img);
      }
      const st = { r: r0 };
      this.tweens.add({
        targets: st, r: r1, duration: dur, ease: 'Cubic.easeOut',
        onUpdate: () => {
          const a = alpha * (1 - (st.r - r0) / (r1 - r0));
          for (let i = 0; i < N; i++) {
            const ang = (i / N) * Math.PI * 2;
            parts[i].setPosition(f.sprite.x + Math.cos(ang) * st.r, f.sprite.y + Math.sin(ang) * st.r)
              .setAlpha(a);
          }
        },
        onComplete: () => parts.forEach((p) => p.destroy()),
      });
    };
    ring(0xffffff, 4, 26, 1.0, 240);                                  // 白热描边：快、炸得利落
    ring(s.barColor, 8, 52, 0.7, 400, Phaser.BlendModes.ADD);         // 流派色余韵：慢、扩得更开更淡
  },

  _showUltName(f) {
    const s = BT.SCHOOLS[f.id];
    f.ultText = this.add.text(f.sprite.x, f.sprite.y - 150, s.title, {
      fontFamily: 'Segoe UI, serif', fontSize: '30px', color: s.accent,
      fontStyle: 'bold italic', stroke: '#120a06', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(72).setScale(0.4);
    this.tweens.add({ targets: f.ultText, scale: 1, duration: 170, ease: 'Back.easeOut' });
  },

  // 蓄力中的视觉：【外轮廓随蓄力越描越厚】，不再画一圈光环。
  // 光环是"角色外面套了个圈"，描边是"力从人身上涨出来"——后者才是这套动作的语言，
  // 而且和防御描边共用一套实现（_outlineHold），画面读法统一（用户定）。
  _drawAura(f, time) {
    const frac = Phaser.Math.Clamp((time - f.chargeFrom) / BT.CHARGE.fullMs, 0, 1);
    const A = BT.GUARD_AURA, s = BT.SCHOOLS[f.id];
    const pulse = 0.5 + 0.5 * Math.sin(time / 70);
    // 半径由蓄力比例主导、叠一层轻微呼吸；满蓄比防御描边更厚，读得出"攒满了"
    const r = A.rMin + (A.chargeRMax - A.rMin) * frac + 1.5 * pulse;
    this._outlineHold(f, s.barColor, r);
  },

  // ─────────── 剑气 ───────────
  // dirOverride：指定飞行方向（北神反手剑气用——挡下时朝攻击者甩，而不是朝当前面向；
  // 反手有 qiDelay 的延迟，这中间 _faceEachOther 可能已经把朝向改了）。
  _fireQi(f, frac, dirOverride) {
    if (!this.qiList) this.qiList = [];
    const dir = dirOverride || (f.facingLeft ? -1 : 1);
    const cfg = this._qiCfg(f.id);
    const x = f.sprite.x + dir * 60, y = f.sprite.y + cfg.emitY;
    const s = BT.SCHOOLS[f.id];
    this._qiBurst(x, y, s.barColor);                 // 剑气脱手瞬间的一记能量爆闪（接住挥砍生效帧）
    this.qiList.push({
      x, prevX: x, y, dir, owner: f, school: f.id, frac,
      rot: this._qiRot(dir, cfg.angleDeg),            // 月牙倾角（含 dir 朝向 + 本流派挥砍角）
      born: this.time.now, age: 0, reflected: false, lastHit: null,
      dmg: Math.round(BT.QI.dmg[f.id] * frac),
      r: BT.QI.baseR * (0.5 + 0.5 * frac),
      history: [],                                   // 甩尾残影用（近→远存位置）
      parts: [],                                     // 弧面内残留粒子（世界坐标、原地衰减）
      gGlow: this.add.graphics().setDepth(25).setBlendMode(Phaser.BlendModes.ADD),  // 残影/粒子/外晕
      g: this.add.graphics().setDepth(26),           // 月牙实体
    });
    window.GameAudio && GameAudio.play && GameAudio.play('slash');
  },

  // ─────────── 北神流·反击飞刀 ───────────
  // 进的是同一个 qiList，所以飞行/扫掠命中/三派防御分流/水神反射全部原样复用；
  // 只有渲染分流到 _drawKnife、速度取 q.speed。dirTo = 攻击者所在方向。
  // crit=true → 挂回旋镖：命中后不消散，穿过对手再飞一段掉头回来，共命中 BT.CRIT.hits 次。
  _throwKnife(f, dirTo, crit) {
    if (!this.qiList) this.qiList = [];
    const K = BT.KNIFE, dir = dirTo < 0 ? -1 : 1;
    // 出手点贴身：暗器是从手里甩出去的，不像剑气那样挂在刀尖前端。
    // 挡下时对手就在面前，生成点再往前挪就会直接越过他（剑气踩过这个坑）。
    const x = f.sprite.x + dir * 34, y = f.sprite.y + K.emitY;
    this._qiBurst(x, y, BT.SCHOOLS[f.id].barColor);
    this.qiList.push({
      x, prevX: x, y, dir, owner: f, school: f.id, frac: 1,
      knife: true, spin: 0, speed: K.speed, life: crit ? K.life * 2.2 : K.life, anchorY: K.emitY,
      // hitsLeft>1 = 回旋镖：每次命中后掉头再来，直到打满。boomerang 的刀多活一会儿，
      // 否则来回一趟就到寿命了（一去一回≈2×turnDist÷speed）。
      hitsLeft: crit ? BT.CRIT.hits : 1, boomerang: !!crit, turnAt: null,
      born: this.time.now, age: 0, reflected: false, lastHit: null,
      dmg: K.dmg, r: K.r, hitH: K.hitH,
      history: [], parts: [],
      gGlow: this.add.graphics().setDepth(25).setBlendMode(Phaser.BlendModes.ADD),
      g: this.add.graphics().setDepth(26),
    });
    window.GameAudio && GameAudio.play && GameAudio.play('slash');
  },

  // 旋转的小刀：刀身多边形绕自身中心自转 + 几片旋转残影。
  // 残影是"转起来"的关键 —— 单帧看是一把刀，连起来才是一团旋刃；
  // 少了它在低帧率下会变成一格一格的跳变。
  _drawKnife(q, lifeF, dts) {
    const K = BT.KNIFE;
    q.spin += K.spin * dts * q.dir;
    const g = q.g, gl = q.gGlow; g.clear(); gl.clear();
    const a = Phaser.Math.Clamp(1 - Math.max(0, lifeF - 0.7) / 0.3, 0, 1);   // 末段三成淡出
    const blade = (cx, cy, rot, alpha, scale) => {
      const c = Math.cos(rot), s = Math.sin(rot), L = K.len * scale, W = K.w * scale;
      const pt = (lx, ly) => ({ x: cx + lx * c - ly * s, y: cy + lx * s + ly * c });
      // 刀身：尖头在前，向后收成柄；刀柄一小截压暗，才看得出是"刀"不是"梭子"
      const body = [pt(L * 0.6, 0), pt(L * 0.15, -W), pt(-L * 0.2, -W * 0.55),
        pt(-L * 0.2, W * 0.55), pt(L * 0.15, W)];
      const hilt = [pt(-L * 0.2, -W * 0.5), pt(-L * 0.5, -W * 0.45),
        pt(-L * 0.5, W * 0.45), pt(-L * 0.2, W * 0.5)];
      g.fillStyle(K.color, alpha); g.fillPoints(body, true);
      g.lineStyle(1.6, K.edge, alpha * 0.95); g.strokePoints(body, true);   // 白热刃口
      g.fillStyle(K.hilt, alpha); g.fillPoints(hilt, true);
    };
    // 旋转残影：沿飞行反方向退开，且自转相位往回倒 —— 读作"边转边飞"
    for (let i = K.ghosts; i >= 1; i--) {
      const t = i / (K.ghosts + 1);
      gl.fillStyle(BT.SCHOOLS[q.school].barColor, a * 0.10 * (1 - t));
      const c = Math.cos(q.spin - i * 0.5), s = Math.sin(q.spin - i * 0.5);
      const cx = q.x - q.dir * i * 11, cy = q.y, L = K.len * 0.9, W = K.w * 0.9;
      gl.fillPoints([
        { x: cx + L * 0.6 * c, y: cy + L * 0.6 * s },
        { x: cx - W * s, y: cy + W * c },
        { x: cx - L * 0.5 * c, y: cy - L * 0.5 * s },
        { x: cx + W * s, y: cy - W * c },
      ], true);
    }
    gl.fillStyle(BT.SCHOOLS[q.school].barColor, a * 0.22);                  // 外晕
    gl.fillCircle(q.x, q.y, K.len * 0.42);
    blade(q.x, q.y, q.spin, a, 1);
  },

  _tickQi(time, delta) {
    if (!this.qiList || !this.qiList.length) return;
    const dts = delta / 1000;
    for (let i = this.qiList.length - 1; i >= 0; i--) {
      const q = this.qiList[i];
      q.prevX = q.x;
      q.x += q.dir * (q.speed || BT.QI.speed) * dts;   // 飞刀比剑气快，速度按弹丸自带
      // ⚠️ 寿命按【累计 delta】算，不按墙钟 (time - q.born)。
      // 位移是 delta 积分出来的，而 Phaser 在掉帧时会把 delta 钳住；两个口径一混，
      // 机器一卡剑气就会"活够了 1500ms 却只飞了 120px"，半路凭空消散——
      // headless 实测正是如此（1533ms 只飞 121px，水神反弹永远等不到剑气到脸上）。
      // 用累计 delta 后，一发剑气飞多远与帧率无关，掉帧只会让它看起来慢，不会缩水。
      q.age += delta;
      const lifeF = q.age / (q.life || BT.QI.life);

      // 回旋镖：穿过对手后再飞 knifeTurnDist 就掉头，并解锁 lastHit 让它能再命中一次
      if (q.turnAt !== null && q.turnAt !== undefined && (q.x - q.turnAt) * q.dir >= 0) {
        q.dir *= -1;
        q.turnAt = null;
        q.lastHit = null;
        q.prevX = q.x;
        this._qiBurst(q.x, q.y, BT.SCHOOLS[q.school].barColor);
      }

      // 甩尾残影轨迹（存当前位置，最多 10 帧）
      q.history.unshift({ x: q.x });
      if (q.history.length > 10) q.history.pop();

      const target = q.owner === this.p1 ? this.p2 : this.p1;
      const verdict = this._qiVsTarget(q, target);
      if (verdict === 'despawn') { this._despawnQi(q, i); continue; }

      this._drawQi(q, lifeF, dts);
      if (lifeF >= 1 || q.x < -100 || q.x > BT.GAME_W + 100) this._despawnQi(q, i);
    }
  },

  // 返回 'despawn' 表示剑气消耗掉了；null 表示继续飞（穿过 / 反弹后 / 未命中）
  _qiVsTarget(q, target) {
    if (!target || target.state === 'down') return null;
    // ⚠️ 同锚点比 y：弹丸在什么高度飞，就拿对手同一高度来比。默认 -36 是胸高（剑气口径），
    // 腰高的飞刀自带 anchorY 覆盖它 —— 混用锚点会让弹丸穿过对手却永不命中。
    const tx = target.sprite.x, ty = target.sprite.y + (q.anchorY != null ? q.anchorY : -36);
    if (Math.abs(q.y - ty) > (q.hitH || BT.QI.hitH)) return null;
    // 横向扫掠：目标躯干 x 是否落在 [上帧,本帧]±半径 内（防高速隧穿）
    const lo = Math.min(q.prevX, q.x) - q.r, hi = Math.max(q.prevX, q.x) + q.r;
    if (tx < lo || tx > hi) return null;
    if (q.lastHit === target) return null;    // 这一发已对该目标结算过

    const guardingFront = target.state === 'guard' && target.facingLeft === (q.dir > 0);

    // 水神受流：反弹（反弹的不可再反弹，伤害保持原值）
    // ⚠️ 只改【归属与方向】，不改 school —— 颜色/形状/倾角全部保持来袭时的样子。
    // 曾经把 school 换成反弹方，结果同一道剑气打过来是蓝的、弹回去变成红的，
    // 玩家读不出"这是我刚挡下的那一发"，反弹的因果感就断了（用户实测反馈）。
    // 归属仍要改：伤害算在反弹方头上，且不能反弹后又打到自己。
    if (guardingFront && target.def.defense === 'parry' && !q.reflected) {
      q.dir *= -1; q.owner = target;
      q.rot = this._qiRot(q.dir, this._qiCfg(q.school).angleDeg);   // 掉头，但仍用【原流派】的挥砍角
      q.reflected = true; q.lastHit = null;
      q.x += q.dir * 12; q.prevX = q.x;
      this._popText(target.sprite.x, target.sprite.y - 84, '受け流し·返', '#8fe0ff');
      this._outlinePunch(target);                  // 反弹成功：描边猛顶一下
      if (this._rollCrit(target)) this._critVolley(target, q);   // 会心 → 再连弹两道，共三道
      this.cameras.main.shake(90, 0.006);
      return null;
    }

    // 剑神完全防御：蓝够就【整道吃下、零伤】，只留推退；蓝不足退化为减伤。
    // 挡剑气比挡近战贵（qiGuardCost>guardCost）——对面那一发本来就是拿蓝换的。
    if (guardingFront && target.def.defense === 'brace') {
      const d = BT.DEFENSE.brace;
      if (target.mp >= d.qiGuardCost) {
        target.mp -= d.qiGuardCost;
        this._drawBars();
        this._popText(target.sprite.x, target.sprite.y - 84, '力受け·完', '#ffe6a8');
        this._outlinePunch(target);               // 完全防御成功：描边猛顶一下
        this.cameras.main.shake(80, 0.005);
        target.sprite.setVelocityX(q.dir * BT.QI.bracePush);
        if (this._rollCrit(target)) this._critCombo(target);     // 会心 → 扛下剑气立刻反打三连
        return 'despawn';
      }
      this._applyQiDamage(q, target, Math.round(q.dmg * d.reduce), true);
      return 'despawn';
    }

    // 北神返し：整道剑气挡下、零伤，并反手甩飞刀回去（飞刀走 knifeCd 冷却）。
    // ⚠️ 这里曾经要求【无敌窗口正好覆盖弹丸到达的那一刻】，而 parry/brace 接剑气都
    // 不看时机 —— 三派里只有北神要对弹丸计时，实际上几乎接不住：AI 起蓄的预告
    // （描边炸弹+震屏+招式名）出现在弹丸到达前约 1.5~1.7 秒（蓄 240~420ms + 飞
    // ~650px÷520px/s），照着预告按防御是确定性的空放+硬直+冷却，刚好锁死在弹丸真正
    // 到达的时刻。现在按住即成立，和另外两派一致。
    if (guardingFront && target.def.defense === 'counter') {
      const d = BT.DEFENSE.counter;
      this._outlinePunch(target);
      if (this.time.now >= target.counterReady) {
        target.counterReady = this.time.now + d.knifeCd;
        target.counterFired = false;
        this._fireCounterQi(target, -q.dir, this._rollCrit(target));
      } else {
        this._popText(target.sprite.x, target.sprite.y - 84, '返し', '#c0a0ff');
      }
      target.sprite.setVelocityX(q.dir * d.pushback);
      this.cameras.main.shake(80, 0.005);
      return 'despawn';
    }

    // 其余（没防 / 防错向）→ 全伤
    const dealt = this._applyQiDamage(q, target, q.dmg, false);
    // 回旋镖还有剩余次数 → 【不消散】，穿过对手继续飞，到 turnAt 掉头回来再打。
    // 只有真打进去才扣次数：被无敌吃掉的那一趟不算，否则"三次伤害"会缩水成两次。
    if (q.boomerang && (!dealt || --q.hitsLeft > 0)) {
      q.turnAt = q.x + q.dir * BT.CRIT.knifeTurnDist;
      return null;
    }
    return 'despawn';
  },

  // 返回 true = 这一下真的结算了伤害；false = 被受击无敌吃掉。
  // 回旋镖靠它决定要不要扣掉一次命中次数——空过的一趟不该算数。
  _applyQiDamage(q, target, dmg, blocked) {
    if (this.time.now < target.invuln) { q.lastHit = target; return false; }
    if (q.owner === this.p2) dmg = Math.round(dmg * this._aiDmgScale());   // AI 一侧难度折扣×档位
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      if (target === this.p2) {
        dmg = Math.round(dmg * 3);
      } else if (target === this.p1) {
        dmg = Math.round(dmg * 0.3);
      }
    }
    target.hp = Math.max(0, target.hp - dmg);
    target.invuln = this.time.now + BT.INVULN;
    q.lastHit = target;
    this._drawBars();
    const dir = q.dir;
    // 走 _knockback：墙角把上挑吃掉，否则横向被边界拦下后只剩原地小跳（见其注释）
    const pinned = this._knockback(target, dir * (blocked ? BT.QI.bracePush : 170), blocked ? 0 : -90);
    if (!blocked) this._bodyFlash(target, 0xff3b3b);   // 整体红闪，同近战受击
    this.cameras.main.shake(blocked ? 70 : 150,
      (blocked ? 0.004 : 0.009) * (pinned ? 1.7 : 1));
    this._popText(target.sprite.x, target.sprite.y - 84, blocked ? '力受け' : `-${dmg}`,
      blocked ? '#ffd28a' : '#ff8a6a');
    if (!blocked) this._setState(target, 'hurt');
    if (target.hp <= 0) this._ko(target);
    return true;
  },

  // 斜向弧带月牙：前厚后尖（taper 收束）+ 白热刀芯 + 前缘过曝描边 + ADD 甩尾残影 + 弧内残留粒子。
  // 整体按 q.rot 旋转（含 dir 朝向 + slashAngle 斜劈倾角），贴合"举刀→斜劈而下"的挥剑轨迹。
  _drawQi(q, lifeF, dts) {
    if (q.knife) { this._drawKnife(q, lifeF, dts); return; }  // 北神反击暗器（旋转小刀）
    if (q.fromBlade) { this._drawFlyQi(q, lifeF); return; }   // 轨迹驱动的飞行月牙（chop/sweep）
    const s = BT.SCHOOLS[q.school];
    const clampF = Phaser.Math.Clamp(lifeF, 0, 1);
    const grow = 1 + (BT.QI.growth - 1) * clampF;
    const a = 0.85 * (1 - clampF);
    const r = q.r * grow, cfg = this._qiCfg(q.school);   // 形状按流派各异（长度/厚度/前凸）
    const span = r * cfg.spanMul, thick = r * cfg.thickMul, curv = cfg.curv;
    const rot = q.rot, cos = Math.cos(rot), sin = Math.sin(rot);
    const g = q.g, gl = q.gGlow;
    g.clear(); gl.clear();

    // [1] 甩尾残影（ADD 叠加，越旧越淡越缩）
    for (let h = 0; h < q.history.length; h++) {
      const f = 1 - h / q.history.length;
      const poly = this._qiCrescent(q.history[h].x, q.y, cos, sin, span * (1 - h * 0.03), thick * 0.6, curv, 1);
      gl.fillStyle(s.barColor, a * 0.13 * f);
      gl.fillPoints(poly, true);
    }

    // [2] 月牙实体（校色半透明填充）
    const body = this._qiCrescent(q.x, q.y, cos, sin, span, thick, curv, 1);
    g.fillStyle(s.barColor, a * 0.55);
    g.fillPoints(body, true);

    // [3] 白热刀芯（收窄到前缘的一薄条，过曝白）
    const core = this._qiCrescent(q.x, q.y, cos, sin, span * 0.96, thick, curv, 0.35);
    g.fillStyle(0xffffff, a * 0.9);
    g.fillPoints(core, true);

    // [4] 前缘白热刃口描边 + [5] 外发光晕（ADD）
    const edge = body.slice(0, Math.ceil(body.length / 2));   // 前半为外缘（前凸）
    g.lineStyle(2.5, 0xffffff, a);
    g.strokePoints(edge, false);
    gl.lineStyle(6, s.barColor, a * 0.35);
    gl.strokePoints(edge, false);

    // [6] 弧面内残留粒子：每帧在月牙几何内采几点、原地世界坐标衰减（不向外飞散），随倾角旋转
    for (let k = 0; k < 3; k++) {
      const t = (Math.random() - 0.5) * 1.9;
      const rp = (Math.random() - 0.5) * 0.9;
      const taper = Math.pow(Math.max(0, 1 - t * t), 0.65);
      const fx = (1 - t * t) * span * curv + rp * thick * taper, fy = t * span * 0.5;
      q.parts.push({
        x: q.x + fx * cos - fy * sin, y: q.y + fx * sin + fy * cos,
        size: 0.8 + Math.random() * 1.6, life: 0.18 + Math.random() * 0.14, col: (k % 2) ? 0xffffff : s.barColor,
      });
    }
    for (let j = q.parts.length - 1; j >= 0; j--) {
      const p = q.parts[j];
      p.life -= dts;
      if (p.life <= 0) { q.parts.splice(j, 1); continue; }
      gl.fillStyle(p.col, a * Math.min(1, p.life * 5));
      gl.fillCircle(p.x, p.y, p.size);
    }
  },

  // 各流派剑气参数（形状/倾角/出招高度），缺省回落到通用值。
  _qiCfg(school) {
    const q = (BT.SCHOOLS[school] && BT.SCHOOLS[school].qi) || {};
    return {
      angleDeg: q.angleDeg != null ? q.angleDeg : 34,
      spanMul: q.spanMul != null ? q.spanMul : 3.3,
      thickMul: q.thickMul != null ? q.thickMul : 0.8,
      curv: q.curv != null ? q.curv : 0.42,
      emitY: q.emitY != null ? q.emitY : -36,
    };
  },

  // 剑气倾角：forward=+x，叠本流派挥砍角 angleDeg；dir<0（朝左）整体镜像到 -x。
  _qiRot(dir, angleDeg) {
    const tilt = angleDeg * Math.PI / 180;
    return dir > 0 ? tilt : Math.PI - tilt;
  },

  // 构造月牙多边形点列：本地系 forward=+x，绕原点按 (cos,sin) 旋转后平移到 (cx,cy)。
  // innerScale<1 时把内缘拉向外缘 → 得到贴前缘的白热薄芯。返回可直接喂 fillPoints/strokePoints。
  _qiCrescent(cx, cy, cos, sin, span, thick, curv, innerScale) {
    const N = 22, half = span * 0.5, outer = [], inner = [];
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * 2 - 1;
      const taper = Math.pow(Math.max(0, 1 - t * t), 0.65);
      const ct = thick * taper;
      const ax = (1 - t * t) * span * curv, ay = t * half;
      const ox = ax + ct * 0.5, ix = ax - ct * 0.5 * innerScale;
      outer.push({ x: cx + ox * cos - ay * sin, y: cy + ox * sin + ay * cos });
      inner.unshift({ x: cx + ix * cos - ay * sin, y: cy + ix * sin + ay * cos });
    }
    return outer.concat(inner);
  },

  // 飞行月牙点列：水平飞行（belly=+x 顺 dir）、span 轴竖直、沿飞行方向拉伸 stretch。
  // t 子区间 [t0,t1] 用于分带渐变；innerScale<1 收出白热薄芯。
  _qiCrescentFly(cx, cy, dir, span, thick, curv, stretch, innerScale, t0, t1) {
    const N = 20, half = span * 0.5, outer = [], inner = [];
    t0 = (t0 == null ? -1 : t0); t1 = (t1 == null ? 1 : t1);
    for (let i = 0; i <= N; i++) {
      const t = t0 + (t1 - t0) * (i / N);
      const taper = Math.pow(Math.max(0, 1 - t * t), 0.65), ct = thick * taper;
      const ax = (1 - t * t) * span * curv, ay = t * half;
      const ox = (ax + ct * 0.5) * stretch, ix = (ax - ct * 0.5 * innerScale) * stretch;
      outer.push({ x: cx + dir * ox, y: cy + ay });
      inner.unshift({ x: cx + dir * ix, y: cy + ay });
    }
    return outer.concat(inner);
  },

  // 明暗混色（立体感分带用）：f=1 顶部偏白亮，f=0 底部压暗。
  _mixShade(color, f) {
    const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
    let R, G, B;
    if (f >= 0.5) { const m = (f - 0.5) * 2 * 0.7; R = r + (255 - r) * m; G = g + (255 - g) * m; B = b + (255 - b) * m; }
    else { const m = (1 - f * 2) * 0.6; R = r * (1 - m); G = g * (1 - m); B = b * (1 - m); }
    return (Math.round(R) << 16) | (Math.round(G) << 8) | Math.round(B);
  },

  // 飞行月牙渲染：chop=竖长薄片 / sweep=宽扁+竖向明暗立体。都凸边朝正前、水平飞、残影拖尾=速度感。
  _drawFlyQi(q, lifeF) {
    const s = BT.SCHOOLS[q.school], dir = q.dir, cx = q.x, cy = q.y;
    const clampF = Phaser.Math.Clamp(lifeF, 0, 1), a = 0.9 * (1 - clampF);
    const curv = Math.max(this._qiCfg(q.school).curv, 0.5);
    const g = q.g, gl = q.gGlow; g.clear(); gl.clear();
    let span, thick, stretch, shaded;
    if (q.flyStyle === 'sweep') { span = Math.max(BT.QI.baseR * 1.7, q.spanV); thick = span * 0.5; stretch = 2.0; shaded = true; }
    else { span = Math.max(q.spanV, BT.QI.baseR * 2); thick = span * 0.3; stretch = 1.4; shaded = false; }
    // 残影拖尾（ADD，水平向后渐淡）
    for (let k = 6; k >= 1; k--) {
      const poly = this._qiCrescentFly(cx - dir * k * 16, cy, dir, span, thick, curv, stretch, 1);
      gl.fillStyle(s.barColor, a * 0.09 * (1 - k / 7)); gl.fillPoints(poly, true);
    }
    if (shaded) {                                   // 立体感：竖向 8 带渐变（顶亮底暗）
      const K = 8;
      for (let b = 0; b < K; b++) {
        const band = this._qiCrescentFly(cx, cy, dir, span, thick, curv, stretch, 1, -1 + 2 * b / K, -1 + 2 * (b + 1) / K);
        const ff = 1 - (b + 0.5) / K;
        g.fillStyle(this._mixShade(s.barColor, ff), a * (0.42 + 0.42 * ff)); g.fillPoints(band, true);
      }
    } else {
      g.fillStyle(s.barColor, a * 0.5); g.fillPoints(this._qiCrescentFly(cx, cy, dir, span, thick, curv, stretch, 1), true);
      g.fillStyle(0xffffff, a * 0.85); g.fillPoints(this._qiCrescentFly(cx, cy, dir, span * 0.94, thick, curv, stretch, 0.4), true);
    }
    const edge = this._qiCrescentFly(cx, cy, dir, span, thick, curv, stretch, 1).slice(0, 22);   // 外缘前半
    g.lineStyle(2.5, 0xffffff, a); g.strokePoints(edge, false);                                   // 白热前刃
    gl.lineStyle(6, s.barColor, a * 0.35); gl.strokePoints(edge, false);                          // 外发光
  },

  // 剑气脱手的能量爆闪：ADD 扩张亮环 + 白热核，快速淡出——是"能量迸发"不是"实心球"。
  _qiBurst(x, y, color) {
    const g = this.add.graphics({ x, y }).setDepth(27).setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(4, color, 0.9); g.strokeCircle(0, 0, 11);
    g.fillStyle(0xffffff, 0.85); g.fillCircle(0, 0, 6);
    this.tweens.add({ targets: g, scaleX: 2.6, scaleY: 2.6, alpha: 0, duration: 190,
      ease: 'Cubic.easeOut', onComplete: () => g.destroy() });
  },

  _despawnQi(q, i) {
    q.g.destroy();
    q.gGlow.destroy();
    this.qiList.splice(i, 1);
  },

  _clearQi() {
    if (this.qiList) { this.qiList.forEach((q) => { q.g.destroy(); q.gGlow.destroy(); }); this.qiList = []; }
    // 换场会 destroy 掉 p2.sprite，但描边/光环是独立 GameObject，必须一并回收，否则留在场上
    for (const f of (this.fighters || [])) {
      if (f.charging) this._endCharge(f);
      if (f.qiSwing) this._clearSwing(f);
      this._clearOutlineHold(f);
    }
  },
});
