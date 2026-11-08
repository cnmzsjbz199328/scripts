/* game/path.js — 轨道（箱体内壁折线）纯函数：采样 / 长度 / 拐角查询
 * ─────────────────────────────────────────────────────────────────────────
 * 轨道 = 世界坐标折线 pts=[[x,y],...]（开放，不闭合）。角色状态只有一个标量
 * s = 从顶点 0 起沿折线的弧长。所有函数无副作用、无状态。
 *
 * 约定：折线按「箱体内部始终在前进方向的左侧」描点（逆时针绕内壁），
 * 于是某段的前进方向角 atan2(dy,dx) 恰好就是精灵应有的旋转角
 * ——精灵默认朝右爬（局部 +x），旋转后局部 +x 指向 +s 方向、局部 -y（头顶）
 * 指向箱体内部，脚/手贴着内壁。反向爬用 setFlipX。
 */
window.BC = window.BC || {};

(function () {
  function segLens(pts) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      out.push(Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]));
    }
    return out;
  }

  function length(pts) {
    return segLens(pts).reduce((a, b) => a + b, 0);
  }

  // 每个顶点处的累计弧长（长度 = pts.length）
  function vertexS(pts) {
    const L = segLens(pts), out = [0];
    for (let i = 0; i < L.length; i++) out.push(out[i] + L[i]);
    return out;
  }

  // s → { x, y, angle, seg }。s 夹紧到 [0, total]。
  function sample(pts, s) {
    const L = segLens(pts);
    const total = L.reduce((a, b) => a + b, 0);
    let rem = Math.max(0, Math.min(s, total));
    for (let i = 0; i < L.length; i++) {
      // At an exact vertex, use the outgoing segment's angle. This lets a
      // corner-turn animation hand off directly to the wall it just entered
      // instead of briefly snapping back to the incoming wall orientation.
      if (rem < L[i] || i === L.length - 1) {
        const a = pts[i], b = pts[i + 1];
        const f = L[i] > 0 ? rem / L[i] : 0;
        const dx = b[0] - a[0], dy = b[1] - a[1];
        return {
          x: a[0] + dx * f,
          y: a[1] + dy * f,
          angle: Math.atan2(dy, dx),
          seg: i,
        };
      }
      rem -= L[i];
    }
    // 单点退化
    return { x: pts[0][0], y: pts[0][1], angle: 0, seg: 0 };
  }

  // 内壁法线（指向箱体内部）单位向量：前进方向左侧（屏幕 y 向下）
  function inwardNormal(pts, s) {
    const { angle } = sample(pts, s);
    // 前进方向 d=(cos,sin)，屏幕左侧 = (sin, -cos)
    return { x: Math.sin(angle), y: -Math.cos(angle) };
  }

  // 内部顶点的有符号转角（度）：[{ s, deg, absDeg, sign, idx }]
  // The path is authored in screen coordinates (y grows downward), while
  // the gameplay convention calls the floor -> right-wall turn CCW. Negate
  // the screen-space cross product to keep that convention stable.
  function corners(pts) {
    const vs = vertexS(pts), out = [];
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      const dx1 = p1[0] - p0[0], dy1 = p1[1] - p0[1];
      const dx2 = p2[0] - p1[0], dy2 = p2[1] - p1[1];
      const turn = Math.atan2(-(dx1 * dy2 - dy1 * dx2), dx1 * dx2 + dy1 * dy2);
      const deg = turn * 180 / Math.PI;
      out.push({ s: vs[i], deg, absDeg: Math.abs(deg), sign: Math.sign(deg), idx: i });
    }
    return out;
  }

  window.BC.Path = { segLens, length, vertexS, sample, inwardNormal, corners };
})();
