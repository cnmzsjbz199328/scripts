/* 反馈表：区域 × 档位 → 变体池。
 *
 * ── 一段素材 = 一个身份（本表的第一铁律）───────────────────────
 * 每段动画只表达**一件事**（一个动作或一种情绪），绝不兼职。曾经 `angry_charge`
 * 同时是"手臂的高级反应"和"生气的待机姿态"，于是玩家说完「我说过了吧？」之后
 * 会看到她把挥杖蓄光**原地重做一遍** —— 那不是动画 bug，是一段素材被派了两份差事。
 * 现在的约束写在 config.js 的 PM.ANIM_ROLE 里，开机自检，谁再让一段素材兼职就报错。
 *
 * 注意区分：**身份唯一 ≠ 触发路径唯一**。`shy` 的身份是「害羞」，碰胸能唤起它、
 * 连戳到高级也能唤起它，都是同一件事，不算兼职；而"反应"和"待机"是两件事，算。
 *
 * ── 档位是全身共享的一条阶梯 ────────────────────────────────
 * 戳头一下(低) → 1.6 秒内戳脚一下(中) → 再戳一下(高)。换区域不重置，
 * 她烦的是"被一直戳"，不是"这块被戳"。所以每个区域**不必**各配一条独立阶梯，
 * 同一区域的低/中档可以是同一段动画配不同台词（chest 和 legR 就是这么撑住的 ——
 * 这两个区至今零专属素材，见 MATERIALS.md）。
 *
 * ── 低/中 = 部位反应，高 = 情绪 ─────────────────────────────
 * 低中两档是"她对你这只手的反应"，戳哪儿动哪儿；高档是"她的状态"，
 * 由 config.TIER3_MOOD 决定跟哪种情绪走（头→害羞、肚子→委屈、腿→被逗笑、其余→生气）。
 *
 * 台词人设：洛琪希·米格路迪亚·格雷拉特（已婚、对鲁迪充满爱意与自豪、礼貌反差萌）。
 * 配音台账见 .gemini 下的 roxy_dubbing_script.md，音频文件名 = 台词编号，不是动画名。
 */
window.PM = window.PM || {};

PM.REACTIONS = {
  head: {
    1: [{ anim: 'head_pat_b', line: '你在给我打招呼吗？', voice: 'assets/audio/head_pat_b.mp3' }],
    2: [{ anim: 'head_pat',   line: '那个……请不要随便把我当小孩子看待哦。', voice: 'assets/audio/head_pat.mp3' }],
    // 高档 → 害羞（`shy` 的唯一身份）
    3: [{ anim: 'shy',        line: '头发会被摸乱的……要是被鲁迪看到的话，会很害羞的……', voice: 'assets/audio/head_shy.mp3' }],
  },

  /* 零专属素材的区域之一：低/中两档都借「害羞」这一件事，靠两条台词拉开层次。
   * 设计上也讲得通 —— 碰胸直接害羞，本来就不需要另一个动作。 */
  chest: {
    1: [{ anim: 'shy',          line: '请、请注意举止！我好歹也是成熟女性……更是鲁迪的妻子哦！', voice: 'assets/audio/chest_shy.mp3' }],
    2: [{ anim: 'shy',          line: '等一下，手碰哪里呢……请放尊重一点。', voice: 'assets/audio/chest_shy2.mp3' }],
    3: [{ anim: 'angry_charge', line: '那里不可以，只有鲁迪才可以……', voice: 'assets/audio/chest_angry.mp3' }],
  },

  belly: {
    1: [{ anim: 'belly', line: '那个……虽然鲁迪有时候也喜欢这么摸，但请不要模仿他哦。', voice: 'assets/audio/belly.mp3' }],
    2: [{ anim: 'laugh', line: '等等……哈哈，那里很痒啦！请住手……', voice: 'assets/audio/belly_laugh.mp3' }],
    // 唯一走「委屈」的高档 —— 也是 SAD 这个情绪在游戏里唯一的入口
    3: [{ anim: 'sad',   line: '呜……一直戳肚子的教养，可不是我教给你的。', voice: 'assets/audio/sad.mp3' }],
  },

  // 画面左臂 = 角色右手 = 持杖那只
  armL: {
    1: [{ anim: 'wand_shake',    line: '需要我为你展示一下水系统魔术的咏唱吗？', voice: 'assets/audio/wand_shake.mp3' }],
    2: [{ anim: 'teacher_boast', line: '那是当然！我可是魔法大学老师，也是鲁迪的师傅兼妻子哦！', voice: 'assets/audio/teacher_boast.mp3' }],
    3: [{ anim: 'angry_charge',  line: '我说过了吧？', voice: 'assets/audio/arm_angry.mp3' }],
  },

  /* 画面右臂 = 角色左手（她用这只手扶杖警告）。这个区的三档是一条完整的升级线：
   * 警告 → 再警告 → 不警告了，开始咏唱。`cast_windup`（举杖起手、光球初成）
   * 曾经挂在惩罚的候选序里当兜底，而候选序永远轮不到它 —— 等于一段死素材，
   * 现在它是 armR 的高档，有了唯一身份。 */
  armR: {
    1: [{ anim: 'wand_warn',   line: '我的魔杖不是玩具哦，你要小心。', voice: 'assets/audio/wand_warn.mp3' },
        { anim: 'wand_warn_b', line: '我的魔杖不是玩具哦，我再说一次。', voice: 'assets/audio/wand_warn_b.mp3' }],
    2: [{ anim: 'wand_warn_c', line: '这个啊，我花了好多金币才买上的，再摸我就会攻击你哦。', voice: 'assets/audio/wand_warn_c.mp3' }],
    3: [{ anim: 'cast_windup', line: '说了这么多还是不听……那就让你见识一下魔法大学讲师的实力吧。', voice: 'assets/audio/cast_windup.mp3' }],
  },

  legL: {
    1: [{ anim: 'leg_lift',  line: '魔术师在长途旅行中，腿部保养也是很重要的课业哦。', voice: 'assets/audio/leg_lift.mp3' },
        { anim: 'boot_show', line: '这个鞋吗？魔力附加品哦！以前和鲁迪长途行走时多亏了它呢。', voice: 'assets/audio/boot_show.mp3' }],
    2: [{ anim: 'coin_deny', line: '你说我踩到你的钱了？没有哦！', voice: 'assets/audio/coin_deny.mp3' }],
    // 四段腿部素材抬的都是**画面左腿**（逐帧确认过），所以踢腿只能给 legL
    3: [{ anim: 'leg_kick',  line: '真是的……就算是我，被一直戳脚也是会反击的哦！', voice: 'assets/audio/leg_kick.mp3' }],
  },

  /* 零专属素材的区域之二。`feet_tap`（左右交替踏脚）是唯一能用的共用段 ——
   * 画面右脚的抬起幅度只有 15~19px，拆成单腿动画读不出来（MATERIALS「腿的问题」量过），
   * 所以低/中两档同段换台词，高档走「被逗笑」：戳脚戳到她笑着喊停，
   * 比借 legL 那条踢腿（动的是另一条腿，肉眼可见的错）诚实得多。 */
  legR: {
    1: [{ anim: 'feet_tap', line: '一直碰脚，难道是鞋子上有尘土吗？', voice: 'assets/audio/feet_tap.mp3' },
        { anim: 'feet_tap', line: '请适可而止……老是盯着脚看很不礼貌哦。', voice: 'assets/audio/feet_tap_b.mp3' }],
    2: [{ anim: 'feet_tap', line: '踩到什么东西了吗……应该没有吧。', voice: 'assets/audio/feet_tap_c.mp3' }],
    3: [{ anim: 'laugh',    line: '不要总是碰脚啦！', voice: 'assets/audio/leg_kick_b.mp3' }],
  },
};

