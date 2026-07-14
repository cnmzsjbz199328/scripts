/* SlimeVale — 背景视差长卷（蓝图 §3）：全程序化，清新明快版。
 * 远景=天空渐变+太阳+双层软丘（周期函数构造，整数波数天然无缝平铺）；
 * 云层单独一层慢速漂移；中景按段放装饰件（草叶/巨花/果树/芦苇瀑布/云朵）；
 * 段间过渡带用「晨雾白」压亮 crossfade（与 WyrmsEnd 的夜幕压暗相反）。 */
Object.assign(MeadowScene.prototype, {

  _segAt(x) {
    const S = Forge.SEGMENTS;
    for (let i = 0; i < S.length; i++) if (x < S[i].x1) return i;
    return S.length - 1;
  },

  // 周期地脊线：整数波数正弦叠加 → x=0 与 x=W 值相同，平铺无缝
  _ridgeY(x, W, base, waves, ph) {
    let y = base;
    for (let i = 0; i < waves.length; i++)
      y += waves[i][1] * Math.sin((x / W) * Math.PI * 2 * waves[i][0] + ph + i * 1.7);
    return y;
  },

  _bgBuildTextures() {
    for (let i = 0; i < 5; i++) { this._makeFar(i); this._makeMid(i); }
    this._makeClouds();
    this._makeGround();
  },

  _makeFar(i) {
    const W = Forge.W, H = Forge.H, cfg = Forge.BG[i];
    if (this.textures.exists(`bg${i}_far`)) return;
    const cv = this.textures.createCanvas(`bg${i}_far`, W, H), ctx = cv.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, cfg.sky[0]); g.addColorStop(0.55, cfg.sky[1]); g.addColorStop(1, cfg.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 太阳（柔光晕 + 亮核），每段位置不同
    const sx = 180 + ((i * 233) % 600), sy = 84 + (i % 3) * 22;
    const sg = ctx.createRadialGradient(sx, sy, 6, sx, sy, 120);
    sg.addColorStop(0, cfg.sun); sg.addColorStop(0.35, cfg.sun);
    sg.addColorStop(0.4, 'rgba(255,250,220,0.35)'); sg.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = sg; ctx.fillRect(sx - 130, sy - 130, 260, 260);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(sx, sy, 34, 0, Math.PI * 2); ctx.fill();
    // 双层软丘
    const layer = (color, base, waves, ph) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, this._ridgeY(x, W, base, waves, ph));
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    };
    layer(cfg.hill, 330, [[2, 26], [5, 12]], i * 2.3);
    layer(cfg.hill2, 398, [[3, 20], [7, 8]], i * 4.1);
    if (cfg.deco === 'creek') {   // 溪谷段：远丘上挂两条白瀑
      ctx.fillStyle = 'rgba(240,252,255,0.75)';
      for (const wx of [270, 700]) {
        ctx.beginPath();
        ctx.moveTo(wx - 9, this._ridgeY(wx, W, 330, [[2, 26], [5, 12]], i * 2.3) + 4);
        ctx.lineTo(wx + 9, this._ridgeY(wx, W, 330, [[2, 26], [5, 12]], i * 2.3) + 4);
        ctx.lineTo(wx + 16, H); ctx.lineTo(wx - 16, H);
        ctx.closePath(); ctx.fill();
      }
    }
    cv.refresh();
  },

  // 中景装饰件：确定性伪随机摆放，件宽 < 边距 → 不跨接缝，平铺无缝
  _makeMid(i) {
    const W = Forge.W, H = Forge.H, cfg = Forge.BG[i];
    if (this.textures.exists(`bg${i}_mid`)) return;
    const cv = this.textures.createCanvas(`bg${i}_mid`, W, H), ctx = cv.getContext();
    let seed = 4241 + i * 991;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const n = 9;
    for (let k = 0; k < n; k++) {
      const bx = 70 + (k / n) * (W - 140) + (rnd() - 0.5) * 46;
      const s = 0.7 + rnd() * 0.6;
      ctx.save(); ctx.translate(bx, H); ctx.scale(s, s);
      ctx.globalAlpha = 0.82;
      if (cfg.deco === 'grass') {
        ctx.strokeStyle = cfg.mid; ctx.lineWidth = 7; ctx.lineCap = 'round';
        for (let b = -1; b <= 1; b++) {
          ctx.beginPath(); ctx.moveTo(b * 14, 0);
          ctx.quadraticCurveTo(b * 22, -60, b * 34 + (rnd() - 0.5) * 10, -104 - rnd() * 30);
          ctx.stroke();
        }
      } else if (cfg.deco === 'flower') {
        ctx.strokeStyle = '#5f9a58'; ctx.lineWidth = 9; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(8, -70, 0, -128); ctx.stroke();
        ctx.fillStyle = cfg.mid;
        for (let p = 0; p < 6; p++) {
          const a = p / 6 * Math.PI * 2;
          ctx.beginPath(); ctx.ellipse(Math.cos(a) * 26, -128 + Math.sin(a) * 26, 17, 11, a, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#ffd166';
        ctx.beginPath(); ctx.arc(0, -128, 15, 0, Math.PI * 2); ctx.fill();
      } else if (cfg.deco === 'orchard') {
        ctx.fillStyle = '#8a6a42';
        ctx.fillRect(-8, -84, 16, 84);
        ctx.fillStyle = '#6fae5e';
        ctx.beginPath(); ctx.arc(0, -122, 52, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-40, -96, 34, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(40, -96, 34, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = cfg.mid;
        for (let f = 0; f < 4; f++) {
          ctx.beginPath(); ctx.arc(-34 + f * 24, -110 + (f % 2) * 26, 7, 0, Math.PI * 2); ctx.fill();
        }
      } else if (cfg.deco === 'creek') {
        ctx.strokeStyle = cfg.mid; ctx.lineWidth = 6; ctx.lineCap = 'round';
        for (let b = -2; b <= 2; b++) {
          ctx.beginPath(); ctx.moveTo(b * 12, 0);
          ctx.quadraticCurveTo(b * 16, -70, b * 13, -110 - Math.abs(b) * -14 - rnd() * 26);
          ctx.stroke();
        }
        ctx.fillStyle = cfg.mid;
        for (let b = -2; b <= 2; b++) {
          ctx.beginPath(); ctx.ellipse(b * 13, -116 - rnd() * 22, 6, 13, 0, 0, Math.PI * 2); ctx.fill();
        }
      } else {   // cloudtop：飘浮云朵
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        const cy = -90 - rnd() * 150;
        ctx.beginPath(); ctx.arc(-30, cy, 22, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, cy - 14, 28, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(32, cy, 22, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, cy + 10, 54, 16, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    cv.refresh();
  },

  _makeClouds() {
    if (this.textures.exists('clouds')) return;
    const W = Forge.W, H = 240;
    const cv = this.textures.createCanvas('clouds', W, H), ctx = cv.getContext();
    let seed = 8117;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 5; k++) {
      const cx = 90 + (k / 5) * (W - 180) + (rnd() - 0.5) * 40;
      const cy = 40 + rnd() * 140, s = 0.7 + rnd() * 0.7;
      ctx.fillStyle = `rgba(255,255,255,${0.55 + rnd() * 0.25})`;
      ctx.beginPath(); ctx.arc(cx - 34 * s, cy, 20 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy - 14 * s, 26 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 34 * s, cy, 20 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, cy + 8 * s, 56 * s, 16 * s, 0, 0, Math.PI * 2); ctx.fill();
    }
    cv.refresh();
  },

  // 地面带：嫩草绿渐变 + 草叶簇 + 小花点（角色脚底沉入其后 → 接地）
  _makeGround() {
    if (this.textures.exists('ground_band')) return;
    const W = Forge.W, BH = 150, TOP = 16;
    const cv = this.textures.createCanvas('ground_band', W, BH), ctx = cv.getContext();
    let seed = 77813;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    ctx.beginPath(); ctx.moveTo(0, BH);
    for (let x = 0; x <= W; x += 6)
      ctx.lineTo(x, TOP + 8 + this._ridgeY(x, W, 0, [[4, 4], [9, 2.5], [17, 1.5]], 0.7));
    ctx.lineTo(W, BH); ctx.closePath();
    const g = ctx.createLinearGradient(0, TOP, 0, BH);
    g.addColorStop(0, '#84d98c'); g.addColorStop(0.4, '#5fbf6e'); g.addColorStop(1, '#3f9e56');
    ctx.fillStyle = g; ctx.fill();
    // 草叶簇
    ctx.strokeStyle = 'rgba(46,138,84,0.85)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const bx = 12 + rnd() * (W - 24), by = TOP + 20 + rnd() * 8;
      for (let b = -1; b <= 1; b++) {
        ctx.beginPath(); ctx.moveTo(bx + b * 3, by);
        ctx.quadraticCurveTo(bx + b * 6, by - 8, bx + b * 9 + (rnd() - 0.5) * 4, by - 13 - rnd() * 6);
        ctx.stroke();
      }
    }
    // 小花/露珠点
    for (let i = 0; i < 26; i++) {
      const fx = 16 + rnd() * (W - 32), fy = TOP + 28 + rnd() * 100;
      ctx.fillStyle = ['rgba(255,255,255,0.85)', 'rgba(255,214,120,0.85)', 'rgba(255,170,200,0.8)', 'rgba(180,240,255,0.8)'][(rnd() * 4) | 0];
      ctx.beginPath(); ctx.arc(fx, fy, 2.2 + rnd() * 1.8, 0, Math.PI * 2); ctx.fill();
    }
    cv.refresh();
  },

  _buildParallax() {
    const D = Forge.C.DEPTH, W = Forge.W, H = Forge.H;
    this.farA = this.add.tileSprite(0, 0, W, H, 'bg0_far').setOrigin(0).setScrollFactor(0).setDepth(D.BG);
    this.farB = this.add.tileSprite(0, 0, W, H, 'bg1_far').setOrigin(0).setScrollFactor(0).setDepth(D.BG + 1).setAlpha(0);
    this.clouds = this.add.tileSprite(0, 20, W, 240, 'clouds').setOrigin(0).setScrollFactor(0).setDepth(D.CLOUD);
    this.midA = this.add.tileSprite(0, 0, W, H, 'bg0_mid').setOrigin(0).setScrollFactor(0).setDepth(D.MID);
    this.midB = this.add.tileSprite(0, 0, W, H, 'bg1_mid').setOrigin(0).setScrollFactor(0).setDepth(D.MID + 1).setAlpha(0);
    this.ground = this.add.tileSprite(0, 406, W, 150, 'ground_band').setOrigin(0).setScrollFactor(0).setDepth(D.GROUND);
    this.add.image(W / 2, H / 2, 'vign').setScrollFactor(0).setDepth(D.VIGN);
    // 段间过渡带晨雾（压亮版 crossfade）
    this.fogRect = this.add.rectangle(W / 2, H / 2, W, H, 0xf4fbf6, 1)
      .setAlpha(0).setScrollFactor(0).setDepth(D.FOG);
  },

  _updateParallax(t) {
    const cam = this.cameras.main.scrollX;
    this.farA.tilePositionX = cam * 0.25; this.farB.tilePositionX = cam * 0.25;
    this.clouds.tilePositionX = cam * 0.12 + (t || 0) * 0.008;   // 云自漂
    this.midA.tilePositionX = cam * 0.55; this.midB.tilePositionX = cam * 0.55;
    this.ground.tilePositionX = cam;

    const cx = cam + Forge.W * 0.5;
    const s = this._segAt(cx), seg = Forge.SEGMENTS[s];
    const BAND = 500;
    let tt = 0;
    if (s < Forge.SEGMENTS.length - 1)
      tt = Phaser.Math.Clamp((cx - (seg.x1 - BAND)) / BAND, 0, 1);
    const sm = tt * tt * (3 - 2 * tt);
    const a = seg.bg, b = Math.min(a + 1, Forge.SEGMENTS.length - 1);
    const setTex = (ts, key) => { if (ts.texture.key !== key) ts.setTexture(key); };
    setTex(this.farA, `bg${a}_far`); setTex(this.farB, `bg${b}_far`);
    setTex(this.midA, `bg${a}_mid`); setTex(this.midB, `bg${b}_mid`);
    this.farB.setAlpha(sm); this.midB.setAlpha(sm);
    this.fogRect.setAlpha(Math.sin(Math.PI * sm) * 0.4);
  },
});
