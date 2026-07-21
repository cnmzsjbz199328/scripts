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

  _startCharge(f, time) {
    f.charging = true;
    f.chargeFrom = time;
    f.state = 'charge';           // 不在 _canAct 白名单 → 蓄力中不可被自身其它输入打断
    f.stateUntil = 0;
    f.sprite.setVelocityX(0);
    f.sprite.play(`${f.id}_guard`, true);     // 无专用蓄力帧，借 guard 姿势占位
    this._chargeWave(f);                       // 起浪弹开近敌（无伤，只解贴身）
    this._showUltName(f);                       // 招式名一次性弹出（占位字体）
    f.auraG = this.add.graphics().setDepth(23);
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
    const released = !this.keys.L.isDown;
    if (released || f.mp <= 0) this._releaseCharge(f, time);
  },

  _releaseCharge(f, time) {
    const frac = Phaser.Math.Clamp((time - f.chargeFrom) / BT.CHARGE.fullMs, 0, 1);
    this._endCharge(f);
    f.state = 'idle'; f.stateUntil = 0;
    f.sprite.play(`${f.id}_idle`, true);
    // 低于 minFrac：只起浪弹开过、不出剑气（当脱身用，蓝照扣）
    if (frac >= BT.CHARGE.minFrac) this._fireQi(f, frac);
  },

  _endCharge(f) {
    f.charging = false;
    if (f.auraG) { f.auraG.destroy(); f.auraG = null; }
    if (f.ultText) { f.ultText.destroy(); f.ultText = null; }
  },

  _chargeWave(f) {
    const opp = this._opp(f);
    if (!opp) return;
    const dx = opp.sprite.x - f.sprite.x, dist = Math.abs(dx);
    if (dist < BT.CHARGE.waveRadius) {
      const dir = dx >= 0 ? 1 : -1;
      opp.sprite.setVelocityX(BT.CHARGE.wavePush * dir);   // 短推，无伤
    }
    this._flash(f.sprite.x, f.sprite.y - 36, 0xbfe4ff, 34, 3.6);
  },

  _showUltName(f) {
    const s = BT.SCHOOLS[f.id];
    f.ultText = this.add.text(f.sprite.x, f.sprite.y - 150, s.title, {
      fontFamily: 'Segoe UI, serif', fontSize: '30px', color: s.accent,
      fontStyle: 'bold italic', stroke: '#120a06', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(72).setScale(0.4);
    this.tweens.add({ targets: f.ultText, scale: 1, duration: 170, ease: 'Back.easeOut' });
  },

  _drawAura(f, time) {
    const frac = Phaser.Math.Clamp((time - f.chargeFrom) / BT.CHARGE.fullMs, 0, 1);
    const g = f.auraG; if (!g) return;
    g.clear();
    const s = BT.SCHOOLS[f.id];
    const pulse = 0.6 + 0.4 * Math.sin(time / 60);
    const r = 30 + 40 * frac;
    g.lineStyle(3 + 3 * frac, s.barColor, 0.5 * pulse + 0.2);
    g.strokeCircle(f.sprite.x, f.sprite.y - 36, r);
  },

  // ─────────── 剑气 ───────────
  _fireQi(f, frac) {
    if (!this.qiList) this.qiList = [];
    const dir = f.facingLeft ? -1 : 1;
    const x = f.sprite.x + dir * 60, y = f.sprite.y - 36;
    this.qiList.push({
      x, prevX: x, y, dir, owner: f, school: f.id, frac,
      born: this.time.now, reflected: false, lastHit: null,
      dmg: Math.round(BT.QI.dmg[f.id] * frac),
      r: BT.QI.baseR * (0.5 + 0.5 * frac),
      g: this.add.graphics().setDepth(26),
    });
    window.GameAudio && GameAudio.play && GameAudio.play('slash');
  },

  _tickQi(time, delta) {
    if (!this.qiList || !this.qiList.length) return;
    const dts = delta / 1000;
    for (let i = this.qiList.length - 1; i >= 0; i--) {
      const q = this.qiList[i];
      q.prevX = q.x;
      q.x += q.dir * BT.QI.speed * dts;
      const lifeF = (time - q.born) / BT.QI.life;

      const target = q.owner === this.p1 ? this.p2 : this.p1;
      const verdict = this._qiVsTarget(q, target);
      if (verdict === 'despawn') { this._despawnQi(q, i); continue; }

      this._drawQi(q, lifeF);
      if (lifeF >= 1 || q.x < -100 || q.x > BT.GAME_W + 100) this._despawnQi(q, i);
    }
  },

  // 返回 'despawn' 表示剑气消耗掉了；null 表示继续飞（穿过 / 反弹后 / 未命中）
  _qiVsTarget(q, target) {
    if (!target || target.state === 'down') return null;
    const tx = target.sprite.x, ty = target.sprite.y - 36;
    if (Math.abs(q.y - ty) > BT.QI.hitH) return null;
    // 横向扫掠：目标躯干 x 是否落在 [上帧,本帧]±半径 内（防高速隧穿）
    const lo = Math.min(q.prevX, q.x) - q.r, hi = Math.max(q.prevX, q.x) + q.r;
    if (tx < lo || tx > hi) return null;
    if (q.lastHit === target) return null;    // 这一发已对该目标结算过

    // 北神闪避无敌：剑气【穿过】，不消散、不伤
    if (this.time.now < target.iframeUntil) {
      target.dodgedSomething = true;
      this._popText(target.sprite.x, target.sprite.y - 84, '逸らし', '#c0a0ff');
      q.lastHit = target;
      return null;
    }

    const guardingFront = target.state === 'guard' && target.facingLeft === (q.dir > 0);

    // 水神受流：反弹（反弹的不可再反弹，伤害保持原值）
    if (guardingFront && target.def.defense === 'parry' && !q.reflected) {
      q.dir *= -1; q.owner = target; q.school = target.id;
      q.reflected = true; q.lastHit = null;
      q.x += q.dir * 12; q.prevX = q.x;
      this._popText(target.sprite.x, target.sprite.y - 84, '受け流し·返', '#8fe0ff');
      this._flash(target.sprite.x, target.sprite.y - 36, 0x8fe0ff, 22, 3.2);
      this.cameras.main.shake(90, 0.006);
      return null;
    }

    // 剑神硬扛：减伤 + 推退，剑气消散
    if (guardingFront && target.def.defense === 'brace') {
      this._applyQiDamage(q, target, Math.round(q.dmg * BT.DEFENSE.brace.reduce), true);
      return 'despawn';
    }

    // 其余（没防 / 防错向 / 北神未在无敌帧）→ 全伤消散
    this._applyQiDamage(q, target, q.dmg, false);
    return 'despawn';
  },

  _applyQiDamage(q, target, dmg, blocked) {
    if (this.time.now < target.invuln) { q.lastHit = target; return; }
    if (q.owner === this.p2) dmg = Math.round(dmg * BT.AI.damageScale);   // AI 一侧难度折扣
    target.hp = Math.max(0, target.hp - dmg);
    target.invuln = this.time.now + BT.INVULN;
    q.lastHit = target;
    this._drawBars();
    const dir = q.dir;
    target.sprite.setVelocity(dir * (blocked ? BT.QI.bracePush : 170), blocked ? 0 : -90);
    this._flash(target.sprite.x + dir * 8, target.sprite.y - 36,
      blocked ? 0x9fd0ff : 0xff5544, blocked ? 12 : 18, blocked ? 2 : 3);
    this.cameras.main.shake(blocked ? 70 : 150, blocked ? 0.004 : 0.009);
    this._popText(target.sprite.x, target.sprite.y - 84, blocked ? '力受け' : `-${dmg}`,
      blocked ? '#ffd28a' : '#ff8a6a');
    if (!blocked) this._setState(target, 'hurt');
    if (target.hp <= 0) this._ko(target);
  },

  // 占位月牙：竖椭圆气团 + 前缘白芯。真·前厚后稀疏的月牙在特效层再做。
  _drawQi(q, lifeF) {
    const s = BT.SCHOOLS[q.school];
    const grow = 1 + (BT.QI.growth - 1) * Phaser.Math.Clamp(lifeF, 0, 1);
    const r = q.r * grow, a = 0.85 * (1 - Phaser.Math.Clamp(lifeF, 0, 1));
    const g = q.g; g.clear();
    g.fillStyle(s.barColor, a * 0.7);
    g.fillEllipse(q.x, q.y, r * 0.85, r * 2.1);
    g.lineStyle(3, 0xffffff, a);
    g.beginPath();
    g.moveTo(q.x + q.dir * r * 0.4, q.y - r * 0.95);
    g.lineTo(q.x + q.dir * r * 0.4, q.y + r * 0.95);
    g.strokePath();
  },

  _despawnQi(q, i) {
    q.g.destroy();
    this.qiList.splice(i, 1);
  },

  _clearQi() {
    if (this.qiList) { this.qiList.forEach((q) => q.g.destroy()); this.qiList = []; }
    for (const f of (this.fighters || [])) if (f.charging) this._endCharge(f);
  },
});
