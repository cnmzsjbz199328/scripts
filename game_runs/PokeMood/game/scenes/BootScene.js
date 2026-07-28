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

    // 背景三层。跟着核心批一起加载（合计约 1MB，比一张角色图集还小），
    // 缺图不算致命：StageScene 会跳过没加载成功的层，只是没背景，游戏照玩。
    this.load.on('loaderror', f => console.warn('[PokeMood] 资源加载失败:', f.key));
    for (const L of C.BG.LAYERS) {
      this.load.image(L.key, `assets/bg/${L.key.replace('bg_', '')}.webp`);
    }

    for (const name of C.CORE_ANIMS) this._loadAnim(name);
  }

  _loadAnim(name) {
    const C = PM.Config;
    this.load.spritesheet(name, `assets/anim/${name}.webp`, {
      frameWidth: C.FRAME_W, frameHeight: C.FRAME_H,
    });
  }

  create() {
    const C = PM.Config;
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

  // 后台批：用一个独立 Loader，不阻塞已经开跑的玩法场景
  _loadRest() {
    const C = PM.Config;
    const rest = Object.keys(C.ANIMS).filter(n => !PM.loaded.has(n));
    if (!rest.length) return;

    for (const name of rest) this._loadAnim(name);
    this.load.once('complete', () => {
      for (const name of rest) this._register(name);
      PM.allLoaded = true;
    });
    this.load.start();
  }
};
