/* BladeTrinity — 输入 / AI / 命中判定 / 互推。 */
Object.assign(BladeTrinityScene.prototype, {

  // 朝向：素材本身朝左，所以 facingLeft = 不翻转（flipX=false）。
  //
  // ⚠️ facingLeft 与 setFlipX 必须【原子更新】：只在可行动时一起改。
  // 曾经把 facingLeft 每帧更新、只把 setFlipX 关在 _canAct 里，结果出招途中
  // 两人位置交错时逻辑朝向翻了而画面没翻，_resolveMelee 的 dir 与视觉相反
  // ——表现就是"劈砍方向反了"。
  _faceEachOther() {
    const left = this.p1.sprite.x > this.p2.sprite.x;
    for (const [f, want] of [[this.p1, left], [this.p2, !left]]) {
      if (!this._canAct(f)) continue;     // 出招/受击/硬直中锁死朝向
      f.facingLeft = want;
      f.sprite.setFlipX(!want);
    }
  },

  _controlPlayer(time) {
    const f = this.p1, sp = f.sprite, onGround = sp.body.blocked.down;
    if (this._handleCharge(f, time)) return;   // 蓄力中/起手：独占操作，原地锁死
    // 移形换影：SPACE 瞬移，按住上 = 升空，否则 = 缩地（无敌+残影+冷却，不耗蓝）
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      const up = this.keys.W.isDown || this.cursors.up.isDown;
      this._doBlink(f, up ? 'rise' : 'ground', time);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.J)) return this._attack(f);

    // 防御三派【同一个键 S】。北神曾经单独占 K，纯粹是因为它是瞬发动作而不是长按态——
    // 但对玩家来说"防御"就该是同一个键，换个流派还要换手指是没道理的（用户定）。
    // 差别只在读法：brace/parry 读长按维持，counter 读点按触发。
    if (f.def.defense === 'counter') {
      if (Phaser.Input.Keyboard.JustDown(this.keys.S)) return this._startDefense(f, time);
    } else {
      if (this.keys.S.isDown && onGround && this._canAct(f)) {
        this._startDefense(f, time);
        return;
      }
      if (f.state === 'guard') this._setState(f, 'idle');
    }

    if (!this._canAct(f)) return;
    // ⚠️ 【定时防御态】锁住姿态直到窗口结束。北神的反击是 _setState(f,'guard',iframes+60)
    // 起的一个有时限的 guard，而 guard 在 _canAct 白名单里 —— 不加这道闸，下面的
    // _setState(f,'idle') 会在【按下 K 的下一帧】就把防御姿势掐掉：无敌照常生效，
    // 但画面上只闪一帧，防御描边更是等于没有。brace/parry 的长按 guard 不设 stateUntil，
    // 不受这条影响。
    if (f.state === 'guard' && f.stateUntil && time < f.stateUntil) return;
    const left = this.keys.A.isDown || this.cursors.left.isDown;
    const right = this.keys.D.isDown || this.cursors.right.isDown;
    const vx = left ? -f.def.speed : right ? f.def.speed : 0;
    sp.setVelocityX(vx);
    if ((this.keys.W.isDown || this.cursors.up.isDown) && onGround) {
      sp.setVelocityY(-600);
      if (this._usage && f === this.p1 && f.state !== 'jump') this._usage.jump++;
    }
    // 姿态：腾空播跳跃姿态（起跳蓄力→收腿→落地），落地回 idle/走。
    // 跳跃是纯视觉+可行动状态，起跳只触发一次（airborne 门），落地 airborne 复位后
    // 因 f.state==='jump'≠idle，下面的 _setState/_setWalk 一定会重播落地姿态。
    if (!onGround) {
      if (!f.airborne) { f.airborne = true; this._playAir(f); }
    } else {
      f.airborne = false;
      if (vx) this._setWalk(f, vx);
      else this._setState(f, 'idle');
    }
  },

  // 当前擂台的难度档（fight.js 每场设定 this.curTier）。缺省回落到王级基线。
  _tierCfg() { return (BT.TIERS && this.curTier) || BT.TIERS.wang; },
  // AI 伤害折扣 = 基线难度旋钮 × 当前档位倍率。伤害结算 4 处统一走这里。
  _aiDmgScale() { return BT.AI.damageScale * this._tierCfg().mul.dmg; },

  // 有剑气/暗器正朝 f 飞来且够近（跳跃升空躲用）
  _qiIncoming(f) {
    if (!this.qiList) return false;
    const sp = f.sprite;
    for (const q of this.qiList) {
      if (q.owner === f) continue;
      const towards = Math.sign(sp.x - q.x) === q.dir;
      if (towards && Math.abs(q.x - sp.x) < 260) return true;
    }
    return false;
  },

  // 对手 AI：能力按【难度档 cap】逐级点亮，数值按【难度档 mul】叠在 BT.AI 基线上。
  // 上级只有走位+平A；圣级+奥义；王级+反应防御；帝级+跳跃/惩罚；神级+缩地绕位。
  _controlAI(time) {
    const f = this.p2, sp = f.sprite, opp = this.p1;
    // ⚠️ 蓄力检查必须在 _canAct 之前：'charge' 不在 _canAct 白名单里，放到后面
    // 就会被 return 掉 —— AI 一旦起蓄就再也没人推进它，永远卡在蓄力姿势。
    if (f.charging) { this._tickCharge(f, time); return; }
    if (!this._canAct(f)) return;
    if (f.state === 'guard' && f.stateUntil && time < f.stateUntil) return;   // 同 _controlPlayer：定时防御态锁姿态
    const T = this._tierCfg(), cap = T.cap, mul = T.mul;
    const dx = opp.sprite.x - sp.x, dist = Math.abs(dx), dir = dx > 0 ? 1 : -1;

    // ── 神级·缩地绕位：玩家起蓄要把 AI 轰飞 → 抢在轰飞前缩地闪开（逆向拉开）──
    if (cap.blink && opp.charging && time > (f.mistReady || 0) && dist < 360) {
      this._doAIBlink(f, 'ground', -dir, time);
      return;
    }
    // ── 帝级+·跳跃升空：有剑气朝 AI 飞来 → 起跳躲贴地弹幕 ──
    if (cap.jump && this._qiIncoming(f) && sp.body.blocked.down) {
      sp.setVelocityY(-600);
      this._playAir(f);
      return;
    }

    // 放奥义（圣级+）：远距离优先，判在走位分支之前（见 BT.AI 注释）
    if (cap.ult && this._aiWantsUlt(f, time, dist, mul.ult)) { this._startAICharge(f, time); return; }

    // 交战距离要把【前冲步】算进去：招式自带 lunge 会主动贴上去（见旧注释）。
    const engage = f.def.reach + BT.ATTACK[f.id].lunge * 0.35;
    if (dist > engage) {
      sp.setVelocityX(f.def.speed * 0.85 * dir);
      this._setState(f, 'walk');
      return;
    }
    sp.setVelocityX(0);

    // ── 帝级+·惩罚窗口：玩家受击硬直/收招露破绽 → 不等决策间隔立即抢攻 ──
    const oppRecovering = opp.state === 'stun' || opp.state === 'hurt' ||
      (opp.state === 'attack' && time > opp.atkTo);
    if (cap.punish && oppRecovering && time > (f.punishReady || 0)) {
      f.punishReady = time + 260;
      this.aiNext = time + Phaser.Math.Between(BT.AI.decisionMin, BT.AI.decisionMax);
      this._attack(f);
      return;
    }

    if (time <= this.aiNext) { this._setState(f, 'idle'); return; }
    // 决策间隔按档位缩放，但【钳在 ≤760ms】：慢过受击硬直+无敌(680) AI 会轮不到出手。
    const decMin = Math.min(700, BT.AI.decisionMin * mul.decision);
    const decMax = Math.min(760, BT.AI.decisionMax * mul.decision);
    this.aiNext = time + Phaser.Math.Between(decMin, decMax);

    // 反应式防御（王级+，cap.react）：对手出招时高概率交防御，让三派防御机制被看见。
    // 低档无 react：只保留微弱的 guardBias（几乎不挡），逼战斗停在"平A 对拼"。
    const oppAttacking = opp.state === 'attack';
    const r = Math.random();
    const gOnAtk = BT.AI.guardOnAttack * mul.guardOnAttack;
    const gBias = BT.AI.guardBias * mul.guardBias;
    if (cap.react && oppAttacking && r < gOnAtk) this._startDefense(f, time);
    else if (r < gBias) this._startDefense(f, time);
    else this._attack(f);
  },

  // AI 是否该起蓄。四个闸门全过才放（见旧注释）；ultMul = 当前档位对 ultChance 的倍率。
  _aiWantsUlt(f, time, dist, ultMul) {
    if (time < (f.ultReady || 0)) return false;
    if (f.mp < BT.MP.ultCost) return false;
    if (dist < BT.AI.ultMinDist) return false;
    return Math.random() < BT.AI.ultChance * (ultMul == null ? 1 : ultMul);
  },

  // 当前播放帧的攻击距离：BT.REACH 是量图集得到的【逐帧刀长】（纹理像素，
  // 距格中心）。刀伸多远就打多远，不用静态 reach —— 静态值曾定在 86~94，
  // 实测挥砍帧刀尖能到 148~160，导致"要贴脸才打得到"。
  // 再加对手身体半宽，刀尖碰到躯干边缘即算命中。
  _bladeReach(f) {
    const tbl = BT.REACH[f.id];
    const fr = f.sprite.anims.currentFrame;
    const i = fr ? Math.min(tbl.length - 1, fr.index - 1) : 0;
    return tbl[i] * BT.SCALE + BT.BODY_HALF_W;
  },

  // 近战命中判定
  // 【扫掠区间】而非瞬时距离：无头 playtest 约 15fps，带 lunge 前冲时单帧可位移
  // 上百 px，瞬时判定会确定性 miss（tween 命中隧穿的同源问题）。
  // 这里比较 [上帧 dx, 本帧 dx] 两个端点，任一端进入刀长即判命中。
  _resolveMelee(f) {
    if (f.state !== 'attack') return;
    if (f.atkHit) return;
    // 【时间轴上的扫掠】——和上面的空间扫掠是同一类问题。
    // 无头 playtest 约 15fps，帧间隔 133ms，而剑神流命中窗口只有 100ms
    // （280~380）。用"当前时刻是否落在窗口内"判断，窗口整个夹在两帧之间时
    // 一次都不会被求值，那一刀凭空消失 —— 表现为 bot 猛挥空、五局输三局。
    // 改判"本帧时间区间 [上帧, 本帧] 是否与窗口相交"。
    const t1 = this.time.now, t0 = this._prevTime ?? t1;
    if (t1 < f.atkFrom || t0 > f.atkTo) return;

    const opp = this._opp(f), dir = f.facingLeft ? -1 : 1;
    const dx = opp.sprite.x - f.sprite.x;
    const prev = f.prevDx === null ? dx : f.prevDx;
    f.prevDx = dx;

    if (Math.abs(opp.sprite.y - f.sprite.y) >= 96) return;
    const reach = this._bladeReach(f);
    const near = Math.min(Math.abs(dx), Math.abs(prev));
    const inFront = Math.sign(dx) === dir || Math.sign(prev) === dir;
    if (inFront && near <= reach) {
      f.atkHit = true;
      this._hit(f, opp, this._damageOf(f), dir);
      if (f.riposteUntil) f.riposteUntil = 0;   // 反击加成一次性
    }
  },

  // 两人重叠时互推开。
  // ⚠️ 只在【双方都落地】时推：任一方腾空就放行，否则跳起来也会被推回去，
  // 玩家永远跨不过对手（换边只能靠对手自己走开）。
  _fighterPhysics() {
    if (!this.p1 || !this.p2) return;
    const a = this.p1.sprite, b = this.p2.sprite;
    if (!a.body.blocked.down || !b.body.blocked.down) return;
    const gap = 46;
    if (Math.abs(a.x - b.x) < gap && Math.abs(a.y - b.y) < 84) {
      const push = (gap - Math.abs(a.x - b.x)) / 2, s = a.x < b.x ? 1 : -1;
      a.x -= push * s; b.x += push * s;
    }
  },
});
