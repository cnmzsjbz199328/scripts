/* SlimeVale — 战斗回放（另一视角的击杀集锦）。
 * 录制：cine 锁点开战即启动，每 90ms 快照一帧「镜头带内所有 Sprite/Image 的位姿」
 *      （角色/技能形态/弹体都在带内；粒子 Blitter、血条 Graphics、文字天然被类型过滤），
 *      并记录当帧 Boss 位置作为回放镜头的注视点。环形缓冲 ~12s。
 * 播放：主怪死后世界静止，奶油纸色幕布 + 信箱黑边铺满屏幕，按快照插值重演最后一段战斗——
 *      注视点跟 Boss、1.5× 变焦（"另一个视角"），最后 ~1.3s 切 0.3× 慢镜 + 白闪 +「致命一击！」。
 * 任意键/`__advanceCard()` 跳过（probe.cardActive 在回放中为 true，bot 管线自动跳过）。 */
Object.assign(MeadowScene.prototype, {

  _recStart() {
    this._rec = { active: true, frames: [], acc: 0 };
  },

  _recStop() {
    if (this._rec) this._rec.active = false;
  },

  _recTick(dms) {
    const R = this._rec;
    if (!R || !R.active) return;
    R.acc += dms;
    if (R.acc < 90) return;
    R.acc = 0;
    let cx = null, cy = null;
    for (const e of this.enemies)
      if (!e.dead && e.def.boss) { cx = e.x; cy = this._eBody(e); break; }
    if (cx == null) { cx = this.P.x; cy = this.P.y - 40; }
    const D = Forge.C.DEPTH;
    const actors = [];
    for (const o of this.children.list) {
      if (o.type !== 'Sprite' && o.type !== 'Image') continue;
      if (!o.visible || o.alpha < 0.06) continue;
      if (o.scrollFactorX === 0) continue;
      if (o.depth < D.CHAR - 1.5 || o.depth > D.FX + 1) continue;
      if (!o.texture || o.texture.key === '__MISSING') continue;
      o._rid = o._rid || (this._recSeq = (this._recSeq || 0) + 1);
      actors.push({
        id: o._rid, k: o.texture.key, x: o.x, y: o.y,
        sx: o.scaleX, sy: o.scaleY, fx: o.flipX, a: o.angle, al: o.alpha,
        ox: o.originX, oy: o.originY,
      });
    }
    R.frames.push({ cx, cy, actors });
    if (R.frames.length > 140) R.frames.shift();
  },

  _makeCineTextures() {
    if (this.textures.exists('cine_bg')) return;
    const W = Forge.W, H = Forge.H;
    const cv = this.textures.createCanvas('cine_bg', W, H), ctx = cv.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, H);   // 奶油回忆纸色
    g.addColorStop(0, '#f6eed8'); g.addColorStop(0.6, '#efe2c4'); g.addColorStop(1, '#e4d2ac');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
    rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(90,64,30,0.32)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(90,64,30,0.25)'; ctx.lineWidth = 3;   // 手绘画框
    ctx.strokeRect(14, 14, W - 28, H - 28);
    ctx.fillStyle = 'rgba(90,64,30,0.5)';                          // 地面线
    ctx.fillRect(0, 442, W, 2.5);
    cv.refresh();
  },

  _playCine(onDone) {
    const R = this._rec;
    if (!R || R.frames.length < 8) return onDone();
    this._makeCineTextures();
    const D = Forge.C.DEPTH, W = Forge.W, H = Forge.H;
    const frames = R.frames.slice(-110);   // 最后 ~10s
    const C = this.cine = {
      onDone, frames, t: 0, hold: 0, pool: new Map(), els: [],
      scx: frames[0].cx, zoom: 1.5, fatal: false, done: false,
      slowFrom: Math.max(1, frames.length - 14),
    };
    const el = (o) => { C.els.push(o); return o; };
    el(this.add.image(W / 2, H / 2, 'cine_bg').setScrollFactor(0).setDepth(D.CINE).setAlpha(0))
      .setAlpha(0.98);
    el(this.add.rectangle(W / 2, 30, W, 60, 0x2e4a3f, 0.95).setScrollFactor(0).setDepth(D.CINE + 6));
    el(this.add.rectangle(W / 2, H - 30, W, 60, 0x2e4a3f, 0.95).setScrollFactor(0).setDepth(D.CINE + 6));
    el(this.add.text(24, 18, '❀ 露之记忆 · 战斗回放', {
      fontFamily: 'Trebuchet MS, PingFang SC, sans-serif', fontSize: '17px', color: '#f2e8c9',
    }).setScrollFactor(0).setDepth(D.CINE + 7));
    el(this.add.text(W - 24, H - 40, '按任意键跳过 ▸', {
      fontFamily: 'Trebuchet MS, PingFang SC, sans-serif', fontSize: '13px', color: '#cfe0c9',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(D.CINE + 7));
    C.flash = el(this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 1)
      .setScrollFactor(0).setDepth(D.CINE + 8).setAlpha(0));
    C.fatalText = el(this.add.text(W / 2, H / 2 - 120, '致命一击！', {
      fontFamily: 'Trebuchet MS, PingFang SC, sans-serif', fontSize: '44px', fontStyle: 'bold',
      color: '#e85a4f', stroke: '#fff6e8', strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D.CINE + 9).setAlpha(0));
    C.keyHandler = () => this._endCine();
    this.input.keyboard.on('keydown', C.keyHandler);
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';   // 电影期间收起 DOM HUD，结束时恢复
    window.GameAudio && GameAudio.play('ui');
  },

  _updateCine(dms) {
    const C = this.cine;
    if (!C || C.done) return;
    const total = C.frames.length;
    const idx = C.t / 90;
    const speed = idx >= C.slowFrom ? 0.3 : 0.92;
    C.t += dms * speed;
    const fi = Math.min(C.t / 90, total - 1);
    const a = Math.floor(fi), b = Math.min(a + 1, total - 1), f = fi - a;
    const fa = C.frames[a], fb = C.frames[b];

    // 注视点平滑跟 Boss；慢镜段推近变焦
    const cx = fa.cx + (fb.cx - fa.cx) * f;
    C.scx += (cx - C.scx) * Math.min(1, dms / 260);
    const wantZoom = fi >= C.slowFrom ? 1.9 : 1.5;
    C.zoom += (wantZoom - C.zoom) * Math.min(1, dms / 420);
    const z = C.zoom, gy = 442, D = Forge.C.DEPTH;

    const seen = new Set();
    const map = new Map();
    for (const o of fb.actors) map.set(o.id, o);
    for (const o of fa.actors) {
      const n = map.get(o.id) || o;
      const x = o.x + (n.x - o.x) * f, y = o.y + (n.y - o.y) * f;
      const ang = o.a + (n.a - o.a) * f, al = o.al + (n.al - o.al) * f;
      let img = C.pool.get(o.id);
      if (!img) {
        img = this.add.image(0, 0, o.k).setScrollFactor(0).setDepth(D.CINE + 3);
        C.pool.set(o.id, img);
      }
      if (img.texture.key !== o.k) img.setTexture(o.k);
      img.setOrigin(o.ox, o.oy)
        .setPosition(480 + (x - C.scx) * z, gy - (Forge.C.FEET_Y - y) * z)
        .setScale(o.sx * z, o.sy * z)
        .setFlipX(o.fx).setAngle(ang).setAlpha(al).setVisible(true);
      seen.add(o.id);
    }
    for (const [id, img] of C.pool) if (!seen.has(id)) img.setVisible(false);

    // 慢镜起点：白闪 +「致命一击！」
    if (fi >= C.slowFrom && !C.fatal) {
      C.fatal = true;
      C.flash.setAlpha(0.9);
      this.tweens.add({ targets: C.flash, alpha: 0, duration: 420 });
      C.fatalText.setAlpha(1).setScale(0.6);
      this.tweens.add({ targets: C.fatalText, scale: 1, duration: 260, ease: 'Back.easeOut' });
      window.GameAudio && GameAudio.play('splashBad');
    }
    if (fi >= total - 1) {
      C.hold += dms;
      if (C.hold > 950) this._endCine();
    }
  },

  _endCine() {
    const C = this.cine;
    if (!C || C.done) return;
    C.done = true;
    this.input.keyboard.off('keydown', C.keyHandler);
    for (const [, img] of C.pool) img.destroy();
    for (const o of C.els) o.destroy();
    this.cine = null;
    this._rec = null;
    const hud = document.getElementById('hud');
    if (hud && !this.ended) hud.style.display = 'flex';
    C.onDone && C.onDone();
  },
});
