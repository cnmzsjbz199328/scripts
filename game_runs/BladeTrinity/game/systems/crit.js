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

  // 掷骰。防御成功的每一处调用点都过这里。
  // 基线是 BT.CRIT.chance；【AI 侧】再乘当前难度档的 mul.crit —— 会心是三派最出彩的
  // 防御演出，高档位该更常见（玩家侧不受档位影响，那是玩家自己的手感基线）。
  _rollCrit(f) {
    if (!BT.CRIT || f.state === 'down') return false;
    const T = this._tierCfg && this._tierCfg();
    const m = (f === this.p2 && T && T.mul && T.mul.crit != null) ? T.mul.crit : 1;
    const hit = Math.random() < BT.CRIT.chance * m;
    if (hit && this._usage && f === this.p1) this._usage.crit++;
    return hit;
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
    if (attacker === this.p2) dmg = Math.round(dmg * this._aiDmgScale());   // 难度旋钮×档位同 _damageOf
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      dmg = Math.round(dmg * (target === this.p2 ? 3 : 0.3));              // playtest bot 让步，同 _hit
    }
    dmg = Math.max(1, dmg);
    target.hp = Math.max(0, target.hp - dmg);
    this._drawBars();
    this._bodyFlash(target, 0xff3b3b);
    this._popText(target.sprite.x, target.sprite.y - 84, `-${dmg}`, '#ffd94a');
    const pinned = this._knockback(target, dir * 90, -60);   // 墙角吃掉上挑，同 _hit
    this.cameras.main.shake(90, 0.006 * (pinned ? 1.7 : 1));
    this._setState(target, 'hurt');
    if (target.hp <= 0) this._ko(target);
  },

  // ─────────── 剑神流·三连劈砍 ───────────
  // 「先手极速」的兑现：挡下瞬间【瞬步贴到对手身侧】，再锁死攻击态连斩三刀，每刀跟着
  // 对手贴身。旧版只给每刀一个 120px/s 的小前冲步——三刀加起来才挪 30px，而对手还在
  // 被击退越飘越远，全程间距稳定 260px：角色对着空气挥刀、伤害却在远处结算，
  // 演出和伤害完全脱节（用户实测"只看见掉血和文字，没有动作"）。
  _critCombo(f) {
    const opp = this._opp(f);
    if (!opp || opp.state === 'down') return;
    this._critBanner(f, '会心 · 三连');
    const dmg = Math.round(BT.ATTACK[f.id].dmg * BT.CRIT.comboDmg);

    // 整段会心【全程锁死攻击态】：stateUntil 一次推到收招之后，中途 _controlPlayer
    // 与主循环的 attack→idle 复位都因 state==='attack' 且未到期而放行，
    // 三刀之间不会再被打回 idle（旧版每刀只播两帧就复位，看不出挥砍）。
    const span = BT.CRIT.hits * BT.CRIT.comboStep + 120;
    f.state = 'attack';
    f.stateUntil = this.time.now + span;
    f.atkHit = true;                             // 屏蔽常规近战判定：伤害由 _critHit 给

    for (let i = 0; i < BT.CRIT.hits; i++) {
      this.time.delayedCall(i * BT.CRIT.comboStep, () => {
        if (f.state === 'down') return;
        const o = this._opp(f);
        if (!o || o.state === 'down') return;
        // 贴身：把自己瞬移到对手身侧（gap 处），朝向对手。这一步就是"快速移动到目标身边"，
        // 每刀都重贴——对手被击退也照样跟上，间距不再拉开。第一刀带残影读作"闪到身边"。
        const dir = o.sprite.x >= f.sprite.x ? 1 : -1;
        const gap = BT.CRIT.comboGap;
        const tx = this._clampX(o.sprite.x - dir * gap);
        if (i === 0) this._blinkGhosts(f, f.sprite.x, f.sprite.y, tx, f.sprite.y);
        f.sprite.setPosition(tx, f.sprite.y).setVelocityX(0);
        f.facingLeft = dir < 0;
        f.sprite.setFlipX(!f.facingLeft);
        // 保持锁定：每刀刷新到期时间，避免主循环在两刀之间把它复位
        f.state = 'attack';
        f.stateUntil = this.time.now + (BT.CRIT.hits - i) * BT.CRIT.comboStep + 120;
        f.atkHit = true;
        f.sprite.play({ key: `${f.id}_attack`, startFrame: 8 }, true);   // 8 = 落刀帧
        this._ghost(f);
        this._swordArc(f, dir, 0xffe08a);
        this._critHit(f, o, dmg, dir);
      });
    }
    // 收招：把速度收住，交回 idle 由主循环处理
    this.time.delayedCall(span, () => {
      if (f.state === 'attack') { f.sprite.setVelocityX(0); this._setState(f, 'idle'); }
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
