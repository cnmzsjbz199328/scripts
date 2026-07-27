/* BladeTrinity — 水神流奥义「剥夺剑界」。6 秒领域，界内对手出手即自伤。
 *
 * ─── 机制只有一个判据：_realmDeprives ───
 * 「界内非施术者的一切进攻输出都被剥夺」。判据只有这一个函数，六处钩子全问它，
 * 别在别处另写条件：
 *   · 近战    combat.js  _hit          → 命中前拦下，改走 _reflectDamage + _mirrorStrike
 *   · 弹丸    charge.js  _qiVsTarget   → 整道掉头改归属
 *   · 会心骰  crit.js    _rollCrit     → 【不触发】（防御照常免伤，只是转不成攻击）
 *   · 脚本伤  crit.js    _critHit      → 反弹（抜刀这类主动招走这条口）
 *   · 受流返伤 defense.js _resolveDefense → 免伤保留、返伤归零
 *   · 返し飞刀 defense.js _resolveDefense → 免伤保留、这一刀甩不出去
 *   · AI      loop.js    _controlAI    → 走 _realmVs：成形了就停手，起手段就抢着打断
 *
 * ⚠️ 会心【曾经是豁免的】（近战走 _critHit 绕过 _hit、弹丸靠 q.crit 显式放行），当时
 * 叫"承重墙"：怕反弹掉它这一招就无解。已按设计决定推翻 —— 剥夺就该是彻底的，否则
 * 这一招只是"更强的防御"而不是"支配规则"。取而代之的两条出路是【起手 820ms 抢断】
 * 与【6 秒纯闪避】（跳跃越过近战纵向闸门 96px / 缩地 260ms 无敌），见 BT.REALM。
 *
 * ⚠️ 两种剥夺形态【不可互换】，这是可读性决定的：
 *   · 主动进攻（平A / 剑气 / 抜刀）→ 【反弹自伤】。是玩家自己按的键，倒影劈砍把因果
 *     说完整。
 *   · 防御触发的会心（三连 / 三重返 / 连弹 / 返し飞刀）→ 【直接不触发】。会心是
 *     _rollCrit 的随机掷骰，玩家没法选择不触发它 —— 做成自伤等于"按 S 有概率莫名
 *     掉血"，玩家学到的是"随机惩罚"而不是"我不该出手"。
 *
 * ⚠️ 防御本身【不是进攻】：完全免伤/卸力硬直照常成立，被剥夺的只有"把防守转成
 * 输出"这一步。全砍掉的话界内连活路都没有了（brace 吃蓝、闪避吃冷却，那是设计好的
 * 生存经济，别顺手拆掉）。
 *
 * ─── 表现由三件事组成 ───
 * ① 外扩圆环：剑界的边界。半径 = 这一招的可视读数，不需要任何 UI。
 * ② 界内去饱和：圆环扫过的区域变黑白，【唯独本体保持彩色】。彩/黑白的边界就是
 *    判定边界 —— 玩家一眼看到剑界到哪儿，不用学任何图标。
 * ③ 倒影劈砍：近战被弹回时，用【攻击者自己的当前帧】镜像出一个倒影劈向他自己。
 *    水镜照出你自己，你的倒影砍了你 —— 因果链在画面里是完整的一句话。
 *
 * ─── 为什么用后处理管线而不是别的办法 ───
 * "只有本体是彩色的"这一条卡掉了所有廉价做法：
 *   · 逐对象 postFX 去饱和 —— 背景是三张整图，会整张一起跳变，读不出圆环扫过
 *   · 在 shader 里给本体开一个矩形/圆形"色彩洞" —— 洞里的背景也会跟着保留颜色，
 *     变成人物身后跟着一块彩色方斑
 * 所以走【相机分离】：主相机挂径向去饱和，另起一台 realmCam 只画本体副本与圆环，
 * 不挂 FX，叠在上面。代价是每帧要维护 cameraFilter（见 _realmSyncCams）。
 */

