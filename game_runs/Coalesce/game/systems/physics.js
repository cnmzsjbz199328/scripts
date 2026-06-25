/* Coalesce — §4B 原型分割；方法体逐字保留。 */
Object.assign(CoalesceScene.prototype, {

  _rFor(v) { return Phaser.Math.Clamp(BASE_R + v * GROW_K, MIN_R, MAX_R); },


  // ── AABB 平台物理 ──
  _physics(dt) {
    const p = this.player;
    p.vy += G * dt;
    p.onGround = false;

    // 水平
    p.x += p.vx * dt;
    this._resolve(p, true);
    // 垂直
    p.y += p.vy * dt;
    this._resolve(p, false);

    // 世界水平边界
    if (p.x < p.r) { p.x = p.r; p.vx = 0; }
    if (p.x > WORLD_W - p.r) { p.x = WORLD_W - p.r; p.vx = 0; }
  },


  _resolve(p, horizontal) {
    const r = p.r;
    const rects = [...PLATFORMS];
    if (!this.damBroken) rects.push([DAM.x, DAM.y, DAM.w, DAM.h]);
    for (const [rx, ry, rw, rh] of rects) {
      const overlapX = Math.min(p.x + r, rx + rw) - Math.max(p.x - r, rx);
      const overlapY = Math.min(p.y + r, ry + rh) - Math.max(p.y - r, ry);
      if (overlapX <= 0 || overlapY <= 0) continue;
      if (horizontal) {
        if (p.x < rx + rw / 2) p.x -= overlapX; else p.x += overlapX;
        p.vx = 0;
      } else {
        if (p.y < ry + rh / 2) { p.y -= overlapY; p.vy = 0; p.onGround = true; }   // 落在顶面
        else { p.y += overlapY; p.vy = 0; }                                        // 顶到底面
      }
    }
  },


  _checkpointFor(x) {
    let cp = CHECKPOINTS[0];
    for (const c of CHECKPOINTS) if (x > c - 40) cp = c;
    return cp;
  },


  // 自动试玩输入：朝右走，跨沟壑/水洼时整段按住跳，窄缝处按住缩小
  _autoInput() {
    const x = this.player.x;
    return { left: false, right: true, up: inZone(x, AUTO_JUMP_ZONES), down: inZone(x, [AUTO_SLIT]) };
  },
});
