/* PokePixel — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  renderTileLayer(layerName, layerConfig) {
    const data = TILEMAP_DATA.layers[layerName];
    if (!data) return;

    const width = TILEMAP_DATA.width;
    const height = TILEMAP_DATA.height;
    
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const id = data[r * width + c];
        if (id === 0) continue;

        const tileName = TILEMAP_DATA.tileIndex[id];
        if (!tileName) continue;

        const x = c * this.tileW + this.tileW / 2;
        const y = r * this.tileH + this.tileH / 2;

        const tileSprite = this.add.sprite(x, y, `tile_${tileName}`);
        tileSprite.setDisplaySize(this.tileW, this.tileH);

        let baseDepth = DEPTH.GROUND;
        if (layerName === 'decor_floor') baseDepth = DEPTH.DECOR_FLOOR;
        else if (layerName === 'objects') baseDepth = DEPTH.YSORT;
        else if (layerName === 'decor_top') baseDepth = DEPTH.DECOR_TOP;

        if (layerConfig.ysort) {
          tileSprite.setDepth(baseDepth + y);
          this.ysortGroup.add(tileSprite);
        } else {
          tileSprite.setDepth(baseDepth);
        }

        if (layerConfig.collision) {
          this.physics.add.existing(tileSprite, true);
          // sync the static body to the 64×64 display size (tile art is 256/512px).
          // plain sprites use body.updateFromGameObject() (refreshBody only exists on
          // factory static sprites). Without this the oversized body overflowed the
          // cell and trapped the player.
          tileSprite.body.updateFromGameObject();
          this.obstaclesGroup.add(tileSprite);
        }
      }
    }
  },


  setPlayerIdleFrame(dir) {
    this.player.anims.stop();
    const facing = dir || this.facingDir || 'down';
    if (facing === 'down') {
      this.player.setFrame(0);
    } else if (facing === 'up') {
      this.player.setFrame(9);
    } else if (facing === 'left') {
      this.player.setFrame(18);
      this.player.setFlipX(true);
    } else if (facing === 'right') {
      this.player.setFrame(18);
      this.player.setFlipX(false);
    }
  },


  checkStepEncounters() {
    const col = Math.floor(this.player.x / 64);
    const row = Math.floor((this.player.y + 20) / 64); // foot offset

    if (col !== this.lastTile.col || row !== this.lastTile.row) {
      this.lastTile = { col, row };

      // Make sure coordinate is inside bounds
      if (col < 0 || col >= TILEMAP_DATA.width || row < 0 || row >= TILEMAP_DATA.height) return;

      const idx = row * TILEMAP_DATA.width + col;
      const groundId = TILEMAP_DATA.layers.ground[idx];
      const decorId = TILEMAP_DATA.layers.decor_floor[idx];

      let encounterChance = 0;
      let area = '';

      // Determine which area we are in and if encounters are possible
      if (col < 15 && row < 15) {
        // Grassland: only in tall grass (decorId === 2)
        if (decorId === 2) {
          encounterChance = 0.08; // 8% chance per step
          area = 'Grassland';
        }
      } else if (col < 15 && row >= 15) {
        // Cave: anywhere on floor (groundId === 3)
        encounterChance = 0.08;
        area = 'Cave';
      } else if (col >= 15 && row < 15) {
        // Snowy Mountain: anywhere on floor (groundId === 5)
        encounterChance = 0.08;
        area = 'SnowyMountain';
      }

      if (encounterChance > 0 && Math.random() < encounterChance) {
        this.triggerRandomEncounter(area);
      }
    }
  },


  updateProximityPrompts() {
    let closestInteractable = null;
    let type = '';
    let minDist = 75; // Proximity threshold (in pixels)

    // Check distance to healing station
    const healDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.healingStation.x, this.healingStation.y);
    if (healDist < minDist) {
      closestInteractable = this.healingStation;
      type = 'healing';
      minDist = healDist;
    }

    // Check distance to shop merchant
    const shopDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.shopMerchant.x, this.shopMerchant.y);
    if (shopDist < minDist) {
      closestInteractable = this.shopMerchant;
      type = 'shop';
      minDist = shopDist;
    }

    // Check distance to chests
    this.chestsList.forEach(chest => {
      if (!chest.getData('opened')) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, chest.x, chest.y);
        if (d < minDist) {
          closestInteractable = chest;
          type = 'chest';
          minDist = d;
        }
      }
    });

    // Check distance to npc trainers
    this.trainersList.forEach(npc => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (d < minDist) {
        closestInteractable = npc;
        type = 'npc';
        minDist = d;
      }
    });

    // Check distance to gym gate
    const gateDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.gymGate.x, this.gymGate.y);
    if (gateDist < minDist) {
      closestInteractable = this.gymGate;
      type = 'gym_gate';
      minDist = gateDist;
    }

    if (closestInteractable) {
      this.activeInteractable = closestInteractable;
      this.activeInteractType = type;

      // Position prompt box slightly above the player
      this.interactPrompt.setPosition(this.player.x, this.player.y - 70);
      
      let promptText = '';
      if (type === 'healing') promptText = 'E 键：使用治疗泉 💖';
      else if (type === 'shop') promptText = 'E 键：打开怪兽商店 🛒';
      else if (type === 'chest') promptText = 'E 键：开启宝箱 📦';
      else if (type === 'gym_gate') {
        promptText = this.gymGateUnlocked ? '已解锁通道 🔓' : 'E 键：开启道馆大门 🔒';
      } else if (type === 'npc') {
        const isDefeated = closestInteractable.getData('defeated');
        if (isDefeated) {
          promptText = `${closestInteractable.name} (已战胜)`;
        } else {
          promptText = `E 键：与 ${closestInteractable.name} 战斗 ⚔️`;
        }
      }

      this.interactPrompt.setText(promptText);
      this.interactPrompt.setVisible(true);
    } else {
      this.activeInteractable = null;
      this.activeInteractType = '';
      this.interactPrompt.setVisible(false);
    }
  },


  triggerInteraction() {
    const type = this.activeInteractType;
    const obj = this.activeInteractable;
    if (!obj) return;

    if (type === 'healing') {
      this.healTeam();
    } else if (type === 'shop') {
      this.openShop();
    } else if (type === 'chest') {
      this.openChest(obj);
    } else if (type === 'gym_gate') {
      this.interactGymGate();
    } else if (type === 'npc') {
      const isDefeated = obj.getData('defeated');
      if (!isDefeated) {
        this.startNpcTrainerBattle(obj);
      }
    }
  },


  healTeam() {
    this.monstersTeam.forEach(m => {
      m.hp = m.maxHp;
    });
    this.spawnFloatingText(this.healingStation.x, this.healingStation.y - 32, "队伍已恢复全满！💖", "#22c55e");
    
    // Play camera color tint flash
    this.cameras.main.flash(300, 34, 197, 94);
  },


  openShop() {
    this.inBattle = true; // Pause map updates
    this.player.setVelocity(0);
    this.setPlayerIdleFrame();

    const shopEl = document.getElementById('shop-overlay');
    if (shopEl) {
      shopEl.style.display = 'flex';
      this.updateShopUI();
    }
  },


  updateShopUI() {
    const goldText = document.getElementById('shop-gold');
    const ballCount = document.getElementById('shop-balls-count');
    const potionCount = document.getElementById('shop-potions-count');
    
    if (goldText) goldText.textContent = this.gold;
    if (ballCount) ballCount.textContent = this.inventory.balls;
    if (potionCount) potionCount.textContent = this.inventory.potions;
  },


  openChest(chest) {
    chest.setData('opened', true);
    chest.play('chest_open');

    // Give random rewards
    const giveBalls = 5;
    const givePotions = 2;
    this.inventory.balls += giveBalls;
    this.inventory.potions += givePotions;

    this.spawnFloatingText(chest.x, chest.y - 32, `获得 精灵球x${giveBalls} 伤药x${givePotions}! 🎒`, "#fbbf24");
    this.updateWorldHUD();
  },


  interactGymGate() {
    if (this.gymGateUnlocked) return;

    // Check player team size
    if (this.monstersTeam.length < 3) {
      this.spawnFloatingText(this.gymGate.x, this.gymGate.y - 32, "守卫：你的怪兽队伍需要至少 3 只怪兽才能挑战道馆！", "#f87171");
    } else {
      this.gymGateUnlocked = true;
      this.gymGate.setTint(0x4ade80); // green tint for unlocked
      this.gymGateCollider.destroy(); // Remove wall physics collider!
      this.spawnFloatingText(this.gymGate.x, this.gymGate.y - 32, "大门已解锁！进入巅峰道馆挑战馆主吧 🔓", "#4ade80");
      window.GameHUD?.setObjective("前往道馆，击败道馆馆主！🏆");
    }
  },


  updateWorldHUD() {
    // Sync values with Global HUD overlay
    window.GameHUD?.setScore(this.monstersTeam.length); // Team size
    
    // Also sync the custom mini-HUD in Phaser
    if (this.goldText) this.goldText.setText(`金币: $${this.gold} 💰`);
    if (this.clockText) this.clockText.setText(`精灵球: ${this.inventory.balls} 🔴 | 伤药: ${this.inventory.potions} 💊`);
    if (this.questText) {
      this.questText.setText(`首发怪兽: ${this.monstersTeam[0] ? this.monstersTeam[0].fullName + ' (HP ' + this.monstersTeam[0].hp + '/' + this.monstersTeam[0].maxHp + ')' : '无'}`);
    }
  }
});
