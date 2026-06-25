/* PixelFarm — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  useActiveItem() {
    const { col, row, mapW, mapH } = this.getFacingTile();
    const targetX = col * this.tileW + this.tileW / 2;
    const targetY = row * this.tileH + this.tileH / 2;

    if (col >= 0 && col < mapW && row >= 0 && row < mapH) {
      const index = row * mapW + col;
      const groundId = TILEMAP_DATA.layers.ground[index];
      const activeTool = this.inventory[this.activeSlot];

      // 1. Hoe Tool (Slot 1): Till Grass OR Harvest Ripe Crops
      if (this.activeSlot === 1) {
        const activeCrop = this.crops[index];
        if (activeCrop && activeCrop.stage === 'ripe') {
          activeCrop.sprite.destroy();
          const isGolden = activeCrop.isGolden;
          delete this.crops[index];
          this.tileSprites[index].clearTint(); // restore wet soil tint
          
          if (isGolden) {
            this.harvestedGolden = true;
            this.spawnBurst(targetX, targetY, 0xfbbf24, 18, 80);
            this.spawnFloatingText(targetX, targetY, 'Harvested Golden Flower! 🏆', '#fbbf24');
            this.showVictoryScreen();
          } else {
            // Add tomato to inventory Slot 5
            this.inventory[5].count++;
            this.inventory[5].icon = '🍅';
            this.updateHotbarUI();
            this.harvestCount++;
            this.spawnBurst(targetX, targetY, 0xf87171, 12, 55);
            this.spawnFloatingText(targetX, targetY, 'Harvested Tomato 🍅', '#10b981');
          }
        } else if (groundId === 1 || groundId === 5) {
          // Till soil (groundId 1 is grass_base, 5 is grass_dry)
          TILEMAP_DATA.layers.ground[index] = 2; // tilled soil ID
          this.tileSprites[index].setTexture('tile_dirt_tilled');
          this.tilledCount++;
          this.spawnBurst(targetX, targetY, 0x8b5a2b, 9, 35);
          this.spawnFloatingText(targetX, targetY, 'Tilled!', '#fbbf24');
        }
      }
      
      // 2. Tomato Seeds (Slot 2): Plant sprout on tilled soil
      else if (this.activeSlot === 2 && activeTool.count > 0) {
        if (groundId === 2 && !this.crops[index]) {
          const sproutSprite = this.add.text(targetX, targetY - 10, '🌱', { font: '24px Arial' }).setOrigin(0.5);
          sproutSprite.setDepth(DEPTH.YSORT + targetY);
          this.ysortGroup.add(sproutSprite);
          this.crops[index] = {
            stage: 'sprout',
            watered: false,
            growthTimer: 0,
            sprite: sproutSprite,
            isGolden: false
          };
          
          activeTool.count--;
          if (activeTool.count === 0) activeTool.icon = ''; // remove icon
          this.updateHotbarUI();
          this.plantedCount++;
          this.spawnFloatingText(targetX, targetY, 'Planted 🌱', '#10b981');
        }
      }

      // 3. Watering Can (Slot 3): Water seed (darken soil tint)
      else if (this.activeSlot === 3 && activeTool.count > 0) {
        const crop = this.crops[index];
        if (crop && !crop.watered) {
          crop.watered = true;
          this.tileSprites[index].setTint(0x7c7c7c); // Darken soil to wet
          this.wateredCount++;
          this.spawnBurst(targetX, targetY, 0x60a5fa, 10, 40);
          this.spawnFloatingText(targetX, targetY, 'Watered 💧', '#60a5fa');
        }
      }

      // 6. Golden Seed (Slot 6): Plant Golden Seed on tilled soil
      else if (this.activeSlot === 6 && activeTool.count > 0) {
        if (groundId === 2 && !this.crops[index]) {
          const sproutSprite = this.add.text(targetX, targetY - 10, '🌟', { font: '24px Arial' }).setOrigin(0.5);
          sproutSprite.setDepth(DEPTH.YSORT + targetY);
          this.ysortGroup.add(sproutSprite);
          this.crops[index] = {
            stage: 'sprout',
            watered: false,
            growthTimer: 0,
            sprite: sproutSprite,
            isGolden: true
          };

          activeTool.count--;
          if (activeTool.count === 0) activeTool.icon = '';
          this.updateHotbarUI();
          this.spawnFloatingText(targetX, targetY, 'Planted Golden Seed! 🌟', '#fbbf24');
        }
      }
    }
  },


  openChest(chest) {
    chest.setData('opened', true);
    chest.play('chest_open');
    this.interactPrompt.setVisible(false);

    // Yield items based on chest position
    const isLeftChest = chest.x < 500;
    if (isLeftChest) {
      this.hasRustyKey = true;
      this.inventory[2] = { name: 'Tomato Seeds', icon: '🌱', count: 5 };
      this.inventory[4] = { name: 'Wood Logs', icon: '🪵', count: 3 };
      
      this.spawnFloatingItem(chest.x - 24, chest.y - 10, '🔑', '#fbbf24');
      this.spawnFloatingItem(chest.x, chest.y - 10, '🌱', '#10b981');
      this.spawnFloatingItem(chest.x + 24, chest.y - 10, '🪵', '#b45309');
      this.spawnFloatingText(chest.x, chest.y - 36, 'Obtained Key, Seeds & Logs!', '#fbbf24');
    } else {
      this.inventory[3] = { name: 'Watering Can', icon: '💧', count: 1 };
      this.inventory[2].count += 5;
      this.inventory[2].icon = '🌱';
      
      this.spawnFloatingItem(chest.x - 12, chest.y - 10, '💧', '#60a5fa');
      this.spawnFloatingItem(chest.x + 12, chest.y - 10, '🌱', '#10b981');
      this.spawnFloatingText(chest.x, chest.y - 36, 'Obtained Toolkit!', '#60a5fa');
    }
    
    this.updateHotbarUI();
  },


  handleInteractions() {
    let closestInteractable = null;
    let closestDist = 80;
    let interactType = '';

    // 1. Check chests
    for (const chest of this.chestsList) {
      if (chest.getData('opened')) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, chest.x, chest.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestInteractable = chest;
        interactType = 'chest';
      }
    }

    // 2. Check locked wooden gate at column 8
    if (!this.gateUnlocked && this.lockedGate) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.lockedGate.x, this.lockedGate.y);
      if (dist < 64) {
        closestDist = dist;
        closestInteractable = this.lockedGate;
        interactType = 'gate';
      }
    }

    // 3. Check bonfire
    if (this.bonfireObj && !this.bonfireLit) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.bonfireObj.x, this.bonfireObj.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestInteractable = this.bonfireObj;
        interactType = 'bonfire';
      }
    }

    // 4. Check shipping bin
    if (this.shippingBin) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.shippingBin.x, this.shippingBin.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestInteractable = this.shippingBin;
        interactType = 'shipping';
      }
    }

    this.activeInteractable = closestInteractable;
    this.activeInteractType = interactType;

    if (closestInteractable) {
      this.interactPrompt.setPosition(closestInteractable.x, closestInteractable.y - 48);
      this.interactPrompt.setVisible(true);

      if (interactType === 'chest') {
        this.interactPrompt.setText('E: Open Chest 📦');
      } else if (interactType === 'gate') {
        if (this.hasRustyKey) {
          this.interactPrompt.setText('E: Unlock Gate 🔑');
        } else {
          this.interactPrompt.setText('Locked Wood Gate 🔒');
        }
      } else if (interactType === 'bonfire') {
        if (this.inventory[4].count >= 3) {
          this.interactPrompt.setText('E: Kindle Bonfire 🔥 (Uses 3 Logs)');
        } else {
          this.interactPrompt.setText('Cold Campfire (Needs 3 Logs 🪵)');
        }
      } else if (interactType === 'shipping') {
        const tomatoCount = this.inventory[5].count;
        if (tomatoCount > 0) {
          this.interactPrompt.setText(`E: Ship Tomatoes 🍅 (Have ${tomatoCount})`);
        } else if (this.tomatoesShipped >= 3 && !this.hasGoldenSeedClaimed) {
          this.interactPrompt.setText('E: Claim Golden Seed ⭐');
        } else {
          this.interactPrompt.setText('Shipping Bin 📦 (Ship 3 Tomatoes)');
        }
      }
    } else {
      this.interactPrompt.setVisible(false);
    }
  },


  triggerInteraction() {
    if (!this.activeInteractable) return;

    if (this.activeInteractType === 'chest') {
      this.openChest(this.activeInteractable);
    } 
    
    else if (this.activeInteractType === 'gate' && this.hasRustyKey) {
      this.gateUnlocked = true;
      this.lockedGate.destroy();
      this.gateCollider.destroy();
      this.spawnFloatingText(544, 416, 'Gate Unlocked! 🔑', '#fbbf24');
      this.activeInteractable = null;
      this.interactPrompt.setVisible(false);
    } 
    
    else if (this.activeInteractType === 'bonfire') {
      if (this.inventory[4].count >= 3) {
        this.inventory[4].count -= 3;
        if (this.inventory[4].count === 0) this.inventory[4].icon = '';
        this.updateHotbarUI();
        this.bonfireLit = true;
        this.bonfireObj.play('burn');
        this.spawnFloatingText(this.bonfireObj.x, this.bonfireObj.y, 'Bonfire Lit! 🔥', '#fbbf24');
        this.activeInteractable = null;
        this.interactPrompt.setVisible(false);
      } else {
        this.spawnFloatingText(this.player.x, this.player.y, 'Need 3 Wood Logs! 🪵', '#ef4444');
      }
    } 
    
    else if (this.activeInteractType === 'shipping') {
      const tomatoCount = this.inventory[5].count;
      if (tomatoCount > 0) {
        this.tomatoesShipped += tomatoCount;
        this.gold += tomatoCount * 150;
        this.goldText.setText(`Gold: $${this.gold}`);
        window.GameHUD?.setScore(this.gold);
        this.inventory[5].count = 0;
        this.inventory[5].icon = '';
        this.updateHotbarUI();
        this.spawnFloatingText(this.shippingBin.x, this.shippingBin.y, `Shipped! +$${tomatoCount * 150} 💰`, '#fbbf24');
        
        if (this.tomatoesShipped >= 3 && !this.hasGoldenSeedClaimed) {
          this.spawnFloatingText(this.shippingBin.x, this.shippingBin.y - 24, 'Compartment Unlocked! ⭐', '#fbbf24');
        }
      } else if (this.tomatoesShipped >= 3 && !this.hasGoldenSeedClaimed) {
        this.hasGoldenSeedClaimed = true;
        this.inventory[6] = { name: 'Golden Seed', icon: '⭐', count: 1 };
        this.updateHotbarUI();
        this.spawnFloatingText(this.shippingBin.x, this.shippingBin.y, 'Obtained Golden Seed! ⭐', '#fbbf24');
      }
    }
  },


  goToSleep() {
    if (this.isSleeping) return;
    this.isSleeping = true;
    this.player.play('farmer_sleep');

    // Display overnight camera transition
    this.cameras.main.fadeOut(800, 11, 15, 25);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      // Complete crop growth overnight for watered crops
      for (const index in this.crops) {
        const crop = this.crops[index];
        if (crop.watered) {
          crop.stage = 'ripe';
          if (crop.isGolden) {
            crop.sprite.setText('🌻');
            // pulse animation
            this.tweens.add({
              targets: crop.sprite,
              scaleX: 1.3,
              scaleY: 1.3,
              duration: 500,
              yoyo: true,
              repeat: -1
            });
          } else {
            crop.sprite.setText('🍅');
          }
          crop.watered = false;
          this.tileSprites[index].clearTint(); // Soil dries out
        }
      }

      // Reset time to 6:00 AM next day
      this.dayCount++;
      this.timeOfDay = 360; 

      this.cameras.main.fadeIn(800, 11, 15, 25);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
        this.spawnFloatingText(this.player.x, this.player.y - 32, `Day ${this.dayCount} Morning!`, '#fbbf24');
        this.isSleeping = false;
        this.setPlayerIdleFrame();
      });
    });
  }
});
