/* BladeTrinity — 蓄力变装展示层（BT.Transform）。
 *
 * 用法：蓄力生命周期（charge.js）在起蓄时 begin、每帧 setProgress(蓄力比例)、收蓄时 end。
 * 预览页 transform-preview.html 调的是同一套函数 —— 预览里看到的就是对局里的表现。
 *
 * 素材：tools/build-transform.mjs 从三段绿幕变身源片抠出的单行图集（assets/sprites/transform/），
 * 元数据 BT.TRANSFORM_ATLAS（assets/sprites/transformations.js）。
 *
 * 实现选择：【直接把 fighter 自己的 sprite 换成变装纹理的某一格】，不另建展示 sprite。
 *   - 位置 / 朝向 / 深度 / 可见性 / 销毁全部天然跟随本体，没有"两个人叠在一起"的重影窗口；
 *   - 碰撞体、速度、HP、命中计算一概不碰（变装格与主图集同为 192×208、脚底基线 202、
 *     同人物高度，见 build-transform.mjs 的 scale 推导）；
 *   - 代价：所有"复制当前帧"的特效（描边 / 残影 / 剑界副本 / 幻剑分身）必须读
 *     sprite.texture.key 而不是 f.id —— 否则会拿变装格号去主图集里取一格错帧。
 *
 * ⚠️ 进度只由蓄力比例驱动（clamp(p,0,1) → chargeFrames，p=1 固定 holdFrame），
 *    不注册成自动播放的动画、不看源片墙钟：满蓄之后一直停在 holdFrame，不循环、不转头、
 *    不自己挥剑。源片后段的挥剑不在图集里 —— 释放仍走原 attack 行与原剑气时序。
 * ⚠️ 资源没载到（404 / 解码失败）时 begin 返回 false，调用方退回旧的 guard 占位，对局不受影响。
 */
window.BT = window.BT || {};

BT.Transform = {
  key(id) { return `tf_${id}`; },

  atlas(id) { return BT.TRANSFORM_ATLAS && BT.TRANSFORM_ATLAS[id]; },

  // 场景 preload 里调。单个文件失败只让那一派回退，不阻塞其余加载。
  preload(scene) {
    if (!BT.TRANSFORM_ATLAS) return;
    for (const [id, a] of Object.entries(BT.TRANSFORM_ATLAS)) {
      if (scene.textures.exists(this.key(id))) continue;
      scene.load.spritesheet(this.key(id), a.texture,
        { frameWidth: a.frameSize.width, frameHeight: a.frameSize.height });
    }
  },

  // 纹理真的在且格数够（防半截图/错图）才算可用
  ready(scene, id) {
    const a = this.atlas(id), k = this.key(id);
    if (!a || !scene.textures.exists(k)) return false;
    return scene.textures.get(k).frameTotal - 1 > a.holdFrame;   // frameTotal 含 __BASE
  },

  // 起蓄：停掉本体当前动画、切到第 0 格。返回 false = 不可用，调用方自行回退。
  begin(scene, f) {
    if (f.tf) this.end(scene, f, 'silent');          // 防重入：上一轮没收干净先收掉
    if (!this.ready(scene, f.id)) return false;
    f.tf = { id: f.id, idx: -1 };
    f.sprite.anims.stop();
    this.setProgress(scene, f, 0);
    return true;
  },

  // p ∈ [0,1]。只在格号变化时换帧（不每 tick 重设），满蓄 p=1 固定 holdFrame。
  setProgress(scene, f, p) {
    const t = f.tf;
    if (!t || !f.sprite.active) return;
    const a = this.atlas(t.id), k = this.key(t.id);
    const n = a.chargeFrames.length;
    p = Phaser.Math.Clamp(p, 0, 1);
    const idx = p >= 1 ? a.holdFrame : a.chargeFrames[Math.min(n - 1, Math.floor(p * n))];
    t.p = p;
    // 纹理被别人换走（受击/倒地已经 play 了主图集动画）就不再抢回来
    if (t.idx >= 0 && f.sprite.texture.key !== k) return;
    if (idx !== t.idx) { f.sprite.setTexture(k, idx); t.idx = idx; }
  },

  // 收蓄。how：
  //   'release' 有效释放 —— 变装外壳化成流派色剪影向外褪去（服饰回落），本体同时切回原装挥砍；
  //   'cancel'  取消（轻点不足 minFrac / 掉线 / 失焦）—— 同样的回落但更淡更短；
  //   'interrupt' / 'silent' 受击打断、换场、倒地 —— 不加特效（受击有自己的红闪）。
  // 幂等：只有第一次调用生效。仍停在变装纹理上时切回本派 idle，保证不会定格在变装帧上；
  // 调用方随后 play 的 attack / idle / hurt 会照常覆盖。
  end(scene, f, how) {
    const t = f.tf;
    if (!t) return;
    f.tf = null;
    const sp = f.sprite;
    if (!sp || !sp.active) return;
    const onTf = sp.texture.key === this.key(t.id);
    if (onTf && (how === 'release' || how === 'cancel')) this._shed(scene, f, t.idx, how === 'release');
    if (onTf) sp.play(`${f.id}_idle`, true);
  },

  // 服饰回落：变装那一格的剪影刷成流派色，压在本体身后外扩淡出。
  // 用 NORMAL 混合的实心剪影而不是 ADD 淡色 —— 后者在白衣 + 暖背景上肉眼不可见（描边踩过的坑）。
  _shed(scene, f, idx, strong) {
    const sp = f.sprite, s = BT.SCHOOLS && BT.SCHOOLS[f.id];
    const color = (s && s.barColor) || 0xffffff;
    const img = scene.add.image(sp.x, sp.y, this.key(f.id), idx)
      .setScale(sp.scaleX, sp.scaleY).setFlipX(sp.flipX).setDepth(sp.depth - 1)
      .setTintFill(color).setAlpha(strong ? 0.55 : 0.32);
    const grow = strong ? 1.12 : 1.04;
    scene.tweens.add({
      targets: img, alpha: 0, scaleX: sp.scaleX * grow, scaleY: sp.scaleY * grow,
      duration: strong ? 240 : 160, ease: 'Cubic.easeOut',
      onComplete: () => img.destroy(),
    });
  },
};
