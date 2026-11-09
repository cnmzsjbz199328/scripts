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
};
