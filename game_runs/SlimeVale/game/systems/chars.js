/* SlimeVale — 程序化角色/道具贴图（零素材）。
 * 统一「白描边贴纸风」：先画彩色本体，再用 source-in 制白剪影、8 向偏移垫底——
 * 高明度背景上角色永远浮得起来，也顺手统一了美术语言。
 * 贴图同时是变形点云的采样源（Forge.Cloud.fromTexture 读 alpha>90 的像素）。 */
Object.assign(MeadowScene.prototype, {

  // 贴纸工厂：pad 6px 容纳描边；draw(ctx) 在 (0,0)~(w,h) 内作画
  _sticker(key, w, h, draw) {
    if (this.textures.exists(key)) return;
    const PAD = 6, W = w + PAD * 2, H = h + PAD * 2;
    const art = document.createElement('canvas'); art.width = W; art.height = H;
    const a = art.getContext('2d'); a.translate(PAD, PAD); draw(a);
    const sil = document.createElement('canvas'); sil.width = W; sil.height = H;
    const s = sil.getContext('2d');
    s.drawImage(art, 0, 0);
    s.globalCompositeOperation = 'source-in';
    s.fillStyle = '#ffffff'; s.fillRect(0, 0, W, H);
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const o = out.getContext('2d');
    for (let i = 0; i < 8; i++)
      o.drawImage(sil, Math.cos(i * Math.PI / 4) * 3, Math.sin(i * Math.PI / 4) * 3);
    o.drawImage(art, 0, 0);
    this.textures.addCanvas(key, out);
  },

  // 通用小件：竖椭圆眼（带高光）
  _eye(x, cx, cy, rx, ry, color) {
    x.fillStyle = color || '#17453a';
    x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.9)';
    x.beginPath(); x.ellipse(cx - rx * 0.3, cy - ry * 0.35, rx * 0.34, ry * 0.28, 0, 0, Math.PI * 2); x.fill();
  },

  _buildCharTextures() {
    // ── 主角露露：薄荷绿史莱姆（朝右）──
    this._sticker('p_slime', 96, 76, (x) => {
      const g = x.createLinearGradient(0, 4, 0, 76);
      g.addColorStop(0, '#a9f2cd'); g.addColorStop(0.45, '#63dda2'); g.addColorStop(1, '#3fc586');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(6, 72);
      x.bezierCurveTo(2, 40, 16, 8, 48, 6);
      x.bezierCurveTo(80, 8, 94, 40, 90, 72);
      x.quadraticCurveTo(72, 76, 48, 74);
      x.quadraticCurveTo(24, 76, 6, 72);
      x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.55)';                    // 顶部高光
      x.beginPath(); x.ellipse(32, 22, 16, 9, -0.5, 0, Math.PI * 2); x.fill();
      this._eye(x, 44, 42, 6, 9);                                // 双眼偏右（面朝右）
      this._eye(x, 70, 42, 6, 9);
      x.strokeStyle = '#17453a'; x.lineWidth = 3; x.lineCap = 'round';
      x.beginPath(); x.arc(57, 52, 7, 0.25, Math.PI - 0.25); x.stroke();   // 微笑
      x.fillStyle = 'rgba(255,140,160,0.4)';                     // 腮红
      x.beginPath(); x.ellipse(32, 52, 7, 4, 0, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.ellipse(84, 52, 5, 4, 0, 0, Math.PI * 2); x.fill();
    });

    // ── 灰兔蹦蹦：枯萎灰紫，一只耳朵耷拉 ──
    this._sticker('m_hopper', 84, 78, (x) => {
      x.fillStyle = '#b3a3d6';
      x.beginPath(); x.ellipse(30, 22, 8, 20, -0.28, 0, Math.PI * 2); x.fill();     // 立耳
      x.beginPath(); x.ellipse(52, 20, 18, 8, 0.9, 0, Math.PI * 2); x.fill();       // 耷拉耳
      const g = x.createLinearGradient(0, 20, 0, 78);
      g.addColorStop(0, '#c3b4e2'); g.addColorStop(1, '#8f7cba');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(8, 74); x.bezierCurveTo(4, 44, 18, 26, 42, 24);
      x.bezierCurveTo(68, 26, 82, 46, 78, 74);
      x.quadraticCurveTo(42, 80, 8, 74); x.closePath(); x.fill();
      x.fillStyle = '#7c68a8';                                    // 两只短脚
      x.beginPath(); x.ellipse(24, 74, 10, 5, 0, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.ellipse(58, 74, 10, 5, 0, 0, Math.PI * 2); x.fill();
      this._eye(x, 36, 46, 5, 7, '#2f2440');
      this._eye(x, 60, 46, 5, 7, '#2f2440');
      x.strokeStyle = '#2f2440'; x.lineWidth = 3; x.lineCap = 'round';
      x.beginPath(); x.moveTo(42, 58); x.lineTo(54, 58); x.stroke();                // 抿嘴
    });

    // ── 刺蜂：灰紫圆身 + 淡翅 + 尾刺 ──
    this._sticker('m_bee', 80, 64, (x) => {
      x.fillStyle = 'rgba(235,232,248,0.75)';                     // 翅膀
      x.beginPath(); x.ellipse(30, 12, 16, 8, -0.5, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.ellipse(50, 10, 16, 8, 0.35, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#8f7cba';                                    // 尾刺（朝左，身体朝右飞）
      x.beginPath(); x.moveTo(12, 38); x.lineTo(0, 42); x.lineTo(12, 48); x.closePath(); x.fill();
      const g = x.createLinearGradient(0, 18, 0, 62);
      g.addColorStop(0, '#c3b4e2'); g.addColorStop(1, '#8f7cba');
      x.fillStyle = g;
      x.beginPath(); x.ellipse(42, 42, 32, 21, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(74,60,104,0.65)';                       // 条纹
      x.fillRect(30, 23, 9, 39); x.fillRect(48, 23, 9, 39);
      this._eye(x, 62, 38, 5, 6, '#2f2440');
      x.fillStyle = '#2f2440';
      x.beginPath(); x.ellipse(70, 46, 3.4, 2.4, 0, 0, Math.PI * 2); x.fill();      // 小嘴
    });

    // ── 蒲公英炮手：灰绒球 + 弯茎 + 草丛底座 ──
    this._sticker('m_puff', 76, 112, (x) => {
      x.strokeStyle = '#6e9a66'; x.lineWidth = 6; x.lineCap = 'round';
      x.beginPath(); x.moveTo(34, 106); x.quadraticCurveTo(30, 62, 44, 38); x.stroke();   // 茎
      x.fillStyle = '#5f8a58';                                    // 底座草叶
      x.beginPath(); x.moveTo(10, 108); x.quadraticCurveTo(18, 82, 30, 92); x.lineTo(26, 108); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(62, 108); x.quadraticCurveTo(58, 84, 44, 94); x.lineTo(48, 108); x.closePath(); x.fill();
      const g = x.createRadialGradient(46, 30, 4, 46, 30, 26);    // 绒球（枯萎灰）
      g.addColorStop(0, '#e8e4f2'); g.addColorStop(1, '#b0a6c8');
      x.fillStyle = g;
      x.beginPath(); x.arc(46, 30, 24, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(122,110,150,0.8)'; x.lineWidth = 2;   // 绒毛
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2;
        x.beginPath(); x.moveTo(46 + Math.cos(a) * 14, 30 + Math.sin(a) * 14);
        x.lineTo(46 + Math.cos(a) * 27, 30 + Math.sin(a) * 27); x.stroke();
      }
      this._eye(x, 40, 32, 4, 5, '#4a3c68');
      this._eye(x, 54, 32, 4, 5, '#4a3c68');
    });

    // ── 硬壳蜗牛：灰蓝身 + 螺壳 ──
    this._sticker('m_snail', 98, 68, (x) => {
      const g = x.createLinearGradient(0, 30, 0, 66);
      g.addColorStop(0, '#a8b2cc'); g.addColorStop(1, '#7e88a8');
      x.fillStyle = g;                                            // 身体（头朝右）
      x.beginPath();
      x.moveTo(6, 64); x.quadraticCurveTo(10, 42, 34, 44); x.lineTo(66, 44);
      x.quadraticCurveTo(88, 42, 92, 24);
      x.quadraticCurveTo(96, 40, 90, 52); x.quadraticCurveTo(84, 64, 60, 64);
      x.closePath(); x.fill();
      x.strokeStyle = '#7e88a8'; x.lineWidth = 4; x.lineCap = 'round';   // 触角
      x.beginPath(); x.moveTo(84, 28); x.lineTo(78, 12); x.stroke();
      x.beginPath(); x.moveTo(92, 26); x.lineTo(94, 10); x.stroke();
      x.fillStyle = '#7e88a8';
      x.beginPath(); x.arc(77, 10, 4, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.arc(95, 8, 4, 0, Math.PI * 2); x.fill();
      const sg = x.createRadialGradient(38, 36, 4, 38, 36, 28);   // 壳
      sg.addColorStop(0, '#cbb4d8'); sg.addColorStop(1, '#93789f');
      x.fillStyle = sg;
      x.beginPath(); x.arc(38, 36, 27, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#6e5878'; x.lineWidth = 3.6;               // 螺线
      x.beginPath();
      for (let t = 0; t < Math.PI * 4.6; t += 0.15) {
        const r = 2.5 + t * 1.72, px = 38 + Math.cos(t + 1) * r, py = 36 + Math.sin(t + 1) * r;
        t === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.stroke();
      this._eye(x, 86, 32, 3.4, 4.4, '#3a3450');
    });

    // ── 小Boss·蘑菇酋长：灰紫大菌盖 + 叶羽冠 ──
    this._sticker('m_shroom', 132, 112, (x) => {
      x.fillStyle = '#5f8a58';                                    // 叶羽冠
      x.beginPath(); x.moveTo(56, 16); x.quadraticCurveTo(40, -2, 28, 8); x.quadraticCurveTo(44, 12, 52, 22); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(76, 14); x.quadraticCurveTo(92, -4, 104, 6); x.quadraticCurveTo(88, 10, 80, 20); x.closePath(); x.fill();
      const cap = x.createLinearGradient(0, 8, 0, 62);            // 菌盖
      cap.addColorStop(0, '#b8a2d8'); cap.addColorStop(1, '#8a6fb2');
      x.fillStyle = cap;
      x.beginPath();
      x.moveTo(4, 58); x.quadraticCurveTo(10, 12, 66, 10);
      x.quadraticCurveTo(122, 12, 128, 58);
      x.quadraticCurveTo(66, 70, 4, 58); x.closePath(); x.fill();
      x.fillStyle = 'rgba(240,235,250,0.7)';                      // 菌斑
      x.beginPath(); x.ellipse(38, 30, 9, 6, 0.3, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.ellipse(88, 26, 7, 5, -0.3, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.ellipse(64, 44, 6, 4, 0, 0, Math.PI * 2); x.fill();
      const st = x.createLinearGradient(0, 60, 0, 108);           // 菌柄脸
      st.addColorStop(0, '#e2d8ee'); st.addColorStop(1, '#b8a8cc');
      x.fillStyle = st;
      x.beginPath();
      x.moveTo(34, 106); x.quadraticCurveTo(32, 60, 66, 60);
      x.quadraticCurveTo(100, 60, 98, 106);
      x.quadraticCurveTo(66, 112, 34, 106); x.closePath(); x.fill();
      this._eye(x, 54, 82, 5.4, 7.4, '#3a2c52');
      this._eye(x, 80, 82, 5.4, 7.4, '#3a2c52');
      x.strokeStyle = '#3a2c52'; x.lineWidth = 3.4; x.lineCap = 'round';
      x.beginPath(); x.arc(67, 92, 7, Math.PI + 0.3, -0.3); x.stroke();   // 皱眉嘴（倒弧）
    });

    // ── 小Boss·刺蜂后：大刺蜂 + 小金冠（全场唯一亮色点缀在敌方身上）──
    this._sticker('m_queen', 112, 96, (x) => {
      x.fillStyle = '#e8c455';                                    // 金冠
      x.beginPath();
      x.moveTo(58, 14); x.lineTo(62, 2); x.lineTo(70, 12); x.lineTo(78, 0); x.lineTo(86, 12);
      x.lineTo(92, 4); x.lineTo(94, 16); x.lineTo(60, 20); x.closePath(); x.fill();
      x.fillStyle = 'rgba(235,232,248,0.72)';                     // 双层翅
      x.beginPath(); x.ellipse(36, 20, 24, 11, -0.55, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.ellipse(62, 15, 22, 10, 0.3, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#7c68a8';                                    // 尾刺
      x.beginPath(); x.moveTo(14, 56); x.lineTo(-2, 62); x.lineTo(14, 70); x.closePath(); x.fill();
      const g = x.createLinearGradient(0, 26, 0, 94);
      g.addColorStop(0, '#c3b4e2'); g.addColorStop(1, '#846fae');
      x.fillStyle = g;
      x.beginPath(); x.ellipse(58, 60, 44, 30, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(64,50,94,0.68)';
      x.fillRect(38, 33, 12, 55); x.fillRect(62, 33, 12, 55);
      this._eye(x, 88, 54, 6, 8, '#2f2440');
      x.strokeStyle = '#2f2440'; x.lineWidth = 3; x.lineCap = 'round';
      x.beginPath(); x.arc(92, 68, 6, Math.PI + 0.4, -0.4); x.stroke();
    });

    // ── 终局·枯萎之冠：巨型垂瓣枯花 + 荆棘茎 ──
    this._sticker('m_bloom', 172, 172, (x) => {
      x.strokeStyle = '#6e5878'; x.lineWidth = 10; x.lineCap = 'round';   // 荆棘茎
      x.beginPath(); x.moveTo(86, 168); x.quadraticCurveTo(78, 128, 86, 96); x.stroke();
      x.fillStyle = '#6e5878';
      for (const [tx, ty, ang] of [[78, 140, -2.4], [92, 120, 0.6], [80, 108, -2.2]]) {
        x.save(); x.translate(tx, ty); x.rotate(ang);
        x.beginPath(); x.moveTo(0, 0); x.lineTo(14, -5); x.lineTo(2, 8); x.closePath(); x.fill();
        x.restore();
      }
      x.fillStyle = '#5f8a58';                                    // 垂头枯叶
      x.beginPath(); x.moveTo(84, 130); x.quadraticCurveTo(46, 122, 34, 146); x.quadraticCurveTo(62, 146, 84, 140); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(88, 122); x.quadraticCurveTo(126, 116, 140, 138); x.quadraticCurveTo(110, 140, 88, 132); x.closePath(); x.fill();
      const petal = (cx, cy, ang, len) => {                        // 干瘪垂瓣
        x.save(); x.translate(cx, cy); x.rotate(ang);
        const pg = x.createLinearGradient(0, 0, 0, len);
        pg.addColorStop(0, '#a88cc8'); pg.addColorStop(1, '#6e547e');
        x.fillStyle = pg;
        x.beginPath(); x.moveTo(0, 0);
        x.quadraticCurveTo(-16, len * 0.45, -6, len);
        x.quadraticCurveTo(0, len * 0.82, 6, len);
        x.quadraticCurveTo(16, len * 0.45, 0, 0);
        x.closePath(); x.fill(); x.restore();
      };
      for (let i = 0; i < 7; i++) petal(86, 62, (i - 3) * 0.52 + (i % 2 ? 0.1 : -0.06), 56 + (i % 3) * 8);
      const core = x.createRadialGradient(86, 58, 4, 86, 58, 34);  // 花心独眼
      core.addColorStop(0, '#4a3c68'); core.addColorStop(1, '#2f2440');
      x.fillStyle = core;
      x.beginPath(); x.arc(86, 58, 32, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#d8cce8';
      x.beginPath(); x.ellipse(86, 56, 13, 16, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#231a36';
      x.beginPath(); x.ellipse(86, 58, 6, 9, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.85)';
      x.beginPath(); x.arc(83, 52, 2.6, 0, Math.PI * 2); x.fill();
    });

    // ── 技能形态（玩家 morph 的目标形）──
    this._sticker('s_drop', 84, 56, (x) => {                       // 露珠彗星（尖尾朝左，冲向右）
      const g = x.createLinearGradient(0, 0, 84, 0);
      g.addColorStop(0, 'rgba(120,226,190,0.35)'); g.addColorStop(0.55, '#6fdcb2'); g.addColorStop(1, '#b8f4de');
      x.fillStyle = g;
      x.beginPath(); x.moveTo(0, 28);
      x.quadraticCurveTo(38, 2, 62, 10);
      x.quadraticCurveTo(84, 18, 84, 28);
      x.quadraticCurveTo(84, 38, 62, 46);
      x.quadraticCurveTo(38, 54, 0, 28);
      x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.7)';
      x.beginPath(); x.ellipse(62, 20, 10, 5, -0.3, 0, Math.PI * 2); x.fill();
    });
    this._sticker('s_hammer', 118, 138, (x) => {                   // 果冻重锤（头朝上，抡砸姿态）
      x.fillStyle = '#57b880';
      x.fillRect(52, 66, 14, 66);                                  // 柄
      x.beginPath(); x.ellipse(59, 132, 13, 6, 0, 0, Math.PI * 2); x.fill();
      const g = x.createLinearGradient(0, 0, 0, 70);
      g.addColorStop(0, '#a9f2cd'); g.addColorStop(1, '#4ecf92');
      x.fillStyle = g;                                             // 圆润巨头
      x.beginPath();
      x.moveTo(6, 62); x.quadraticCurveTo(2, 6, 59, 4);
      x.quadraticCurveTo(116, 6, 112, 62);
      x.quadraticCurveTo(59, 74, 6, 62); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.5)';
      x.beginPath(); x.ellipse(36, 24, 16, 8, -0.4, 0, Math.PI * 2); x.fill();
    });
    this._sticker('s_spike', 88, 88, (x) => {                      // 下砸刺球（空中重锤形态）
      x.fillStyle = '#4ecf92';
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2 + Math.PI / 8;
        x.save(); x.translate(44, 44); x.rotate(a);
        x.beginPath(); x.moveTo(-9, -26); x.lineTo(0, -44); x.lineTo(9, -26); x.closePath(); x.fill();
        x.restore();
      }
      const g = x.createRadialGradient(38, 36, 4, 44, 44, 32);
      g.addColorStop(0, '#a9f2cd'); g.addColorStop(1, '#3fc586');
      x.fillStyle = g;
      x.beginPath(); x.arc(44, 44, 30, 0, Math.PI * 2); x.fill();
      this._eye(x, 38, 42, 5, 7);
      this._eye(x, 58, 42, 5, 7);
    });
    this._sticker('s_star', 72, 72, (x) => {                       // 回旋星刃
      const g = x.createRadialGradient(36, 36, 4, 36, 36, 36);
      g.addColorStop(0, '#ffe9a8'); g.addColorStop(1, '#ffc94a');
      x.fillStyle = g;
      x.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 34 : 15, a = i * Math.PI / 5 - Math.PI / 2;
        const px = 36 + r * Math.cos(a), py = 36 + r * Math.sin(a);
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.closePath(); x.fill();
      this._eye(x, 30, 36, 3.6, 5, '#8a5a1a');
      this._eye(x, 44, 36, 3.6, 5, '#8a5a1a');
    });
    this._sticker('s_bubble', 46, 46, (x) => {                     // 泡泡弹
      const g = x.createRadialGradient(18, 16, 2, 23, 23, 22);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.35, 'rgba(160,230,255,0.55)');
      g.addColorStop(1, 'rgba(110,200,240,0.62)');
      x.fillStyle = g;
      x.beginPath(); x.arc(23, 23, 20, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 2.5;
      x.beginPath(); x.arc(23, 23, 17, -2.2, -0.8); x.stroke();
    });

    // ── 敌方弹体：枯萎种子 ──
    this._sticker('p_seed', 34, 34, (x) => {
      x.fillStyle = '#8f7cba';
      x.beginPath(); x.ellipse(17, 19, 9, 12, 0.35, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(230,225,244,0.9)'; x.lineWidth = 2.4; x.lineCap = 'round';
      x.beginPath(); x.moveTo(17, 9); x.quadraticCurveTo(24, 2, 31, 4); x.stroke();
      x.beginPath(); x.moveTo(16, 9); x.quadraticCurveTo(10, 1, 3, 4); x.stroke();
    });

    // ── 根刺（枯萎之冠 roots 弹幕的地刺）──
    this._sticker('e_spike', 56, 92, (x) => {
      const g = x.createLinearGradient(0, 0, 0, 92);
      g.addColorStop(0, '#8f7cba'); g.addColorStop(1, '#5a4a80');
      x.fillStyle = g;
      x.beginPath(); x.moveTo(4, 92); x.quadraticCurveTo(16, 40, 26, 2);
      x.quadraticCurveTo(38, 42, 52, 92); x.closePath(); x.fill();
      x.fillStyle = '#5a4a80';
      x.beginPath(); x.moveTo(10, 70); x.lineTo(0, 56); x.lineTo(16, 60); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(44, 66); x.lineTo(56, 52); x.lineTo(40, 56); x.closePath(); x.fill();
    });

    // ── 技能包：糖纸水晶球 + 内嵌小图标 ──
    const pack = (key, iconDraw) => this._sticker(key, 64, 64, (x) => {
      const g = x.createRadialGradient(26, 22, 4, 32, 32, 30);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.5, 'rgba(190,244,222,0.8)');
      g.addColorStop(1, 'rgba(110,214,170,0.9)');
      x.fillStyle = g;
      x.beginPath(); x.arc(32, 32, 28, 0, Math.PI * 2); x.fill();
      iconDraw(x);
      x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 3;
      x.beginPath(); x.arc(32, 32, 23, -2.3, -1.1); x.stroke();
    });
    pack('pack_slam', (x) => {
      x.fillStyle = '#2e8a5c';
      x.fillRect(29, 30, 6, 20);
      x.beginPath();
      x.moveTo(16, 32); x.quadraticCurveTo(15, 15, 32, 14);
      x.quadraticCurveTo(49, 15, 48, 32);
      x.quadraticCurveTo(32, 37, 16, 32); x.closePath(); x.fill();
    });
    pack('pack_star', (x) => {
      x.fillStyle = '#e8a83a';
      x.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 17 : 7.5, a = i * Math.PI / 5 - Math.PI / 2;
        const px = 32 + r * Math.cos(a), py = 33 + r * Math.sin(a);
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.closePath(); x.fill();
    });
    pack('pack_bubble', (x) => {
      x.strokeStyle = '#3a9ec8'; x.lineWidth = 3.5;
      x.beginPath(); x.arc(25, 36, 9, 0, Math.PI * 2); x.stroke();
      x.beginPath(); x.arc(40, 26, 6.5, 0, Math.PI * 2); x.stroke();
      x.beginPath(); x.arc(42, 42, 4.5, 0, Math.PI * 2); x.stroke();
    });
  },
});
