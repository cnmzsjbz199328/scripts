/* PixelFarm — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  createHUD() {
    this.hudContainer = this.add.container(0, 0).setScrollFactor(0);
    this.hudContainer.setDepth(DEPTH.EFFECTS);

    // Gold Counter
    this.goldText = this.add.text(780, 20, `Gold: $${this.gold}`, {
      font: 'bold 16px monospace',
      fill: '#fbbf24',
      backgroundColor: '#1e293b',
      padding: { x: 10, y: 6 }
    }).setOrigin(1, 0);
    this.hudContainer.add(this.goldText);

    // Time Clock
    this.clockText = this.add.text(20, 20, '', {
      font: 'bold 16px monospace',
      fill: '#f8fafc',
      backgroundColor: '#1e293b',
      padding: { x: 10, y: 6 }
    });
    this.hudContainer.add(this.clockText);

    // Active Quest Objective HUD
    this.questText = this.add.text(20, 70, 'Quest: Open grandfather\'s left chest', {
      font: 'bold 14px monospace',
      fill: '#60a5fa',
      backgroundColor: '#1e293b',
      padding: { x: 10, y: 6 }
    });
    this.hudContainer.add(this.questText);

    // Hotbar (6 slots)
    const hotbarY = 530;
    const slotSize = 54;
    const spacing = 8;
    this.hotbarStartX = 400 - ((slotSize * 6 + spacing * 5) / 2);

    this.hotbarBorders = [];
    this.hotbarIcons = [];
    this.hotbarCounts = [];

    for (let i = 0; i < 6; i++) {
      const x = this.hotbarStartX + i * (slotSize + spacing);
      
      // Slot background
      const bg = this.add.graphics();
      bg.fillStyle(0x1e293b, 0.85);
      bg.fillRect(x, hotbarY, slotSize, slotSize);
      this.hudContainer.add(bg);

      // Slot border reference
      const border = this.add.graphics();
      this.drawSlotBorder(border, x, hotbarY, slotSize, i === 0);
      this.hudContainer.add(border);
      this.hotbarBorders.push(border);

      // Slot label number
      this.hudContainer.add(
        this.add.text(x + 5, hotbarY + 5, `${i + 1}`, { font: '9px monospace', fill: '#94a3b8' })
      );

      // Item icon
      const item = this.inventory[i + 1];
      const iconText = this.add.text(x + 27, hotbarY + 27, item?.icon || '', { font: '24px Arial', fill: '#f8fafc' }).setOrigin(0.5);
      this.hudContainer.add(iconText);
      this.hotbarIcons.push(iconText);

      // Item count
      const countText = this.add.text(x + 48, hotbarY + 48, (item?.count > 0) ? `x${item.count}` : '', { font: 'bold 10px monospace', fill: '#10b981' }).setOrigin(1, 1);
      this.hudContainer.add(countText);
      this.hotbarCounts.push(countText);
    }
  },


  drawSlotBorder(graphics, x, y, size, isActive) {
    graphics.clear();
    graphics.lineStyle(isActive ? 3 : 1, isActive ? 0xfbbd23 : 0x475569, 1);
    graphics.strokeRect(x, y, size, size);
  },


  updateHotbarUI() {
    const slotSize = 54;
    const spacing = 8;
    for (let i = 0; i < 6; i++) {
      const x = this.hotbarStartX + i * (slotSize + spacing);
      const border = this.hotbarBorders[i];
      const item = this.inventory[i + 1];

      // Draw border highlight
      this.drawSlotBorder(border, x, 530, slotSize, (this.activeSlot === i + 1));

      // Update icon & count
      this.hotbarIcons[i].setText(item?.icon || '');
      this.hotbarCounts[i].setText((item?.count > 0) ? `x${item.count}` : '');
    }
  },


  updateQuestsHUD() {
    let currentObjective = '';
    if (!this.hasRustyKey && !this.gateUnlocked) {
      currentObjective = `打开祖父留下的左侧宝箱 📦 (${this.hasRustyKey ? 1 : 0}/1)`;
    } else if (!this.gateUnlocked) {
      currentObjective = '使用钥匙解锁大门 🔑';
    } else if (!this.bonfireLit) {
      currentObjective = '用3块木头点燃寒冷的篝火 🔥';
    } else if (this.tilledCount < 3) {
      currentObjective = `在东侧开垦3块土地 (${this.tilledCount}/3) ⛏`;
    } else if (this.harvestCount < 3) {
      const hasWateringCan = this.inventory[3].count > 0;
      if (!hasWateringCan) {
        currentObjective = '打开右侧宝箱获取洒水壶 💧';
      } else {
        currentObjective = `种植并收获3个番茄 🍅 (${this.harvestCount}/3)`;
      }
    } else if (this.tomatoesShipped < 3) {
      currentObjective = `在出货箱出售3个番茄 📦 (${this.tomatoesShipped}/3)`;
    } else if (!this.harvestedGolden) {
      const hasGoldenSeed = this.inventory[6].count > 0;
      if (hasGoldenSeed) {
        currentObjective = '种植并浇灌黄金种子！🌟';
      } else {
        currentObjective = '从出货箱领取黄金种子 ⭐';
      }
    } else {
      currentObjective = '黄金花朵绽放！农场重现荣光！🏆';
    }

    if (this.questText.text !== currentObjective) {
      this.questText.setText(currentObjective);
      window.GameHUD?.setObjective(currentObjective);
    }
  }
});
