/* PokePixel — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  // --- HTML DOM Integration ---
  injectHTMLOverlays() {
    // Inject Custom CSS
    const cssStyle = `
      /* --- Battle Overlay Container --- */
      #battle-overlay {
        display: none;
        position: absolute;
        inset: 0;
        z-index: 40;
        background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
        font-family: 'Segoe UI', 'Courier New', monospace;
        color: #f1f5f9;
        flex-direction: column;
        padding: 16px;
        box-sizing: border-box;
      }

      .bt-layout {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: 12px;
      }

      /* Arena Area */
      .bt-arena {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 24px;
        position: relative;
        background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%);
      }

      .bt-card {
        background: rgba(30, 41, 59, 0.75);
        backdrop-filter: blur(8px);
        border: 1px solid #475569;
        border-radius: 12px;
        padding: 12px 16px;
        width: 44%;
        box-shadow: 0 4px 15px rgba(0,0,0,0.35);
      }

      .bt-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-weight: bold;
      }

      .bt-name { font-size: 15px; color: #f8fafc; }
      .bt-level { font-size: 12px; color: #a5f3fc; }

      .bt-bar-wrapper {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 4px;
      }

      .bt-hp-bar-outer {
        width: 100%;
        height: 12px;
        background: #334155;
        border-radius: 6px;
        overflow: hidden;
      }

      .bt-hp-bar-inner {
        height: 100%;
        width: 100%;
        background-color: #22c55e;
        transition: width 0.3s ease;
      }

      .bt-xp-bar-outer {
        width: 60%;
        height: 4px;
        background: #1e293b;
        border-radius: 2px;
        overflow: hidden;
      }

      .bt-xp-bar-inner {
        height: 100%;
        width: 0%;
        background-color: #3b82f6;
      }

      .bt-avatar-box {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 52px;
        height: 90px;
        margin-top: 8px;
        user-select: none;
        filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
      }

      /* Control Deck */
      .bt-controls {
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 12px;
        display: flex;
        height: 150px;
        gap: 12px;
      }

      .bt-log {
        flex: 1;
        background: #090d16;
        border: 1px solid #273549;
        border-radius: 8px;
        padding: 8px 12px;
        overflow-y: auto;
        font-size: 12px;
        color: #e2e8f0;
        line-height: 1.5;
      }

      .bt-actions {
        width: 250px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .bt-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        height: 100%;
      }

      /* Buttons */
      .skill-btn, .opt-btn, .shop-btn, .starter-card button {
        padding: 6px 8px;
        font-size: 12px;
        font-weight: bold;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.1s;
        text-align: center;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: white;
      }

      .skill-btn {
        background: #312e81;
        border: 1px solid #4f46e5;
      }
      .skill-btn:hover { background: #4338ca; }
      .skill-btn:disabled { opacity: 0.5; cursor: not-allowed; }

      .opt-btn { background: #b45309; }
      .opt-btn:hover { background: #d97706; }
      .opt-btn:disabled { opacity: 0.5; cursor: not-allowed; }

      .opt-red { background: #b91c1c; }
      .opt-red:hover { background: #dc2626; }

      .opt-purple { background: #6d28d9; }
      .opt-purple:hover { background: #7c3aed; }

      /* Swap Menu popup */
      #bt-swap-menu {
        display: none;
        position: absolute;
        inset: 20px;
        background: rgba(15, 23, 42, 0.98);
        border: 2px solid #3b82f6;
        border-radius: 12px;
        padding: 16px;
        z-index: 50;
        flex-direction: column;
      }

      .bt-swap-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        flex: 1;
        margin-top: 12px;
      }

      .bt-swap-item {
        background: #1e293b;
        border: 1px solid #475569;
        border-radius: 8px;
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: background 0.2s;
      }

      .bt-swap-item:hover {
        background: #334155;
        border-color: #3b82f6;
      }
      
      .bt-swap-item.fainted {
        opacity: 0.4;
        cursor: not-allowed;
      }

      /* Starter Select and Shop Overlay */
      .modal-overlay {
        display: none;
        position: absolute;
        inset: 0;
        background: rgba(8, 12, 24, 0.92);
        z-index: 60;
        align-items: center;
        justify-content: center;
        font-family: monospace;
      }

      .modal-card {
        background: #0f172a;
        border: 2px solid #3b82f6;
        border-radius: 12px;
        padding: 24px 32px;
        width: 80%;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      }

      .starter-grid {
        display: flex;
        justify-content: space-around;
        margin-top: 20px;
        gap: 12px;
      }

      .starter-card {
        background: #1e293b;
        border: 1px solid #475569;
        border-radius: 8px;
        padding: 16px 8px;
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        transition: transform 0.2s, border-color 0.2s;
      }

      .starter-card:hover {
        transform: translateY(-4px);
        border-color: #3b82f6;
      }

      .starter-icon {
        font-size: 44px;
        margin-bottom: 8px;
      }

      /* Shop UI elements */
      .shop-item-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #1e293b;
        padding: 8px 16px;
        border-radius: 8px;
        margin-bottom: 8px;
        border: 1px solid #334155;
      }

      /* Micro Animations */
      .battle-hop {
        animation: hop 0.3s ease-in-out;
      }
      .battle-shake {
        animation: shake 0.4s ease-in-out;
      }
      .battle-catch-shake {
        animation: catch-shake 0.5s ease-in-out infinite;
      }

      @keyframes hop {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-20px); }
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-8px); }
        40%, 80% { transform: translateX(8px); }
      }
      @keyframes catch-shake {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-15deg) translateY(-8px); }
        75% { transform: rotate(15deg) translateY(-8px); }
      }

      /* Animated pet spritesheets used as battle monster avatars.
         Source frames are 192x208 in a 9x6 grid (1728x1248), displayed at
         90px tall (scale = 90/208). One row = 9 frames stepped over 0.9s. */
      .mon-sprite {
        width: 83px;
        height: 90px;
        background-repeat: no-repeat;
        background-size: 748px 540px;
        background-position-y: -180px; /* row 2: running-left (loops) */
        image-rendering: pixelated;
        animation: monwalk 0.9s steps(9) infinite;
      }
      @keyframes monwalk {
        from { background-position-x: 0; }
        to { background-position-x: -748px; }
      }
    `;

    // Inject css
    const styleEl = document.createElement('style');
    styleEl.innerHTML = cssStyle;
    document.head.appendChild(styleEl);

    // Injected DOM nodes inside game wrapper
    const wrapper = document.getElementById('game-wrapper');
    if (!wrapper) return;

    // 1. Battle Overlay
    const battleHTML = `
      <div id="battle-overlay">
        <div class="bt-layout">
          <!-- Arena Area -->
          <div class="bt-arena">
            <!-- Player active monster -->
            <div class="bt-card">
              <div class="bt-card-header">
                <span id="bt-p-name">-</span>
                <span id="bt-p-level">-</span>
              </div>
              <div class="bt-avatar-box" id="bt-p-avatar">🐰</div>
              <div class="bt-bar-wrapper">
                <div style="font-size:10px; display:flex; justify-content:space-between">
                  <span>HP: <span id="bt-p-hp-text">0/0</span></span>
                  <span id="bt-p-type" style="font-weight:bold">-</span>
                </div>
                <div class="bt-hp-bar-outer">
                  <div class="bt-hp-bar-inner" id="bt-p-hp-bar"></div>
                </div>
                <div class="bt-xp-bar-outer">
                  <div class="bt-xp-bar-inner" id="bt-p-xp-bar"></div>
                </div>
              </div>
            </div>

            <div style="font-size: 28px; font-weight: bold; color: #94a3b8; text-shadow: 0 4px 6px rgba(0,0,0,0.5)">VS</div>

            <!-- Enemy active monster -->
            <div class="bt-card">
              <div class="bt-card-header">
                <span id="bt-e-name">-</span>
                <span id="bt-e-level">-</span>
              </div>
              <div class="bt-avatar-box" id="bt-e-avatar">🦊</div>
              <div class="bt-bar-wrapper">
                <div style="font-size:10px; display:flex; justify-content:space-between">
                  <span>HP: <span id="bt-e-hp-text">0/0</span></span>
                  <span id="bt-e-type" style="font-weight:bold">-</span>
                </div>
                <div class="bt-hp-bar-outer">
                  <div class="bt-hp-bar-inner" id="bt-e-hp-bar"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Battle Control Panel -->
          <div class="bt-controls">
            <div class="bt-log" id="bt-log-box"></div>
            <div class="bt-actions">
              <div class="bt-grid">
                <div style="display:contents" id="bt-skills-grid">
                  <!-- Skill buttons populated dynamically -->
                </div>
                <button class="opt-btn opt-purple" onclick="window.MainGame.triggerBattleSwapMenu()">🔁 换怪兽</button>
                <button class="opt-btn opt-red" id="bt-catch-btn" onclick="window.MainGame.triggerCatch()">🔴 扔飞球</button>
                <button class="opt-btn" onclick="window.MainGame.triggerRunAway()">🏃 逃跑</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Swap monster menu -->
        <div id="bt-swap-menu">
          <h3 style="text-align:center; border-bottom:1px solid #334155; padding-bottom:8px">选择出战怪兽</h3>
          <div class="bt-swap-grid" id="bt-swap-grid-box"></div>
          <button class="opt-btn opt-red" style="margin-top:12px; width:100%" onclick="document.getElementById('bt-swap-menu').style.display='none'">取消</button>
        </div>
      </div>
    `;
    wrapper.insertAdjacentHTML('beforeend', battleHTML);

    // 2. Starter Select Overlay
    const starterHTML = `
      <div id="starter-overlay" class="modal-overlay">
        <div class="modal-card">
          <h2 style="color:#60a5fa; font-size:1.6rem">选择你的初始伙伴</h2>
          <p style="color:#94a3b8; font-size:11px; margin-top:8px">这是你怪兽训练师旅程的起点。选择一只最吸引你的初始怪兽吧！</p>
          <div class="starter-grid">
            <div class="starter-card" onclick="window.MainGame.chooseStarter('叶兔')">
              <div class="starter-icon" style="color:#22c55e">🐰</div>
              <strong style="color:#22c55e">叶兔 (草系)</strong>
              <small style="font-size:10px; color:#94a3b8; margin-top:4px">高血量高防御<br>擅长回复治愈</small>
            </div>
            <div class="starter-card" onclick="window.MainGame.chooseStarter('炎狐')">
              <div class="starter-icon" style="color:#f97316">🦊</div>
              <strong style="color:#f97316">炎狐 (火系)</strong>
              <small style="font-size:10px; color:#94a3b8; margin-top:4px">高速度高攻击<br>输出暴力输出</small>
            </div>
            <div class="starter-card" onclick="window.MainGame.chooseStarter('水龟')">
              <div class="starter-icon" style="color:#3b82f6">🐢</div>
              <strong style="color:#3b82f6">水龟 (水系)</strong>
              <small style="font-size:10px; color:#94a3b8; margin-top:4px">全面均衡发展<br>极高物理防御</small>
            </div>
          </div>
        </div>
      </div>
    `;
    wrapper.insertAdjacentHTML('beforeend', starterHTML);

    // 3. Poke Shop Overlay
    const shopHTML = `
      <div id="shop-overlay" class="modal-overlay">
        <div class="modal-card" style="max-width:400px">
          <h2 style="color:#3b82f6; border-bottom:1px solid #334155; padding-bottom:8px">怪兽商店 🛒</h2>
          <div style="text-align:right; font-size:12px; color:#fbbf24; margin:10px 0">
            我的金币: <span id="shop-gold">0</span> 💰
          </div>
          <div style="display:flex; flex-direction:column; gap:8px">
            <div class="shop-item-row">
              <div>
                <strong>精灵球 (Catch Ball)</strong><br>
                <small style="color:#a5f3fc; font-size:9px">价格: 50 金币</small>
              </div>
              <button class="opt-btn opt-purple" onclick="window.MainGame.buyItem('balls', 50)">购买 (拥有:<span id="shop-balls-count">0</span>)</button>
            </div>
            <div class="shop-item-row">
              <div>
                <strong>全效伤药 (Potion)</strong><br>
                <small style="color:#a5f3fc; font-size:9px">价格: 75 金币 (回复 50HP)</small>
              </div>
              <button class="opt-btn opt-purple" onclick="window.MainGame.buyItem('potions', 75)">购买 (拥有:<span id="shop-potions-count">0</span>)</button>
            </div>
          </div>
          <button class="opt-btn opt-red" style="margin-top:16px; width:100%" onclick="window.MainGame.closeShop()">离开商店</button>
        </div>
      </div>
    `;
    wrapper.insertAdjacentHTML('beforeend', shopHTML);

    // 4. Map Menu Overlay (Monsters List Manager)
    const mapMenuHTML = `
      <div id="map-monsters-overlay" class="modal-overlay">
        <div class="modal-card">
          <h2 style="color:#a855f7; border-bottom:1px solid #334155; padding-bottom:8px">我的怪兽队伍</h2>
          <p style="color:#94a3b8; font-size:10px; margin-top:4px">在此查看你的队伍。首位怪兽将作为首发出战。伤药剩余: <span id="menu-potion-cnt">0</span></p>
          <div id="menu-monsters-list" style="margin-top:16px; display:flex; flex-direction:column; gap:8px; max-height:240px; overflow-y:auto">
            <!-- Monsters list row dynamically populated -->
          </div>
          <button class="opt-btn opt-red" style="margin-top:16px; width:100%" onclick="document.getElementById('map-monsters-overlay').style.display='none'; window.MainGame.resumeMap()">关闭界面</button>
        </div>
      </div>
    `;
    wrapper.insertAdjacentHTML('beforeend', mapMenuHTML);

    // Expose Javascript functions to window for onclick handlers
    window.MainGame = {
      chooseStarter: (name) => {
        const starter = this.createMonsterInstance(name, 5);
        this.monstersTeam.push(starter);
        
        document.getElementById('starter-overlay').style.display = 'none';

        // Let the game start now! Clear inBattle (set by showStarterSelect) so the
        // update() movement loop resumes — without this the player could never move.
        this.gameStarted = true;
        this.inBattle = false;

        this.writeBattleLog(`你获得了初始伙伴 ${starter.fullName}！`);
        this.updateWorldHUD();
        this.spawnFloatingText(this.player.x, this.player.y, `获得了初始伙伴 ${name}! 🐰`, "#22c55e");
      },
      triggerBattleSwapMenu: () => {
        const swapBox = document.getElementById('bt-swap-grid-box');
        swapBox.innerHTML = '';
        
        this.monstersTeam.forEach((m, idx) => {
          const item = document.createElement('div');
          const isFainted = m.hp <= 0;
          const isActive = idx === this.battleState.playerActiveIdx;
          
          item.className = `bt-swap-item ${isFainted ? 'fainted' : ''}`;
          item.innerHTML = `
            <div style="font-size:32px">${m.icon}</div>
            <div style="flex:1">
              <strong>${m.fullName}</strong> ${isActive ? '<small style="color:#3b82f6">(战斗中)</small>' : ''}<br>
              <small>等级 ${m.level} / HP: ${m.hp}/${m.maxHp}</small>
            </div>
          `;
          
          if (!isFainted && !isActive) {
            item.onclick = () => this.switchBattleMonster(idx);
          }
          
          swapBox.appendChild(item);
        });
        
        document.getElementById('bt-swap-menu').style.display = 'flex';
      },
      triggerCatch: () => {
        this.throwPokeBall();
      },
      triggerRunAway: () => {
        this.runAway();
      },
      buyItem: (type, price) => {
        if (this.gold < price) {
          alert("金币不足！💰");
          return;
        }
        this.gold -= price;
        this.inventory[type]++;
        this.updateShopUI();
        this.updateWorldHUD();
      },
      closeShop: () => {
        document.getElementById('shop-overlay').style.display = 'none';
        this.inBattle = false; // resume map updates
      },
      usePotionOnMonster: (idx) => {
        if (this.inventory.potions <= 0) {
          alert("没有可用的全效伤药！");
          return;
        }
        const mon = this.monstersTeam[idx];
        if (mon.hp <= 0) {
          alert("全效伤药不能复活濒死的怪兽！请前往治疗泉。");
          return;
        }
        if (mon.hp >= mon.maxHp) {
          alert("该怪兽生命值已经是满的！");
          return;
        }
        
        this.inventory.potions--;
        mon.hp = Math.min(mon.maxHp, mon.hp + 50);
        
        // Refresh UI
        this.updateMonstersMenuUI();
        this.updateWorldHUD();
      },
      setFirstActive: (idx) => {
        if (idx === 0) return;
        if (this.monstersTeam[idx].hp <= 0) {
          alert("战败的怪兽不能作为首发！");
          return;
        }
        
        // Swap idx with 0
        const temp = this.monstersTeam[0];
        this.monstersTeam[0] = this.monstersTeam[idx];
        this.monstersTeam[idx] = temp;
        
        this.updateMonstersMenuUI();
      },
      resumeMap: () => {
        this.inBattle = false;
      }
    };
  },


  showStoryBanner(lines, duration = 3500, callback = null) {
    const existing = document.getElementById('story-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'story-banner';
    banner.style.cssText = `
      position:absolute; inset:0; z-index:100; display:flex; flex-direction:column;
      align-items:center; justify-content:center; pointer-events:none;
      background:rgba(0,0,0,0.72); font-family:'Segoe UI',monospace;
    `;
    banner.innerHTML = lines.map((l, i) =>
      `<div style="color:${i===0?'#fbbf24':'#e2e8f0'};font-size:${i===0?'20px':'15px'};
        font-weight:${i===0?'bold':'normal'};text-align:center;margin:4px 32px;
        text-shadow:0 0 12px rgba(251,191,36,0.6)">${l}</div>`
    ).join('');
    const gameContainer = document.querySelector('#game-container') || document.body;
    gameContainer.appendChild(banner);

    this.time.delayedCall(duration, () => {
      banner.style.transition = 'opacity 0.6s';
      banner.style.opacity = '0';
      this.time.delayedCall(600, () => { banner.remove(); if (callback) callback(); });
    });
  },


  showStarterSelect() {
    this.inBattle = true;
    this.showStoryBanner([
      '🌿 怪兽收集：像素物语',
      '一个充满奇妙怪兽的像素世界向你敞开大门。',
      '草地、洞窟、雪山……每一片土地都潜藏着传说中的伙伴。',
      '收集怪兽，磨砺羁绊，挑战道馆馆主，成为顶级大师！',
      '',
      '首先，选择你的初始伙伴——'
    ], 3000, () => {
      document.getElementById('starter-overlay').style.display = 'flex';
    });
  },


  openMonstersMenu() {
    this.inBattle = true;
    this.player.setVelocity(0);
    this.setPlayerIdleFrame();

    document.getElementById('map-monsters-overlay').style.display = 'flex';
    this.updateMonstersMenuUI();
  },


  updateMonstersMenuUI() {
    document.getElementById('menu-potion-cnt').textContent = this.inventory.potions;
    const box = document.getElementById('menu-monsters-list');
    box.innerHTML = '';

    this.monstersTeam.forEach((m, idx) => {
      const row = document.createElement('div');
      row.className = 'shop-item-row';
      row.style.background = '#1e293b';
      row.style.margin = '4px 0';
      row.style.padding = '8px 12px';
      
      const isFirst = idx === 0;
      const isFainted = m.hp <= 0;

      row.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; flex:1; text-align:left">
          <div style="font-size:32px">${m.icon}</div>
          <div>
            <strong>${m.fullName}</strong> <small style="color:#a5f3fc">(Lv ${m.level})</small><br>
            <span style="font-size:10px; color:${isFainted ? '#ef4444' : '#22c55e'}">${isFainted ? '战败 😵' : `HP: ${m.hp}/${m.maxHp}`}</span>
          </div>
        </div>
        <div style="display:flex; gap:6px">
          <button class="opt-btn opt-purple" style="font-size:10px; padding:4px 8px" onclick="window.MainGame.usePotionOnMonster(${idx})" ${this.inventory.potions <= 0 || isFainted ? 'disabled' : ''}>💊 使用伤药</button>
          <button class="opt-btn" style="font-size:10px; padding:4px 8px; background:#10b981" onclick="window.MainGame.setFirstActive(${idx})" ${isFirst || isFainted ? 'disabled' : ''}>👑 设为首发出战</button>
        </div>
      `;
      box.appendChild(row);
    });
  }
});
