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
      ground: c.ground.map(([a, b]) => [a + c.startX, b + c.startX]),
      pits: c.pits.map(([a, b]) => [a + c.startX, b + c.startX]),
      gusts: c.gusts.map(g => ({ ...g, x0: g.x0 + c.startX, x1: g.x1 + c.startX })),
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
    this.bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, this._makeBgTexture(C0))
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
      // 抉择亡魂
      if (c.soul) {
        this.soulSprite = this.add.sprite(c.soul.x, c.soul.y, 'soul_0').setScale(0.6).setDepth(DEPTH.SOUL);
        this.soulSprite.play('soul_flutter');
        this.tweens.add({ targets: this.soulSprite, x: c.soul.x + 18, angle: 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
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

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(160, 200);
    this.curCircle = 0;
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
    if (this.bg) this.bg.setTexture(this._makeBgTexture(c));
  },

  _updateAmbient() {
    if (this.bg) this.bg.tilePositionX = this.cameras.main.scrollX * 0.3;
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
