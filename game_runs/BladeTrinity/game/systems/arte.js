/* BladeTrinity — 流派秘技（ARTE）。神级 AI 会用，玩家选到该流派也能放。
 *
 * 目前只有北神流「幻剑」；剑神的秘技位子留着（水神那记是 6 秒领域「剥夺剑界」，
 * 生命周期自成一套，在 systems/realm.js，不在本文件）。反制方式的约定见 BT.ARTE 顶部。
 *
 * ─── 幻剑的设计要点 ───
 * 「三体挥刀、只有本体有判定」如果真的分辨不出来，就不是心理战而是抛硬币。
 * 所以这里有三条【必须成套存在】的规则：
 *   ① 分身去饱和、本体满色（tellGray）—— 能读但要练的破绽，玩家输了知道自己该看出来
 *   ② 打中分身即溃散 —— 猜对猜错都有【即时反馈】，玩家才学得会怎么读
 *   ③ 分身跟着本体走 —— 少了这条，"谁在动谁是真的"会盖掉①，见 _tickPhantom
 * 少了②，三个人一直站着，玩家永远不知道自己判断对没对，练不出来也就等于没有破绽。
 *
 * ⚠️ 分身【没有伤害判定、也不挡刀】：它是纯信息战，不是三倍压制。
 * 给分身加判定会让这招从"混淆"变成"数值碾压"，那是另一个游戏。
 */
