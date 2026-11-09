window.HuaPi = window.HuaPi || {};
window.HuaPi.ViewSystem = class ViewSystem {
  constructor(scene, story, art, runtime) {
    this.scene = scene;
    this.story = story;
    this.art = art || { bg: {}, cg: {}, lihui: {} };
    this.runtime = runtime;
    this.bgObjects = [];
    this.bgTweens = [];
    this.cgObjects = [];
    this.currentScene = null;
    this.currentCG = null;
    this.currentPov = 'wang';
    this.stage = new window.HuaPi.StageSystem(scene, this.art, story.cast);
    this.panel = new window.HuaPi.PanelSystem(scene, runtime, story);
    this.fxSystem = new window.HuaPi.FxSystem(scene);
  }

  clearObjects(items) {
    for (const obj of items) {
      const tweens = this.scene.tweens.getTweensOf(obj);
      tweens.forEach((tween) => tween.stop());
      obj.destroy?.();
    }
    items.length = 0;
  }

  hex(value) { return Number.parseInt(String(value || '#6c6671').replace('#', ''), 16) || 0x6c6671; }

  setScene(id) {
    this.clearObjects(this.bgObjects);
    for (const tween of this.bgTweens) if (tween?.isPlaying()) tween.stop();
    this.bgTweens.length = 0;
    this.currentScene = id;
    this.panel.clearEcho?.();
    const def = this.story.scenes?.[id] || { name: id, tint: '#6c6671' };
    const textureKey = `bg:${id}`;
    if (this.art.bg?.[id] && this.scene.textures.exists(textureKey)) {
      const image = this.scene.add.image(640, 360, textureKey).setDisplaySize(1280, 720).setDepth(0).setAlpha(0);
      const wash = this.scene.add.rectangle(640, 360, 1280, 720, this.hex(def.tint), 0.08).setDepth(1);
      this.scene.tweens.add({ targets: image, alpha: 1, duration: 350, onComplete: () => {} });
      this.bgObjects.push(image, wash);
    } else {
      const base = this.hex(def.tint);
      const bg = this.scene.add.graphics().setDepth(0);
      bg.fillGradientStyle(base, base, 0x28252b, 0x28252b, 1, 1, 1, 1).fillRect(0, 0, 1280, 720);
      bg.fillStyle(0xf4e9d6, 0.05).fillEllipse(640, 260, 940, 380);
      bg.lineStyle(1, 0xe8ddce, 0.07);
      for (let y = 40; y < 720; y += 56) bg.lineBetween(0, y, 1280, y + 6);
      const label = this.scene.add.text(26, 504, `占位背景 · ${def.name}`, { fontFamily: 'serif', fontSize: '15px', color: '#e8d9c5', alpha: 0.48 }).setDepth(2);
      this.bgObjects.push(bg, label);
    }
    const mist = this.scene.add.graphics().setDepth(3).setAlpha(0.35);
    mist.fillStyle(0xf3e8d7, 0.14).fillEllipse(250, 300, 500, 90);
    mist.fillStyle(0xe6d9cc, 0.10).fillEllipse(1020, 365, 610, 120);
    this.bgTweens.push(this.scene.tweens.add({ targets: mist, x: 60, alpha: 0.78, duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
    this.bgObjects.push(mist);
    this.stage.setTint(def.tint);
  }

  setCG(id) {
    this.clearObjects(this.cgObjects);
    const hadCG = Boolean(this.currentCG);
    this.currentCG = id || null;
    if (this.lastStage && hadCG !== Boolean(this.currentCG)) this.applyStage();
    if (!id) return;
    const textureKey = `cg:${id}`;
    if (this.art.cg?.[id] && this.scene.textures.exists(textureKey)) {
      const image = this.scene.add.image(640, 360, textureKey).setDisplaySize(1280, 720).setDepth(10).setAlpha(0);
      this.scene.tweens.add({ targets: image, alpha: 1, duration: 400, onComplete: () => {} });
      this.cgObjects.push(image);
    } else {
      const item = this.scene.add.container(0, 0).setDepth(10);
      const shade = this.scene.add.rectangle(640, 340, 890, 340, 0x241e21, 0.73);
      const border = this.scene.add.graphics();
      border.lineStyle(1, 0xc8b8a2, 0.68).strokeRoundedRect(205, 170, 870, 340, 6);
      const text = this.scene.add.text(640, 340, `占位插画\n${this.story.cgs[id]?.name || id}`, {
        fontFamily: 'serif', fontSize: '27px', color: '#efe2ce', align: 'center', lineSpacing: 12,
      }).setOrigin(0.5);
      item.add([shade, border, text]);
      this.cgObjects.push(item);
    }
  }

  setPov(id) { this.currentPov = id; this.panel.setPov(id); }
  setStage(stage, speaker, pov) {
    this.lastStage = { stage: { ...stage }, speaker, pov };
    this.applyStage();
  }

  // CG 是构图完整的事件插画（多数已画入当事人），立绘叠上去会遮主体、人物重复出现。
  // 惯例：CG 期间不站立绘，说话人只靠名牌；剧本里的 stage 照常记入状态，CG 撤下后恢复。
  applyStage() {
    const { stage, speaker, pov } = this.lastStage;
    this.stage.apply(this.currentCG ? {} : stage, speaker, pov);
  }

  setSpeaker(speaker, pov) {
    if (this.lastStage) Object.assign(this.lastStage, { speaker, pov });
    this.stage.setSpeaker(speaker, pov);
  }
  typeLine(segment, onTyped) { this.panel.typeLine(segment, onTyped); }
  completeTyping() { this.panel.completeTyping(); }
  cancelTyping() { this.panel.cancelTyping(); }
  showChoices(choices, onPick) { this.panel.showChoices(choices, onPick); }
  selectChoice(index) { this.panel.selectChoice(index); }
  echoChoice(text, pov) { this.panel.echoChoice(text, pov); }
  showCard(title, pov) { this.panel.showCard(title, pov); }
  hideCard() { this.panel.hideCard(); }
  showEnding(node) { this.panel.showEnding(node); }
  fx(name) { this.fxSystem.run(name); }

  onVars(delta, vars, pov) {
    this.setPov(pov);
    if (Object.hasOwn(delta, 'xin')) this.panel.setHeart(vars.xin);
  }

  onAch() {}

  destroy() {
    this.clearObjects(this.bgObjects);
    this.clearObjects(this.cgObjects);
    this.panel.destroy();
    this.stage.destroy();
    this.fxSystem.destroy();
  }
};
