/* 场景（背景）运行时：查表、拼贴图 key、把逐场景 atmos 合进基表。
 *
 * 为什么单独一层而不是塞进 StageScene：贴图 key 的拼法（`bg_<dir>_<层>`）
 * BootScene 加载时要用、StageScene 建层时要用、缩略图要用 —— 三处必须一致，
 * 散在各处早晚拼错一个下划线，然后表现为"某个场景默默没有背景"。
 */
window.PM = window.PM || {};

PM.Scenes = (function () {
  const list = () => PM.Config.SCENES;
  const byId = (id) => list().find(s => s.id === id) || list()[0];

  let currentId = PM.Config.DEFAULT_SCENE;

  return {
    list,
    byId,
    get currentId() { return currentId; },
    current() { return byId(currentId); },
    setCurrent(id) { if (byId(id)) currentId = byId(id).id; return currentId; },

    // 贴图 key：全项目唯一的拼法，别在别处手写字符串
    texKey(scene, layer) { return `bg_${scene.dir}_${layer}`; },
    texPath(scene, layer) { return `assets/bg/${scene.dir}/${layer}.webp`; },

    /* 三层的装配参数。scale/scaleX 逐场景，depth/par 全局固定（层序不该随场景变）。
     * 返回顺序即建层顺序。 */
    layers(scene) {
      const B = PM.Config.BG;
      /* omit = 还没生成出来的层。必须在这里就滤掉，不能靠"加载失败再兜底"——
       * game-verify 的 L1 对 404 零容忍（这是对的：真·打错路径和"这层还没画"
       * 在控制台里长得一模一样）。补上图之后把 omit 删掉即可。 */
      const omit = scene.omit || [];
      return ['far', 'mid', 'fore'].filter(l => !omit.includes(l)).map(l => ({
        layer: l,
        key: this.texKey(scene, l),
        scale: scene.scale[l],
        scaleX: l === 'fore' ? (scene.foreScaleX ?? null) : null,
        depth: B.DEPTH[l],
        par: B.PAR[l],
        // 家具悬空的装配侧退路（DESIGN §4.6 ①b）：`split: { mid: {y, dy} }`。
        // 现在六套场景都从提示词根治了，没人用；留着是因为下次生图翻车时它是唯一的当场补救。
        split: (scene.split && scene.split[l]) || null,
      }));
    },

    // 逐场景 atmos 是【浅覆盖】：只写与基表不同的键，其余继承
    atmos(scene) { return Object.assign({}, PM.Config.ATMOS, scene.atmos || {}); },
  };
})();
