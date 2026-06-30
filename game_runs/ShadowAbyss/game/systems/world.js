/* ShadowAbyss — 世界系统：纹理/动画/单一连续世界搭建/暗黑视界/环境氛围/维吉尔。 */
Object.assign(AbyssScene.prototype, {

  _makeFxTextures() {
    if (!this.textures.exists('lantern')) {
      const S = 256, tex = this.textures.createCanvas('lantern', S, S), ctx = tex.getContext();
      const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      g.addColorStop(0.0, 'rgba(255,255,255,1)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.85)');
      g.addColorStop(1.0, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); tex.refresh();
    }
    if (!this.textures.exists('glow')) {
      const S = 256, tex = this.textures.createCanvas('glow', S, S), ctx = tex.getContext();
      const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      g.addColorStop(0.0, 'rgba(255,180,120,0.9)');
      g.addColorStop(0.45, 'rgba(255,150,90,0.4)');
      g.addColorStop(1.0, 'rgba(255,150,90,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); tex.refresh();
    }
    if (!this.textures.exists('ash')) {
      const S = 8, tex = this.textures.createCanvas('ash', S, S), ctx = tex.getContext();
      ctx.fillStyle = '#caa37a'; ctx.beginPath(); ctx.arc(4, 4, 2.4, 0, 7); ctx.fill(); tex.refresh();
    }
    this._makeHazardTextures();
    if (!this.textures.exists('fg_cliff')) {
      const w = 180, h = 280;
      const tex = this.textures.createCanvas('fg_cliff', w, h), ctx = tex.getContext();
      ctx.fillStyle = '#030406';
      ctx.beginPath();
      ctx.moveTo(w, h);
      ctx.lineTo(0, h);
      ctx.lineTo(0, h * 0.3);
      ctx.lineTo(w * 0.25, h * 0.45);
      ctx.lineTo(w * 0.5, h * 0.25);
      ctx.lineTo(w * 0.75, h * 0.6);
      ctx.lineTo(w, h * 0.5);
      ctx.closePath();
      ctx.fill();
      tex.refresh();
    }
    if (!this.textures.exists('fg_cliff2')) {
      const w = 220, h = 340;
      const tex = this.textures.createCanvas('fg_cliff2', w, h), ctx = tex.getContext();
      ctx.fillStyle = '#020305';
      ctx.beginPath();
      ctx.moveTo(w, h);
      ctx.lineTo(0, h);
      ctx.lineTo(0, h * 0.6);
      ctx.lineTo(w * 0.3, h * 0.35);
      ctx.lineTo(w * 0.65, h * 0.7);
      ctx.lineTo(w * 0.85, h * 0.5);
      ctx.lineTo(w, h * 0.75);
      ctx.closePath();
      ctx.fill();
      tex.refresh();
    }
    if (!this.textures.exists('fg_branch')) {
      const w = 140, h = 140;
      const tex = this.textures.createCanvas('fg_branch', w, h), ctx = tex.getContext();
      ctx.strokeStyle = '#030406';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w * 0.5, h * 0.5);
      ctx.moveTo(w * 0.25, h * 0.25);
      ctx.lineTo(w * 0.1, h * 0.6);
      ctx.moveTo(w * 0.4, h * 0.4);
      ctx.lineTo(w * 0.85, h * 0.3);
      ctx.moveTo(w * 0.5, h * 0.5);
      ctx.lineTo(w * 0.9, h * 0.85);
      ctx.stroke();
      tex.refresh();
    }
  },

  _makeAnims() {
    const mk = (key, prefix, n, fps, loop) => {
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frameRate: fps, repeat: loop ? -1 : 0,
        frames: Array.from({ length: n }, (_, i) => ({ key: `${prefix}_${i}` })) });
    };
    mk('d_idle', 'dante_idle', 4, 4, true);
    mk('d_walk', 'dante_walk', 6, 12, true);
    mk('d_jump', 'dante_jump', 3, 8, false);
    mk('v_idle', 'virgil_idle', 4, 4, true);
    mk('v_walk', 'virgil_walk', 6, 11, true);
    mk('soul_flutter', 'soul', 2, 4, true);
    mk('fiend_move', 'fiend_move', 2, 5, true);
    mk('satan_fly', 'satan', 2, 3, true);
    for (const c of CIRCLES) mk(`amb_tree_${c.id}`, `amb_tree_${c.id}`, 6, 7, true);
  },

  // 环境视差层：枯树带（视差精灵）+ 流雾带（雾下）+ 风痕带（雾上，仅欲色）。
  // 配合调淡后的暗雾幕，背景一路变丰富又不丢氛围。
  _buildAmbient() {
    // 流雾：离散云精灵池（雾幕下，被提灯揭示）。各自独立的飘速/高度/大小/形状/透明度，
    // 持续自主飘动 + 轻微视差，飘出屏缘即用新随机参数重生 —— 不平铺、不与相机死同步，
    // 规避"白云规律飘动"的机械感。
    this._cloudFog = (this.circles[0].ambient || CIRCLES[0].ambient).fog;
    this.clouds = [];
    for (let i = 0; i < 8; i++) {
      const c = this.add.image(0, 0, `${this._cloudFog}_0`)
        .setScrollFactor(0).setDepth(DEPTH.FOG - 40);
      this._respawnCloud(c, Phaser.Math.Between(0, GAME_W));   // 初始铺满屏宽
      this.clouds.push(c);
    }
    // 风痕带（雾幕上，永远可见的情欲之风）
    this.windBand = this.add.tileSprite(0, GAME_H * 0.12, GAME_W, GAME_H * 0.5, 'amb_wind_lust_0')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.FOG + 5).setAlpha(0).setTileScale(1.3, 1.3);

    // 枯树视差带：跨整个世界散布，scrollFactor 0.5 → 中景缓慢掠过
    this.trees = [];
    let x = 120;
    while (x < WORLD_W) {
      const ci = this.circles.findIndex(c => x >= c.startX && x < c.startX + c.span);
      const key = (this.circles[Math.max(0, ci)].ambient || CIRCLES[0].ambient).tree;
      const t = this.add.sprite(x, FLOOR_Y - 6, `${key}_0`)
        .setOrigin(0.5, 1).setScrollFactor(0.5).setDepth(DEPTH.FOG - 30)
        .setScale(Phaser.Math.FloatBetween(1.4, 2.4)).setAlpha(0.9);
      t.play(key);
      this.trees.push(t);
      x += Phaser.Math.Between(360, 560);
    }

    // 风痕带帧循环（tileSprite 不能播 anim，手动换纹理；云用离散飘动，不在此列）
    this._ambTick = 0;
    this.time.addEvent({ delay: 130, loop: true, callback: () => {
      this._ambTick++;
      const a = this.circles[this.curCircle ?? 0].ambient || CIRCLES[0].ambient;
      if (a.wind) this.windBand.setTexture(`${a.wind}_${this._ambTick % 4}`);
    }});
  },

  // 单朵云重生：随机高度/大小/透明度/形状帧/自主飘速/视差系数（每朵略不同 → 不同步）
  _respawnCloud(c, x) {
    c.x = x;
    c.y = Phaser.Math.Between(24, Math.floor(GAME_H * 0.52));
    c.setScale(Phaser.Math.FloatBetween(1.3, 2.8));
    c.setAlpha(Phaser.Math.FloatBetween(0.20, 0.48));
    c.setTexture(`${this._cloudFog}_${Phaser.Math.Between(0, 7)}`);
    c._speed = Phaser.Math.FloatBetween(4, 16);     // px/s 自主飘速（与相机无关）
    c._par = Phaser.Math.FloatBetween(0.12, 0.26);  // 视差系数（每朵不同 → 错开）
  },

  // 程序化剪影背景纹理（渐变天空 + 远景崖壁），按圈配色，零 AI 图
  _makeBgTexture(c) {
    const key = `bg_${c.id}`;
    if (this.textures.exists(key)) return key;
    const W = GAME_W, H = GAME_H, tex = this.textures.createCanvas(key, W, H), ctx = tex.getContext();
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, c.parallax.sky[0]); sky.addColorStop(1, c.parallax.sky[1]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = c.parallax.cliff;
    for (let layer = 0; layer < 2; layer++) {
      const base = H * (0.55 + layer * 0.16);
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 60) ctx.lineTo(x, base + Math.sin(x * 0.018 + layer * 2) * 40 + (layer ? 30 : 0));
      ctx.lineTo(W, H); ctx.closePath();
      ctx.globalAlpha = layer ? 0.7 : 1; ctx.fill();
    }
    ctx.globalAlpha = 1; tex.refresh();
    return key;
  },

  // 把相对坐标的圈数据绝对化（加 startX）
  _absoluteCircles() {
    return CIRCLES.map(c => ({
      ...c,
      ground: (c.ground || []).map(([a, b]) => [a + c.startX, b + c.startX]),
      pits: (c.pits || []).map(([a, b]) => [a + c.startX, b + c.startX]),
      gusts: (c.gusts || []).map(g => ({ ...g, x0: g.x0 + c.startX, x1: g.x1 + c.startX })),
      groundHazards: (c.groundHazards || []).map(g => ({ ...g, x: g.x + c.startX })),
      patrollers: (c.patrollers || []).map(p => ({ ...p, x0: p.x0 + c.startX, x1: p.x1 + c.startX })),
      fallers: (c.fallers || []).map(f => ({ ...f, x0: f.x0 + c.startX, x1: f.x1 + c.startX })),
      soul: c.soul ? { ...c.soul, x: c.soul.x + c.startX } : null,
      riftAbs: c.riftX + c.startX,
    }));
  },

  _buildWorld() {
    this.circles = this._absoluteCircles();
    const C0 = this.circles[0];
    this.physics.world.setBounds(0, 0, WORLD_W, FLOOR_Y + 400);
    this.physics.world.setBoundsCollision(true, true, true, false);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    // 背景 + 暗黑雾幕 + 反相光晕遮罩
    const bgTex = C0.parallax.panorama || this._makeBgTexture(C0);
    this.bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, bgTex)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.BG);
    this.fog = this.add.rectangle(0, 0, GAME_W, GAME_H, C0.fog, C0.fogA)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.FOG);
    this.lantern = this.add.image(GAME_W / 2, GAME_H / 2, 'lantern').setScrollFactor(0).setVisible(false);
    const mask = this.lantern.createBitmapMask();
    mask.invertAlpha = true;
    this.fog.setMask(mask);
    this._lightR = C0.lightR;

    this.glow = this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.GLOW);

    // 地面（所有圈一次建好）
    this.solids = this.physics.add.staticGroup();
    for (const c of this.circles) {
      for (const [x0, x1] of c.ground) {
        for (let x = x0; x < x1; x += 48) {
          for (let row = 0; row < 8; row++) {
            const sp = this.add.image(x + 24, FLOOR_Y + 24 + row * 48, 'tile_rock')
              .setDisplaySize(48, 48).setDepth(DEPTH.GROUND);
            if (row === 0) { this.solids.add(sp); sp.body.setSize(48, 48); }
          }
        }
      }
      // 下行裂口
      const rift = this.add.image(c.riftAbs + 20, FLOOR_Y - 40, 'rift').setDepth(DEPTH.RIFT);
      this.tweens.add({ targets: rift, alpha: 0.6, duration: 1100, yoyo: true, repeat: -1 });
      // 抉择亡魂（精灵存到圈对象上，支持多圈各自的抉择点）
      if (c.soul) {
        c.soulSprite = this.add.sprite(c.soul.x, c.soul.y, 'soul_0').setScale(0.6).setDepth(DEPTH.SOUL);
        c.soulSprite.play('soul_flutter');
        this.tweens.add({ targets: c.soulSprite, x: c.soul.x + 18, angle: 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      }
    }

    // 但丁（贴左墙出生 + 世界边界碰撞，防 L2 左右键位移精确抵消，见 [[game-verify-l2-movement-cancel]]）
    this.player = this.physics.add.sprite(60, FLOOR_Y - 60, 'dante_idle_0');
    this.player.setScale(0.62);
    this.player.body.setSize(36, 96).setOffset(66, 60);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(DEPTH.PLAYER);
    this.physics.add.collider(this.player, this.solids);
    this.player.play('d_idle');
    this.lastSafeX = 60;
    if (window.__gameState) window.__gameState.player = this.player;

    // 维吉尔引路者
    this.virgil = this.add.sprite(170, FLOOR_Y - 62, 'virgil_idle_0').setScale(0.66).setDepth(DEPTH.PLAYER - 1);
    this.virgil.play('v_idle');

    // 灰烬环境轨
    this.ashEmitter = this.add.particles(0, 0, 'ash', {
      x: { min: 0, max: GAME_W }, y: -10, lifespan: 5200, quantity: 1, frequency: 220,
      speedY: { min: 14, max: 34 }, speedX: { min: -10, max: 10 },
      scale: { min: 0.4, max: 1 }, alpha: { start: 0.5, end: 0 },
    }).setScrollFactor(0).setDepth(DEPTH.FOG + 1);

    // 近景前景: 程序化黑色崖壁/断枝，scrollFactor 1.12-1.15，放在雾幕下 (depth DEPTH.FOG - 5 = -55)
    this.foregrounds = [];
    let fgX = 200;
    while (fgX < WORLD_W) {
      const isCliff = fgX % 3 !== 0;
      if (isCliff) {
        const key = fgX % 2 === 0 ? 'fg_cliff' : 'fg_cliff2';
        const fg = this.add.image(fgX, GAME_H, key)
          .setOrigin(0.5, 1).setScrollFactor(1.15).setDepth(DEPTH.FOG - 5)
          .setAlpha(0.95);
        this.foregrounds.push(fg);
      } else {
        const fg = this.add.image(fgX, 0, 'fg_branch')
          .setOrigin(0.5, 0).setScrollFactor(1.12).setDepth(DEPTH.FOG - 5)
          .setAlpha(0.95).setFlipY(true);
        this.foregrounds.push(fg);
      }
      fgX += Phaser.Math.Between(450, 700);
    }

    this._buildHazards();

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(160, 200);
    this.curCircle = 0;
    this._buildAmbient();
  },

  _currentCircleIdx() {
    const x = this.player ? this.player.x : 0;
    let idx = 0;
    for (let i = 0; i < this.circles.length; i++) if (x >= this.circles[i].startX) idx = i;
    return idx;
  },

  // 进入某圈时切换氛围（雾色/亮度/背景配色）
  _applyAtmosphere(idx) {
    const c = this.circles[idx];
    this.curCircle = idx;
    this._lightR = c.lightR;
    if (this.fog) { this.fog.fillColor = c.fog; this.fog.fillAlpha = c.fogA; }
    if (this.bg) {
      if (c.parallax.panorama) {
        this.bg.setTexture(c.parallax.panorama);
      } else {
        this.bg.setTexture(this._makeBgTexture(c));
      }
    }
    // 云切换到本圈配色集（后续重生自然采用新集；当前云也即时换形状）
    const a = c.ambient || CIRCLES[idx].ambient;
    this._cloudFog = a.fog;
    if (this.clouds) this.clouds.forEach(cl => cl.setTexture(`${a.fog}_${Phaser.Math.Between(0, 7)}`));
    // 风痕带仅在有风的圈淡入（情欲之风）
    if (this.windBand) this.tweens.add({ targets: this.windBand, alpha: a.wind ? 0.45 : 0, duration: 600 });
  },

  _updateAmbient(time, delta) {
    const sx = this.cameras.main.scrollX;
    const dt = (delta || 16) / 1000;
    if (this.bg) this.bg.tilePositionX = sx * 0.2;        // 远景 AI 全景层
    if (this.windBand) this.windBand.tilePositionX = sx * 0.5;
    // 离散云：自主飘动（与相机解耦）+ 每朵不同的视差，飘出屏缘换新参数重生
    if (this.clouds) {
      const dsx = sx - (this._prevScrollX ?? sx);
      for (const c of this.clouds) {
        c.x -= c._speed * dt + dsx * c._par;
        const m = c.displayWidth;
        if (c.x < -m) this._respawnCloud(c, GAME_W + m * 0.5);
        else if (c.x > GAME_W + m) this._respawnCloud(c, -m * 0.5);
      }
      this._prevScrollX = sx;
    }
  },

  _updateLight() {
    if (!this.lantern || !this.player) return;
    const cam = this.cameras.main;
    const dir = this.player.flipX ? -1 : 1;
    const sx = this.player.x - cam.scrollX + LIGHT_BIAS * dir;
    const sy = this.player.y - cam.scrollY - 4;
    const r = Math.max(LIGHT_MIN, this._lightR);
    const d = r * 2 * LIGHT_SOFT * this._lightPulse;
    this.lantern.setPosition(sx, sy).setDisplaySize(d, d);
    if (this.glow) {
      const gd = r * 1.5 * this._lightPulse;
      this.glow.setPosition(this.player.x, this.player.y - 4).setDisplaySize(gd, gd)
        .setAlpha(0.5 + 0.2 * (this._lightPulse - 1) * 5);
    }
  },

  _animateVirgil(moving) {
    if (!this.virgil || !this.player) return;
    const targetX = Math.min(this.player.x + 96, FINAL_RIFT_X + 20);
    const dx = targetX - this.virgil.x;
    if (Math.abs(dx) > 4) {
      this.virgil.x += Phaser.Math.Clamp(dx, -PLAYER_SPEED / 50, PLAYER_SPEED / 50);
      this.virgil.setFlipX(dx < 0);
      if (this.virgil.anims.currentAnim?.key !== 'v_walk') this.virgil.play('v_walk', true);
    } else if (this.virgil.anims.currentAnim?.key !== 'v_idle') {
      this.virgil.play('v_idle', true);
    }
    this.virgil.y = this.player.y - 2;
  },
});
