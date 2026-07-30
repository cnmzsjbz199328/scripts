/* 指针 → 手势分类 + 区域命中。与情绪完全解耦，是纯输入层。
 *
 * 判定取向：**在人身上宽松，在人身外一律不响应**。
 * 这是主打轻松反馈的玩具，不需要精准点击，所以区域矩形四边外扩、点在缝隙里也吸附到最近区域；
 * 但吸附**必须先过"落点在角色身上"这道闸**（isBody），否则点在空白背景也会有反应，很尴尬。
 *
 * isBody 由 Scene 提供：查 base.png 的 alpha。base.png 与所有动画帧共用同一裁剪窗，
 * 所以它的 alpha 就是角色轮廓（含法杖与脚下法阵 —— 那些也算"她的一部分"，点了有反应不违和）。
 */
window.PM = window.PM || {};

PM.Touch = {
  // 世界坐标 → 单元格内的归一化坐标（0..1）
  // 按【画布上的实际占位】DRAW_* 换算，不是单元格原尺寸 —— 角色缩放后
  // 用 FRAME_* 会把命中框算成原大，戳头戳到帽子上方的空气。
  toFrame(wx, wy) {
    const C = PM.Config;
    return {
      fx: (wx - (C.CHAR_X - C.DRAW_W / 2)) / C.DRAW_W,
      fy: (wy - C.CHAR_Y) / C.DRAW_H,
    };
  },

  /* 归一化坐标 → 区域 id，命不中返回 null。
   * @param isBody (fx,fy) => boolean  落点是否在角色身上；不传则跳过该闸门 */
  hitRegion(fx, fy, isBody) {
    const C = PM.Config, pad = C.REGION_PAD;

    // 1) 直接落在某个区域矩形（含外扩）内 —— 这些矩形本来就画在身上，不用再查 alpha
    let best = null, bestD = Infinity;
    for (const id of PM.REGION_ORDER) {
      const r = PM.REGIONS[id];
      if (fx >= r.x - pad && fx <= r.x + r.w + pad &&
          fy >= r.y - pad && fy <= r.y + r.h + pad) {
        // 命中多个（区域有重叠）时取中心最近的那个
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        const d = Math.hypot((fx - cx) * C.FRAME_W, (fy - cy) * C.FRAME_H);
        if (d < bestD) { bestD = d; best = id; }
      }
    }
    if (best) return best;

    // 2) 没命中 → 必须确实点在角色身上，才吸附到最近的区域
    if (isBody && !isBody(fx, fy)) return null;

    bestD = Infinity;
    for (const id of PM.REGION_ORDER) {
      const r = PM.REGIONS[id];
      // 到矩形边的距离（不是到中心），斗篷、缝隙这类位置才不会被判太远
      const dx = Math.max(r.x - fx, 0, fx - (r.x + r.w)) * C.FRAME_W;
      const dy = Math.max(r.y - fy, 0, fy - (r.y + r.h)) * C.FRAME_H;
      const d = Math.hypot(dx, dy);
      if (d < bestD) { bestD = d; best = id; }
    }
    return bestD <= C.SNAP_DIST ? best : null;
  },

  /* 一次指针交互的手势分类。
   * @param down {t, x, y}  按下时刻与坐标
   * @param up   {t, x, y}  抬起时刻与坐标
   * @param travel          按下到抬起之间的累计移动距离
   */
  classify(down, up, travel) {
    const C = PM.Config;
    const dt = up.t - down.t;
    const disp = Math.hypot(up.x - down.x, up.y - down.y);

    if (travel >= C.RUB_DIST) return 'rub';
    if (dt >= C.HOLD_MS && disp < C.TAP_SLOP) return 'hold';
    if (dt <= C.TAP_MS && disp < C.TAP_SLOP) return 'tap';
    return travel > C.TAP_SLOP ? 'rub' : 'tap';   // 边界情况一律给个反应
  },
};
