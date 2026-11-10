window.HuaPi = window.HuaPi || {};
window.HuaPi.Config = {
  WIDTH: 1280,
  HEIGHT: 720,
  BACKGROUND: '#0d0b0c',
  ACCENT: '#c96f7a',
  PACE: { typeCps: 30, charMs: 150, tailMs: 900, minMs: 1800, cardMs: 2500, choiceDelay: 0 },
  REDUCED_MOTION: Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches),
  // 立绘槽位中心 x。两侧外推贴边，把画面中段让给背景：常规角色上半身宽约 ±180，
  // L=200 时左缘留约 30px；R 侧最宽的鬼/道士（±240，挥剑态右袖 +263）会被屏幕边裁掉少许袖/发梢，可接受。
  STAGE_X: { L: 200, C: 640, R: 1080 },
  // 对话头像窗：对白时显示在对话框内左侧，旁白不显示，以此区分对白与旁白。
  // 优先用 assets/avatar/ 的 Q 版头像；缺图时从立绘裁头部顶替：[x, y, 边长]，单位为 640×1100 立绘像素。
  AVATAR: { x: 58, y: 560, size: 132, textX: 214, wrap: 36 },
  AVATAR_CROP: {
    wang: [180, 20, 280], chen: [180, 70, 280], nv: [180, 70, 280],
    gui: [180, 70, 280], dao: [180, 20, 280], shen: [180, 100, 280],
  },
};
