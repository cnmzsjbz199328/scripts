/* StickmanFighter — hud 系统（增补 MainScene 原型）
 * 由 game-logic.js 单体机械拆分而来；方法体逐字保留，PvP 已移除。 */
Object.assign(MainScene.prototype, {
  showFightBanner(lines, duration = 3000, callback = null) {
    const existing = document.getElementById('fight-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'fight-banner';
    banner.style.cssText = `
      position:absolute; inset:0; z-index:100; display:flex; flex-direction:column;
      align-items:center; justify-content:center; pointer-events:none;
      background:rgba(0,0,0,0.78); font-family:'Courier New',monospace;
    `;
    banner.innerHTML = lines.map((l, i) =>
      `<div style="color:${i===0?'#ef4444':'#f1f5f9'};font-size:${i===0?'20px':'14px'};
        font-weight:${i===0?'bold':'normal'};text-align:center;margin:4px 36px;
        text-shadow:0 0 12px rgba(239,68,68,0.7)">${l}</div>`
    ).join('');
    const gameContainer = document.querySelector('#game-container') || document.body;
    gameContainer.appendChild(banner);

    this.time.delayedCall(duration, () => {
      banner.style.transition = 'opacity 0.5s';
      banner.style.opacity = '0';
      this.time.delayedCall(500, () => { banner.remove(); if (callback) callback(); });
    });
  },

  setupHUD() {
    const hud = document.getElementById('hud');
    if (!hud) return;

    if (this.isPvP) {
      hud.innerHTML = `
        <div id="p1-hud" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
          <span style="color: #ef4444; font-weight: bold; font-size: 15px;">小红 (P1)</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="p1-hearts" style="color: #f87171; font-size: 18px; letter-spacing: 2px;">♥♥♥</span>
            <div style="width: 100px; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden; border: 1px solid #ef4444;">
              <div id="p1-energy-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #f59e0b, #ef4444); transition: width 0.1s;"></div>
            </div>
            <span id="p1-energy-text" style="color: #f59e0b; font-size: 11px; font-weight: bold;">0%</span>
          </div>
          <div id="p1-wins-container" style="color: #fbbf24; font-size: 12px; height: 16px;"></div>
        </div>
        <div id="hud-objective" style="color: #a5f3fc; flex: 1; text-align: center; font-size: 13px;"><span id="hud-objective-text">双人决斗！生死一战！</span></div>
        <div id="p2-hud" style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
          <span style="color: #06b6d4; font-weight: bold; font-size: 15px;">小蓝 (P2)</span>
          <div style="display: flex; align-items: center; gap: 8px; flex-direction: row-reverse;">
            <span id="p2-hearts" style="color: #f87171; font-size: 18px; letter-spacing: 2px;">♥♥♥</span>
            <div style="width: 100px; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden; border: 1px solid #06b6d4;">
              <div id="p2-energy-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #06b6d4, #3b82f6); transition: width 0.1s;"></div>
            </div>
            <span id="p2-energy-text" style="color: #06b6d4; font-size: 11px; font-weight: bold;">0%</span>
          </div>
          <div id="p2-wins-container" style="color: #fbbf24; font-size: 12px; height: 16px;"></div>
        </div>
      `;
    } else {
      hud.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div id="hud-hearts" style="color: #f87171; letter-spacing: 2px; font-size: 18px;">♥♥♥</div>
          <div id="p1-energy-container" style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 80px; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden; border: 1px solid #ef4444;">
              <div id="p1-energy-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #f59e0b, #ef4444); transition: width 0.1s;"></div>
            </div>
            <span id="p1-energy-text" style="color: #f59e0b; font-size: 11px; font-weight: bold;">0%</span>
          </div>
        </div>
        <div id="hud-score" style="color: #fbbf24; margin-left: 20px;">K.O.数: <span id="hud-score-value">0</span></div>
        <div id="hud-objective" style="color: #a5f3fc; flex: 1; text-align: center;"><span id="hud-objective-text">击败前来的暗影战士，证明你的格斗实力！</span></div>
      `;
    }
  },

  updateHUDHearts() {
    if (this.isPvP) {
      const p1El = document.getElementById('p1-hearts');
      if (p1El) {
        const p1Filled = Math.max(0, Math.ceil(this.hearts));
        p1El.textContent = '♥'.repeat(p1Filled) + '♡'.repeat(3 - p1Filled);
      }
      const p2El = document.getElementById('p2-hearts');
      if (p2El) {
        const p2Filled = Math.max(0, Math.ceil(this.p2Hearts));
        p2El.textContent = '♥'.repeat(p2Filled) + '♡'.repeat(3 - p2Filled);
      }
    } else {
      window.GameHUD?.setHearts(Math.ceil(this.hearts), 3);
    }
  },

  updateHUDValues() {
    const p1Bar = document.getElementById('p1-energy-bar');
    const p1Text = document.getElementById('p1-energy-text');
    if (p1Bar) p1Bar.style.width = `${this.playerEnergy}%`;
    if (p1Text) p1Text.textContent = `${this.playerEnergy}%`;

    if (this.isPvP) {
      const p2Bar = document.getElementById('p2-energy-bar');
      const p2Text = document.getElementById('p2-energy-text');
      if (p2Bar) p2Bar.style.width = `${this.p2Energy}%`;
      if (p2Text) p2Text.textContent = `${this.p2Energy}%`;
    } else {
      window.GameHUD?.setScore(this.score);
    }
  }
});
