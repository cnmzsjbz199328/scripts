/* 事件 → 挑一个反应变体。
 * 规则：同池均匀随机，但排除上一次播的那个（池子只有 1 个时才允许重复）。
 * 另外只从**已加载完成**的动画里挑 —— 图集分两批加载，后台那批到位前不能挑它。
 */
window.PM = window.PM || {};

PM.React = {
  _last: {},          // regionId+tier → 上次播的 anim

  ready(anim, loaded) { return !loaded || loaded.has(anim); },

  /* @param loaded Set<string>|null 已加载的动画名；null = 不做限制 */
  pick(region, tier, loaded) {
    const table = PM.REACTIONS[region];
    if (!table) return null;

    // 该 tier 没配或都没加载完 → 逐级降档找一个能播的
    let pool = null;
    for (let t = tier; t >= 1; t--) {
      const cand = (table[t] || []).filter(v => this.ready(v.anim, loaded));
      if (cand.length) { pool = cand; tier = t; break; }
    }
    if (!pool) return null;

    const key = region + ':' + tier;
    let choices = pool;
    if (pool.length > 1 && this._last[key]) {
      const filtered = pool.filter(v => v.anim !== this._last[key]);
      if (filtered.length) choices = filtered;
    }
    const picked = choices[Math.floor(Math.random() * choices.length)];
    this._last[key] = picked.anim;
    return { ...picked, tier };
  },

  reset() { this._last = {}; },
};
