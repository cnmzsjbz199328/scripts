/* 反馈表：区域 × tier → 变体池。
 *
 * 变体池是这类游戏的核心资源（DESIGN §1.5）：同一部位连戳五下如果动画都一样，
 * 第三下起就没人想戳了。每多一个变体，该区域的耐玩度就多一档。
 * 挑选规则见 systems/react.js：同池随机 + 不连续重复上一次。
 *
 * 台词全部由素材作者随视频提供，口吻：礼貌、略带说明欲、不凶。
 * 没有原话的动作就不给台词（宁可沉默，也别编出不像她的话）。
 */
window.PM = window.PM || {};

PM.REACTIONS = {
  head: {
    1: [{ anim: 'head_pat' },
        { anim: 'head_pat_b', line: '你在给我打招呼吗？' }],
    2: [{ anim: 'shy' }],
    3: [{ anim: 'angry_charge', line: '再摸下去，我可要认真了。' }],
  },

  // 没有专属素材 —— 碰胸直接害羞，设计上也讲得通
  chest: {
    1: [{ anim: 'shy' }],
    2: [{ anim: 'shy' }],
    3: [{ anim: 'angry_charge', line: '那里不可以。' }],
  },

  belly: {
    1: [{ anim: 'belly' }],
    2: [{ anim: 'laugh' }],
    3: [{ anim: 'sad' }],
  },

  // 画面左臂 = 角色右手 = 持杖那只
  armL: {
    1: [{ anim: 'wand_shake' },
        { anim: 'teacher_boast', line: '那是当然，我可是魔法大学老师哦！' }],
    2: [{ anim: 'wand_warn', line: '我的魔杖不是玩具哦，你要小心。' }],
    3: [{ anim: 'angry_charge', line: '我说过了吧？' }],
  },

  // 画面右臂 = 角色左手（她用这只手扶杖警告）
  armR: {
    1: [{ anim: 'wand_warn',   line: '我的魔杖不是玩具哦，你要小心。' },
        { anim: 'wand_warn_b', line: '我的魔杖不是玩具哦，我再说一次。' }],
    2: [{ anim: 'wand_warn_c', line: '这个啊，我花了好多金币才买上的，再摸我就会攻击你哦。' }],
    3: [{ anim: 'water_threat', line: '……我警告过你了。' }],
  },

  legL: {
    1: [{ anim: 'leg_lift' },
        { anim: 'boot_show', line: '这个鞋吗？魔力附加品哦！远距离行走也不会累。' }],
    2: [{ anim: 'coin_deny', line: '你说我踩到你的钱了？没有哦！' },
        { anim: 'feet_tap' }],
    3: [{ anim: 'leg_kick' }],
  },

  // 素材里所有单腿动作用的都是另一条腿，这里只能复用共享的踏脚（MATERIALS「腿的问题」）
  legR: {
    1: [{ anim: 'feet_tap' }],
    2: [{ anim: 'feet_tap' }],
    3: [{ anim: 'leg_kick' }],
  },
};

/* 终极惩罚：已经生气了还继续戳 → 举水球 → 前端粒子朝屏幕泼你一脸 → 她哭。
 * 素材只出前摇（AI 三条视频的喷射方向全是朝画面左，弃用），释放完全由渲染层做，
 * 方向可控。见 DESIGN §4.5。 */
PM.PUNISH = { anim: 'water_threat', line: '这是你自找的哦。' };

/* 安抚成功（连续讨好）时的正反馈出口 */
PM.HAPPY_REACT = { anim: 'happy_tilt' };
