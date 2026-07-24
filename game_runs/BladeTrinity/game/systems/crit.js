/* BladeTrinity — 会心（防御暴击）。
 *
 * 三派【防御成功】时掷骰，中了就打出各自的会心演出。数值口径见 BT.CRIT：
 * 一律【三次伤害】而不是一次大的 —— 三下才有连段/连弹/回旋的观感，
 * 且每一下都比平A小，总量压在 1.5~2 记平A，不会让防御变成最优解。
 *
 *   brace   剑神 → 立刻转身【三连劈砍】
 *   parry   水神 → 把对方那道剑气【连弹三道】回去；近战会心则是三段返伤
 *   counter 北神 → 飞刀挂【回旋镖】：穿过 → 回旋 → 再穿 → 再回旋，共三次命中
 *
 * 会心的伤害走 _critHit 直接结算（绕过受击无敌与防御分流），理由见 BT.CRIT 注释：
 * 走正常 _hit 的话连段第二、三下会被 300ms 无敌吃掉，"三次伤害"名存实亡。
 */
Object.assign(BladeTrinityScene.prototype, {

  // 掷骰。防御成功的每一处调用点都过这里，概率只有 BT.CRIT.chance 一个旋钮。
  _rollCrit(f) {
    if (!BT.CRIT || f.state === 'down') return false;
    return Math.random() < BT.CRIT.chance;
  },

  // 会心提示：字 + 描边猛顶 + 一记震屏。描边复用防御那套，不另起光效。
  _critBanner(f, text) {
    this._popText(f.sprite.x, f.sprite.y - 108, text || '会心！', '#ffd94a');
    this._outlinePunch(f);
    this.cameras.main.shake(110, 0.007);
  },

  // 会心伤害的统一结算口：【绕过受击无敌与防御分流】，只认倒地。
  // 这是读招成功的奖励演出，判定上当作"必中的一段脚本"，不再走一次防御博弈。
  _critHit(attacker, target, dmg, dir) {
    if (!target || target.state === 'down') return;
    if (attacker === this.p2) dmg = Math.round(dmg * BT.AI.damageScale);   // 难度旋钮同 _damageOf
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      dmg = Math.round(dmg * (target === this.p2 ? 3 : 0.3));              // playtest bot 让步，同 _hit
    }
    dmg = Math.max(1, dmg);
    target.hp = Math.max(0, target.hp - dmg);
    this._drawBars();
    this._bodyFlash(target, 0xff3b3b);
    this._popText(target.sprite.x, target.sprite.y - 84, `-${dmg}`, '#ffd94a');
    target.sprite.setVelocity(dir * 90, -60);
    this.cameras.main.shake(90, 0.006);
    this._setState(target, 'hurt');
    if (target.hp <= 0) this._ko(target);
  },

  // ─────────── 剑神流·三连劈砍 ───────────
  // 挡下的瞬间转向对手连斩三刀。每刀都重播 attack 行（从落刀帧起播，省掉预备段——
  // 会心是"抓到破绽立刻打"，走完整预备就慢得像另起一招了）。
  _critCombo(f) {
    const opp = this._opp(f);
    if (!opp || opp.state === 'down') return;
    this._critBanner(f, '会心 · 三连');
    const a = BT.ATTACK[f.id], dmg = Math.round(a.dmg * BT.CRIT.comboDmg);
    for (let i = 0; i < BT.CRIT.hits; i++) {
      this.time.delayedCall(i * BT.CRIT.comboStep, () => {
        if (f.state === 'down') return;
        const o = this._opp(f);
        if (!o || o.state === 'down') return;
        // 每刀重新取向：对手会被击退，三刀之间朝向可能反过来
        const dir = o.sprite.x >= f.sprite.x ? 1 : -1;
        f.facingLeft = dir < 0;
        f.sprite.setFlipX(!f.facingLeft);
        f.state = 'attack';
        f.stateUntil = this.time.now + BT.CRIT.comboStep + 60;
        f.atkHit = true;                       // 屏蔽常规近战判定：伤害由 _critHit 给
        f.sprite.play({ key: `${f.id}_attack`, startFrame: 8 }, true);   // 8 = 落刀帧
        f.sprite.setVelocityX(BT.CRIT.comboLunge * dir);
        this._ghost(f);
        this._swordArc(f, dir, 0xffe08a);
        this._critHit(f, o, dmg, dir);
      });
    }
    // 收招：最后一刀之后把速度收住，交回 idle 由主循环处理
    this.time.delayedCall(BT.CRIT.hits * BT.CRIT.comboStep, () => {
      if (f.state === 'attack') f.sprite.setVelocityX(0);
    });
  },

  // ─────────── 水神流·连弹三道 ───────────
  // 会心时把对方那道剑气【复制成三道】依次弹回去。
  // ⚠️ 不能靠"让同一道剑气来回反弹三次"实现：反弹回去的剑气打的是对手，而对手
  // 不是水神流，不会再把它弹回来 —— 那样永远只有一次。所以是连发三道。
  _critVolley(f, q) {
    this._critBanner(f, '会心 · 连弹');
    // 先把这一道的伤害压下来，再复制——三道满蓄剑气会一口气抹掉八成血条（见 BT.CRIT 注释）
    q.dmg = Math.max(1, Math.round(q.dmg * BT.CRIT.volleyDmgMul));
    for (let i = 1; i < BT.CRIT.hits; i++) {
      this.time.delayedCall(i * BT.CRIT.volleyStep, () => {
        if (f.state === 'down' || !this.qiList) return;
        this._cloneQi(q, f);
      });
    }
  },

  // 复制一道飞行剑气（用于水神会心连弹）。位置贴着施术者，方向/外观沿用原弹。
  _cloneQi(src, owner) {
    const dir = src.dir;
    const c = Object.assign({}, src, {
      x: owner.sprite.x + dir * 60, y: src.y,
      owner, born: this.time.now, age: 0, lastHit: null,
      history: [], parts: [],
      gGlow: this.add.graphics().setDepth(25).setBlendMode(Phaser.BlendModes.ADD),
      g: this.add.graphics().setDepth(26),
    });
    c.prevX = c.x;
    this.qiList.push(c);
    this._qiBurst(c.x, c.y, BT.SCHOOLS[c.school].barColor);
  },

  // 水神近战会心：没有剑气可弹，改成三段返伤，观感对齐"连弹"
  _critMeleeReflect(f, attacker, dmg) {
    this._critBanner(f, '会心 · 三重返');
    const per = Math.round(dmg * BT.CRIT.meleeReflectMul);
    for (let i = 0; i < BT.CRIT.hits; i++) {
      this.time.delayedCall(i * BT.CRIT.volleyStep, () => {
        if (f.state === 'down') return;
        const dir = attacker.sprite.x >= f.sprite.x ? 1 : -1;
        this._critHit(f, attacker, per, dir);
      });
    }
  },
});
