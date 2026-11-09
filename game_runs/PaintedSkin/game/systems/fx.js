window.HuaPi = window.HuaPi || {};
window.HuaPi.FxSystem = class FxSystem {
  constructor(scene) {
    this.scene = scene;
    this.live = new Set();
  }

  add(obj) { this.live.add(obj); return obj; }
  release(obj) { this.live.delete(obj); obj?.destroy?.(); }

  run(name) {
    const scene = this.scene;
    const reduced = window.HuaPi.Config.REDUCED_MOTION;
    if (name === 'shake') {
      if (!reduced) scene.cameras.main.shake(200, 0.006);
      return;
    }
    if (name === 'flash') {
      scene.cameras.main.flash(reduced ? 90 : 180, 245, 224, 207, false);
      return;
    }
    if (name === 'inksplash') {
      const g = this.add(scene.add.graphics().setDepth(100));
      const colors = [0x251d20, 0x5e2730, 0xb23e4b, 0x0f1116];
      colors.forEach((color, index) => {
        g.fillStyle(color, 0.72 - index * 0.10).fillCircle(640 + (index - 1.5) * 18, 360 + ((index % 2) ? 22 : -14), 18 + index * 7);
      });
      g.setScale(0.12).setAlpha(0.9);
      scene.tweens.add({ targets: g, scale: reduced ? 1.5 : 3.1, alpha: 0, duration: reduced ? 450 : 650,
        onComplete: () => { this.live.delete(g); g.destroy(); } });
      return;
    }
    if (name === 'heartbeat') {
      const g = this.add(scene.add.graphics().setDepth(96));
      g.fillStyle(0x12070a, 0.27).fillRect(0, 0, 1280, 720);
      scene.tweens.add({ targets: g, alpha: 0.02, duration: 360, yoyo: true, repeat: 2,
        onComplete: () => { this.live.delete(g); g.destroy(); } });
      return;
    }
    if (name === 'candle_out') {
      const g = this.add(scene.add.graphics().setDepth(105));
      g.fillStyle(0x09090a, 1).fillRect(0, 0, 1280, 720);
      g.setAlpha(0);
      scene.tweens.add({ targets: g, alpha: 0.94, duration: 300, yoyo: true,
        onComplete: () => { this.live.delete(g); g.destroy(); } });
      return;
    }
    if (name === 'fire') {
      for (let i = 0; i < 18; i++) {
        const x = 130 + Math.random() * 1020;
        const y = 690 + Math.random() * 80;
        const r = 2 + Math.random() * 7;
        const color = Math.random() > 0.5 ? 0xffbd58 : 0xe76036;
        const spark = this.add(scene.add.circle(x, y, r, color, 0.82).setDepth(98));
        scene.tweens.add({ targets: spark, y: y - 160 - Math.random() * 180, x: x + (Math.random() - 0.5) * 80,
          alpha: 0, scale: 0.2, duration: 650 + Math.random() * 550,
          onComplete: () => { this.live.delete(spark); spark.destroy(); } });
      }
    }
  }

  destroy() {
    for (const obj of this.live) obj.destroy?.();
    this.live.clear();
  }
};
