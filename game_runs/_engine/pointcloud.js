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
      // 战锤（参考 weapon_library_sheet 第二行左一，转为竖持）：竖柄 + 分段圆筒巨头带錾缘，头朝上 → 举锤姿态
      cv.width = 190; cv.height = 200;
      const x = cv.getContext('2d');
      x.fillStyle = ink;
      x.fillRect(89, 80, 13, 106);                 // 柄
      x.fillRect(82, 186, 27, 10);                 // 柄尾帽
      x.fillRect(46, 18, 98, 56);                  // 锤头主体（圆筒中段）
      x.fillRect(26, 8, 18, 76); x.fillRect(146, 8, 18, 76);   // 两侧粗錾缘
      x.fillRect(50, 12, 8, 68); x.fillRect(132, 12, 8, 68);   // 内侧细箍带（上下探出主体）
    } else if (kind === 'scythe') {
      // 巨镰（参考第一行左一，satan 终局武器）：横置长柄，左端骨节+垂链，柄上倒钩，右端大新月刃垂落
      cv.width = 340; cv.height = 170;
      const x = cv.getContext('2d');
      x.fillStyle = ink; x.strokeStyle = ink;
      x.fillRect(38, 51, 232, 9);                  // 长柄
      x.beginPath(); x.arc(30, 55, 10, 0, Math.PI * 2); x.fill();   // 左端骨球
      x.beginPath(); x.arc(14, 49, 6, 0, Math.PI * 2); x.fill();    // 骨球外凸
      x.lineWidth = 4.5;                           // 垂落锁链（空心环）
      for (let i = 0; i < 3; i++) {
        x.beginPath(); x.arc(22 - i * 5, 76 + i * 18, 6.5, 0, Math.PI * 2); x.stroke();
      }
      x.beginPath();                               // 柄上双倒钩（近刃处）
      x.moveTo(168, 51); x.lineTo(182, 30); x.lineTo(190, 51); x.closePath(); x.fill();
      x.beginPath();
      x.moveTo(198, 51); x.lineTo(214, 26); x.lineTo(224, 51); x.closePath(); x.fill();
      x.beginPath();                               // 刃根上挑小尖
      x.moveTo(252, 48); x.lineTo(274, 16); x.lineTo(280, 50); x.closePath(); x.fill();
      x.beginPath();                               // 大新月刃：由柄端向下垂扫，尖指左下，中段饱满
      x.moveTo(262, 32);
      x.quadraticCurveTo(344, 66, 292, 164);       // 外刃弧至锋尖
      x.quadraticCurveTo(296, 88, 250, 58);        // 内刃弧收回刃根
      x.closePath(); x.fill();
    } else if (kind === 'axe') {
      // 审判巨斧（参考第一行左二，minos 武器）：竖柄，右侧不对称大弯刃 + 左侧断折背刺 + 顶尖
      cv.width = 250; cv.height = 260;
      const x = cv.getContext('2d');
      x.fillStyle = ink;
      x.fillRect(117, 60, 14, 184);                // 柄
      x.fillRect(111, 242, 26, 12);                // 柄尾帽
      x.beginPath();                               // 右侧主刃：夸张外弧刃缘，下缘内凹成须(beard)
      x.moveTo(126, 30);
      x.quadraticCurveTo(206, 10, 236, 72);        // 外弧至刃缘最右
      x.quadraticCurveTo(240, 116, 198, 156);      // 刃缘下弧至须尖
      x.quadraticCurveTo(196, 118, 158, 110);      // 内凹收须
      x.quadraticCurveTo(136, 104, 126, 96);       // 收回柄身
      x.closePath(); x.fill();
      x.beginPath();                               // 左侧断折背刺
      x.moveTo(124, 46); x.lineTo(66, 30); x.lineTo(58, 40); x.lineTo(104, 70);
      x.closePath(); x.fill();
      x.beginPath();                               // 顶尖
      x.moveTo(116, 28); x.lineTo(127, 2); x.lineTo(138, 28); x.closePath(); x.fill();
    } else if (kind === 'dagger') {
      // 短匕/尖刺（soul/icesoul 贴身刺击）：横置，细长三角刃尖朝右，短柄带护手
      cv.width = 160; cv.height = 90;
      const x = cv.getContext('2d');
      x.fillStyle = ink;
      x.fillRect(16, 40, 32, 10);                  // 柄
      x.fillRect(46, 30, 7, 30);                   // 护手
      x.beginPath();                               // 刃：细长三角，尖朝右
      x.moveTo(53, 34);
      x.quadraticCurveTo(120, 40, 150, 45);        // 上刃至锋尖
      x.quadraticCurveTo(120, 50, 53, 56);         // 下刃收回护手
      x.closePath(); x.fill();
    } else if (kind === 'claw') {
      // 恶鬼之爪（fiend 扑袭/玩家恶鬼形爪袭）：短拳杆 + 三道平行弯曲爪刃，锋尖朝右
      cv.width = 220; cv.height = 140;
      const x = cv.getContext('2d');
      x.fillStyle = ink;
      x.fillRect(16, 56, 26, 28);                  // 拳杆
      for (let i = 0; i < 3; i++) {
        const y0 = 26 + i * 34, tx = 206 - i * 10, ty = 50 + i * 26;   // 根部高度 / 锋尖略散开
        x.beginPath();
        x.moveTo(38, y0);
        x.quadraticCurveTo(130, y0 - 16, tx, ty);        // 上缘弧至锋尖
        x.quadraticCurveTo(126, y0 + 14, 38, y0 + 18);   // 下缘弧收回根部
        x.closePath(); x.fill();
      }
    } else {
      // 链镰（参考第二行左二）：大钩状新月刃（右侧，尖垂向左下）+ 空心链环（左侧延伸），中距离横扫
      cv.width = 260; cv.height = 130;
      const x = cv.getContext('2d');
      x.fillStyle = ink; x.strokeStyle = ink;
      x.lineWidth = 5;                             // 链环（空心，比实心圆更像锁链）
      for (let i = 0; i < 4; i++) {
        x.beginPath(); x.arc(30 + i * 30, 66 + (i % 2 ? 4 : -4), 10, 0, Math.PI * 2); x.stroke();
      }
      x.fillRect(128, 58, 20, 14);                 // 链刃连接柄
      x.beginPath();                               // 大钩新月刃：上弧饱满、锋尖垂向左下
      x.moveTo(148, 48);
      x.quadraticCurveTo(228, 6, 248, 68);         // 外弧至最右
      x.quadraticCurveTo(250, 108, 196, 126);      // 外弧收至下尖
      x.quadraticCurveTo(224, 92, 214, 66);        // 内弧
      x.quadraticCurveTo(200, 36, 152, 62);        // 内弧收回连接柄
      x.closePath(); x.fill();
    }
    scene.textures.addCanvas(key, cv);
    return key;
  },
};
