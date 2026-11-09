window.HuaPi = window.HuaPi || {};
window.HuaPi.Config = {
  WIDTH: 1280,
  HEIGHT: 720,
  BACKGROUND: '#0d0b0c',
  ACCENT: '#c96f7a',
  PACE: { typeCps: 30, charMs: 150, tailMs: 900, minMs: 1800, cardMs: 2500, choiceDelay: 0 },
  REDUCED_MOTION: Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches),
  STAGE_X: { L: 320, C: 640, R: 960 },
};
