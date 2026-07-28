/* 热度衰减 + 情绪状态机。纯函数：接收 state、返回事件，由 Scene 决定后果。
 *
 * 这样拆是为了能脱离 Phaser 单独推演（poke-bot 也直接打这一层）。
 * 坑：字段名必须和 Scene 里一致 —— InkMechanics 就栽在 state.t vs this._t（MIGRATION §4A）。
 */
window.PM = window.PM || {};

PM.Mood = {
  create() {
    const heat = {};
    for (const id of PM.REGION_ORDER) heat[id] = 0;
    return {
      heat,
      mood: 'NEUTRAL',
      patience: PM.Config.PATIENCE_MAX,
      soothStreak: 0,
      moodUntil: 0,
      reactionsPlayed: 0,
      lastRegion: null,
      lastTier: 0,
    };
  },

  // 每帧衰减；情绪维持期过了就回 NEUTRAL
  step(s, dtMs, now) {
    const C = PM.Config;
    const dec = C.HEAT_DECAY * (dtMs / 1000);
    for (const id in s.heat) s.heat[id] = Math.max(0, s.heat[id] - dec);
    if (s.mood !== 'NEUTRAL' && now >= s.moodUntil) {
      s.mood = 'NEUTRAL';
      return { moodChanged: true };
    }
    return null;
  },

  /* 一次触碰。返回 { region, tier, mood, moodChanged, punish, soothed }
   * punish=true 表示"已经生气了还继续戳"，交给渲染层放水魔法。 */
  poke(s, region, gesture, now) {
    const C = PM.Config;
    const tune = C.REGION_TUNE[region] || { heat: 15, prefer: null };

    // 讨好：用对了手势 → 加耐心、攒连击
    const soothed = tune.prefer && gesture === tune.prefer;
    if (soothed) {
      s.patience = Math.min(C.PATIENCE_MAX, s.patience + C.PATIENCE_SOOTHE);
      s.soothStreak++;
    } else {
      s.soothStreak = 0;
    }

    s.heat[region] = Math.min(
      C.HEAT_MAX,
      s.heat[region] + tune.heat * (C.GESTURE_MUL[gesture] ?? 1)
    );

    const h = s.heat[region];
    const tier = h >= C.TIER3_AT ? 3 : (h >= C.TIER2_AT ? 2 : 1);

    const before = s.mood;
    let punish = false;

    if (tier === 2) {
      s.patience = Math.max(0, s.patience + C.PATIENCE_T2);
    } else if (tier === 3) {
      s.patience = Math.max(0, s.patience + C.PATIENCE_T3);

      if (s.mood === 'ANGRY') {
        // 生气了还戳 → 惩罚 → 哭
        punish = true;
        s.mood = 'CRY';
        s.patience = C.CRY_PATIENCE_AFTER;
      } else if (s.patience <= C.PATIENCE_ANGRY_AT) {
        s.mood = 'ANGRY';
      } else {
        s.mood = (region === 'belly' || region === 'legL' || region === 'legR')
          ? 'TICKLED' : 'SHY';
      }
      s.moodUntil = now + C.MOOD_HOLD_MS;
      s.heat[region] = 0;   // 重反应后清零，不然会连着炸
    }

    // 正反馈出口：连续讨好且没把人惹到 → HAPPY
    if (!punish && tier === 1 && s.soothStreak >= C.HAPPY_STREAK) {
      s.mood = 'HAPPY';
      s.moodUntil = now + C.MOOD_HOLD_MS;
      s.soothStreak = 0;
    }

    s.reactionsPlayed++;
    s.lastRegion = region;
    s.lastTier = tier;

    return { region, tier, mood: s.mood, moodChanged: s.mood !== before, punish, soothed };
  },
};