// 径向去饱和：界内（d < uRadius）转灰度，界外原样，边缘 uEdge 像素软过渡。
const REALM_FRAG = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uEdge;
varying vec2 outTexCoord;
void main() {
  vec4 c = texture2D(uMainSampler, outTexCoord);
  vec2 p = outTexCoord * uResolution;
  float d = distance(p, uCenter);
  float k = 1.0 - smoothstep(uRadius - uEdge, uRadius, d);   // 1 = 界内
  float g = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  gl_FragColor = vec4(mix(c.rgb, vec3(g), k), c.a);
}`;

if (typeof Phaser !== 'undefined' && Phaser.Renderer.WebGL) {
  window.RealmGreyFX = class extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
      super({ game, fragShader: REALM_FRAG });
      this.cx = 0; this.cy = 0; this.radius = 0; this.edge = BT.REALM.edge;
    }
    onPreRender() {
      this.set2f('uResolution', this.renderer.width, this.renderer.height);
      // ⚠️ outTexCoord 的原点在【左下】，而 sprite.y 是屏幕坐标（左上原点）——
      // 这里必须翻一次 y，否则圆环会出现在角色上下镜像的位置。
      this.set2f('uCenter', this.cx, this.renderer.height - this.cy);
      this.set1f('uRadius', this.radius);
      this.set1f('uEdge', this.edge);
    }
  };
}

Object.assign(BladeTrinityScene.prototype, {

  // ─────────── 机制的唯一判据 ───────────
  // f 此刻是否被剥夺（= 在别人的剑界里，且剑界已成形）。文件头列的六处钩子全问它。
  //
  // ⚠️ open 段【不剥夺】。圆环还没成形，这 820ms 正是设计里留给对手"抢在成形前打掉它"
  // 的窗口（见 BT.REALM）—— 起手就生效的话那个选项自己就不存在了。
  _realmDeprives(f) {
    const rm = this.realm;
    return !!rm && !!f && rm.owner !== f && rm.phase !== 'open';
  },

  // owner 的剑界此刻是否把 who 的这一击弹回去。语义 = "who 被剥夺，且剥夺者正是 owner"。
  // 留着它是因为近战/弹丸两处钩子手里拿的是【被打的那一方】，要确认反弹的归属。
  _realmReflects(owner, who) {
    const rm = this.realm;
    return !!rm && rm.owner === owner && this._realmDeprives(who);
  },

  // 「剥奪」提示：防御成立但转不成输出的那一下。用灰蓝而不是水蓝 —— 水蓝是剑界
  // 自己的颜色（圆环/倒影），那是施术者的读数；被剥夺的一方看到的该是"被吃掉了"。
  _realmDeprivePop(f) {
    this._popText(f.sprite.x, f.sprite.y - 84, '剥奪', '#7a90a0');
    if (this._usage && f === this.p1) this._usage.realmDeprive++;
  },

  // 遥测：玩家在界内出手、被弹回自己的次数（近战 / 弹丸 / 抜刀三处调用）。
  // playtest 拿它断言"bot 学会了界内不出手"—— 目标是 0，不是越多越好。
  _realmNoteSelfHit(f) {
    if (this._usage && f === this.p1) this._usage.realmSelfHit++;
  },

  // 「界内对手该停手」的对外读数：给 AI 用（loop.js）也给探针用。
  // 返回 'stop'（剑界已成形，出手即自伤）/ 'break'（还在起手段，打掉它）/ null。
  _realmVs(f) {
    const rm = this.realm;
    if (!rm || rm.owner === f) return null;
    return rm.phase === 'open' ? 'break' : 'stop';
  },

  // ─────────── 起 / 收 ───────────
  _realmStart(f, time) {
    if (this.realm) return;
    const R = BT.REALM;
    const fx = this._realmFX();                 // Canvas 回落时为 null（圆环仍然照画）
    const realmCam = this._realmCam();

    // 本体副本：realmCam 专画它，所以它【不吃去饱和】—— "只有本体是彩色的"就是这么来的
    const dup = this.add.image(f.sprite.x, f.sprite.y, f.id, f.sprite.frame.name)
      .setScale(BT.SCALE).setFlipX(f.sprite.flipX).setDepth(500);
    this.cameras.main.ignore(dup);               // 主相机不画它，否则会重影一层灰的

    const ring = this.add.graphics().setDepth(499);
    this.cameras.main.ignore(ring);               // 圆环也交给 realmCam：它得保持水蓝，不被自己的去饱和吃掉

    // ⚠️ 血条/名牌也要豁免去饱和。剑界最大半径罩满全屏，主相机的 FX 会把血条一起刷灰
    // —— 两条血条的流派配色（剑神红/水神蓝/北神紫）是这游戏最要紧的读数，灰掉 6 秒
    // 等于让玩家在最关键的一段时间里看不清双方还剩多少血（首版实测就是这样）。
    const hud = [this.barG, ...(this.barTexts || [])].filter(Boolean);
    this.cameras.main.ignore(hud);

    this.realm = {
      owner: f, fx, dup, ring, hud, extras: [],
      phase: 'open', t0: time, r: 0,
      until: time + R.openMs + R.liveMs,          // 收回从这个时刻开始（liveMs = 剑界持续）
    };
    realmCam.setVisible(true);
    this._popText(f.sprite.x, f.sprite.y - 150, '剥奪剣界', '#8fe0ff');
    window.GameAudio && GameAudio.play && GameAudio.play('charge');
  },

  _realmEnd() {
    const rm = this.realm;
    if (!rm) return;
    this.realm = null;
    if (rm.fx) rm.fx.radius = 0;
    if (this.realmCamRef) this.realmCamRef.setVisible(false);
    // ⚠️ 把血条还给主相机。起界时让主相机 ignore 了它们（豁免去饱和），realmCam 一旦
    // 隐藏就没人画了 —— 不还回去，剑界收完血条会【永久消失】。
    const mainBit = this.cameras.main.id;
    for (const o of (rm.hud || [])) if (o && o.active !== false) o.cameraFilter &= ~mainBit;
    rm.dup.destroy();
    rm.ring.destroy();
    rm.extras.forEach((o) => o.destroy && o.destroy());
    if (rm.fx) this.cameras.main.resetPostPipeline();
  },

  // 每帧推进：半径按 open → hold → close 三段走，圆环跟着画，本体副本跟帧。
  _realmTick(time) {
    const rm = this.realm;
    if (!rm) return;
    const R = BT.REALM, f = rm.owner;
    // owner 倒下 / 换场 → 立刻收
    if (f.state === 'down' || this.phase !== 'fight') { this._realmEnd(); return; }

    const el = time - rm.t0;
    // 【起手可被打断】open 段挨一下就作废，蓝照扣。这是对手对这一招的正解之一，
    // 也是它没有变成"90 蓝买 6 秒无敌"的原因。open 段 _realmReflects 返回 false，
    // 所以这一下打得进来 —— 两条必须成对存在，别只留一条。
    if (el < R.openMs && (f.state === 'hurt' || f.state === 'stun')) {
      this._popText(f.sprite.x, f.sprite.y - 120, '剣界·崩', '#7a90a0');
      this._realmEnd();
      return;
    }
    if (el < R.openMs) {
      // ⚠️ 外扩用【线性】，别改回 ease-out。前沿匀速横扫才读得出"剑界正在展开"；
      // 快起慢收会让圆环在头 100ms 就冲出画布，核心表现直接消失（见 BT.REALM.openMs）。
      rm.r = R.maxR * (el / R.openMs);
      rm.phase = 'open';
    } else if (time < rm.until) {
      rm.r = R.maxR;
      rm.phase = 'hold';
    } else {
      const k = (time - rm.until) / R.closeMs;
      if (k >= 1) { this._realmEnd(); return; }
      rm.r = R.maxR * (1 - k);                    // 收回：色彩从外向内匀速灌回来
      rm.phase = 'close';
    }

    const cx = f.sprite.x, cy = f.sprite.y;
    if (rm.fx) { rm.fx.cx = cx; rm.fx.cy = cy; rm.fx.radius = rm.r; }

    // 本体副本跟帧（含朝向）——它就是那个"唯一还有颜色的人"
    rm.dup.setPosition(cx, cy).setFrame(f.sprite.frame.name).setFlipX(f.sprite.flipX);

    // 圆环：双线 + 呼吸，水面的感觉
    const g = rm.ring; g.clear();
    const pulse = 0.5 + 0.5 * Math.sin(time / R.period);
    for (const [w, a, dr] of [[R.wOuter, 0.9, 0], [R.wInner, 0.45, -R.gap]]) {
      g.lineStyle(w, R.color, a * (0.75 + 0.25 * pulse));
      g.strokeCircle(cx, cy, Math.max(1, rm.r + dr));
    }
    this._realmSyncCams();
  },

  _easeOut(k) { k = Phaser.Math.Clamp(k, 0, 1); return 1 - (1 - k) * (1 - k); },

  // ─────────── 相机分离的维护 ───────────
  // realmCam 只该画白名单（本体副本 / 圆环 / 倒影的刀光）。其余对象每帧打上它的
  // cameraFilter 位。⚠️ 必须每帧重扫：剑气、残影、飘字、落叶都是运行时新建的，
  // 漏一个就会在剑界上方多出一层【没有去饱和的重影】。
  _realmSyncCams() {
    const rm = this.realm, cam = this.realmCamRef;
    if (!rm || !cam) return;
    const white = new Set([rm.dup, rm.ring, ...(rm.hud || []), ...rm.extras]);
    const bit = cam.id;
    for (const o of this.children.list) {
      if (white.has(o)) o.cameraFilter &= ~bit;
      else o.cameraFilter |= bit;
    }
  },

  _realmCam() {
    if (!this.realmCamRef) {
      // 常驻一台，靠 setVisible 开关。⚠️ 别用完就 destroy：相机 id 会被后来者复用，
      // 而对象身上残留的 cameraFilter 位会让它们被新相机莫名其妙地隐藏掉。
      this.realmCamRef = this.cameras.add(0, 0, BT.GAME_W, BT.GAME_H);
      this.realmCamRef.setVisible(false);
    }
    return this.realmCamRef;
  },

  // 后处理管线。Canvas 回落时返回 null —— 圆环与倒影仍然可见，只是没有黑白。
  _realmFX() {
    if (this.renderer.type !== Phaser.WEBGL || !window.RealmGreyFX) return null;
    if (!this._realmFXReady) {
      this.renderer.pipelines.addPostPipeline('RealmGreyFX', window.RealmGreyFX);
      this._realmFXReady = true;
    }
    this.cameras.main.setPostPipeline('RealmGreyFX');
    return this.cameras.main.getPostPipeline('RealmGreyFX');
  },

  // ─────────── 倒影劈砍 ───────────
  // 近战被剑界弹回时的表现：拿【攻击者自己的当前帧】镜像一个倒影，劈向他自己。
  //
  // ⚠️ 用攻击者的图集与当前帧，不要用别的姿势 —— 姿势对上了才是"这是我刚才那一刀"，
  // 对不上就变成"旁边冒出个人砍我"，因果感立刻没了。
  // ⚠️ 两条都是【看了截图才改对的】，别按"理论上更合理"退回去：
  //
  //  ① 倒影出现在攻击者【身后】(-dir)，不是身前。放身前（朝着施术者那一侧）时，AI 一贴
  //     上来倒影就叠在两个人身上，完全分不出谁是谁。放身后则永远不和施术者重叠，
  //     而且"倒影从背后把你那一刀还给你"读起来更明确。
  //  ② 倒影【走 realmCam、染水蓝】，不走主相机。原本想让它跟着去饱和成黑白（"天然属于
  //     剑界"），实测在全灰的画面里它和灰色的对手糊成一团，等于没做这个特效。
  //     全灰底 + 一个水蓝的自己 = 一眼就懂。界内的彩色因此有且只有两样：本体、倒影。
  _mirrorStrike(attacker) {
    const R = BT.REALM, sp = attacker.sprite;
    const dir = attacker.facingLeft ? -1 : 1;
    const mx = this._clampX(sp.x - dir * R.mirrorGap);
    const ghost = this.add.image(mx, sp.y, attacker.id, sp.frame.name)
      .setScale(BT.SCALE).setFlipX(!sp.flipX)      // 翻转 = 倒影，且朝着攻击者
      .setDepth(502).setAlpha(R.mirrorAlpha).setTint(R.color);
    const arc = this._arcAt(mx, sp.y - 30, dir, R.color);   // 刀光从倒影朝攻击者划过去
    for (const o of [ghost, arc]) {
      this.cameras.main.ignore(o);                 // 交给 realmCam：不吃去饱和
      if (this.realm) this.realm.extras.push(o);
    }
    this.tweens.add({
      targets: ghost, alpha: 0, scaleX: BT.SCALE * 1.12, scaleY: BT.SCALE * 1.12,
      duration: R.mirrorMs, onComplete: () => this._mirrorDrop(ghost),
    });
    this.tweens.add({ targets: arc, alpha: 0, duration: R.mirrorMs,
      onComplete: () => this._mirrorDrop(arc) });
    this.cameras.main.shake(90, 0.005);
    window.GameAudio && GameAudio.play && GameAudio.play('slash');
  },

  // 从白名单里摘掉再销毁 —— 留在 extras 里会让 _realmSyncCams 每帧去读已销毁的对象
  _mirrorDrop(o) {
    if (this.realm) this.realm.extras = this.realm.extras.filter((x) => x !== o);
    o.destroy();
  },

  // _swordArc 的坐标版（那个只吃 fighter）。返回 graphics 交给调用方管生命周期。
  _arcAt(cx, cy, dir, color) {
    const rad = (d) => d * Math.PI / 180;
    const g = this.add.graphics().setDepth(501);
    for (const [w, a] of [[9, 0.55], [3, 0.9]]) {
      g.lineStyle(w, color, a);
      g.beginPath();
      g.arc(cx, cy, 74, dir > 0 ? rad(-55) : rad(125), dir > 0 ? rad(70) : rad(235), false);
      g.strokePath();
    }
    return g;
  },
});
