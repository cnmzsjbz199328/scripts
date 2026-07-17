/* game/systems/gates.js — 障碍与机关系统
 * ─────────────────────────────────────────────────────────────────────────
 * 处理各类地形判定：高墙、矮缝、深水区、宽壕沟、上升气流、裂石墙和荆棘丛。
 * 判定玩家形态是否克制该地形，提供软惩罚（溺水弹回、鱼上岸扑腾等）。
 * 为 Bot 暴露 nextGate 接口以实现自动化形态选择。
 */
window.SSG = window.SSG || {};

window.SSG.Gates = {
  init(scene) {
    scene.lastSafeX = 100;
    scene.lastSafeY = window.SSG.Config.WORLD.FEET_Y - 104; // 348, 使角色重心刚好落在地面之上，不陷地
    scene.isInWater = false;
    scene.isInLowTunnel = false;
    scene.activeUpdrafts = [];
    scene.nextGate = { at: 999999, need: 'none' };
  },

  update(scene, time, delta) {
    const player = scene.player;
    if (!player || !player.body) return;

    const feetY = window.SSG.Config.WORLD.FEET_Y;
    const onFloor = player.body.blocked.down || player.body.touching.down;

    // 1. 动态记录陆地上安全复归点（非水、非刺、非坑的地面上）
    if (onFloor && !scene.isInWater && !scene.isInThorns && player.x > 50) {
      // 检查当前是否在任何危险区域内
      const inDanger = this.isPositionInDanger(scene, player.x);
      if (!inDanger) {
        scene.lastSafeX = player.x;
        scene.lastSafeY = player.y;
      }
    }
    
    // 强制防穿地夹钳：在非危险区域（陆地）上，玩家的中心 Y 坐标绝不能低于 348（FEET_Y - 104）
    if (!this.isPositionInDanger(scene, player.x)) {
      if (player.y > 348) {
        player.y = 348;
        if (player.body.velocity.y > 0) {
          player.body.setVelocityY(0);
        }
      }
    }

    // 2. 检测深渊坠落 (鱼形态可以游到深水底部，不触发坠落)
    if (player.y > 530 && scene.currentForm !== 'fish') {
      const inChasm = activeLevel.triggers.some(t => t.type === 'chasm' && player.x >= t.x - 10 && player.x <= t.x + t.w + 10);
      if (inChasm) {
        this.handleDamageReset(scene, '坠入深渊，扣生命值 1 点！');
        return;
      }
    }

    // 3. 各种机制状态重置
    scene.isInWater = false;
    scene.isInLowTunnel = false;
    scene.isInThorns = false;
    scene.isInUpdraft = false;

    // 4. 扫描所有触发器，更新玩家机制状态
    const activeLevel = window.SSG.LEVELS[scene.levelIdx];
    if (!activeLevel) return;

    let nearestGateX = 999999;
    let nearestGateNeed = 'none';

    for (const trigger of activeLevel.triggers) {
      // 用于 Bot 识别的 nextGate：寻找前方最近的需要变身的机关
      if (trigger.x > player.x && trigger.x < nearestGateX) {
        let needForm = 'none';
        if (trigger.type === 'tunnel') needForm = 'cat';
        else if (trigger.type === 'wall') needForm = 'cat';
        else if (trigger.type === 'water') needForm = 'fish';
        else if (trigger.type === 'chasm') needForm = 'eagle';
        else if (trigger.type === 'updraft') needForm = 'eagle';
        else if (trigger.type === 'rock') needForm = 'bear';
        else if (trigger.type === 'thorns') needForm = 'bear';

        if (needForm !== 'none') {
          nearestGateX = trigger.x;
          nearestGateNeed = needForm;
        }
      }

      // 进行物理与位置范围碰撞检测
      const px = player.x;
      const py = player.y;

      if (trigger.type === 'water') {
        // 水域检测：如果玩家横坐标在水域内，且纵坐标在地面基线下/水里
        if (px >= trigger.x && px <= trigger.x + trigger.w) {
          scene.isInWater = true;
          // 非鱼入深水，呛水弹回
          if (scene.currentForm !== 'fish') {
            this.handleDamageReset(scene, '呛水！非鱼形态无法通过深水！');
            return;
          }
        }
      }
      
      else if (trigger.type === 'tunnel') {
        // 矮缝检测
        if (px >= trigger.x && px <= trigger.x + trigger.w) {
          // 只有猫（高度36）能过，人和熊过不去（会撞墙卡住）
          if (scene.currentForm !== 'cat') {
            // 人或熊阻挡
            player.x = trigger.x - 10;
            scene.showToast('通道矮窄，需要变猫才能通过！');
          } else {
            scene.isInLowTunnel = true;
          }
        }
      }
      
      else if (trigger.type === 'wall') {
        // 高墙检测
        if (px >= trigger.x && px <= trigger.x + trigger.w) {
          if (py > feetY - trigger.h + 10) {
            // 阻挡
            player.x = trigger.x - 15;
            player.setVelocityX(0);
            scene.showToast('高墙阻挡，猫可以跳得更高！');
          }
        }
      }
      
      else if (trigger.type === 'rock') {
        // 碎石墙检测：如果碎石墙未被摧毁
        if (!trigger.destroyed) {
          if (px >= trigger.x && px <= trigger.x + trigger.w) {
            // 阻挡
            player.x = trigger.x - 15;
            player.setVelocityX(0);
            scene.showToast('巨石封路，熊形态按 [J] 可拍碎！');
          }
        }
      }
      
      else if (trigger.type === 'thorns') {
        // 荆棘检测
        if (px >= trigger.x && px <= trigger.x + trigger.w && py > feetY - 20) {
          scene.isInThorns = true;
          if (scene.currentForm !== 'bear') {
            // 扣血并击退
            this.handleSpikeHurt(scene);
          }
        }
      }
      
      else if (trigger.type === 'updraft') {
        // 上升气流检测
        if (px >= trigger.x && px <= trigger.x + trigger.w) {
          scene.isInUpdraft = true;
          if (scene.currentForm === 'eagle') {
            // 鹰形体上升：给以向上持续加速度
            player.setVelocityY(-350);
            if (window.SSG.Render) {
              window.SSG.Render.playWindLinesFX(scene, player);
            }
          }
        }
      }
    }

    // 更新场景全局 nextGate 契约变量
    scene.nextGate = { at: nearestGateX, need: nearestGateNeed };
  },

  isPositionInDanger(scene, x) {
    const activeLevel = window.SSG.LEVELS[scene.levelIdx];
    if (!activeLevel) return false;
    for (const t of activeLevel.triggers) {
      if (t.type === 'water' && x >= t.x - 50 && x <= t.x + t.w + 50) return true;
      if (t.type === 'thorns' && x >= t.x - 50 && x <= t.x + t.w + 50) return true;
      if (t.type === 'chasm' && x >= t.x - 50 && x <= t.x + t.w + 50) return true;
    }
    return false;
  },

  handleDamageReset(scene, msg) {
    if (scene.isInvincible || scene.isDead) return;
    
    if (window.SSG.Game.auto) {
      scene.showToast(msg);
      this.teleportToSafe(scene);
      return;
    }

    // 扣减生命值
    scene.hp = Math.max(0, scene.hp - 1);
    scene.updateHUDHearts();
    
    scene.showToast(msg);
    if (window.AudioEngine) window.AudioEngine.play('hurt');

    if (scene.hp <= 0) {
      scene.handleGameOver(false);
    } else {
      // 闪烁并复位到上一次安全点
      this.teleportToSafe(scene);
    }
  },

  handleSpikeHurt(scene) {
    if (scene.isInvincible || scene.isDead) return;

    if (window.SSG.Game.auto) {
      scene.showToast('被荆棘扎伤！');
      scene.player.setVelocityX(-200);
      scene.player.setVelocityY(-200);
      scene.triggerInvincible();
      return;
    }

    scene.hp = Math.max(0, scene.hp - 1);
    scene.updateHUDHearts();
    scene.showToast('被荆棘扎伤，扣生命值 1 点！');
    if (window.AudioEngine) window.AudioEngine.play('hurt');

    if (scene.hp <= 0) {
      scene.handleGameOver(false);
    } else {
      // 进入短暂无敌并击退
      scene.player.setVelocityX(-200);
      scene.player.setVelocityY(-200);
      scene.triggerInvincible();
    }
  },

  teleportToSafe(scene) {
    scene.player.setVelocity(0, 0);
    scene.player.x = scene.lastSafeX;
    scene.player.y = scene.lastSafeY;
    scene.triggerInvincible();
  }
};
