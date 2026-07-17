/* game/systems/movement.js — 各形态物理控制系统
 * ─────────────────────────────────────────────────────────────────────────
 * 根据当前形态，动态调整物理碰撞盒的尺寸与中心偏移，确保变身时不陷地、不浮空。
 * 实现不同形态的专属移动逻辑：
 *   - 少女：标准跑跳。
 *   - 猫：高跳、二段跳（空中按跳跃）、快移速度。
 *   - 鱼：水中无重力全向游动（WASD/方向键）；陆地脱水扑腾，1.5秒后自动变回人。
 *   - 鹰：空中长按 jump 键进入滑翔（极低下坠速度与水平缓漂）。
 *   - 熊：重力大、移速低、跳跃矮，但有重踏。
 */
window.SSG = window.SSG || {};

window.SSG.Movement = {
  init(scene) {
    // 监听输入
    scene.cursors = scene.input.keyboard.createCursorKeys();
    scene.wasd = scene.input.keyboard.addKeys('W,A,S,D');
    
    // 初始化跳跃计数与状态
    scene.catJumpsCount = 0;
    scene.isGliding = false;
    scene.fishLandTimer = 0;
    
    // 默认应用少女形态物理
    this.applyFormPhysics(scene, 'girl');
  },

  applyFormPhysics(scene, formName) {
    const player = scene.player;
    if (!player || !player.body) return;

    const C = window.SSG.Config;
    const config = window.SSG.Form.getFormConfig(formName);

    // 占位渲染层：素材缺失时切换到对应形态的程序化剪影贴图
    if (scene.usePlaceholders) {
      player.setTexture('ph_' + formName);
    }

    // 调整 Arcade 物理包围盒大小
    player.body.setSize(config.width, config.height);

    // 按取景框居中对齐公式计算偏移量，确保底面对齐地面
    const offsetX = C.SPRITE.FRAME_W / 2 - config.width / 2;
    const offsetY = C.SPRITE.FRAME_H - config.height;
    player.body.setOffset(offsetX, offsetY);

    // 默认启用重力
    player.body.setGravityY(0);
    player.body.setDrag(0, 0);

    // 针对特定形态做初始化配置
    if (formName === 'fish') {
      if (scene.isInWater) {
        player.body.setGravityY(-C.PHYSICS.GRAVITY_Y); // 抵消全局重力
        player.body.setDrag(200, 200);
      }
    } else if (formName === 'bear') {
      // 熊形态更重，增加额外重力
      player.body.setGravityY(600);
    }
    
    // 更新 HUD 中的形态名称
    const hudForm = document.getElementById('hud-form');
    if (hudForm) {
      hudForm.textContent = window.SSG.Form.getFormChineseName(formName);
    }
  },

  handleInput(scene, time, delta) {
    const player = scene.player;
    if (!player || !player.body) return;

    // 如果处于变身硬直或剧情卡开启状态，锁定全部输入控制
    if (scene.isMorphing || scene.cardActive || scene.isDead) {
      return;
    }

    const form = scene.currentForm;
    const config = window.SSG.Form.getFormConfig(form);
    
    // 判定玩家是否站在地面上
    const onFloor = player.body.blocked.down || player.body.touching.down;
    
    if (onFloor) {
      scene.catJumpsCount = 0; // 重置猫二段跳计数
      scene.isGliding = false;
    }

    // 1. 获取方向键/WASD输入
    const leftPressed = scene.cursors.left.isDown || scene.wasd.A.isDown;
    const rightPressed = scene.cursors.right.isDown || scene.wasd.D.isDown;
    const jumpJustPressed = Phaser.Input.Keyboard.JustDown(scene.cursors.up) || Phaser.Input.Keyboard.JustDown(scene.wasd.W) || Phaser.Input.Keyboard.JustDown(scene.cursors.space);
    const jumpPressed = scene.cursors.up.isDown || scene.wasd.W.isDown || scene.cursors.space.isDown;
    const downPressed = scene.cursors.down.isDown || scene.wasd.S.isDown;

    // 2. 形态特定逻辑分发
    if (form === 'fish') {
      // 🐟 鱼形态逻辑
      if (scene.isInWater) {
        // 在水中：无重力全向游动
        player.body.setGravityY(-window.SSG.Config.PHYSICS.GRAVITY_Y); // 抵消基准重力
        player.body.setDrag(150, 150);

        let vx = 0;
        let vy = 0;
        if (leftPressed) vx = -config.speed;
        if (rightPressed) vx = config.speed;
        if (jumpPressed) vy = -config.speed; // 上游
        if (downPressed) vy = config.speed;  // 下潜

        if (vx !== 0) player.setVelocityX(vx);
        if (vy !== 0) player.setVelocityY(vy);

        // 游泳朝向
        if (vx < 0) player.setFlipX(false);
        else if (vx > 0) player.setFlipX(true);

        window.SSG.Render.safePlay(player, 'swim', true);
      } else {
        // 陆地脱水：重力生效，丧失横向移速，原地扑腾（auto 同样走真实规则，
        // 自动辅助会立即起手变回人形）
        player.body.setGravityY(0);
        player.body.setDrag(100, 0);
        player.setVelocityX(0);

        // 扑腾：周期性向上跳跃，伴随小震动
        scene.fishLandTimer += delta;
        if (scene.fishLandTimer >= 1000) {
          scene.fishLandTimer = 0;
          player.setVelocityY(-150);
          player.setAngle(player.angle === 90 ? 0 : 90); // 左右翻滚
          if (window.AudioEngine) window.AudioEngine.play('flop');
        }

        // 触发自动变回人形的计时器保护（提示只在搁浅开始时给一次，避免每帧刷 HUD）
        if (!scene.fishAutoMorphTimer) {
          scene.showToast('游鱼搁浅！1.5秒后自动恢复人身...');
          scene.fishAutoMorphTimer = scene.time.delayedCall(1500, () => {
            scene.fishAutoMorphTimer = null;
            if (scene.currentForm === 'fish' && !scene.isInWater && !scene.isMorphing) {
              window.SSG.Form.startMorph(scene, 'girl');
            }
          });
        }
      }
    } else {
      // 恢复鱼在陆地造成的倾斜角
      if (player.angle !== 0) player.setAngle(0);
      if (scene.fishAutoMorphTimer) {
        scene.fishAutoMorphTimer.destroy();
        scene.fishAutoMorphTimer = null;
      }

      // 🚶 陆地常规形态移动逻辑 (人, 猫, 鹰, 熊)
      let runAnim = 'run';
      let idleAnim = 'idle';
      let jumpAnim = 'jump';

      if (form === 'cat') {
        runAnim = 'cat_run';
        idleAnim = 'cat_idle';
        jumpAnim = 'cat_jump';
      } else if (form === 'bear') {
        runAnim = 'bear_walk';
        idleAnim = 'bear_idle';
        jumpAnim = 'bear_idle'; // 熊无跳跃动画，用 idle 代替
      } else if (form === 'eagle') {
        runAnim = 'fly';
        idleAnim = 'fly';
        jumpAnim = 'fly';
      }

      // 横向移动
      if (leftPressed) {
        player.setVelocityX(-config.speed);
        player.setFlipX(false); // 统一面向左

        if (onFloor) window.SSG.Render.safePlay(player, runAnim, true);
      } else if (rightPressed) {
        player.setVelocityX(config.speed);
        player.setFlipX(true); // 水平翻转面向右

        if (onFloor) window.SSG.Render.safePlay(player, runAnim, true);
      } else {
        player.setVelocityX(0);
        if (onFloor && !scene.isAttacking) {
          window.SSG.Render.safePlay(player, idleAnim, true);
        }
      }

      // 🦅 鹰形态滑翔判定：跳起后按住跳跃键才滑翔（与开局说明一致；auto 模式视同按住）
      if (form === 'eagle') {
        const isAutoGliding = window.SSG.Game.auto && !onFloor;
        if (!onFloor && (jumpPressed || isAutoGliding)) {
          scene.isGliding = true;
          // 应用极小重力
          player.body.setGravityY(-window.SSG.Config.PHYSICS.GRAVITY_Y + config.glideGravity);
          // 水平滑行漂移，减缓阻力
          player.body.setDragX(50);

          window.SSG.Render.safePlay(player, 'glide', true);
        } else {
          scene.isGliding = false;
          player.body.setGravityY(0);
          player.body.setDragX(0);

          if (!onFloor) window.SSG.Render.safePlay(player, 'fly', true);
        }
      }

      // 🐱 猫形态二段跳判定
      if (jumpJustPressed) {
        if (onFloor) {
          player.setVelocityY(config.jump);
          if (window.AudioEngine) window.AudioEngine.play('jump');
          if (form !== 'bear') window.SSG.Render.safePlay(player, jumpAnim, false);
        } else if (form === 'cat' && scene.catJumpsCount < 1) {
          // 二段跳
          scene.catJumpsCount++;
          player.setVelocityY(config.jump * 0.9);
          if (window.AudioEngine) window.AudioEngine.play('jump_double');
          if (window.SSG.Render) window.SSG.Render.playDoubleJumpFX(scene, player);
          window.SSG.Render.safePlay(player, 'cat_jump', false);
        }
      }
    }
  }
};