Object.assign(BladeTrinityScene.prototype, {

  _arteCfg(f) { return BT.ARTE && BT.ARTE[f.id]; },

  // 这一方此刻能不能放秘技。
  // AI 侧多一道 cap.arte（只有神级会用）；玩家侧不看档位，选到该流派就能放。
  _canArte(f, time) {
    const a = this._arteCfg(f);
    if (!a) return false;
    if (f === this.p2 && !this._tierCfg().cap.arte) return false;
    if (f.phantom || time < (f.arteReady || 0)) return false;
    if (a.kind === 'realm' && this.realm) return false;   // 场上一次只允许一个剑界
    return f.mp >= a.cost;
  },

  // ─────────── 秘技分派 ───────────
  // 三派【同一个输入形状】：出刀后按住 J 不放，holdMs 之后那一刀转成秘技。
  // 玩家侧由 loop.js 的按键分支调进来，AI 侧由 combat.js 的 _attack 掷骰调进来 ——
  // 两边都只认这一个入口，各流派的差别在这里分岔，别在调用侧写 if (id === 'north')。
  //
  // ⚠️ 别改成"长按 J 直接触发秘技"（不挂在一记已出手的平A 上）。_controlPlayer 里平A
  // 走的是 JustDown，按下那一刻刀就已经挥出去了；要做成独立起手就得把平A 推迟到松手
  // 判定之后（170~200ms），那是拿全局手感换一个招（[[fighting-input-tap-vs-hold]]
  // 记着的同一类坑）。现在：点按 = 普通平A（手感一点没变），按住 = 那一刀转秘技。
  _startArte(f, time) {
    const a = this._arteCfg(f);
    if (!a) return;
    if (a.kind === 'realm') return this._startRealmArte(f, time);
    return this._startPhantom(f, time);
  },

  // 通用扣费：蓝、冷却、遥测。各招的 _startXxx 一进来就调它。
  _payArte(f, time) {
    const a = this._arteCfg(f);
    f.mp = Math.max(0, f.mp - a.cost);
    f.arteReady = time + a.cd;
    this._drawBars();
    if (this._usage && f === this.p1) this._usage.arte = (this._usage.arte || 0) + 1;
  },

  // ── 水神流 · 剥夺剑界 ──（表现层与推进在 systems/realm.js）
  _startRealmArte(f, time) {
    this._payArte(f, time);
    this._realmStart(f, time);
  },

  // ─────────── 北神流 · 幻剑 ───────────
  // 观感上正是"北神流挥刀挥出了残影"，比凭空分身更贴「虚実」。
  _startPhantom(f, time) {
    const a = this._arteCfg(f);
    if (!a) return;
    this._payArte(f, time);

    const sp = f.sprite, dir = f.facingLeft ? -1 : 1;
    // 本体【随机换到三个身位之一】——不然本体永远在原地，玩家记住位置就破了。
    const slots = [];
    for (let i = 0; i < a.clones + 1; i++) slots.push(i - a.clones / 2);
    Phaser.Utils.Array.Shuffle(slots);
    const realSlot = slots.pop();

    // 三体【整组平移】进合法区间，不是各自 _clampX。逐个钳会在墙角把两三个身位压到
    // 同一个 x 上，间距塌掉 —— 而"三个等距身位"正是这招读起来像残影的全部依据。
    const half = (a.clones / 2) * a.spread;
    const baseX = Phaser.Math.Clamp(sp.x, BT.EDGE_X + half, BT.GAME_W - BT.EDGE_X - half);
    sp.setPosition(baseX + realSlot * a.spread, sp.y);

    const clones = slots.map((s) => {
      const g = this.add.image(baseX + s * a.spread, sp.y, f.id, sp.frame.name)
        .setScale(BT.SCALE).setFlipX(sp.flipX).setDepth(sp.depth).setAlpha(a.cloneAlpha);
      // 【破绽】分身去饱和，本体保持满色 —— 详见 _tickPhantom 顶部为什么不用描边。
      if (g.postFX) g.postFX.addColorMatrix().grayscale(a.tellGray);
      // 相对本体的身位差。每帧照这个差跟着本体走（见 _tickPhantom），
      // 分身才会和本体一起前冲；不跟就等于把"谁在动谁是真的"写在脸上。
      g.dx = g.x - sp.x;
      return g;
    });
    f.phantom = { clones, dir, until: time + BT.ATTACK[f.id].dur };
    this._popText(sp.x, sp.y - 96, '幻剣！', '#c0a0ff');
    window.GameAudio && GameAudio.play && GameAudio.play('morph');
  },

  // 每帧维护：分身跟着本体【同帧同位移】、招式结束即收。
  //
  // ⚠️ 由 POST_UPDATE 调用，不是 update()。Arcade 在 update() 之后才移动 body，
  // 在 update() 里定位分身就恒定落后一个物理步 —— 前冲那几帧三个身位的间距会忽宽忽窄。
  //
  // ⚠️ 跟位移是【这招成立的前提】而不是打磨。首版只同步了帧和朝向：而 _attack 会在
  // from-40 时给本体一记前冲步（setVelocityX(lunge*dir)，北神 lunge=130），于是本体
  // 挥刀途中往前滑 130px、两个分身钉在原地 —— 玩家根本不用看破绽，【谁在动谁就是真的】。
  // 那比 1/3 抛硬币更糟：它是个 100% 可读的假破绽，把设计好的心理战整个盖掉了。
  _tickPhantom(f, time) {
    const p = f.phantom;
    if (!p) return;
    const a = this._arteCfg(f), sp = f.sprite;
    // 被打断（受击/硬直/倒地）也要收，否则分身会留在场上
    if (time > p.until || f.state === 'hurt' || f.state === 'stun' || f.state === 'down') {
      this._endPhantom(f);
      return;
    }
    for (const g of p.clones) {
      if (!g.active) continue;
      g.setFrame(sp.frame.name).setFlipX(sp.flipX).setPosition(sp.x + g.dx, sp.y);
    }
    // 【破绽】不在这里做 —— 分身在 _startPhantom 里就挂了去饱和的 ColorMatrix，
    // "彩色的那个是本体"整招期间恒成立，不用每帧维护。
    //
    // ⚠️ 首版的破绽是给本体挂一层 tellAlpha 0.22 的紫描边，【截图目检确认看不见】：
    // 三派角色是满色插画（条纹和服），一层 22% 的淡紫描在花衣服边上等于没有，
    // 正是 [[phaser-sprite-outline-technique]] 记的那个坑。改成去饱和有三个好处：
    //   ① 颜色差比轮廓差好读得多，尤其在这种高饱和素材上
    //   ② 和水神流「剥夺剑界」共用一条规则「彩色 = 真的」，玩家学一次用两次
    //   ③ tellGray 仍然是同一个难度旋钮（0=完全分不出，1=分身全黑白一眼认出）
  },

  _endPhantom(f) {
    const p = f.phantom;
    if (!p) return;
    f.phantom = null;
    for (const g of p.clones) {
      if (!g.active) continue;
      this.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
    }
    // 破绽是分身自己身上的 ColorMatrix，随分身一起销毁 —— 本体身上没有要清的东西。
  },

  // 对手的刀扫到分身 → 分身溃散。
  // 这是玩家【学会读本体】的唯一反馈来源：猜错了当场就知道猜错了。
  // 由 _resolveMelee 在真正的命中判定【之后】调用（本体优先，打中本体就不管分身了）。
  _cleaveClones(attacker) {
    const foe = this._opp(attacker), p = foe && foe.phantom;
    if (!p) return;
    const dir = attacker.facingLeft ? -1 : 1;
    const reach = this._bladeReach(attacker), sp = attacker.sprite;
    for (const g of p.clones) {
      if (!g.active) continue;
      const dx = g.x - sp.x;
      if (Math.sign(dx) !== dir || Math.abs(dx) > reach) continue;
      if (Math.abs(g.y - sp.y) >= 96) continue;
      g.active = false;
      this._popText(g.x, g.y - 84, '虚', '#8a7ab0');
      this.tweens.add({ targets: g, alpha: 0, scaleX: BT.SCALE * 1.15, scaleY: BT.SCALE * 1.15,
        duration: 180, onComplete: () => g.destroy() });
    }
  },
});
