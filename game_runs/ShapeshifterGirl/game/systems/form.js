/* game/systems/form.js — 变身控制系统
 * ─────────────────────────────────────────────────────────────────────────
 * 管理小满的 5 种形态切换、变身读条时序（硬直、保留动量、不可取消）、形态映射。
 * 支持：人↔兽（0.5s）、兽↔兽（逆放+顺放，1s）等时长逻辑，且在图到位前以白光特效占位。
 */
window.SSG = window.SSG || {};

window.SSG.Form = {
  // 形态映射表
  KEYS: {
    '1': 'GIRL',
    '2': 'CAT',
    '3': 'FISH',
    '4': 'EAGLE',
    '5': 'BEAR'
  },

  init(scene) {
    scene.currentForm = 'girl'; // 初始形态：人
    scene.isMorphing = false;
    scene.morphTimeLeft = 0;
    scene.morphDuration = 0;
    scene.morphTarget = null;
    scene.morphSource = null;

    // 绑定变身按键 1-5
    scene.formKeys = scene.input.keyboard.addKeys('ONE,TWO,THREE,FOUR,FIVE');
  },

  update(scene, time, delta) {
    // 1. 如果正在变身，扣减读条时间
    if (scene.isMorphing) {
      scene.morphTimeLeft -= delta;
      
      // 变身读条期间硬直：锁定键盘左右与跳跃输入，停止水平移动防止惯性滑出边缘
      scene.player.setVelocityX(0);
      
      if (scene.morphTimeLeft <= 0) {
        this.completeMorph(scene);
      }
      return;
    }

    // 2. 检测变身输入 (1-5 键)
    let targetBeast = null;
    if (Phaser.Input.Keyboard.JustDown(scene.formKeys.ONE)) targetBeast = 'GIRL';
    else if (Phaser.Input.Keyboard.JustDown(scene.formKeys.TWO)) targetBeast = 'CAT';
    else if (Phaser.Input.Keyboard.JustDown(scene.formKeys.THREE)) targetBeast = 'FISH';
    else if (Phaser.Input.Keyboard.JustDown(scene.formKeys.FOUR)) targetBeast = 'EAGLE';
    else if (Phaser.Input.Keyboard.JustDown(scene.formKeys.FIVE)) targetBeast = 'BEAR';

    if (targetBeast) {
      const configKey = targetBeast;
      const targetFormName = window.SSG.Config.FORMS[configKey].name;
      
      if (targetFormName !== scene.currentForm) {
        // 进行空间检测：从娇小形态变回庞大形态（例如猫变熊/人），如果头顶空间不足，拒绝变身并给出红光抖动提示
        if (this.checkSpaceConstraint(scene, targetFormName)) {
          this.startMorph(scene, targetFormName);
        } else {
          // 空间不足，拒绝变身
          scene.cameras.main.shake(100, 0.01);
          if (window.AudioEngine) window.AudioEngine.play('error');
          scene.showToast('空间狭窄，无法变回！');
        }
      }
    }
  },

  // 空间检测：防止变大时卡进墙体/天花板
  checkSpaceConstraint(scene, targetFormName) {
    const currentConf = this.getFormConfig(scene.currentForm);
    const targetConf = this.getFormConfig(targetFormName);

    // 变大形态时，若正处于矮缝中（头顶是低天花板），禁止变身
    if (targetConf.height > currentConf.height && scene.isInLowTunnel) {
      return false;
    }
    return true;
  },

  startMorph(scene, targetForm) {
    const sourceForm = scene.currentForm;
    scene.isMorphing = true;
    scene.morphSource = sourceForm;
    scene.morphTarget = targetForm;

    // 计算变身时间
    const isSourceHuman = sourceForm === 'girl';
    const isTargetHuman = targetForm === 'girl';
    
    // 人↔兽 0.5s，兽↔兽 两段共计 1.0s（auto 模式同样走真实读条，验证门必须验人类时序）
    const duration = (isSourceHuman || isTargetHuman)
      ? window.SSG.Config.MORPH.TRANSFORM_TIME
      : window.SSG.Config.MORPH.TRANSFORM_BEAST_TIME;

    scene.morphDuration = duration;
    scene.morphTimeLeft = duration;

    // 播放变身程序化粒子特效与音效
    if (window.SSG.Render) {
      window.SSG.Render.playMorphFX(scene, scene.player, duration);
    }
    if (window.AudioEngine) {
      // 程序合成变声音效，不同形态有特定声调偏向
      const accentHz = this.getFormAccentFreq(targetForm);
      window.AudioEngine.playMorph(accentHz);
    }

    // 播放变身动画（如果有 WebP 图集则播放）
    this.playMorphAnimation(scene, sourceForm, targetForm, duration);
  },

  completeMorph(scene) {
    scene.isMorphing = false;
    scene.currentForm = scene.morphTarget;

    // 更新玩家物理包围盒与形态参数
    window.SSG.Movement.applyFormPhysics(scene, scene.currentForm);

    // 变身完成的程序化闪爆特效
    if (window.SSG.Render) {
      window.SSG.Render.playMorphCompleteFX(scene, scene.player, this.getFormConfig(scene.currentForm).color);
    }

    scene.showToast(`变身：${this.getFormChineseName(scene.currentForm)}`);
  },

  playMorphAnimation(scene, src, dst, duration) {
    const sprite = scene.player;
    if (!sprite.anims) return;

    // 尝试播放 morph 动画
    // 逆放/顺放逻辑：
    // 人 -> 兽：直接顺放 morph-兽
    // 兽 -> 人：逆放 morph-兽
    // 兽A -> 兽B：先逆放 morph-兽A（0.5s），然后顺放 morph-兽B（0.5s）
    
    if (src === 'girl') {
      const animKey = `morph-${dst}`;
      if (scene.anims.exists(animKey)) {
        sprite.play(animKey);
      }
    } else if (dst === 'girl') {
      const animKey = `morph-${src}`;
      if (scene.anims.exists(animKey)) {
        sprite.playReverse(animKey);
      }
    } else {
      // 兽A -> 兽B：串联两段
      const animA = `morph-${src}`;
      const animB = `morph-${dst}`;
      if (scene.anims.exists(animA)) {
        sprite.playReverse(animA);
        scene.time.delayedCall(duration / 2, () => {
          if (scene.isMorphing && scene.morphTarget === dst) {
            if (scene.anims.exists(animB)) {
              sprite.play(animB);
            }
          }
        });
      }
    }
  },

  getFormConfig(formName) {
    const key = Object.keys(window.SSG.Config.FORMS).find(k => window.SSG.Config.FORMS[k].name === formName);
    return window.SSG.Config.FORMS[key];
  },

  getFormChineseName(formName) {
    const names = { girl: '少女', cat: '灵猫', fish: '游鱼', eagle: '飞鹰', bear: '暴熊' };
    return names[formName] || formName;
  },

  getFormAccentFreq(formName) {
    // 变声音色签名频率偏向
    const freqs = { girl: 440, cat: 880, fish: 600, eagle: 750, bear: 180 };
    return freqs[formName] || 440;
  }
};
