/* ShadowAbyss — 叙事场景骨架：资源加载 / 图层装配 / 输入分发。
 * 节点解释器见 systems/runtime.js，呈现层见 systems/ui.js（Object.assign 到本原型）。 */
class StoryScene extends Phaser.Scene {
  constructor() { super('StoryScene'); }

  preload() {
    // 场景背景图：允许缺图（loaderror 不建纹理，create 时补章色板渐变占位）
    for (const [sid, m] of Object.entries(SCENE_META)) this.load.image('bg_' + sid, m.art);
    // 但丁 / 维吉尔剪影帧（glb-sprite 轨，朝右基线）
    for (let i = 0; i < 8; i++) {
      this.load.image(`dante_idle_${i}`, `assets/3d/dante_idle_${i}.png`);
      this.load.image(`dante_walk_${i}`, `assets/3d/dante_walk_${i}.png`);
      this.load.image(`virgil_idle_${i}`, `assets/3d/virgil_idle_${i}.png`);
      this.load.image(`virgil_walk_${i}`, `assets/3d/virgil_walk_${i}.png`);
      this.load.image(`soul_walk_${i}`, `assets/3d/soul_walk_${i}.png`);
      // 路人 NPC 共享剪影槽（config.js NPC_GUEST），按 speaker 名字临时换贴图
      for (const tex of ['beatrice', 'elder', 'matilda', 'angel', 'furies', 'minos'])
        this.load.image(`${tex}_idle_${i}`, `assets/3d/${tex}_idle_${i}.png`);
    }
    // 背景亡魂 NPC 的非循环手势帧数与主角不同（6 帧），单独一个循环
    for (let i = 0; i < 6; i++) this.load.image(`soul_gesture_${i}`, `assets/3d/soul_gesture_${i}.png`);
    // 四章前景近地雾（svg-ambient 轨，scratch/gen_shadowabyss_fg.mjs）
    for (let ch = 1; ch <= 4; ch++)
      for (let i = 0; i < 8; i++)
        this.load.svg(`chfog_ch${ch}_${i}`, `assets/svg/amb_chfog_ch${ch}_${i}.svg`, { width: 320, height: 320 });
    this.load.on('loaderror', () => {});   // 缺图静默，占位纹理兜底
  }

  create() {
    this.auto = !!navigator.webdriver || location.search.includes('autoplay');
    this._makeFallbackTextures();
    this._buildLayers();
    this._buildCharacters();
    this._initRuntime();
    this._bindInput();
    this._exposeContract();
    window.GameHUD?.onStart(() => this._begin());
  }

  update() {
    // 接触阴影跟随人物（走入动画期间也贴脚；透明度 = 基准 × 人物 alpha）
    const sync = (shadow, spr) => {
      if (!shadow) return;
      shadow.setX(spr.x)
        .setVisible(spr.visible && spr.alpha > 0.05)
        .setAlpha((shadow.getData('base') || 0.3) * spr.alpha);
    };
    sync(this.danteShadow, this.dante);
    sync(this.virgilShadow, this.virgil);
    sync(this.soulShadow, this.soul);
    sync(this.guestShadow, this.guest);
  }

  _bindInput() {
    const adv = () => this._advance();
    this.input.keyboard.on('keydown-SPACE', adv);
    this.input.keyboard.on('keydown-ENTER', adv);
    this.input.keyboard.on('keydown-ONE', () => this._choose(0));
    this.input.keyboard.on('keydown-TWO', () => this._choose(1));
    // 点击空白处推进；点在抉择按钮上时由按钮自己处理
    this.input.on('pointerdown', (_p, over) => { if (!over || !over.length) this._advance(); });
  }
}
