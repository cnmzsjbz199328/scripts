/* BladeTrinity — 流派秘技（ARTE）。帝级起的 AI 会用（神级还会挑时机用），
 * 玩家选到该流派也能放。
 *
 * 本文件装两记：北神流「幻剑」与剑神流「一の太刀·抜刀」。
 * 水神流那记是 6 秒领域「剥夺剑界」，生命周期/相机/shader 自成一套，在 systems/realm.js。
 * 三招【反制方式必须各异】的约定见 BT.ARTE 顶部：看破 / 打断 / 停手。
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
  // AI 侧多一道 cap.arte（帝级起才会用）；玩家侧不看档位，选到该流派就能放。
  _canArte(f, time) {
    const a = this._arteCfg(f);
    if (!a) return false;
    if (f === this.p2 && !this._tierCfg().cap.arte) return false;
    if (f.phantom || time < (f.arteReady || 0)) return false;
    if (a.kind === 'realm' && this.realm) return false;   // 场上一次只允许一个剑界
    return f.mp >= a.cost;
  },

  // ─────────── AI 侧：上膛的那一刀每帧推进 ───────────
  // combat.js _attack 掷中秘技时只置 f.arteArmed；出刀满 holdMs 就在这里转招。
  // 返回 true = 本帧已转招（_controlAI 直接 return）。
  //
  // ⚠️ 必须排在 _controlAI 的【反应层之前】。反应层每帧跑，高档 reactDelay 只有 70ms，
  // 又有人机特权 guardCancel（平A 任意时刻可弃招回防）—— 排在它之后，上膛后那
  // 170~200ms 里探到任何威胁都会把这一刀收掉，秘技就永远转不成。
  // 同理 routine.js _aiAbortForGuard 对 arteArmed 的这一刀【不弃】，两处是一套。
  _aiTickArte(f, time) {
    if (!f.arteArmed) return false;
    const a = this._arteCfg(f);
    // 这一刀没了（挨打/被打断/收招结束）→ 上膛作废，下一刀重新掷骰
    if (!a || f.state !== 'attack') { f.arteArmed = false; return false; }
    if (time - (f.atkStart || 0) < a.holdMs) return false;
    f.arteArmed = false;
    if (!this._canArte(f, time)) return false;    // 这段时间里蓝被打掉了之类
    this._startArte(f, time);
    return true;
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
    if (a.kind === 'iai') return this._startIai(f, time);
    return this._startPhantom(f, time);
  },

  // 通用扣费：蓝、冷却、遥测。各招的 _startXxx 一进来就调它。
  _payArte(f, time) {
    const a = this._arteCfg(f);
    f.mp = Math.max(0, f.mp - a.cost);
    // 冷却是秘技频率的真正上限（抜刀 6000 / 剑界 14000，一场 40~70s）。
    // 档位可用 arteCdMul 压短（只作用于 AI 一侧：玩家的冷却不该跟着难度变）。
    f.arteReady = time + a.cd * (f === this.p2 ? (this._tierCfg().arteCdMul || 1) : 1);
    this._drawBars();
    // 遥测分两条：arte = 玩家用了几次（技能覆盖度断言），aiArte = 电脑用了几次。
    // ⚠️ aiArte 是【必需】的验收口：秘技是高档 AI 的独占内容，没有这个计数就只能靠
    // 人眼数"这一场它放了没有"，而这招正好又踩过一次无头计时坑（见 combat.js _attack）。
    if (this._usage) {
      const k = f === this.p1 ? 'arte' : 'aiArte';
      this._usage[k] = (this._usage[k] || 0) + 1;
    }
  },

  // ── 水神流 · 剥夺剑界 ──（表现层与推进在 systems/realm.js）
  _startRealmArte(f, time) {
    this._payArte(f, time);
    this._realmStart(f, time);
  },

  // ─────────── 剑神流 · 一の太刀·抜刀 ───────────
  // 刀停在半空不落 = 居合架式。松手即抜刀：瞬发、横贯、不可防御。
  // 设计与三重代价见 BT.ARTE.sword 的注释（那一段是这一招的说明书，改前先读）。
  _startIai(f, time) {
    const a = this._arteCfg(f);
    this._payArte(f, time);
    // 预示线的 depth 22 要压过前景层（fore depth 20）—— 见 _drawIaiTell 的注释
    f.iai = { from: time, tier: 0, line: this.add.graphics().setDepth(22) };
    // 【不走 _setState】：图集没有居合行，也不该退回 guard 姿势 —— 直接把当前这一刀
    // 的动画【冻在当前帧】，观感正是"刀举到一半停住了"，比借用防御姿势贴切得多。
    f.state = 'iai';
    f.stateUntil = 0;
    f.sprite.setVelocityX(0);
    f.sprite.anims.pause();
    // AI 侧没有键盘，架式时长在这里掷定，_tickIai 到点自动出刀
    if (f === this.p2) f.iaiRelease = time + Phaser.Math.Between(a.aiHoldMin, a.aiHoldMax);
    this._popText(f.sprite.x, f.sprite.y - 150, '一の太刀', '#ffe6a8');
    window.GameAudio && GameAudio.play && GameAudio.play('charge');
  },

  // 玩家侧的架式接管：由 _controlPlayer 在最前面调，返回 true = 这一帧独占输入。
  _handleIai(f, time) {
    if (!f.iai) return false;
    this._tickIai(f, time);
    return !!f.iai || f.state === 'iai';
  },

  // 每帧推进：算当前档、画预示、判打断、判松手。玩家与 AI 共用。
  _tickIai(f, time) {
    const it = f.iai, a = this._arteCfg(f);
    if (!it || !a) return;
    // 【被打断】state 被 hurt/stun/down 改走 → 架式作废，蓝照扣，另加一段更长的硬直。
    // 这是这一招唯一的反制方式，也是它敢做成不可防御的理由（见 BT.ARTE.sword ②）。
    if (f.state !== 'iai' || this.phase !== 'fight') {
      const broken = f.state === 'hurt' || f.state === 'stun';
      this._endIai(f);
      if (broken) {
        this._setState(f, 'stun', a.breakStun);
        this._popText(f.sprite.x, f.sprite.y - 108, '抜刀·崩', '#7a90a0');
      }
      return;
    }
    const el = time - it.from;
    let tier = 0;
    for (let i = 0; i < a.tiers.length; i++) if (el >= a.tiers[i].at) tier = i;
    if (tier !== it.tier) {                       // 升档：给一记听得见/看得见的反馈
      it.tier = tier;
      this._outlinePunch(f);
      window.GameAudio && GameAudio.play && GameAudio.play('charge');
    }
    f.sprite.setVelocityX(0);
    // 架式描边：半径随档位涨（超过蓄剑气的上限），一眼看出这是更大的东西、蓄到哪了。
    // 颜色用饱和的流派主色而不是白刃的浅金 —— 理由见 BT.ARTE.sword.tellColor。
    this._outlineHold(f, a.tellColor, a.tellR * (1 + 0.25 * f.iai.tier));
    this._drawIaiTell(f, a, time);

    // 松手 = 抜刀。玩家看 J 键；AI 看 _startIai 掷定的 iaiRelease。上限一到强制出刀。
    const released = f === this.p1 ? !this.keys.J.isDown : time >= (f.iaiRelease || 0);
    if (released || el >= a.maxMs) this._iaiStrike(f, time);
  },

  // 【预示斩击范围】：脚下一条随蓄势变长的地面线。
  //
  // ⚠️ 这条线是【必需的信息公开】，不是装饰。不给它，玩家不知道该退还是该冲；给了之后
  // "退到线外"和"冲进去打断"变成两个都成立的选择（前者稳、后者赚）。本项目铁律
  // 「没有预告的瞬移背刺不是难度，是耍赖」对玩家自己的招也一样成立 —— AI 摆架式时，
  // 这条线就是玩家读它的唯一依据。
  // ⚠️ depth 22 与 y = FLOOR_Y-20 都不是随手取的，别按"画在地上所以压低一点"退回去：
  // 前景层（BG_SETS 的 fore）depth 20、盖到 FLOOR_Y 上方 10px 用来藏脚踝 —— 首版的
  // depth 9 / FLOOR_Y-4 两个条件都踩中，整条线会躲在那块木板后面。
  //
  // 验收这条线【不要靠眼睛看整图】：4px 的线在 960×540 缩览里三次都被我看漏，
  // 一路误判成"没画出来"。用 scratchpad/iai-check.mjs 里那段 snapshotArea 读回像素
  // （沿这一行数红色像素）才是可靠判据。
  _drawIaiTell(f, a, time) {
    const g = f.iai.line; if (!g) return;
    const sp = f.sprite, dir = f.facingLeft ? -1 : 1;
    const reach = a.tiers[f.iai.tier].reach;
    const y = BT.FLOOR_Y - 20;   // 前景木板顶边在 FLOOR_Y-10，得再抬高才露得出来
    // ⚠️ 呼吸幅度【故意很小】。首版 0.55±0.45 的低谷是 alpha 0.10：亮色那一道几乎消失，
    // 只剩下暗色垫底，而垫底在道场那块深木纹上等于没有 —— 于是这条预示线【在半个周期里
    // 是不存在的】。预示信息不能跟着呼吸忽有忽无，脉动只该改亮度不该改可读性。
    const pulse = 0.8 + 0.2 * Math.sin(time / 90);
    const end = sp.x + dir * reach;
    g.clear();
    // 先铺一道暗色垫底再画亮色：这条线要同时压在深木纹（近景木板）和浅纸门上，
    // 单色细线在其中一种上必然吃掉。垫底之后两种底都读得出，不必为背景另调颜色。
    g.lineStyle(9, 0x1a0c08, 0.5);
    g.lineBetween(sp.x, y, end, y);
    g.lineStyle(4, a.tellColor, 0.95 * pulse);
    g.lineBetween(sp.x, y, end, y);
    // 刀锋落点：末端一记竖标（同样垫底）
    g.lineStyle(10, 0x1a0c08, 0.45);
    g.lineBetween(end, y - 26, end, y + 6);
    g.lineStyle(5, a.tellColor, pulse);
    g.lineBetween(end, y - 26, end, y + 6);
  },

  // 出刀。演出顺序【先结果、后过程】—— 居合的全部就是这个顺序。
  //
  // ⚠️ 伤害【立刻结算】，不用 delayedCall 排在白闪之后。无头环境下 Phaser 的 Clock
  // 事件严重滞后（200ms 的 delayedCall 实测落在 +1183ms，见 scratchpad/arte-check.mjs），
  // 把伤害挂在计时器上就等于把命中判定交给帧率。观感也不受影响：白闪那一帧本来就把
  // 命中的瞬间整个盖住了，玩家读到的顺序仍是"闪 → 刃线 → 对手在挨打"。
  _iaiStrike(f, time) {
    const a = this._arteCfg(f), t = a.tiers[f.iai.tier];
    const sp = f.sprite, dir = f.facingLeft ? -1 : 1;
    this._endIai(f);
    f.sprite.anims.resume();
    this._setState(f, 'attack');
    f.atkHit = true;                    // 屏蔽常规近战判定：伤害由本函数给（同 _releaseCharge）

    this._iaiFlash(a);
    this._iaiLine(sp.x, sp.y, dir, t.reach, a);
    this.freezeUntil = time + a.freezeMs;    // 画面真的静止（不是慢放）；由 update() 自愈
    this.cameras.main.shake(140, 0.009);
    window.GameAudio && GameAudio.play && GameAudio.play('slash');

    // 剑神流奥义出刀：道场远景撕裂错位，露出底层雪山 (仅在 dojo 场景)
    if (this.stageName === 'dojo' && this._startDojoSplitAnim) {
      this._startDojoSplitAnim();
    }

    // 判定：从自身横贯到前方一条水平带。纵向容差同近战闸门 → 【跳跃仍然躲得开】。
    const opp = this._opp(f);
    if (opp && opp.state !== 'down') {
      const dx = (opp.sprite.x - sp.x) * dir;
      if (dx >= -BT.BODY_HALF_W && dx <= t.reach + BT.BODY_HALF_W &&
          Math.abs(opp.sprite.y - sp.y) < a.hitH) {
        // 走 _critHit：和会心共用【已定案的脚本伤害】那条结算口（绕过受击无敌与防御
        // 分流）。抜刀不可防御是设计，不是漏洞 —— 反制在架式那一段，见 BT.ARTE.sword。
        this._critHit(f, opp, Math.round(BT.ATTACK[f.id].dmg * t.dmgMul), dir);
      }
    }
  },

  // 全屏白闪一帧。钉屏（setScrollFactor(0)）—— 忘了这条就会画在世界原点
  // （[[phaser-ui-scrollfactor-blindspot]]）。
  _iaiFlash(a) {
    const r = this.add.rectangle(BT.GAME_W / 2, BT.GAME_H / 2, BT.GAME_W, BT.GAME_H, 0xffffff)
      .setScrollFactor(0).setDepth(600).setAlpha(0.92);
    this.tweens.add({ targets: r, alpha: 0, duration: a.flashMs, onComplete: () => r.destroy() });
  },

  // 白刃线：从腰间横贯到斩击末端。用两道叠加（粗淡 + 细白）撑出"过曝的一条线"。
  _iaiLine(x, y, dir, reach, a) {
    const g = this.add.graphics().setDepth(599);
    const y0 = y + 18;                      // 腰高：刀是从腰间拔出来的
    for (const [w, alpha, col] of [[14, 0.5, a.color], [5, 0.95, 0xffffff]]) {
      g.lineStyle(w, col, alpha);
      g.lineBetween(x, y0, x + dir * reach, y0 - 10);   // 略上挑，符合居合的斩线
    }
    this.tweens.add({ targets: g, alpha: 0, duration: a.lineMs, onComplete: () => g.destroy() });
  },

  _endIai(f) {
    if (!f.iai) return;
    if (f.iai.line) f.iai.line.destroy();
    f.iai = null;
    f.sprite.anims.resume();
    if (!f.charging && f.state !== 'guard') this._clearOutlineHold(f);
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