/* 终极惩罚：已经生气了还继续戳 → 举水球 → 前端粒子朝屏幕泼你一脸 → 她哭。
 * 素材只出前摇（AI 三条视频的喷射方向全是朝画面左，弃用），释放完全由渲染层做，
 * 方向可控。见 DESIGN §4.5。
 *
 * anim 是**单值**，不再是候选序：`water_threat` 已经进核心批（CORE_ANIMS），
 * 玩法场景一起来它就在，不存在"前摇还没加载、水凭空泼出来"那个老问题。
 * 曾经的候选序 ['water_threat','cast_windup','angry_charge'] 是两段素材兼职的根源，
 * 而且后两个永远轮不到（三段同批注册，水球那段排在最前）—— 纯粹的死代码。
 *
 * 两条台词随机：这一下是整局的高潮，一局里可能触发好几次，同一句会腻。
 * 「……我警告过你了。」原本挂在 armR 的高档，那个位置现在归 cast_windup，
 * 这句挪到这里正合适 —— 它本来就是"动手之前最后一句"。 */
PM.PUNISH = {
  anim: 'water_threat',
  variants: [
    { line: '这是你自找的哦。',   voice: 'assets/audio/punish.mp3' },
    { line: '……我警告过你了。', voice: 'assets/audio/water_threat.mp3' },
  ],
};

/* 强制生气出口：耐心见底或连击封顶溢出时，高档**不播该部位的反应**，改播这条。
 * 没有它的话，戳画面右腿到封顶会出现"她笑着，脚下法阵却是红的"——
 * 情绪和画面打架。台词用的是原本挂在头部高档的那句（那个位置现在归 shy），
 * 它本来就是一句不限部位的"我受够了"。 */
PM.ANGRY_REACT = { anim: 'angry_charge', line: '再摸下去，我可要叫鲁迪过来了哦。', voice: 'assets/audio/head_angry.mp3' };

/* 安抚成功（连续讨好）时的正反馈出口。`happy_tilt` 的唯一身份就是「开心」——
 * 它曾经又是这条出口、又是 MOOD_ANIM.HAPPY，于是进 HAPPY 的那一下歪头笑会连播两次。 */
PM.HAPPY_REACT = { anim: 'happy_tilt', line: '哼哼～看到你这么有精神我也很高兴呢。等会儿去给鲁迪做点好吃的吧。', voice: 'assets/audio/happy_tilt.mp3' };
