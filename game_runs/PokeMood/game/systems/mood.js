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
      combo: 0,          // 全角色共享的连击数 → 决定反应等级
      comboUntil: 0,     // 连击窗口的截止时刻（由 Scene 在每段表演结束时续期）
    };
  },

  // 每帧衰减；情绪维持期过了就回 NEUTRAL；连击窗口过期就断档
  step(s, dtMs, now) {
    const C = PM.Config;
    const dec = C.HEAT_DECAY * (dtMs / 1000);
    for (const id in s.heat) s.heat[id] = Math.max(0, s.heat[id] - dec);

    if (s.combo > 0 && now > s.comboUntil) s.combo = 0;

    // 连击断了才回耐心：还在被连戳的时候她不该"边被戳边消气"
    if (s.combo === 0 && s.mood !== 'CRY') {
      s.patience = Math.min(C.PATIENCE_MAX, s.patience + C.PATIENCE_REGEN * (dtMs / 1000));
    }

    if (s.mood !== 'NEUTRAL' && now >= s.moodUntil) {
      s.mood = 'NEUTRAL';
      return { moodChanged: true };
    }
    return null;
  },

  /* 连击窗口续期：从**表演结束**起算，不是从按下起算。
   * 一句配音最长 9.8 秒，若从按下起算，玩家听完整句再戳就断档，阶梯永远爬不上去。
   *
   * 注意调用时机：Scene 必须在表演**进行中每帧**续期，不能只在 _endPerform 续一次 ——
   * 只续一次的话，step() 早在演到 1.6 秒时就把 combo 清零了，等演完再来续，
   * `combo > 0` 这道守卫已经不成立，窗口白续。症状正是这套阶梯要修的那个 bug：
   * 玩家听完整句再戳，永远停在 tier1。 */
  holdCombo(s, until) {
    if (s.combo > 0) s.comboUntil = Math.max(s.comboUntil, until);
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

    // heat 只喂调试可视化，不再参与等级判定
    s.heat[region] = Math.min(
      C.HEAT_MAX,
      s.heat[region] + tune.heat * (C.GESTURE_MUL[gesture] ?? 1)
    );

    /* 等级 = 连击数（封顶 3），窗口内累加、窗口外从头来。
     * 共享一条阶梯：换区域戳不重置，她烦的是"被一直戳"，不是"这块被戳"。 */
    s.combo = (s.combo > 0 && now <= s.comboUntil) ? s.combo + 1 : 1;
    s.comboUntil = now + C.COMBO_WINDOW_MS;
    const tier = Math.min(3, s.combo);

    const before = s.mood;
    let punish = false;

    if (tier === 2) {
      s.patience = Math.max(0, s.patience + C.PATIENCE_T2);
    } else if (tier === 3) {
      s.patience = Math.max(0, s.patience + C.PATIENCE_T3);

      /* 封顶溢出 = 惩罚出口。tier3 是阶梯顶，每个区域的 tier3 又只有一个变体，
       * 再往上戳只会把同一段反反复复排队重演 —— "没得升级"要变成"升到头就爆"。
       * 连击到 COMBO_PUNISH_AT 强制进生气线，再戳一下就是泼水 + 哭：
       * 耐心还满着也照样走得到 ANGRY → 惩罚，重复的高级反应最多连着两次。 */
      const overflow = s.combo >= C.COMBO_PUNISH_AT;

      if (s.mood === 'ANGRY') {
        // 生气了还戳 → 惩罚 → 哭
        punish = true;
        s.mood = 'CRY';
        s.patience = C.CRY_PATIENCE_AFTER;
        // 高潮过了，阶梯从头爬：不清零的话哭完第一下就又是 tier3
        s.combo = 0;
        s.comboUntil = 0;
      } else if (overflow || s.patience <= C.PATIENCE_ANGRY_AT) {
        /* 封顶溢出**先进生气线**，不直接跳惩罚 —— 直接跳会把 ANGRY 这一档整个跳过去
         * （耐心还满着，害羞线一路演到哭），玩家看不到"她真的生气了"这个中间态。
         * 进了 ANGRY，下一下就走上面那条惩罚分支，重复的 tier3 照样最多连着两次。 */
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
