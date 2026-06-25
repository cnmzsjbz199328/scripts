/* RoboWarehouse — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  // Conveyor Belt sliding phase
  checkConveyors() {
    let movedAny = false;
    const moveTimeline = [];

    // 1. Move boxes on conveyors
    this.activeBoxes.forEach(box => {
      const tileVal = this.levelGrid[box.gridY][box.gridX];
      let dx = 0, dy = 0;
      if (tileVal === 6) dy = -1; // up
      if (tileVal === 7) dy = 1;  // down
      if (tileVal === 8) dx = -1; // left
      if (tileVal === 9) dx = 1;  // right

      if (dx !== 0 || dy !== 0) {
        const tx = box.gridX + dx;
        const ty = box.gridY + dy;
        // Make sure destination is free
        if (!this.isWall(tx, ty) && !this.getBoxAt(tx, ty) && !(this.player.gridX === tx && this.player.gridY === ty)) {
          box.gridX = tx;
          box.gridY = ty;
          movedAny = true;
          moveTimeline.push({
            target: box.sprite,
            x: tx * 64 + 32,
            y: ty * 64 + 32
          });
        }
      }
    });

    // 2. Move player on conveyor
    const pTile = this.levelGrid[this.player.gridY][this.player.gridX];
    let pdx = 0, pdy = 0;
    if (pTile === 6) pdy = -1;
    if (pTile === 7) pdy = 1;
    if (pTile === 8) pdx = -1;
    if (pTile === 9) pdx = 1;

    if (pdx !== 0 || pdy !== 0) {
      const ptx = this.player.gridX + pdx;
      const pty = this.player.gridY + pdy;
      if (!this.isWall(ptx, pty) && !this.getBoxAt(ptx, pty)) {
        this.player.gridX = ptx;
        this.player.gridY = pty;
        movedAny = true;
        moveTimeline.push({
          target: this.player,
          x: ptx * 64 + 32,
          y: pty * 64 + 32
        });
      }
    }

    if (movedAny) {
      // Tween all moves simultaneously
      let tweenCount = 0;
      moveTimeline.forEach(m => {
        this.tweens.add({
          targets: m.target,
          x: m.x,
          y: m.y,
          duration: 200,
          onUpdate: () => {
            m.target.setDepth(DEPTH.YSORT + m.target.y);
          },
          onComplete: () => {
            tweenCount++;
            if (tweenCount === moveTimeline.length) {
              // Re-check in case they landed on another conveyor belt
              this.checkConveyors();
            }
          }
        });
      });
    } else {
      // Finished conveyor checks, now check switch triggers and gravity
      this.handleTriggers();
    }
  },


  // Handle Switch triggers and gravity flips
  handleTriggers() {
    let standingOnSwitch = false;

    // Check if player stands on switch
    const playerTile = this.levelGrid[this.player.gridY][this.player.gridX];
    if (playerTile === 10) standingOnSwitch = true;

    // Check if any box stands on switch
    this.activeBoxes.forEach(box => {
      if (this.levelGrid[box.gridY][box.gridX] === 10) standingOnSwitch = true;
    });

    // Gravity Inversion triggers on standing on gravity switch (10)
    // If gravity was triggered, flip it!
    if (standingOnSwitch) {
      const oldGravity = this.gravityDirection;
      this.gravityDirection = (oldGravity === 'down') ? 'up' : 'down';
      
      // Update Gravity indicator tiles visually
      this.mapTiles.forEach(tile => {
        if (tile.getData('isGravityIndicator')) {
          const key = this.gravityDirection === 'down' ? 'tile_gravity_indicator_down_base' : 'tile_gravity_indicator_up_base';
          tile.setTexture(key);
        }
      });

      // Play a quick camera flash + energy burst to show flip
      this.cameras.main.flash(150, 160, 100, 240, 0.4);
      this.spawnBurst(this.player.x, this.player.y, 0xa066f0, 16, 90);

      // Perform gravity slide
      this.applyGravity();
    } else {
      // No gravity flip, proceed to standard gravity check (level 5)
      this.applyGravity();
    }
  },


  // Gravity sliding check (Level 5 special)
  applyGravity() {
    if (this.currentLevel !== 5) {
      this.checkWinCondition();
      return;
    }

    const dy = (this.gravityDirection === 'down') ? 1 : -1;
    let movedAny = false;
    const gravityMoves = [];

    // Sort boxes so that those further down/up slide first to prevent blocking
    const sortedBoxes = [...this.activeBoxes];
    if (this.gravityDirection === 'down') {
      sortedBoxes.sort((a, b) => b.gridY - a.gridY);
    } else {
      sortedBoxes.sort((a, b) => a.gridY - b.gridY);
    }

    sortedBoxes.forEach(box => {
      let targetY = box.gridY;
      
      while (true) {
        const nextY = targetY + dy;
        
        // Blocked by wall?
        if (this.isWall(box.gridX, nextY)) break;
        
        // Blocked by another box?
        const otherBox = this.activeBoxes.find(b => b.gridX === box.gridX && b.gridY === nextY);
        if (otherBox) break;
        
        // Blocked by player?
        if (this.player.gridX === box.gridX && this.player.gridY === nextY) break;

        targetY = nextY;
      }

      if (targetY !== box.gridY) {
        const stepCount = Math.abs(targetY - box.gridY);
        box.gridY = targetY;
        movedAny = true;
        gravityMoves.push({
          target: box.sprite,
          y: targetY * 64 + 32,
          steps: stepCount
        });
      }
    });

    if (movedAny) {
      this.isTransitioning = true;
      let completedCount = 0;
      gravityMoves.forEach(m => {
        this.tweens.add({
          targets: m.target,
          y: m.y,
          duration: m.steps * 100,
          ease: 'Cubic.easeIn',
          onUpdate: () => {
            m.target.setDepth(DEPTH.YSORT + m.target.y);
          },
          onComplete: () => {
            completedCount++;
            if (completedCount === gravityMoves.length) {
              // Wait a little frame, then check conveyors again (e.g. if box landed on conveyor!)
              this.time.delayedCall(50, () => {
                this.checkConveyors();
              });
            }
          }
        });
      });
    } else {
      this.checkWinCondition();
    }
  },


  checkWinCondition() {
    // Check if all targets are satisfied
    let levelComplete = true;

    this.activeTargets.forEach(tgt => {
      const tgtColor = tgt.getData('color');
      const tx = tgt.getData('gridX');
      const ty = tgt.getData('gridY');

      const box = this.getBoxAt(tx, ty);
      if (!box || box.color !== tgtColor) {
        levelComplete = false;
      }
    });

    if (levelComplete) {
      this.isTransitioning = true;
      this.cameras.main.flash(250, 255, 255, 255);
      
      // Play target success effects
      const colorHex = { red: 0xff5555, green: 0x4ade80, blue: 0x60a5fa };
      this.activeTargets.forEach(tgt => {
        this.tweens.add({
          targets: tgt,
          scale: 1.3,
          yoyo: true,
          duration: 150
        });
        this.spawnBurst(tgt.x, tgt.y, colorHex[tgt.getData('color')] || 0xffffff, 14, 60);
      });

      const bottyComments = {
        1: '✅ 小博特：单色方块归位！简单？等等后面的……',
        2: '✅ 小博特：双色分流成功！传送带，我的朋友！',
        3: '✅ 小博特：三色方块全归位！我的弹簧臂快断了……',
        4: '✅ 小博特：重力翻转也难不倒我！最后一关——来吧！',
      };

      this.time.delayedCall(500, () => {
        const comment = bottyComments[this.currentLevel];
        if (comment && this.currentLevel < 5) {
          const txt = this.add.text(
            this.cameras.main.width / 2, this.cameras.main.height / 2 - 30,
            comment, {
              font: 'bold 14px monospace', fill: '#fbbf24',
              stroke: '#000', strokeThickness: 3, align: 'center'
            }
          ).setOrigin(0.5).setScrollFactor(0).setDepth(9999);
          this.time.delayedCall(2000, () => txt.destroy());
        }

        if (this.currentLevel < 5) {
          this.loadLevel(this.currentLevel + 1);
        } else {
          // Win Game
          this.gameStarted = false;
          window.GameHUD?.showGameOver(true,
            '🎉 仓库全面重启！\n\n' +
            '小博特（Botty）用弹簧手臂逐一归位了所有能量方块，\n' +
            '穿越传送带迷宫、克服重力翻转，解开了全部5个谜题。\n\n' +
            '齿轮咔哒一声旋转，彩虹蒸汽从烟囱欢快地喷涌而出——\n' +
            '卡通蒸汽工厂，重新开工了！\n\n' +
            '小博特的大圆眼睛弯成了两道弧线：\n"谢谢你，伙伴！"'
          );
        }
      });
    } else {
      // Finished all updates, release input lock
      this.isTransitioning = false;
    }
  },


  // Capture the stable pre-move state (player + boxes + gravity) for undo.
  snapshotState() {
    return {
      gravityDirection: this.gravityDirection,
      player: { gridX: this.player.gridX, gridY: this.player.gridY },
      boxes: this.activeBoxes.map(b => ({ gridX: b.gridX, gridY: b.gridY }))
    };
  },


  // Restore a snapshot, cancelling any in-flight cascade tweens.
  restoreState(s) {
    this.tweens.killAll();
    this.gravityDirection = s.gravityDirection;
    this.player.gridX = s.player.gridX;
    this.player.gridY = s.player.gridY;
    this.player.x = s.player.gridX * 64 + 32;
    this.player.y = s.player.gridY * 64 + 32;
    this.player.setDepth(DEPTH.YSORT + this.player.y);
    this.player.anims.stop();
    s.boxes.forEach((bs, i) => {
      const b = this.activeBoxes[i];
      if (!b) return;
      b.gridX = bs.gridX;
      b.gridY = bs.gridY;
      b.sprite.x = bs.gridX * 64 + 32;
      b.sprite.y = bs.gridY * 64 + 32;
      b.sprite.setDepth(DEPTH.YSORT + b.sprite.y);
    });
    this.mapTiles.forEach(tile => {
      if (tile.getData && tile.getData('isGravityIndicator')) {
        const key = this.gravityDirection === 'down'
          ? 'tile_gravity_indicator_down_base'
          : 'tile_gravity_indicator_up_base';
        tile.setTexture(key);
      }
    });
    this.isTransitioning = false;
  }
});
