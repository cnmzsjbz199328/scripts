/* PixelFarm — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  renderTileLayer(layerName, layerConfig) {
    const data = TILEMAP_DATA.layers[layerName];
    if (!data) return;

    const width = TILEMAP_DATA.width;
    const height = TILEMAP_DATA.height;
    
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const id = data[r * width + c];
        if (id === 0) continue; // 0 means empty

        const tileName = TILEMAP_DATA.tileIndex[id];
        if (!tileName) continue;

        const x = c * this.tileW + this.tileW / 2;
        const y = r * this.tileH + this.tileH / 2;

        const tileSprite = this.add.sprite(x, y, `tile_${tileName}`);
        tileSprite.setDisplaySize(this.tileW, this.tileH);

        // Determine base depth
        let baseDepth = DEPTH.GROUND;
        if (layerName === 'decor_floor') baseDepth = DEPTH.DECOR_FLOOR;
        else if (layerName === 'objects') baseDepth = DEPTH.YSORT;
        else if (layerName === 'decor_top') baseDepth = DEPTH.DECOR_TOP;

        // Apply Y-sort if ysort is enabled
        if (layerConfig.ysort) {
          tileSprite.setDepth(baseDepth + y);
          this.ysortGroup.add(tileSprite);
        } else {
          tileSprite.setDepth(baseDepth);
        }

        // Apply static physics collision if collision is enabled
        if (layerConfig.collision) {
          this.physics.add.existing(tileSprite, true);
          this.obstaclesGroup.add(tileSprite);
        }

        // Keep reference for dynamic tilling/watering:
        if (layerName === 'ground') {
          this.tileSprites[r * width + c] = tileSprite;
        }
      }
    }
  },


  setPlayerIdleFrame() {
    this.player.anims.stop();
    if (this.facingDir === 'down') {
      this.player.setFrame(0);
    } else if (this.facingDir === 'up') {
      this.player.setFrame(9);
    } else if (this.facingDir === 'left') {
      this.player.setFrame(18);
      this.player.setFlipX(true);   // row 2 visually faces right; flip to face left
    } else if (this.facingDir === 'right') {
      this.player.setFrame(18);
      this.player.setFlipX(false);  // row 2 visually faces right; no flip needed
    }
  },


  getFacingTile() {
    const mapW = TILEMAP_DATA.width;
    const mapH = TILEMAP_DATA.height;
    // +20 approximates the player's feet offset from sprite center
    const playerCol = Math.floor(this.player.x / this.tileW);
    const playerRow = Math.floor((this.player.y + 20) / this.tileH);
    let col = playerCol;
    let row = playerRow;
    if (this.facingDir === 'down') row++;
    else if (this.facingDir === 'up') row--;
    else if (this.facingDir === 'left') col--;
    else if (this.facingDir === 'right') col++;
    col = Phaser.Math.Clamp(col, 0, mapW - 1);
    row = Phaser.Math.Clamp(row, 0, mapH - 1);
    return { col, row, mapW, mapH };
  },


  updateTileHighlight() {
    this.tileHighlight.clear();
    this.tileHint.setVisible(false);

    if (this.isAttacking || this.isSleeping) return;

    const { col, row, mapW, mapH } = this.getFacingTile();
    if (col < 0 || col >= mapW || row < 0 || row >= mapH) return;

    const index = row * mapW + col;
    const groundId = TILEMAP_DATA.layers.ground[index];
    const activeTool = this.inventory[this.activeSlot];
    const crop = this.crops[index];

    const px = col * this.tileW;
    const py = row * this.tileH;

    let borderColor = 0x94a3b8;
    let fillColor = 0x94a3b8;
    let fillAlpha = 0.0;
    let actionText = '';

    if (this.activeSlot === 1) {
      if (crop && crop.stage === 'ripe') {
        borderColor = 0xfbbf24; fillColor = 0xfbbf24; fillAlpha = 0.3;
        actionText = crop.isGolden ? 'Z: 收获黄金花 🌻' : 'Z: 收获番茄 🍅';
      } else if (groundId === 1 || groundId === 5) {
        borderColor = 0x10b981; fillColor = 0x10b981; fillAlpha = 0.25;
        actionText = 'Z: 耕地 ⛏';
      } else if (groundId === 2 && !crop) {
        borderColor = 0x94a3b8; fillColor = 0x94a3b8; fillAlpha = 0.12;
        actionText = '已耕地';
      } else if (groundId === 2 && crop) {
        borderColor = 0x94a3b8; fillColor = 0x94a3b8; fillAlpha = 0.1;
        if (crop.stage === 'sprout') {
          actionText = crop.watered ? '🌱 生长中...' : '🌱 需要浇水';
        }
      }
    } else if (this.activeSlot === 2) {
      if (activeTool.count <= 0) {
        borderColor = 0xef4444; fillAlpha = 0.0; actionText = '种子不足';
      } else if (groundId === 2 && !crop) {
        borderColor = 0x10b981; fillColor = 0x10b981; fillAlpha = 0.25;
        actionText = 'Z: 种植番茄 🌱';
      } else if (groundId !== 2) {
        borderColor = 0xef4444; fillAlpha = 0.0; actionText = '需先耕地';
      } else {
        borderColor = 0x94a3b8; fillAlpha = 0.1; actionText = '已占用';
      }
    } else if (this.activeSlot === 3) {
      if (activeTool.count <= 0) {
        borderColor = 0xef4444; fillAlpha = 0.0; actionText = '无水';
      } else if (crop && !crop.watered && crop.stage !== 'ripe') {
        borderColor = 0x60a5fa; fillColor = 0x60a5fa; fillAlpha = 0.3;
        actionText = 'Z: 浇水 💧';
      } else if (crop && crop.watered) {
        borderColor = 0x60a5fa; fillColor = 0x60a5fa; fillAlpha = 0.1;
        actionText = '💧 已浇水';
      } else {
        borderColor = 0x94a3b8; fillAlpha = 0.0; actionText = '无作物';
      }
    } else if (this.activeSlot === 6) {
      if (activeTool.count <= 0) {
        borderColor = 0xef4444; fillAlpha = 0.0; actionText = '无黄金种子';
      } else if (groundId === 2 && !crop) {
        borderColor = 0xfbbf24; fillColor = 0xfbbf24; fillAlpha = 0.3;
        actionText = 'Z: 种植黄金种子 🌟';
      } else if (groundId !== 2) {
        borderColor = 0xef4444; fillAlpha = 0.0; actionText = '需先耕地';
      }
    }

    // Draw tile border
    this.tileHighlight.lineStyle(2, borderColor, 0.9);
    this.tileHighlight.strokeRect(px + 2, py + 2, this.tileW - 4, this.tileH - 4);
    if (fillAlpha > 0) {
      this.tileHighlight.fillStyle(fillColor, fillAlpha);
      this.tileHighlight.fillRect(px + 2, py + 2, this.tileW - 4, this.tileH - 4);
    }

    if (actionText) {
      this.tileHint.setPosition(px + this.tileW / 2, py - 2);
      this.tileHint.setText(actionText);
      this.tileHint.setVisible(true);
    }
  },


  updateCropsGrowth(delta) {
    for (const index in this.crops) {
      const crop = this.crops[index];
      if (crop.stage === 'sprout' && crop.watered) {
        let growthSpeed = 1;
        if (this.bonfireLit) {
          // Bonfire is at 600, 400. Warmth speeds up growth if nearby
          const col = index % TILEMAP_DATA.width;
          const row = Math.floor(index / TILEMAP_DATA.width);
          const cx = col * this.tileW + this.tileW / 2;
          const cy = row * this.tileH + this.tileH / 2;
          const distToFire = Phaser.Math.Distance.Between(cx, cy, 600, 400);
          if (distToFire < 200) {
            growthSpeed = 2.5; // Warmth speeds up growth
          }
        }
        
        crop.growthTimer += delta * growthSpeed;
        
        const targetTime = crop.isGolden ? 12000 : 8000;
        if (crop.growthTimer >= targetTime) {
          crop.stage = 'ripe';
          if (crop.isGolden) {
            crop.sprite.setText('🌻');
            this.tweens.add({
              targets: crop.sprite,
              scaleX: 1.3,
              scaleY: 1.3,
              duration: 500,
              yoyo: true,
              repeat: -1
            });
            const col = index % TILEMAP_DATA.width;
            const row = Math.floor(index / TILEMAP_DATA.width);
            const x = col * this.tileW + this.tileW / 2;
            const y = row * this.tileH + this.tileH / 2;
            this.spawnBurst(x, y, 0xfbbf24, 16, 70);
            this.spawnFloatingText(x, y, 'Golden Flower Ripe! ✨🌻✨', '#fbbf24');
          } else {
            crop.sprite.setText('🍅');
            const col = index % TILEMAP_DATA.width;
            const row = Math.floor(index / TILEMAP_DATA.width);
            const x = col * this.tileW + this.tileW / 2;
            const y = row * this.tileH + this.tileH / 2;
            this.spawnBurst(x, y, 0xf87171, 10, 50);
            this.spawnFloatingText(x, y, 'Ripe 🍅!', '#f87171');
          }
        }
      }
    }
  },


  updateDayNight(delta) {
    this.timeOfDay += (delta / 500);

    if (this.timeOfDay >= 1440) {
      this.timeOfDay = 0;
      this.dayCount++;
    }

    const hours = Math.floor(this.timeOfDay / 60);
    const minutes = Math.floor(this.timeOfDay % 60);
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    
    this.clockText.setText(`Day ${this.dayCount} - ${displayHours}:${displayMinutes} ${ampm}`);

    this.dayNightOverlay.clear();

    let color = 0x000000;
    let alpha = 0.0;

    if (hours >= 20 || hours < 5) {
      color = 0x1e1b4b;
      alpha = 0.45;
    } else if (hours === 5) {
      color = 0xf59e0b;
      alpha = 0.3 * (1 - minutes / 60);
    } else if (hours >= 17 && hours < 20) {
      color = 0x701a75;
      const sunsetProg = (hours - 17) * 60 + minutes;
      alpha = 0.45 * (sunsetProg / 180);
    }

    if (alpha > 0) {
      this.dayNightOverlay.fillStyle(color, alpha);
      this.dayNightOverlay.fillRect(0, 0, 800, 600);
    }
  }
});
