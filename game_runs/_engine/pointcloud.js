/* engine/pointcloud.js — 点云采样：纹理不透明像素 → 2D 点云（脚底锚点 0.5,1）。
 * 变形机制的数据源：人形/敌形直接采现成剪影帧，冷兵器采程序化 canvas 剪影。
 * 只负责"取点"，全部缓存；"怎么飘"见 engine/morph.js（两层解耦）。
 * 依赖调用方注入的 Forge.C.DEPTH / Forge.FXN（见 ShadowForge/game/config.js），跨游戏复用时按同名约定提供。 */
Forge.Cloud = {
  _cache: {},

  // 从已加载纹理采 count 个点 → Float32Array [dx0,dy0,...]，相对脚底锚点
  fromTexture(scene, key, count) {
    const ck = key + '|' + count;
    if (this._cache[ck]) return this._cache[ck];
    const img = scene.textures.get(key).getSourceImage();
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    return (this._cache[ck] = this._sample(cv, count));
  },

  _sample(cv, count) {
    const w = cv.width, h = cv.height;
    const data = cv.getContext('2d').getImageData(0, 0, w, h).data;
    const cand = [];
    for (let y = 0; y < h; y += 2)
      for (let x = 0; x < w; x += 2)
        if (data[(y * w + x) * 4 + 3] > 90) cand.push(x - w / 2, y - h);
    const total = cand.length / 2;
    const pts = new Float32Array(count * 2);
    if (!total) return pts;                       // 缺纹理兜底：原点堆叠而非崩溃
    for (let i = 0; i < count; i++) {
      const j = (Math.random() * total) | 0;
      pts[i * 2] = cand[j * 2]; pts[i * 2 + 1] = cand[j * 2 + 1];
    }
    return pts;
  },

  // 冷兵器剪影：canvas 画一次，既当实体段纹理又当点云源。返回纹理 key。
  weapon(scene, kind) {
    const key = 'tex_' + kind;
    if (scene.textures.exists(key)) return key;
    const cv = document.createElement('canvas');
    const ink = '#0a0d12';

    if (kind === 'spear') {
      // 横置长矛/箭矢，尖朝右；中心线 y=70.5
      cv.width = 272; cv.height = 150;
      const x = cv.getContext('2d');
      x.fillStyle = ink;

      // 1. 纤细箭杆 (4px)
      x.fillRect(26, 68.5, 176, 4);

      // 2. 空气动力学双尾羽 (Fletching)
      x.beginPath();
      // 上尾翼
      x.moveTo(34, 68.5);
      x.lineTo(10, 52);
      x.lineTo(6, 52);
      x.lineTo(18, 68.5);
      x.closePath();
      // 下尾翼
      x.moveTo(34, 72.5);
      x.lineTo(10, 89);
      x.lineTo(6, 89);
      x.lineTo(18, 72.5);
      x.closePath();
      x.fill();

      // 3. 极具侵略性的倒钩箭头 (Barbed Head)
      x.beginPath();
      x.moveTo(202, 70.5);                        // 箭杆接合点
      x.lineTo(190, 58);                          // 上倒钩顶点
      x.quadraticCurveTo(232, 63, 266, 70.5);     // 上刃曲线至锋尖
      x.quadraticCurveTo(232, 78, 190, 83);       // 下刃曲线至下倒钩顶点
      x.lineTo(202, 70.5);                        // 回合接合点
      x.closePath();
      x.fill();
    } else if (kind === 'hammer') {
      // 战锤：竖柄 + 巨头，头朝上 → 举锤姿态
      cv.width = 190; cv.height = 200;
      const x = cv.getContext('2d');
      x.fillStyle = ink;
      x.fillRect(89, 56, 13, 138);                 // 柄
      const r = 14;                                // 圆角锤头
      x.beginPath();
      x.moveTo(38 + r, 8); x.lineTo(152 - r, 8); x.quadraticCurveTo(152, 8, 152, 8 + r);
      x.lineTo(152, 72 - r); x.quadraticCurveTo(152, 72, 152 - r, 72);
      x.lineTo(38 + r, 72); x.quadraticCurveTo(38, 72, 38, 72 - r);
      x.lineTo(38, 8 + r); x.quadraticCurveTo(38, 8, 38 + r, 8);
      x.closePath(); x.fill();
      x.fillRect(30, 22, 8, 36); x.fillRect(152, 22, 8, 36);   // 两侧錾缘
    } else {
      // 链镰：新月形镰刀头（右侧，尖朝右上）+ 链节（左侧延伸），中距离横扫
      cv.width = 260; cv.height = 130;
      const x = cv.getContext('2d');
      x.fillStyle = ink;
      x.beginPath();                               // 新月形刃
      x.moveTo(150, 70);
      x.quadraticCurveTo(210, 28, 246, 44);
      x.quadraticCurveTo(220, 70, 178, 86);
      x.closePath(); x.fill();
      for (let i = 0; i < 5; i++) {                 // 链节
        x.beginPath();
        x.arc(140 - i * 24, 70 + (i % 2 ? 4 : -4), 9, 0, Math.PI * 2);
        x.fill();
      }
    }
    scene.textures.addCanvas(key, cv);
    return key;
  },
};
