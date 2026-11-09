window.HuaPi = window.HuaPi || {};
window.HuaPi.StageSystem = class StageSystem {
  constructor(scene, art, cast) {
    this.scene = scene;
    this.art = art;
    this.cast = cast;
    this.items = { L: null, C: null, R: null };
    this.tweens = { L: null, C: null, R: null };
    this.positions = window.HuaPi.Config.STAGE_X;
    this.tint = 0xffffff;
  }

  apply(stage, speaker, pov) {
    for (const slot of ['L', 'C', 'R']) {
      const value = stage[slot] || null;
      const current = this.items[slot];
      if (current?.key === value) {
        this.setEmphasis(current, value, speaker, pov);
        continue;
      }
      this.remove(slot);
      if (!value) continue;
      this.items[slot] = this.create(slot, value);
      this.setEmphasis(this.items[slot], value, speaker, pov);
      this.fadeIn(slot);
    }
  }

  setSpeaker(speaker, pov) {
    for (const slot of ['L', 'C', 'R']) {
      const item = this.items[slot];
      if (item) this.setEmphasis(item, item.key, speaker, pov);
    }
  }

  setTint(hex) {
    this.tint = Number.parseInt(String(hex || '#ffffff').replace('#', ''), 16) || 0xffffff;
    for (const slot of ['L', 'C', 'R']) {
      const item = this.items[slot];
      if (item?.image) item.image.setTint(item.tinted ? 0x8a8a8a : this.tint);
    }
  }

  create(slot, key) {
    const [actor, state] = key.split(':');
    const group = this.scene.add.container(this.positions[slot], 0).setDepth(20).setAlpha(0);
    const asset = this.art.lihui?.[key];
    const textureKey = `lihui:${key}`;
    let image = null;
    if (asset && this.scene.textures.exists(textureKey)) {
      image = this.scene.add.image(0, 0, textureKey).setOrigin(0.5, 0).setDisplaySize(640, 1100);
      group.add(image);
    } else {
      const g = this.scene.add.graphics();
      g.fillStyle(0x6f6b70, 0.92);
      g.fillEllipse(0, 150, 170, 190);
      g.fillRoundedRect(-84, 250, 168, 96, 34);
      g.fillPoints([
        { x: -78, y: 300 }, { x: 78, y: 300 }, { x: 170, y: 1010 },
        { x: -170, y: 1010 },
      ], true);
      group.add(g);
      const name = this.cast[actor]?.name || actor;
      const stateName = this.cast[actor]?.states?.[state] || state;
      const label = this.scene.add.text(0, 600, `${name} · ${stateName}`, {
        fontFamily: 'serif', fontSize: '24px', color: '#f6eee2',
        backgroundColor: 'rgba(20,18,20,.62)', padding: { x: 12, y: 8 },
      }).setOrigin(0.5, 0.5);
      group.add(label);
    }
    return { key, actor, state, group, image, tinted: false };
  }

  setEmphasis(item, key, speaker, pov) {
    const speaking = speaker ? speaker === item.actor : item.actor === pov;
    item.tinted = !speaking;
    if (item.image) item.image.setTint(item.tinted ? 0x8a8a8a : this.tint);
    item.group.setAlpha(item.tinted ? 0.82 : 1);
    item.group.setScale(item.tinted ? 0.98 : 1);
  }

  fadeIn(slot) {
    const item = this.items[slot];
    if (!item) return;
    const duration = 250;
    item.group.setAlpha(0);
    this.tweens[slot] = this.scene.tweens.add({
      targets: item.group, alpha: item.tinted ? 0.82 : 1,
      x: this.positions[slot], duration, ease: 'Sine.Out',
      onComplete: () => { this.tweens[slot] = null; },
    });
  }

  remove(slot) {
    const tween = this.tweens[slot];
    if (tween?.isPlaying()) tween.stop();
    this.tweens[slot] = null;
    const item = this.items[slot];
    if (!item) return;
    this.scene.tweens.add({
      targets: item.group, alpha: 0, x: this.positions[slot] + (slot === 'L' ? -24 : 24), duration: 250,
      onComplete: () => { item.group.destroy(true); },
    });
    this.items[slot] = null;
  }

  destroy() {
    for (const slot of ['L', 'C', 'R']) {
      if (this.tweens[slot]?.isPlaying()) this.tweens[slot].stop();
      this.items[slot]?.group.destroy(true);
      this.items[slot] = null;
    }
  }
};
