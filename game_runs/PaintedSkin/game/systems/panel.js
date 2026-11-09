window.HuaPi = window.HuaPi || {};
window.HuaPi.PanelSystem = class PanelSystem {
  constructor(scene, runtime, story) {
    this.scene = scene;
    this.runtime = runtime;
    this.story = story;
    this.currentRecord = null;
    this.lastFace = {};
    this.typingEvent = null;
    this.choiceLayer = null;
    this.choiceItems = [];
    this.cardLayer = null;
    this.endingLayer = null;
    this.buildDialogue();
  }

  buildDialogue() {
    const g = this.scene.add.graphics().setDepth(50);
    g.fillStyle(0x171314, 0.30).fillRect(0, 530, 1280, 190);
    g.fillStyle(0xf0e6d3, 0.9).fillRoundedRect(36, 540, 1208, 170, 8);
    g.lineStyle(2, 0x7c6254, 0.86).strokeRoundedRect(36, 540, 1208, 170, 8);
    g.lineStyle(1, 0xfff7e8, 0.65).strokeRoundedRect(43, 547, 1194, 156, 5);
    this.panelGraphics = g;
    this.namePlate = this.scene.add.graphics().setDepth(52);
    this.namePlate.fillStyle(0x453735, 0.96).fillRoundedRect(58, 518, 200, 38, 5);
    this.namePlate.lineStyle(1, 0xe3caa7, 0.85).strokeRoundedRect(58, 518, 200, 38, 5);
    this.nameText = this.scene.add.text(76, 522, '', { fontFamily: 'serif', fontSize: '21px', color: '#fff0d9' }).setDepth(53);
    this.lineText = this.scene.add.text(80, 572, '', {
      fontFamily: 'serif', fontSize: '26px', color: '#241d1c', lineSpacing: 10,
      wordWrap: { width: 1120, useAdvancedWrap: false },
    }).setDepth(53);
    const A = window.HuaPi.Config.AVATAR;
    this.avatarFrame = this.scene.add.graphics().setDepth(51).setVisible(false);
    this.avatarFrame.fillStyle(0xe2d4bc, 1).fillRoundedRect(A.x - 4, A.y - 4, A.size + 8, A.size + 8, 6);
    this.avatarFrame.lineStyle(2, 0x7c6254, 0.9).strokeRoundedRect(A.x - 4, A.y - 4, A.size + 8, A.size + 8, 6);
    this.avatarImage = null;
    this.avatarInitial = this.scene.add.text(A.x + A.size / 2, A.y + A.size / 2, '', {
      fontFamily: 'serif', fontSize: '54px', color: '#7c6254',
    }).setOrigin(0.5).setDepth(52).setVisible(false);
    this.haze = this.scene.add.graphics().setDepth(70);
    this.hazeAlpha = 0;
    this.pov = 'wang';
  }

  resolveName(actor) {
    if (!actor) return '旁白';
    const def = this.story.cast?.[actor];
    if (!def) return actor;
    let name = def.name;
    for (const rename of def.rename || []) if (this.runtime.state.flags.has(rename.flag)) name = rename.name;
    return name;
  }

  wrap(text, width = this.lineWrap || 42) {
    const chars = Array.from(String(text ?? ''));
    const lines = [];
    for (let i = 0; i < chars.length; i += width) lines.push(chars.slice(i, i + width).join(''));
    return lines.join('\n');
  }

  setPov(pov) {
    this.pov = pov;
    const isWang = pov === 'wang';
    this.haze.setVisible(isWang);
    if (!isWang) this.haze.clear();
  }

  // 对白模式（有说话人）：名牌 + 框内头像 + 「」；旁白模式：三者都不显示，正文顶格。
  setSpeaker(actor, face = null) {
    const A = window.HuaPi.Config.AVATAR;
    this.nameText.setText(this.resolveName(actor));
    this.namePlate.setVisible(Boolean(actor));
    this.nameText.setVisible(Boolean(actor));
    this.showAvatar(actor, face);
    this.lineText.setX(actor ? A.textX : 80);
    this.lineWrap = actor ? A.wrap : 42;
  }

  // 表情：段落显式 face → 说话人当前在台上的状态 → 该角色上次的表情 → 立绘清单里的第一个状态。
  // 读 runtime 的 stage 数据而非可见立绘，CG 期间立绘隐藏时头像仍能取到表情。
  resolveFace(actor, face) {
    const onStage = Object.values(this.runtime?.state?.stage || {}).find((value) => value?.startsWith(`${actor}:`));
    const state = face || onStage?.split(':')[1] || this.lastFace[actor]
      || Object.keys(window.HuaPi.ART?.lihui || {}).find((key) => key.startsWith(`${actor}:`))?.split(':')[1] || null;
    if (state) this.lastFace[actor] = state;
    return state;
  }

  showAvatar(actor, face) {
    this.avatarImage?.destroy();
    this.avatarImage = null;
    this.avatarFrame.setVisible(Boolean(actor));
    this.avatarInitial.setVisible(false);
    if (!actor) return;
    const { AVATAR: A, AVATAR_CROP: CROP } = window.HuaPi.Config;
    const art = window.HuaPi.ART || {};
    const textures = this.scene.textures;
    const state = this.resolveFace(actor, face);
    const qKey = [`${actor}:${state}`, actor].find((key) => art.avatar?.[key] && textures.exists(`avatar:${key}`));
    if (qKey) {
      this.avatarImage = this.scene.add.image(A.x, A.y, `avatar:${qKey}`).setOrigin(0).setDisplaySize(A.size, A.size);
    } else if (state && CROP[actor] && textures.exists(`lihui:${actor}:${state}`)) {
      const [cx, cy, side] = CROP[actor];
      const scale = A.size / side;
      this.avatarImage = this.scene.add.image(A.x - cx * scale, A.y - cy * scale, `lihui:${actor}:${state}`)
        .setOrigin(0).setScale(scale).setCrop(cx, cy, side, side);
    }
    if (this.avatarImage) this.avatarImage.setDepth(52);
    else this.avatarInitial.setText(Array.from(this.resolveName(actor))[0] || '').setVisible(true);
  }

  format(text) {
    const body = String(text ?? '');
    return this.lineWrap === 42 || body.startsWith('「') ? body : `「${body}」`;
  }

  typeLine(segment, onTyped = () => {}) {
    this.cancelTyping();
    const who = segment.speaker || null;
    this.setSpeaker(who, segment.face || null);
    const text = this.format(segment.text);
    this.currentRecord = { text };
    this.lineText.setText('');
    const chars = Array.from(text);
    let index = 0;
    const paceScale = this.runtime?.fast ? 0.02 : (this.runtime?.paceMul || 1);
    const interval = Math.max(1, 1000 / (window.HuaPi.Config.PACE.typeCps || 30) * paceScale);
    const addNext = () => {
      if (index >= chars.length) {
        this.lineText.setText(this.wrap(text));
        this.typingEvent = null;
        onTyped();
        return;
      }
      index += 1;
      this.lineText.setText(this.wrap(chars.slice(0, index).join('')));
      this.typingEvent = this.scene.time.delayedCall(interval, addNext);
    };
    addNext();
  }

  completeTyping() {
    if (!this.currentRecord) return;
    this.cancelTyping();
    this.lineText.setText(this.wrap(this.currentRecord.text));
  }

  cancelTyping() {
    if (this.typingEvent) this.typingEvent.remove(false);
    this.typingEvent = null;
  }

  echoChoice(text, pov) {
    this.pov = pov || this.pov;
    // 选项是视角人物的决定而非台词，按旁白样式回显（无头像、无「」）。
    this.setSpeaker(null);
    this.currentRecord = { text };
    this.lineText.setText(this.wrap(text));
  }

  clearEcho() {
    this.clearChoices();
    this.currentRecord = null;
    this.lineText.setText('');
    this.setSpeaker(null);
  }

  setHeart(amount) {
    this.hazeAlpha = this.pov === 'wang' ? 0.04 + Math.max(0, Math.min(100, amount)) / 100 * 0.30 : 0;
    this.haze.clear();
    if (!this.hazeAlpha) return;
    const cfg = window.HuaPi.Config;
    const width = 52;
    this.haze.fillStyle(0xc96f7a, this.hazeAlpha);
    this.haze.fillRect(0, 0, width, 720);
    this.haze.fillRect(1280 - width, 0, width, 720);
    this.haze.fillRect(0, 0, 1280, 26);
    this.haze.fillRect(0, 694, 1280, 26);
    this.haze.setVisible(this.pov === 'wang');
    if (!cfg.REDUCED_MOTION) {
      this.scene.tweens.add({ targets: this.haze, alpha: 0.72, duration: 180, yoyo: true, repeat: 1 });
    }
  }

  clearChoices() {
    if (this.choiceLayer) {
      const tween = this.scene.tweens.getTweensOf(this.choiceLayer);
      tween.forEach((item) => item.stop());
      this.choiceLayer.destroy(true);
    }
    this.choiceLayer = null;
    this.choiceItems = [];
  }

  showChoices(choices, onPick) {
    this.clearChoices();
    const layer = this.scene.add.container(0, 0).setDepth(90);
    this.choiceLayer = layer;
    const shade = this.scene.add.rectangle(640, 360, 1280, 720, 0x09090c, 0.38);
    layer.add(shade);
    const height = 64;
    const gap = 16;
    const total = choices.length * height + (choices.length - 1) * gap;
    const firstY = 360 - total / 2 + height / 2;
    choices.forEach((choice, index) => {
      const y = firstY + index * (height + gap);
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x372d2b, 0.96).fillRoundedRect(340, y - height / 2, 600, height, 8);
      bg.lineStyle(2, 0xc7ad8f, 0.92).strokeRoundedRect(340, y - height / 2, 600, height, 8);
      const label = this.scene.add.text(640, y, choice.text, {
        fontFamily: 'serif', fontSize: '24px', color: '#f6ead4', align: 'center',
        wordWrap: { width: 550 },
      }).setOrigin(0.5);
      const zone = this.scene.add.zone(640, y, 600, height).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => { if (this.choiceLayer === layer) bg.setAlpha(0.78); });
      zone.on('pointerout', () => { if (this.choiceLayer === layer) bg.setAlpha(1); });
      zone.on('pointerdown', () => onPick(index));
      layer.add([bg, label, zone]);
      this.choiceItems.push({ bg, label, zone });
    });
  }

  selectChoice(index) {
    const item = this.choiceItems[index];
    if (item) item.label.setColor('#f4c9c4');
    if (!this.choiceLayer) return;
    this.choiceItems.forEach((choice, i) => {
      choice.zone.disableInteractive();
      this.scene.tweens.add({ targets: [choice.bg, choice.label], alpha: i === index ? 1 : 0.15, duration: 250 });
    });
    this.scene.tweens.add({ targets: this.choiceLayer, alpha: 0, duration: 270 });
  }

  showCard(title, pov) {
    this.hideCard();
    const layer = this.scene.add.container(0, 0).setDepth(110);
    const shade = this.scene.add.rectangle(640, 360, 1280, 720, 0x0d0b0c, 0.94);
    const top = this.scene.add.graphics();
    top.lineStyle(1, 0xd6c4a7, 0.52).lineBetween(260, 288, 1020, 288).lineBetween(260, 430, 1020, 430);
    const heading = this.scene.add.text(640, 340, title, { fontFamily: 'serif', fontSize: '42px', color: '#f1e2cb' }).setOrigin(0.5);
    const sub = this.scene.add.text(640, 398, pov === 'chen' ? '此刻，你是陈氏' : '一段尚未说完的因果', { fontFamily: 'serif', fontSize: '19px', color: '#c8b6a2' }).setOrigin(0.5);
    layer.add([shade, top, heading, sub]);
    this.cardLayer = layer;
  }

  hideCard() {
    if (this.cardLayer) this.cardLayer.destroy(true);
    this.cardLayer = null;
  }

  showEnding(node) {
    this.clearChoices();
    if (this.endingLayer) this.endingLayer.destroy(true);
    const layer = this.scene.add.container(0, 0).setDepth(120);
    this.endingLayer = layer;
    const g = this.scene.add.graphics();
    g.fillStyle(0x0d0b0c, 0.95).fillRect(0, 0, 1280, 720);
    g.lineStyle(1, 0xc9ac8a, 0.45).lineBetween(280, 158, 1000, 158);
    g.lineBetween(280, 580, 1000, 580);
    const ending = node.ending;
    const typeNames = { true: '圓滿', normal: '未竟', bad: '悲剧' };
    const title = this.scene.add.text(640, 195, ending.title, { fontFamily: 'serif', fontSize: '44px', color: '#f0dec5' }).setOrigin(0.5);
    const type = this.scene.add.text(640, 246, typeNames[ending.type] || ending.type, { fontFamily: 'serif', fontSize: '18px', color: '#c96f7a' }).setOrigin(0.5);
    const closing = this.scene.add.text(640, 318, this.wrap(ending.closing, 38), {
      fontFamily: 'serif', fontSize: '22px', color: '#e6dbca', align: 'center', lineSpacing: 14,
    }).setOrigin(0.5);
    const commentary = this.scene.add.text(640, 485, this.wrap(ending.commentary, 44), {
      fontFamily: 'serif', fontSize: '19px', color: '#bfae9b', align: 'center', lineSpacing: 10,
    }).setOrigin(0.5);
    const ach = this.story.achievements?.[ending.achievement];
    const achievement = ach ? this.scene.add.text(640, 548, `解锁 · ${ach.title}`, { fontFamily: 'serif', fontSize: '17px', color: '#cbb38e' }).setOrigin(0.5) : null;
    const replay = this.scene.add.text(640, 625, 'R / 点击 重新读', { fontFamily: 'serif', fontSize: '19px', color: '#e6c5a1' }).setOrigin(0.5);
    const zone = this.scene.add.zone(640, 360, 1280, 720).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => window.location.reload());
    layer.add([g, title, type, closing, commentary, replay, zone]);
    if (achievement) layer.add(achievement);
    layer.bringToTop(zone);
  }

  destroy() {
    this.cancelTyping();
    this.clearChoices();
    this.hideCard();
    this.endingLayer?.destroy(true);
    this.endingLayer = null;
  }
};
