/* engine/audio.js — 跨游戏共享音效层（WebAudio 程序化合成，零素材）
 * ─────────────────────────────────────────────────────────────────────────
 * 不加载任何音频文件：用振荡器即时合成 UI/反馈音，与「纯程序化绘图」的项目调性一致。
 * 首次用户手势后才解锁 AudioContext（浏览器自动播放策略）。
 * 尊重「reduced-motion / 静音」：window.GameAudio.muted = true 可全局关。
 *
 * window.GameAudio.play(name)  内置音色：
 *   'tick' 画线  'release' 放水  'splashGood' 入井  'splashBad' 失败
 *   'win' 通关  'lose' 失败结束  'ui' 菜单点击  'unlock' 解锁新关
 *   'morph' 体块变形（低频噪声 swoosh，供"化形/聚散"类瞬间使用）
 */
(function () {
  if (window.GameAudio) return;

  let ctx = null;
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { ctx = null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // 一个简单的 osc→gain 包络音
  function blip(freq, dur, type, vol, slideTo) {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function chord(freqs, dur, type, vol) { freqs.forEach((f) => blip(f, dur, type, vol)); }

  // 低频噪声 swoosh：白噪声缓冲 → 带通滤波器扫频（黑雾聚散一类"体块变形"音色，blip/chord 的纯振荡器做不出噪声质感）
  function noiseSwoosh(dur, freqFrom, freqTo, vol) {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    const n = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, n, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = 'bandpass'; filt.Q.value = 0.9;
    filt.frequency.setValueAtTime(freqFrom, t);
    filt.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.14, t + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt).connect(g).connect(c.destination);
    src.start(t); src.stop(t + dur + 0.02);
  }

  const VOICES = {
    tick:       () => blip(420 + Math.random() * 60, 0.04, 'triangle', 0.05),
    release:    () => blip(300, 0.22, 'sawtooth', 0.12, 620),
    splashGood: () => blip(660, 0.18, 'sine', 0.16, 990),
    splashBad:  () => blip(220, 0.18, 'square', 0.12, 90),
    ui:         () => blip(520, 0.05, 'triangle', 0.10),
    unlock:     () => chord([523, 784], 0.18, 'triangle', 0.10),
    morph:      () => noiseSwoosh(0.32, 220, 70, 0.13),
    win:        () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.3, 'triangle', 0.13), i * 110)); },
    lose:       () => { [392, 311, 233].forEach((f, i) => setTimeout(() => blip(f, 0.34, 'sawtooth', 0.12), i * 130)); },
  };

  const GameAudio = {
    muted: false,
    play(name) {
      if (this.muted) return;
      const v = VOICES[name];
      if (v) try { v(); } catch (_) {}
    },
    toggle() { this.muted = !this.muted; return this.muted; },
  };

  window.GameAudio = GameAudio;
})();
