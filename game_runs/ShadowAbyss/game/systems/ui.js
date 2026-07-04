/* ShadowAbyss — 呈现层：背景交叉淡入 / 打字机叙事面板 / 抉择按钮 / 章节卡 /
 * 光照计数 / 成就吐司 / 结局幕。全部画布内，DOM 只留开始与重开遮罩。 */

function _hexCss(n, a) {
  const s = '#' + n.toString(16).padStart(6, '0');
  if (a === undefined) return s;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

Object.assign(StoryScene.prototype, {

  // ── 缺图占位：按章色板画渐变 + 地平线辉光 + 地面带 ──
  _makeFallbackTextures() {
    for (const [sid, m] of Object.entries(SCENE_META)) {
      const key = 'bg_' + sid;
      if (this.textures.exists(key)) continue;
      const pal = CHAPTER_PAL[m.ch];
      const cv = this.textures.createCanvas(key, GAME_W, GAME_H);
      const ctx = cv.getContext();
      const g = ctx.createLinearGradient(0, 0, 0, GAME_H);
      g.addColorStop(0, _hexCss(pal.top)); g.addColorStop(0.55, _hexCss(pal.mid)); g.addColorStop(1, _hexCss(pal.bot));
      ctx.fillStyle = g; ctx.fillRect(0, 0, GAME_W, GAME_H);
      const rg = ctx.createRadialGradient(GAME_W / 2, GAME_H * 0.6, 30, GAME_W / 2, GAME_H * 0.6, 520);
      rg.addColorStop(0, _hexCss(pal.glow, 0.38)); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, GAME_W, GAME_H);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, GAME_H - 110, GAME_W, 110);
      cv.refresh();
    }
    this._makeGroundBands();
    // 四角暗角
    if (!this.textures.exists('vign')) {
      const cv = this.textures.createCanvas('vign', GAME_W, GAME_H);
      const ctx = cv.getContext();
      const rg = ctx.createRadialGradient(GAME_W / 2, GAME_H / 2, GAME_H * 0.42, GAME_W / 2, GAME_H / 2, GAME_H * 0.95);
      rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.62)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, GAME_W, GAME_H);
      cv.refresh();
    }
  },

  // ── 前景地面遮罩带：四章主题化 canvas 程序纹理（消除人物悬空感的"近景片"） ──
  _makeGroundBands() {
    const W = GAME_W + FG_DRIFT * 2 + 16, H = 260, TOP = 44;   // 带体一直铺到画布底（面板之下）
    for (let ch = 1; ch <= 4; ch++) {
      const key = 'fg_band_ch' + ch;
      if (this.textures.exists(key)) continue;
      const cv = this.textures.createCanvas(key, W, H);
      const ctx = cv.getContext();
      let seed = ch * 92821 + 7;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

      if (ch === 4) {
        // 天堂：地面是云——发光云带，不用黑岩
        for (let i = 0; i < 30; i++) {
          const x = rnd() * W, y = TOP + rnd() * 60, r = 34 + rnd() * 64;
          const g = ctx.createRadialGradient(x, y, 4, x, y, r);
          g.addColorStop(0, 'rgba(248,238,214,0.30)');
          g.addColorStop(1, 'rgba(248,238,214,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        }
        cv.refresh(); continue;
      }

      const cols = { 1: ['#0a0d0f', '#04060a'], 2: ['#0e0808', '#060303'], 3: ['#0b1114', '#050a0e'] }[ch];
      // 不规则地脊剪影（炼狱台缘更平直）
      ctx.beginPath();
      ctx.moveTo(0, H); ctx.lineTo(0, TOP + rnd() * 10);
      for (let x = 0; x < W;) {
        x += 24 + rnd() * 46;
        ctx.lineTo(Math.min(x, W), TOP + rnd() * (ch === 3 ? 7 : 16));
      }
      ctx.lineTo(W, H); ctx.closePath();
      const g = ctx.createLinearGradient(0, TOP, 0, H * 0.7);
      g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
      ctx.fillStyle = g; ctx.fill();

      ctx.fillStyle = cols[0]; ctx.strokeStyle = cols[0];
      if (ch === 1) {
        // 黑暗森林：枯草 + 拱起的盘根
        for (let i = 0; i < 48; i++) {
          const bx = rnd() * W, bh = 8 + rnd() * 22, lean = (rnd() - 0.5) * 12;
          ctx.lineWidth = 1 + rnd() * 1.4;
          ctx.beginPath(); ctx.moveTo(bx, TOP + 12);
          ctx.quadraticCurveTo(bx + lean * 0.4, TOP + 12 - bh * 0.6, bx + lean, TOP + 12 - bh);
          ctx.stroke();
        }
        for (let i = 0; i < 7; i++) {
          const bx = rnd() * W, r = 8 + rnd() * 16;
          ctx.lineWidth = 3 + rnd() * 3;
          ctx.beginPath(); ctx.arc(bx, TOP + 14, r, Math.PI, 0); ctx.stroke();
        }
      } else if (ch === 2) {
        // 地狱：碎岩尖片
        for (let i = 0; i < 20; i++) {
          const bx = rnd() * W, w2 = 8 + rnd() * 22, h2 = 8 + rnd() * 28;
          ctx.beginPath();
          ctx.moveTo(bx - w2 / 2, TOP + 14);
          ctx.lineTo(bx - w2 * 0.1 + (rnd() - 0.5) * 6, TOP + 14 - h2);
          ctx.lineTo(bx + w2 / 2, TOP + 14);
          ctx.closePath(); ctx.fill();
        }
      } else {
        // 炼狱：台缘石缝 + 平放石板
        for (let i = 0; i < 28; i++)
          ctx.fillRect(rnd() * W, TOP + 4 + rnd() * 6, 1.6, 8 + rnd() * 10);
        for (let i = 0; i < 6; i++)
          ctx.fillRect(rnd() * W, TOP - 4 - rnd() * 6, 26 + rnd() * 40, 8);
      }
      cv.refresh();
    }
  },

  _buildLayers() {
    const cx = GAME_W / 2;
    // 背景双层交叉淡入（超采若干像素，容纳换场视差漂移不露边）
    this.bgA = this.add.image(cx, GAME_H / 2, 'bg_selva_oscura')
      .setDisplaySize(GAME_W + BG_OVERSCAN, GAME_H + BG_OVERSCAN * 0.6).setDepth(DEPTH.BG);
    this.bgB = this.add.image(cx, GAME_H / 2, 'bg_selva_oscura')
      .setDisplaySize(GAME_W + BG_OVERSCAN, GAME_H + BG_OVERSCAN * 0.6).setDepth(DEPTH.BG_TOP).setAlpha(0);
    this._bgKey = 'bg_selva_oscura';
    this.add.image(cx, GAME_H / 2, 'vign').setDepth(DEPTH.VIGN);

    // 前景三明治：地面带（人物之前）+ 近地雾
    this.fgBand = this.add.image(cx, FG_BAND_Y, 'fg_band_ch1').setOrigin(0.5, 0).setDepth(DEPTH.FG);
    this.fgFogs = [];
    for (let i = 0; i < 2; i++) {
      const f = this.add.sprite(240 + i * 500, 356 + i * 14, 'chfog_ch1_0')
        .setDepth(DEPTH.FG_FOG).setAlpha(0.16).setScale(1.5 + i * 0.5);
      // 缓移：左右极慢往返，周期错开
      this.tweens.add({ targets: f, x: f.x + (i ? -90 : 110), duration: 11000 + i * 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.fgFogs.push(f);
    }

    // 场景名横幅（左上，出场后淡去）
    this.banner = this.add.text(28, 58, '', { fontFamily: 'Georgia, serif', fontSize: '21px', color: '#e8d6b0' })
      .setDepth(DEPTH.BANNER).setAlpha(0);

    // 底部叙事面板
    const py = GAME_H - PANEL_H;
    this.panelBg = this.add.rectangle(0, py, GAME_W, PANEL_H, 0x070810, 0.78).setOrigin(0, 0).setDepth(DEPTH.PANEL);
    this.panelLine = this.add.rectangle(0, py, GAME_W, 2, 0xe07a4a, 0.45).setOrigin(0, 0).setDepth(DEPTH.PANEL + 1);
    this.progRect = this.add.rectangle(0, py, 0, 2, 0xffd98a, 0.9).setOrigin(0, 0).setDepth(DEPTH.PANEL + 2);
    this.speakerText = this.add.text(60, py + 16, '', { fontFamily: 'Georgia, serif', fontSize: '15px', color: '#e07a4a', fontStyle: 'bold' })
      .setDepth(DEPTH.TEXT);
    this.bodyText = this.add.text(60, py + 42, '', {
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif', fontSize: '17px', color: '#bdb6a4',
      lineSpacing: 9, wordWrap: { width: 840 },
    }).setDepth(DEPTH.TEXT);
    this.hintText = this.add.text(GAME_W - 26, GAME_H - 18, '', { fontFamily: '"Segoe UI", sans-serif', fontSize: '12px', color: '#6b6456' })
      .setOrigin(1, 1).setDepth(DEPTH.TEXT);
    this._panelEls = [this.panelBg, this.panelLine, this.progRect, this.speakerText, this.bodyText, this.hintText];

    // 光照计数（右上）
    this.lightText = this.add.text(GAME_W - 26, 58, '✦ 光照 ' + (STORY.meta.initialVariable || 0),
      { fontFamily: 'Georgia, serif', fontSize: '17px', color: '#ffd98a', stroke: '#000000', strokeThickness: 3 })
      .setOrigin(1, 0).setDepth(DEPTH.HUD);

    // 章节卡
    this.cardRect = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x03040a, 1).setOrigin(0, 0).setDepth(DEPTH.CARD).setVisible(false);
    this.cardNum = this.add.text(cx, 190, '', { fontFamily: 'Georgia, serif', fontSize: '52px', color: '#e07a4a' })
      .setOrigin(0.5).setDepth(DEPTH.CARD + 1).setVisible(false);
    this.cardTitle = this.add.text(cx, 268, '', { fontFamily: 'Georgia, serif', fontSize: '36px', color: '#e8d6b0' })
      .setOrigin(0.5).setDepth(DEPTH.CARD + 1).setVisible(false);
    this.cardHint = this.add.text(cx, GAME_H - 66, '▸ 空格 继续', { fontFamily: '"Segoe UI", sans-serif', fontSize: '13px', color: '#6b6456' })
      .setOrigin(0.5).setDepth(DEPTH.CARD + 1).setVisible(false);
    this._cardEls = [this.cardRect, this.cardNum, this.cardTitle, this.cardHint];

    this._choiceEls = [];
    this._toastQueue = []; this._toastBusy = false;
  },

  _buildCharacters() {
    const mk = (who, frames) => {
      for (const [name, n] of Object.entries(frames)) {
        this.anims.create({
          key: `${who}_${name}`,
          frames: Array.from({ length: n }, (_, i) => ({ key: `${who}_${name}_${i}` })),
          frameRate: name === 'walk' ? 10 : 7, repeat: -1,
        });
      }
    };
    mk('dante', { idle: 8, walk: 8 });
    mk('virgil', { idle: 8, walk: 8 });
    this.anims.create({
      key: 'soul_walk',
      frames: Array.from({ length: 8 }, (_, i) => ({ key: `soul_walk_${i}` })),
      frameRate: 8, repeat: -1,
    });
    this.anims.create({
      key: 'soul_gesture',
      frames: Array.from({ length: 6 }, (_, i) => ({ key: `soul_gesture_${i}` })),
      frameRate: 6, repeat: 0,
    });
    // 路人 NPC 共享剪影槽的各套待机呼吸循环
    for (const tex of ['beatrice', 'elder', 'matilda', 'angel', 'furies', 'minos']) {
      this.anims.create({
        key: `${tex}_idle`,
        frames: Array.from({ length: 8 }, (_, i) => ({ key: `${tex}_idle_${i}` })),
        frameRate: 6, repeat: -1,
      });
    }
    // 前景雾帧循环（四章各一套）
    for (let ch = 1; ch <= 4; ch++) {
      this.anims.create({
        key: `chfog_ch${ch}`,
        frames: Array.from({ length: 8 }, (_, i) => ({ key: `chfog_ch${ch}_${i}` })),
        frameRate: 5, repeat: -1,
      });
    }
    for (const f of this.fgFogs) f.play('chfog_ch1');

    // 剪影帧朝右基线；维吉尔"始终走在前面半步"→ 站位更靠前。
    // 脚底基线 FEET_Y 在面板顶之上，脚面被前景地脊咬住 → 接地
    // 阴影抬到地脊沿口附近：谷底以上的部分从地脊缺口里露出来，其余被前景带自然遮掉
    this.danteShadow = this.add.ellipse(150, FEET_Y - 12, 68, 12, 0x000000, 0.3)
      .setDepth(DEPTH.SHADOW).setData('base', 0.3);
    this.virgilShadow = this.add.ellipse(262, FEET_Y - 14, 62, 11, 0x000000, 0.26)
      .setDepth(DEPTH.SHADOW).setData('base', 0.26).setVisible(false);
    // glb-sprite 帧(192x208)底部有 24px 透明留白，origin(0.5,1) 对齐的是图底而非脚底：
    // 落点须加 24*scale 补偿，否则实际脚底 ≈ FEET_Y-20，浮在地脊边缘之上
    this.dante = this.add.sprite(150, FEET_Y + 24 * 0.85, 'dante_idle_0').setOrigin(0.5, 1).setScale(0.85).setDepth(DEPTH.CHAR);
    this.virgil = this.add.sprite(262, FEET_Y - 2 + 24 * 0.82, 'virgil_idle_0').setOrigin(0.5, 1).setScale(0.82).setDepth(DEPTH.CHAR - 1).setVisible(false);
    this.dante.play('dante_idle');
    this.virgil.play('virgil_idle');

    // 背景亡魂 NPC（地狱/炼狱章路人剪影，svg-sprite/glb-sprite 第四轨同款接地公约）：
    // 缩小 + 半透明模拟纵深，右侧地脊上来回踱步，章节切换时按 _setScene 显隐
    this.soulShadow = this.add.ellipse(760, FEET_Y - 8, 40, 8, 0x000000, 0.2)
      .setDepth(DEPTH.SHADOW).setData('base', 0.2).setVisible(false);
    this.soul = this.add.sprite(760, FEET_Y + 24 * 0.6, 'soul_walk_0')
      .setOrigin(0.5, 1).setScale(0.6).setAlpha(0.75).setDepth(DEPTH.CHAR - 2).setVisible(false);
    this.soul.play('soul_walk');
    this._paceSoul();

    // 路人 NPC 共享剪影槽：站在维吉尔与远景亡魂之间，speaker 命中 NPC_GUEST 才现身（见 _showGuest）。
    // heaven 角色背后加一圈叠加光晕表现"圣洁感"——剪影本身仍是统一深色，不重染颜色：
    // 天堂章背景本身很亮（米黄色调），试过整体重染暖金色，结果剪影和背景融在一起几乎看不见
    // （至高天场景实测：贝雅特丽齐 tintFill 后近乎隐形）。深色剪影在明暗背景下对比度都稳定。
    this.guestHalo = this.add.circle(620, FEET_Y - 96, 72, 0xfff2d0, 0.4)
      .setDepth(DEPTH.CHAR - 2).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.guestShadow = this.add.ellipse(620, FEET_Y - 10, 56, 10, 0x000000, 0.25)
      .setDepth(DEPTH.SHADOW).setData('base', 0.25).setVisible(false);
    this.guest = this.add.sprite(620, FEET_Y + 24 * 0.85, 'beatrice_idle_0')
      .setOrigin(0.5, 1).setScale(0.85).setAlpha(0).setDepth(DEPTH.CHAR - 1).setVisible(false);
    this.guestKey = null;
  },

  // speaker 命中 NPC_GUEST → 淡入对应剪影（heaven 角色加光晕）；同一角色连续发言不重复触发
  _showGuest(g) {
    if (this.guestKey === g.tex) return;
    this.guestKey = g.tex;
    this.guest.play(`${g.tex}_idle`, true);
    this.guest.setVisible(true);
    this.guestShadow.setVisible(true).setData('base', g.heaven ? 0.15 : 0.25);
    this.guestHalo.setVisible(!!g.heaven).setAlpha(0);
    this.tweens.killTweensOf(this.guest);
    this.tweens.killTweensOf(this.guestHalo);
    this.tweens.add({ targets: this.guest, alpha: 1, duration: 400 });
    if (g.heaven) this.tweens.add({ targets: this.guestHalo, alpha: 1, duration: 400 });
  },

  // 节点切换时清空剪影槽，避免上一位路人跨场景残留
  _resetGuest() {
    if (!this.guestKey) return;
    this.guestKey = null;
    this.tweens.killTweensOf(this.guest);
    this.tweens.killTweensOf(this.guestHalo);
    this.tweens.add({
      targets: this.guest, alpha: 0, duration: 300,
      onComplete: () => this.guest.setVisible(false),
    });
    this.guestHalo.setVisible(false);
    this.guestShadow.setVisible(false);
  },

  // 亡魂来回踱步：走到一端→原地做一次挣扎手势→折返，循环往复
  _paceSoul() {
    if (!this.soul.active) return;
    this._soulGoingRight = !this._soulGoingRight;
    const to = this._soulGoingRight ? 860 : 660;
    this.soul.setFlipX(!this._soulGoingRight).play('soul_walk', true);
    this.tweens.add({
      targets: this.soul, x: to, duration: 5200, ease: 'Sine.easeInOut',
      onComplete: () => {
        this.soul.play('soul_gesture', true);
        this.soul.once('animationcomplete-soul_gesture', () => this._paceSoul());
      },
    });
  },

  // ── 场景切换：背景交叉淡入 + 横幅 + 人物走入 + DOM 目标栏 ──
  _setScene(scene) {
    const meta = SCENE_META[scene.id];
    if (meta) this._chapter = meta.ch;
    const pal = CHAPTER_PAL[this._chapter];
    const accentInt = Phaser.Display.Color.HexStringToColor(pal.accent).color;
    this.panelLine.setFillStyle(accentInt, 0.45);
    this.speakerText.setColor(pal.accent);
    this.cardNum.setColor(pal.accent);

    const cx = GAME_W / 2;
    const BW = GAME_W + BG_OVERSCAN, BH = GAME_H + BG_OVERSCAN * 0.6;
    const key = this.textures.exists('bg_' + scene.id) ? 'bg_' + scene.id : this._bgKey;
    if (key !== this._bgKey) {
      this._bgKey = key;
      this.tweens.killTweensOf(this.bgB);
      // 交叉淡入 + 轻推视差：新背景从 +10px 缓推回中，镜头有"移步"感
      this.bgB.setTexture(key).setDisplaySize(BW, BH).setAlpha(0).setX(cx + 10);
      this.tweens.add({
        targets: this.bgB, alpha: 1, x: cx, duration: XFADE_MS, ease: 'Sine.easeOut',
        onComplete: () => { this.bgA.setTexture(key).setDisplaySize(BW, BH); this.bgB.setAlpha(0); },
      });
    }

    // 前景带随章切换主题，换场时反向漂移（与背景推移方向相反 → 纵深）
    const bandKey = 'fg_band_ch' + this._chapter;
    this.tweens.killTweensOf(this.fgBand);
    if (this.fgBand.texture.key !== bandKey) {
      this.fgBand.setTexture(bandKey);
      this.fgBand.setAlpha(0);
    } else this.fgBand.setAlpha(0.35);
    this.fgBand.setX(cx - FG_DRIFT);
    this.tweens.add({ targets: this.fgBand, alpha: 1, x: cx, duration: XFADE_MS + 200, ease: 'Sine.easeOut' });

    // 前景雾换章配色；天堂章雾更亮、影更淡
    for (const f of this.fgFogs) {
      if (!f.anims.currentAnim || f.anims.currentAnim.key !== `chfog_ch${this._chapter}`) f.play(`chfog_ch${this._chapter}`);
      f.setAlpha(this._chapter === 4 ? 0.22 : 0.16);
    }
    this.danteShadow.setData('base', this._chapter === 4 ? 0.2 : 0.3);
    this.virgilShadow.setData('base', this._chapter === 4 ? 0.17 : 0.26);

    // 亡魂路人仅在地狱/炼狱（ch2/3）出没，森林与天堂章不显示
    const soulOn = this._chapter === 2 || this._chapter === 3;
    this.soul.setVisible(soulOn);
    this.soulShadow.setVisible(soulOn).setData('base', this._chapter === 3 ? 0.15 : 0.2);

    // 横幅：显现后淡去
    this.tweens.killTweensOf(this.banner);
    this.banner.setText(scene.name).setAlpha(0);
    this.tweens.add({ targets: this.banner, alpha: 1, duration: 400, yoyo: true, hold: 2200 });

    // 人物走入
    this._walkIn(this.dante, 150);
    this.virgil.setVisible(this._virgilOn);
    if (this._virgilOn) this._walkIn(this.virgil, 262);

    window.GameHUD?.setObjective(`${CHAPTER_NUMERALS[
      Object.keys(CHAPTER_NUMERALS)[this._chapter - 1]] || ''} ${pal.name} · ${scene.name}`);
  },

  _walkIn(spr, tx) {
    const who = spr === this.dante ? 'dante' : 'virgil';
    this.tweens.killTweensOf(spr);
    spr.setX(tx - 84).play(`${who}_walk`, true);
    this.tweens.add({
      targets: spr, x: tx, duration: WALKIN_MS, ease: 'Sine.easeOut',
      onComplete: () => spr.play(`${who}_idle`, true),
    });
  },

  // ── 打字机叙事 ──
  _renderSegment(seg) {
    this._setHint('▸ 空格');
    this.speakerText.setText(seg.speaker ? '「 ' + seg.speaker + ' 」' : '');
    const guest = seg.speaker && NPC_GUEST[seg.speaker];
    if (guest) this._showGuest(guest);
    this.bodyText.setColor(seg.arrival ? '#8b8474' : seg.speaker ? '#e2d8be' : '#bdb6a4');
    this._typing = true; this._typeFull = seg.text; this._typeI = 0;
    this.bodyText.setText('');
    if (this._typeEvt) this._typeEvt.remove();
    this._typeEvt = this.time.addEvent({
      delay: TYPE_MS, loop: true,
      callback: () => {
        this._typeI = Math.min(this._typeFull.length, this._typeI + 2);
        this.bodyText.setText(this._typeFull.slice(0, this._typeI));
        if (this._typeI >= this._typeFull.length) this._finishTyping();
      },
    });
  },

  _completeTyping() {
    this.bodyText.setText(this._typeFull);
    this._finishTyping();
  },

  _finishTyping() {
    if (this._typeEvt) { this._typeEvt.remove(); this._typeEvt = null; }
    this._typing = false;
  },

  _setHint(t) { this.hintText.setText(t); },

  // ── 抉择 ──
  _renderChoices(cs) {
    this._choicesActive = true;
    this._setHint('▸ 按 1 / 2 或点击选择');
    const pal = CHAPTER_PAL[this._chapter];
    const accentInt = Phaser.Display.Color.HexStringToColor(pal.accent).color;
    const w = 780, h = 52, gap = 12;
    const baseY = GAME_H - PANEL_H - cs.length * (h + gap) - 12;
    cs.forEach((c, i) => {
      const y = baseY + i * (h + gap);
      const r = this.add.rectangle(GAME_W / 2, y, w, h, 0x0c101c, 0.93)
        .setOrigin(0.5, 0).setDepth(DEPTH.CHOICE)
        .setStrokeStyle(1, accentInt, 0.7)
        .setInteractive({ useHandCursor: true });
      r.on('pointerover', () => r.setFillStyle(0x1c2436, 0.96));
      r.on('pointerout', () => r.setFillStyle(0x0c101c, 0.93));
      r.on('pointerup', () => this._choose(i));
      const t = this.add.text(GAME_W / 2 - w / 2 + 20, y + h / 2, `${i + 1}．${c.text}`, {
        fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif', fontSize: '16px', color: '#d8cfba',
        wordWrap: { width: w - 44 },
      }).setOrigin(0, 0.5).setDepth(DEPTH.CHOICE + 1);
      this._choiceEls.push(r, t);
    });
  },

  _clearChoices() {
    this._choicesActive = false;
    for (const e of this._choiceEls) e.destroy();
    this._choiceEls = [];
  },

  _renderContinue(cb) {
    this._continueCb = cb;
    this._setHint('▸ 空格 继续');
  },

  // ── 章节卡 ──
  _showChapterCard(title, cb) {
    this._cardActive = true; this._cardCb = cb;
    this.cardNum.setText(CHAPTER_NUMERALS[title] || '');
    this.cardTitle.setText(title);
    for (const e of this._cardEls) e.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this._cardEls, alpha: 1, duration: 500 });
  },

  _dismissChapterCard() {
    if (!this._cardActive) return;
    this._cardActive = false;
    const cb = this._cardCb; this._cardCb = null;
    if (cb) cb();       // 卡片淡出的同时，场景在其身后切换
    this.tweens.add({
      targets: this._cardEls, alpha: 0, duration: 600,
      onComplete: () => this._cardEls.forEach(e => e.setVisible(false)),
    });
  },

  // ── 光照 HUD / 浮字 / 进度 / 吐司 ──
  _updateLightHud() { this.lightText.setText('✦ 光照 ' + this.state.val); },

  _floatVal(dv) {
    const t = this.add.text(GAME_W - 30, 92, `${dv > 0 ? '+' : ''}${dv} 光照`, {
      fontFamily: 'Georgia, serif', fontSize: '15px',
      color: dv >= 0 ? '#ffd98a' : '#c4503a', stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(DEPTH.HUD);
    this.tweens.add({ targets: t, y: 74, alpha: 0, duration: 1300, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
  },

  _updateProgress(p) {
    if (typeof p !== 'number') return;
    this.tweens.add({ targets: this.progRect, width: GAME_W * p / 100, duration: 500 });
  },

  _toast(msg) {
    this._toastQueue.push(msg);
    if (!this._toastBusy) this._nextToast();
  },

  _nextToast() {
    const msg = this._toastQueue.shift();
    if (!msg) { this._toastBusy = false; return; }
    this._toastBusy = true;
    const bg = this.add.rectangle(GAME_W / 2, 96, 340, 34, 0x0a0c14, 0.9)
      .setDepth(DEPTH.TOAST).setStrokeStyle(1, 0xffd98a, 0.5).setAlpha(0);
    const t = this.add.text(GAME_W / 2, 96, msg, { fontFamily: 'Georgia, serif', fontSize: '14px', color: '#ffd98a' })
      .setOrigin(0.5).setDepth(DEPTH.TOAST + 1).setAlpha(0);
    bg.width = Math.max(220, t.width + 44);
    this.tweens.add({
      targets: [bg, t], alpha: 1, y: 108, duration: 300, hold: 1700, yoyo: true,
      onComplete: () => { bg.destroy(); t.destroy(); this._nextToast(); },
    });
  },

  // ── 结局幕 ──
  _showEnding(id, n) {
    this.state.ended = true; this.state.endingId = id;
    this.state.won = /TRUE|NORMAL/.test(n.type || '');
    this._endingNode = n;
    if (n.achievement) this._unlockAch(n.achievement);
    this._clearChoices(); this._setHint('');
    if (this._typeEvt) { this._typeEvt.remove(); this._typeEvt = null; this._typing = false; }
    this._updateProgress(typeof n.progress === 'number' ? n.progress : 100);

    const bright = id === 'ending_true' || id === 'ending_normal';   // 天堂结局白金收束，其余沉入黑暗
    const cx = GAME_W / 2;
    const veil = this.add.rectangle(0, 0, GAME_W, GAME_H, bright ? 0xf4ead2 : 0x030408, 1)
      .setOrigin(0, 0).setDepth(DEPTH.ENDING).setAlpha(0);
    const col = bright
      ? { type: '#8a6a20', title: '#4a3410', body: '#5a4a28', close: '#7a6a40', hint: '#9a8a60' }
      : { type: '#6b6456', title: '#e8d6b0', body: '#b9b2a4', close: '#8f8878', hint: '#6b6456' };
    const els = [veil];
    const mk = (y, txt, style) => {
      const t = this.add.text(cx, y, txt, style).setOrigin(0.5, 0).setDepth(DEPTH.ENDING + 1).setAlpha(0);
      els.push(t); return t;
    };
    mk(96, `— ${n.type || 'ENDING'} —`, { fontFamily: 'Georgia, serif', fontSize: '14px', color: col.type, letterSpacing: 4 });
    mk(126, n.title_end || '', { fontFamily: 'Georgia, serif', fontSize: '34px', color: col.title });
    mk(196, n.description || '', {
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif', fontSize: '16px', color: col.body,
      lineSpacing: 9, wordWrap: { width: 740 }, align: 'center',
    });
    const ach = n.achievement && STORY.achievements[n.achievement];
    const closing = (n.closing || '') + (ach ? `\n\n✦ 成就 · ${ach.title}` : '');
    const closeT = mk(0, closing, {
      fontFamily: 'Georgia, serif', fontSize: '15px', color: col.close,
      lineSpacing: 8, wordWrap: { width: 700 }, align: 'center', fontStyle: 'italic',
    });
    closeT.setY(GAME_H - closeT.height - 96);
    mk(GAME_H - 44, '▸ 空格', { fontFamily: '"Segoe UI", sans-serif', fontSize: '13px', color: col.hint });

    this.tweens.add({
      targets: [this.dante, this.virgil, this.banner, this.fgBand, ...this.fgFogs, ...this._panelEls],
      alpha: 0, duration: 900,
    });
    this.tweens.add({
      targets: els, alpha: 1, duration: 1400, ease: 'Sine.easeIn',
      onComplete: () => { this._endingReady = true; },
    });
  },

  _endingAdvance() {
    if (!this._endingReady || this._endingDone) return;
    this._endingDone = true;
    const n = this._endingNode;
    window.GameHUD?.showGameOver(this.state.won, `【${n.type}】${n.title_end}\n\n${n.closing || ''}`);
    // 共享 HUD 的 "🎉 YOU WIN / GAME OVER" 对叙事游戏太跳戏，改成结局名
    const t = document.getElementById('gameover-title');
    if (t) t.textContent = n.title_end || 'FIN';
  },
});
