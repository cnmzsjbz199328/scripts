/* game/systems/collect.js — 收集链系统（心光碎）
 * ─────────────────────────────────────────────────────────────────────────
 * 弟弟留下的「心光碎」：沿路线漂浮的可拾取宝石，只做两件事——
 *   1) 引导视线：撒在跳跃弧线/滑翔航线/高台之上，用光点暗示"往这走、这里能飞过去"；
 *   2) 正反馈：拾取即计数 + 光爆 + 音效，给障碍之间的空跑段一个够得着的奖励。
 * 绝不阻挡通行、不参与解谜、不进 probe——bot 无视它们，纯锦上添花，零通关风险。
 * 关卡数据用 level.gems（{x,y} 数组，可由 levels.js 顶部的 gemArc/gemLine 生成）。
 */
window.SSG = window.SSG || {};

window.SSG.Collect = {
  init(scene) {
    scene.gemsCollected = 0;
    scene.gemSprites = [];

    this._makeGemTexture(scene);

    // 固定计数牌（屏幕坐标，钉在 HUD 心条下方，不随相机滚动）
    scene.gemLabel = scene.add.text(24, 74, '✦ 0', {
      fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '18px',
      color: '#8fe9ff', fontStyle: 'bold', stroke: '#08202e', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(45);

    const lvl = window.SSG.LEVELS[scene.levelIdx];
    const gems = (lvl && lvl.gems) || [];
    for (const g of gems) {
      const spr = scene.add.image(g.x, g.y, 'ssg_gem').setDepth(6);
      spr.setData('taken', false);
      // 漂浮 + 自转微光
      scene.tweens.add({ targets: spr, y: g.y - 9, duration: 1100 + (g.x % 300),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      scene.tweens.add({ targets: spr, scaleX: 0.82, duration: 900,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      scene.gemSprites.push(spr);
    }
  },

  update(scene) {
    if (!scene.player || !scene.gemSprites || !scene.gemSprites.length) return;
    const px = scene.player.x, py = scene.player.y;
    const camLeft = scene.cameras.main.scrollX;
    for (const spr of scene.gemSprites) {
      if (spr.getData('taken')) continue;
      if (spr.x < camLeft - 100 || spr.x > camLeft + 1100) continue; // 离屏跳过判定
      const dx = spr.x - px, dy = spr.y - py;
      if (dx * dx + dy * dy < 44 * 44) {
        spr.setData('taken', true);
        this._pickup(scene, spr);
      }
    }
  },

  _pickup(scene, spr) {
    scene.gemsCollected++;
    if (scene.gemLabel) {
      scene.gemLabel.setText('✦ ' + scene.gemsCollected);
      scene.tweens.add({ targets: scene.gemLabel, scale: 1.35, duration: 110, yoyo: true, ease: 'Quad.easeOut' });
    }
    // 光爆碎点（复用软圆粒子）
    if (scene.add.particles) {
      const em = scene.add.particles(spr.x, spr.y, 'particle_placeholder', {
        speed: { min: 60, max: 160 }, angle: { min: 0, max: 360 },
        scale: { start: 0.7, end: 0 }, alpha: { start: 0.9, end: 0 },
        tint: 0x9fe9ff, lifespan: 380, maxParticles: 12,
      }).setDepth(15);
      scene.time.delayedCall(420, () => em.destroy());
    }
    if (window.AudioEngine) window.AudioEngine.play('ui');
    // 拾取即隐藏（tween 上飞淡出）
    scene.tweens.add({ targets: spr, y: spr.y - 26, alpha: 0, scale: 1.4, duration: 220,
      ease: 'Quad.easeOut', onComplete: () => spr.destroy() });
  },

  // 心光碎贴图：青光菱形宝石 + 白高光 + 柔光晕
  _makeGemTexture(scene) {
    if (scene.textures.exists('ssg_gem')) return;
    const S = 30;
    const cv = scene.textures.createCanvas('ssg_gem', S, S);
    if (!cv) return;
    const ctx = cv.getContext();
    // 柔光晕
    const halo = ctx.createRadialGradient(S / 2, S / 2, 1, S / 2, S / 2, S / 2);
    halo.addColorStop(0, 'rgba(150,230,255,0.55)'); halo.addColorStop(1, 'rgba(150,230,255,0)');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, S, S);
    // 菱形宝石体
    const cx = S / 2, cy = S / 2, rw = 8, rh = 11;
    const g = ctx.createLinearGradient(cx, cy - rh, cx, cy + rh);
    g.addColorStop(0, '#dffaff'); g.addColorStop(0.5, '#4fc8ee'); g.addColorStop(1, '#1c7fb0');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx, cy - rh); ctx.lineTo(cx + rw, cy); ctx.lineTo(cx, cy + rh); ctx.lineTo(cx - rw, cy);
    ctx.closePath(); ctx.fill();
    // 刻面分割线
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - rw, cy); ctx.lineTo(cx + rw, cy);
    ctx.moveTo(cx, cy - rh); ctx.lineTo(cx, cy + rh); ctx.stroke();
    // 左上高光
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.moveTo(cx, cy - rh); ctx.lineTo(cx - rw * 0.45, cy - rh * 0.15); ctx.lineTo(cx, cy - rh * 0.2); ctx.closePath(); ctx.fill();
    cv.refresh();
  },
};
