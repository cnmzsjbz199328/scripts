/* BladeTrinity — 流派秘技（ARTE）。神级 AI 会用，玩家选到该流派也能放。
 *
 * 目前只有北神流「幻剑」；剑神/水神的秘技位子留着（见 BT.ARTE 顶部的反制方式约定）。
 *
 * ─── 幻剑的设计要点 ───
 * 「三体挥刀、只有本体有判定」如果真的分辨不出来，就不是心理战而是抛硬币。
 * 所以这里有两条【必须成对存在】的规则：
 *   ① 本体带一层极淡描边（tellAlpha）—— 能读但要练的破绽，玩家输了知道自己该看出来
 *   ② 打中分身即溃散 —— 猜对猜错都有【即时反馈】，玩家才学得会怎么读
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
    return f.mp >= a.cost;
  },

  // ─────────── 北神流 · 幻剑 ───────────
  // 触发时机【刻意挂在一记已经出手的平A 上】，不是独立起手。
  //
  // ⚠️ 别改成"长按 J 直接触发秘技"。_controlPlayer 里平A 走的是 JustDown，按下那一刻
  // 刀就已经挥出去了；要做成独立起手就得把平A 推迟到松手判定之后（约 170ms），
  // 那是拿全局手感换一个招（[[fighting-input-tap-vs-hold]] 记着的同一类坑）。
  // 现在的做法：点按 = 普通平A（手感一点没变），按住不放 = 挥到一半【化影】成三体。
  // 观感上正是"北神流挥刀挥出了残影"，比凭空分身更贴「虚実」。
  _startPhantom(f, time) {
    const a = this._arteCfg(f);
    if (!a) return;
    f.mp = Math.max(0, f.mp - a.cost);
    f.arteReady = time + a.cd;
    this._drawBars();

    const sp = f.sprite, dir = f.facingLeft ? -1 : 1;
    // 本体【随机换到三个身位之一】——不然本体永远在原地，玩家记住位置就破了。
    const slots = [];
    for (let i = 0; i < a.clones + 1; i++) slots.push(i - a.clones / 2);
    Phaser.Utils.Array.Shuffle(slots);
    const realSlot = slots.pop();

    const baseX = sp.x;
    sp.setPosition(this._clampX(baseX + realSlot * a.spread), sp.y);

    const clones = slots.map((s) => {
      const g = this.add.image(this._clampX(baseX + s * a.spread), sp.y, f.id, sp.frame.name)
        .setScale(BT.SCALE).setFlipX(sp.flipX).setDepth(sp.depth).setAlpha(a.cloneAlpha);
      return g;
    });
    f.phantom = { clones, dir, until: time + BT.ATTACK[f.id].dur };
    this._popText(sp.x, sp.y - 96, '幻剣！', '#c0a0ff');
    window.GameAudio && GameAudio.play && GameAudio.play('morph');
    if (this._usage && f === this.p1) this._usage.arte = (this._usage.arte || 0) + 1;
  },

  // 每帧维护：分身跟着本体播同一帧、本体挂破绽描边、招式结束即收。
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
      g.setFrame(sp.frame.name).setFlipX(sp.flipX);
    }
    // 【破绽】本体的极淡描边。复用防御/蓄力那套八向偏移，视觉语言统一：
    // 描边 = 这个人身上有真东西。alpha 由 BT.ARTE.north.tellAlpha 单独控，是难度旋钮。
    this._outlineHold(f, a.color, a.tellR);
    if (f.guardAura) f.guardAura.forEach((g) => g.setAlpha(a.tellAlpha));
  },

  _endPhantom(f) {
    const p = f.phantom;
    if (!p) return;
    f.phantom = null;
    for (const g of p.clones) {
      if (!g.active) continue;
      this.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
    }
    // 描边由 _tickDefense 的常规清理接手；这里直接收掉避免留一帧
    if (!f.charging && f.state !== 'guard') this._clearOutlineHold(f);
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
