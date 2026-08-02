/* 载核心图集 → 起玩法场景 → 后台补齐剩余图集。
 *
 * 为什么分两批：22 张图集合计约 29MB（580×720 的大帧，见 MATERIALS.md）。
 * 一次性等完再进游戏，进场要盯着进度条很久。核心批约 10 张就足够玩，
 * 其余在玩的过程中补；没补到的变体由 React.pick 自动跳过（不会播到空贴图）。
 */
window.PM = window.PM || {};

PM.BootScene = class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const C = PM.Config;
    PM.loaded = new Set();

    const bar = this.add.graphics();
    const label = this.add.text(C.WIDTH / 2, C.HEIGHT / 2 + 44, '正在唤醒魔女…', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#8fa7c9',
    }).setOrigin(0.5);

    this.load.on('progress', p => {
      bar.clear();
      bar.fillStyle(0x1d2432, 1).fillRect(C.WIDTH / 2 - 150, C.HEIGHT / 2, 300, 6);
      bar.fillStyle(0x5fe0c8, 1).fillRect(C.WIDTH / 2 - 150, C.HEIGHT / 2, 300 * p, 6);
    });
    this.load.on('complete', () => { bar.destroy(); label.destroy(); });

    // 区域标定的基准帧。运行时不显示，只用它的 alpha 判"这一点是不是在角色身上"
    this.load.image('base', 'assets/base.png');

    /* 背景三层。**只有开局那个场景**进核心批（约 260KB，比一张角色图集小两位数），
     * 其余五套场景跟角色图集一起在后台补 —— 六套合起来也才 ~1.6MB，
     * 但没必要为"可能不会去的场景"拖长开场白。
     * 缺图不算致命：StageScene 会跳过没加载成功的层，只是没背景，游戏照玩；
     * 场景选择器也会把没加载完的那格标成"载入中"而不是给一块黑。 */
    this.load.on('loaderror', f => console.warn('[PokeMood] 资源加载失败:', f.key));
    this._loadSceneBg(PM.Scenes.current());

    for (const name of C.CORE_ANIMS) this._loadAnim(name);
  }

  // 一个场景的三层。key/path 的拼法只有 PM.Scenes 一处，别在这里手写字符串
  _loadSceneBg(scene) {
    for (const L of PM.Scenes.layers(scene)) {
      if (this.textures.exists(L.key)) continue;
      this.load.image(L.key, PM.Scenes.texPath(scene, L.layer));
    }
  }

  _loadAnim(name) {
    const C = PM.Config;
    this.load.spritesheet(name, `assets/anim/${name}.webp`, {
      frameWidth: C.FRAME_W, frameHeight: C.FRAME_H,
    });
  }

  /* 客串（木桶男孩）走自己的加载路径：单元格是 192×208，不是她的 580×720。
   * 借 _loadAnim 会按 580×720 去切，出来是一堆错位的碎片而不是报错。 */
  _loadCameo() {
    const K = PM.Config.CAMEO;
    this.load.spritesheet(K.KEY, `assets/anim/${K.KEY}.webp`, {
      frameWidth: K.CELL_W, frameHeight: K.CELL_H,
    });
  }

  /* 两段式：顶开 / 放下各一条，都是 once —— 演完停在末帧，就是当前状态的静止姿势
   * （顶开停在探头，放下停在密封）。不用 yoyo：yoyo 是"一次点击自动一个来回"，
   * 而这里要的是两次点击各管一段。
   * 倒放那条【显式列帧】而不是 start>end —— generateFrameNumbers 的 start/end
   * 不保证降序可用，列出来最省事也最没歧义。 */
  _registerCameo() {
    const K = PM.Config.CAMEO;
    if (!this.textures.exists(K.KEY)) return;
    const fwd = Array.from({ length: K.FRAMES }, (_, i) => i);
    const back = fwd.slice().reverse();
    for (const [key, list] of [[K.ANIM_OUT, fwd], [K.ANIM_IN, back]]) {
      if (this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(K.KEY, { frames: list }),
        frameRate: K.FPS, repeat: 0,
      });
    }
  }

  create() {
    const C = PM.Config;
    /* 素材身份自检（一段素材 = 一件事）。放在这里是因为它要读 REACTIONS/ANIMS 两张表，
     * 而 config.js 加载时 reactions.js 还没到。报错走 console.error —— poke-bot 的
     * "零运行时错误"那项直接接住，等于把这条设计铁律钉进了验证门。 */
    PM.checkAnimRoles();
    for (const name of C.CORE_ANIMS) this._register(name);
    this.scene.start('Stage');
    this._loadRest();
  }

  // 建 Phaser 动画。图集是网格排布，末尾可能有空格子，所以必须显式给 end
  _register(name) {
    const C = PM.Config;
    const cfg = C.ANIMS[name];
    if (!cfg || this.anims.exists(name)) return;
    this.anims.create({
      key: name,
      frames: this.anims.generateFrameNumbers(name, { start: 0, end: cfg.frames - 1 }),
      frameRate: cfg.fps,
      repeat: cfg.mode === 'once' ? 0 : -1,
      yoyo: cfg.mode === 'pingpong',
    });
    PM.loaded.add(name);
  }

  /* 后台批：用一个独立 Loader，不阻塞已经开跑的玩法场景。
   * 背景排在动画【前面】入队 —— 它们加起来 1.3MB，而动画是 19MB；
   * 排后面的话玩家点开场景选择器时会对着五格灰图等一分钟。 */
  _loadRest() {
    const C = PM.Config;
    for (const s of PM.Scenes.list()) {
      if (s.id !== PM.Scenes.currentId) this._loadSceneBg(s);
    }
    const rest = Object.keys(C.ANIMS).filter(n => !PM.loaded.has(n));
    for (const name of rest) this._loadAnim(name);
    // 客串排在后台批：它是彩蛋，开局第一下用不上，没理由让它拖长开场白
    this._loadCameo();
    if (!rest.length && !this.load.list.size && !this.load.totalToLoad) return;

    this.load.once('complete', () => {
      for (const name of rest) this._register(name);
      this._registerCameo();
      PM.allLoaded = true;
    });
    this.load.start();
  }
};
