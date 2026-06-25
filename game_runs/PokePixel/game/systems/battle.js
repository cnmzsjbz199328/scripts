/* PokePixel — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  // --- Battle System Logic ---
  startBattle(type, enemyData) {
    this.inBattle = true;
    
    // Select player's first alive monster
    let activePlayerIdx = this.monstersTeam.findIndex(m => m.hp > 0);
    if (activePlayerIdx === -1) {
      alert("没有可以战斗的怪兽！请前往治疗泉回复。");
      this.inBattle = false;
      return;
    }

    // Hide world HUD and show battle screen
    const hudEl = document.getElementById('hud');
    if (hudEl) hudEl.style.display = 'none';
    const battleOverlay = document.getElementById('battle-overlay');
    if (battleOverlay) {
      battleOverlay.style.display = 'flex';
    }

    const openingLog = type === 'wild'
      ? `野生的 ${enemyData.name} 出现了！它露出了警觉的眼神！`
      : `${enemyData.name} 发起了挑战！`;

    this.battleState = {
      type: type, // 'wild' or 'trainer'
      enemyName: enemyData.name,
      enemyTeam: enemyData.monsters,
      enemyActiveIdx: 0,
      playerActiveIdx: activePlayerIdx,
      npcRef: enemyData.npcRef,
      logs: [openingLog]
    };

    this.initBattleUI();
    this.writeBattleLog(openingLog);
  },


  initBattleUI() {
    const state = this.battleState;
    const playerActive = this.monstersTeam[state.playerActiveIdx];
    const enemyActive = state.enemyTeam[state.enemyActiveIdx];

    // Catch button visibility (only wild encounters)
    const catchBtn = document.getElementById('bt-catch-btn');
    if (catchBtn) {
      catchBtn.style.display = state.type === 'wild' ? 'block' : 'none';
    }

    this.renderBattleMonsters();
  },


  renderBattleMonsters() {
    const state = this.battleState;
    const pActive = this.monstersTeam[state.playerActiveIdx];
    const eActive = state.enemyTeam[state.enemyActiveIdx];

    // Player Card
    document.getElementById('bt-p-name').textContent = pActive.fullName;
    document.getElementById('bt-p-level').textContent = pActive.level;
    document.getElementById('bt-p-type').textContent = pActive.type;
    document.getElementById('bt-p-hp-text').textContent = `${pActive.hp}/${pActive.maxHp}`;
    
    const pHpPct = Math.max(0, (pActive.hp / pActive.maxHp) * 100);
    const pHpBar = document.getElementById('bt-p-hp-bar');
    pHpBar.style.width = `${pHpPct}%`;
    pHpBar.style.backgroundColor = pHpPct < 25 ? '#ef4444' : pHpPct < 50 ? '#eab308' : '#22c55e';

    const pXpPct = Math.max(0, (pActive.exp / (pActive.level * 100)) * 100);
    document.getElementById('bt-p-xp-bar').style.width = `${pXpPct}%`;
    this.applyMonsterAvatar(document.getElementById('bt-p-avatar'), pActive, true); // player faces right

    // Enemy Card
    document.getElementById('bt-e-name').textContent = eActive.fullName;
    document.getElementById('bt-e-level').textContent = eActive.level;
    document.getElementById('bt-e-type').textContent = eActive.type;
    document.getElementById('bt-e-hp-text').textContent = `${eActive.hp}/${eActive.maxHp}`;

    const eHpPct = Math.max(0, (eActive.hp / eActive.maxHp) * 100);
    const eHpBar = document.getElementById('bt-e-hp-bar');
    eHpBar.style.width = `${eHpPct}%`;
    eHpBar.style.backgroundColor = eHpPct < 25 ? '#ef4444' : eHpPct < 50 ? '#eab308' : '#22c55e';
    this.applyMonsterAvatar(document.getElementById('bt-e-avatar'), eActive, false); // enemy faces left (toward player)

    // Skills Grid
    const skillsGrid = document.getElementById('bt-skills-grid');
    skillsGrid.innerHTML = '';
    pActive.skills.forEach((skill, index) => {
      const btn = document.createElement('button');
      btn.className = 'skill-btn';
      btn.innerHTML = `${skill.name}<br><small style="font-size:9px;opacity:0.8">${skill.type} / 威力 ${skill.power}</small>`;
      btn.onclick = () => this.executeBattleTurn(index);
      skillsGrid.appendChild(btn);
    });
  },


  // Render a battle avatar: animated pet spritesheet if the monster has one,
  // otherwise fall back to its emoji icon. faceRight flips the (left-facing) sheet.
  applyMonsterAvatar(el, monster, faceRight) {
    if (!el) return;
    if (monster.sprite) {
      el.textContent = '';
      let s = el.querySelector('.mon-sprite');
      if (!s) {
        s = document.createElement('div');
        s.className = 'mon-sprite';
        el.appendChild(s);
      }
      s.style.backgroundImage = `url(assets/monsters/${monster.sprite}.webp)`;
      s.style.transform = faceRight ? 'scaleX(-1)' : 'none';
    } else {
      const s = el.querySelector('.mon-sprite');
      if (s) s.remove();
      el.textContent = monster.icon;
      el.style.color = monster.color;
    }
  },


  writeBattleLog(text) {
    const logBox = document.getElementById('bt-log-box');
    if (logBox) {
      const p = document.createElement('p');
      p.textContent = text;
      p.style.margin = '4px 0';
      logBox.appendChild(p);
      logBox.scrollTop = logBox.scrollHeight;
    }
  },


  executeBattleTurn(playerSkillIdx) {
    const state = this.battleState;
    const playerMon = this.monstersTeam[state.playerActiveIdx];
    const enemyMon = state.enemyTeam[state.enemyActiveIdx];
    const skill = playerMon.skills[playerSkillIdx];

    // Determine move order based on speed
    const playerFirst = playerMon.speed >= enemyMon.speed;

    // Disable buttons during animation
    this.toggleBattleButtons(false);

    if (playerFirst) {
      // Player attacks first
      this.executeAction(playerMon, enemyMon, skill, 'player', () => {
        if (enemyMon.hp <= 0) {
          this.handleEnemyFainted();
        } else {
          // Enemy retaliates
          const enemySkill = enemyMon.skills[Math.floor(Math.random() * enemyMon.skills.length)];
          this.executeAction(enemyMon, playerMon, enemySkill, 'enemy', () => {
            if (playerMon.hp <= 0) {
              this.handlePlayerFainted();
            } else {
              this.toggleBattleButtons(true);
            }
          });
        }
      });
    } else {
      // Enemy attacks first
      const enemySkill = enemyMon.skills[Math.floor(Math.random() * enemyMon.skills.length)];
      this.executeAction(enemyMon, playerMon, enemySkill, 'enemy', () => {
        if (playerMon.hp <= 0) {
          this.handlePlayerFainted();
        } else {
          // Player attacks second
          this.executeAction(playerMon, enemyMon, skill, 'player', () => {
            if (enemyMon.hp <= 0) {
              this.handleEnemyFainted();
            } else {
              this.toggleBattleButtons(true);
            }
          });
        }
      });
    }
  },


  executeAction(attacker, defender, skill, attackerSide, onComplete) {
    const avatarId = attackerSide === 'player' ? 'bt-p-avatar' : 'bt-e-avatar';
    const defenderAvatarId = attackerSide === 'player' ? 'bt-e-avatar' : 'bt-p-avatar';
    const avatarEl = document.getElementById(avatarId);
    const defenderEl = document.getElementById(defenderAvatarId);

    // Play attack hop animation
    if (avatarEl) {
      avatarEl.classList.add('battle-hop');
      setTimeout(() => avatarEl.classList.remove('battle-hop'), 300);
    }

    this.writeBattleLog(`${attacker.fullName} 使用了 ${skill.name}!`);

    setTimeout(() => {
      if (skill.effect === 'damage' || skill.effect === 'leech') {
        // Calculate type multiplier
        let effectiveness = 1;
        if (TYPE_EFFECTIVENESS[skill.type] && TYPE_EFFECTIVENESS[skill.type][defender.type]) {
          effectiveness = TYPE_EFFECTIVENESS[skill.type][defender.type];
        }

        const baseDmg = skill.power * (attacker.attack / defender.defense) * 0.4;
        const randomMultiplier = 0.85 + Math.random() * 0.3;
        let damage = Math.floor(baseDmg * effectiveness * randomMultiplier) + 2;

        defender.hp = Math.max(0, defender.hp - damage);

        // Shake animation for taking damage
        if (defenderEl) {
          defenderEl.classList.add('battle-shake');
          setTimeout(() => defenderEl.classList.remove('battle-shake'), 400);
        }

        this.writeBattleLog(`对 ${defender.fullName} 造成了 ${damage} 点伤害！`);
        
        if (effectiveness > 1.1) {
          this.writeBattleLog("效果拔群！⚡");
        } else if (effectiveness < 0.9) {
          this.writeBattleLog("效果不佳... 🛡️");
        }

        if (skill.effect === 'leech') {
          const leechAmount = Math.floor(damage * 0.5);
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + leechAmount);
          this.writeBattleLog(`${attacker.fullName} 吸取了 ${leechAmount} 点生命！`);
        }

      } else if (skill.effect === 'heal') {
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + skill.healAmount);
        this.writeBattleLog(`${attacker.fullName} 恢复了 ${skill.healAmount} 点生命！`);
      } else if (skill.effect === 'buff_atk') {
        attacker.attack = Math.floor(attacker.attack * 1.3);
        this.writeBattleLog(`${attacker.fullName} 的攻击力提升了！🚀`);
      } else if (skill.effect === 'buff_def') {
        attacker.defense = Math.floor(attacker.defense * 1.3);
        this.writeBattleLog(`${attacker.fullName} 的防御力提升了！🛡️`);
      } else if (skill.effect === 'debuff_atk') {
        defender.attack = Math.max(5, Math.floor(defender.attack * 0.7));
        this.writeBattleLog(`${defender.fullName} 的攻击力降低了！📉`);
      }

      // Update UI displays
      this.renderBattleMonsters();
      setTimeout(onComplete, 800);
    }, 500);
  },


  toggleBattleButtons(enabled) {
    const buttons = document.querySelectorAll('#battle-overlay button');
    buttons.forEach(b => {
      b.disabled = !enabled;
    });
  },


  handlePlayerFainted() {
    const state = this.battleState;
    const playerMon = this.monstersTeam[state.playerActiveIdx];
    this.writeBattleLog(`${playerMon.fullName} 战败了！😢`);

    setTimeout(() => {
      // Find another alive monster
      const nextIdx = this.monstersTeam.findIndex((m, idx) => idx !== state.playerActiveIdx && m.hp > 0);
      if (nextIdx !== -1) {
        state.playerActiveIdx = nextIdx;
        this.writeBattleLog(`派出 ${this.monstersTeam[nextIdx].fullName}！`);
        this.renderBattleMonsters();
        this.toggleBattleButtons(true);
      } else {
        // Player completely defeated (all fainted)
        this.writeBattleLog("你队伍中的怪兽已全部战败... 😵");
        setTimeout(() => this.endBattle(false), 1200);
      }
    }, 800);
  },


  handleEnemyFainted() {
    const state = this.battleState;
    const enemyMon = state.enemyTeam[state.enemyActiveIdx];
    this.writeBattleLog(`击败了 ${enemyMon.fullName}！🎉`);

    setTimeout(() => {
      // Player gains EXP
      const activeMon = this.monstersTeam[state.playerActiveIdx];
      const expGain = enemyMon.level * 18;
      activeMon.exp += expGain;
      this.writeBattleLog(`${activeMon.fullName} 获得了 ${expGain} 点经验值！`);

      // Check level up
      const expNeeded = activeMon.level * 100;
      if (activeMon.exp >= expNeeded) {
        activeMon.level++;
        activeMon.exp -= expNeeded;
        activeMon.maxHp += 5;
        activeMon.attack += 2;
        activeMon.defense += 2;
        activeMon.speed += 2;
        activeMon.hp = activeMon.maxHp; // fully heal on level up
        this.writeBattleLog(`🌟 太棒了！${activeMon.fullName} 升级到了 等级 ${activeMon.level}！`);
      }

      // Check next enemy monster
      const nextEnemyIdx = state.enemyActiveIdx + 1;
      if (nextEnemyIdx < state.enemyTeam.length) {
        state.enemyActiveIdx = nextEnemyIdx;
        this.writeBattleLog(`${state.enemyName} 派出了 ${state.enemyTeam[nextEnemyIdx].fullName}！`);
        this.renderBattleMonsters();
        this.toggleBattleButtons(true);
      } else {
        // Defeated all enemies!
        this.writeBattleLog(`战胜了 ${state.enemyName}！✨`);
        setTimeout(() => this.endBattle(true), 1200);
      }
    }, 800);
  },


  throwPokeBall() {
    const state = this.battleState;
    if (state.type !== 'wild') return;

    if (this.inventory.balls <= 0) {
      this.writeBattleLog("你的精灵球不足！🎒");
      return;
    }

    this.inventory.balls--;
    this.toggleBattleButtons(false);
    this.writeBattleLog("扔出了精灵球！🔴");

    const enemyMon = state.enemyTeam[state.enemyActiveIdx];
    const ballEl = document.getElementById('bt-e-avatar');
    
    if (ballEl) {
      ballEl.classList.add('battle-catch-shake');
    }

    setTimeout(() => {
      // Catch rate calculation: (1 - hp/maxHp) + bonus
      const hpRatio = enemyMon.hp / enemyMon.maxHp;
      const catchChance = (1 - hpRatio) * 0.75 + 0.15; // lower hp -> higher chance (up to 90%)

      if (ballEl) {
        ballEl.classList.remove('battle-catch-shake');
      }

      if (Math.random() < catchChance) {
        // Success
        this.writeBattleLog(`成功捕获 ${enemyMon.fullName}！🎉`);
        
        // Add to team or storage
        const capturedInstance = JSON.parse(JSON.stringify(enemyMon));
        capturedInstance.fullName = capturedInstance.fullName.replace("野生 ", "");
        
        if (this.monstersTeam.length < 6) {
          this.monstersTeam.push(capturedInstance);
          this.writeBattleLog(`${capturedInstance.fullName} 已加入你的战斗队伍！`);
        } else {
          this.monsterStorage.push(capturedInstance);
          this.writeBattleLog(`队伍已满，${capturedInstance.fullName} 被送往电脑仓库！`);
        }

        setTimeout(() => this.endBattle(true, true), 1200);
      } else {
        // Break free
        this.writeBattleLog(`差一点！${enemyMon.fullName} 从精灵球挣脱了！💨`);
        
        // Enemy counter attacks immediately
        setTimeout(() => {
          const enemySkill = enemyMon.skills[Math.floor(Math.random() * enemyMon.skills.length)];
          const playerMon = this.monstersTeam[state.playerActiveIdx];
          this.executeAction(enemyMon, playerMon, enemySkill, 'enemy', () => {
            if (playerMon.hp <= 0) {
              this.handlePlayerFainted();
            } else {
              this.toggleBattleButtons(true);
            }
          });
        }, 800);
      }
    }, 1500);
  },


  switchBattleMonster(teamIdx) {
    const state = this.battleState;
    if (teamIdx === state.playerActiveIdx) return;
    const mon = this.monstersTeam[teamIdx];
    if (mon.hp <= 0) return;

    // Close swap menu
    document.getElementById('bt-swap-menu').style.display = 'none';
    this.writeBattleLog(`收回了 ${this.monstersTeam[state.playerActiveIdx].fullName}！`);
    
    setTimeout(() => {
      state.playerActiveIdx = teamIdx;
      this.writeBattleLog(`派出 ${mon.fullName}！`);
      this.renderBattleMonsters();
      this.toggleBattleButtons(false);

      // Enemy counter attacks because switching takes a turn!
      const enemyActive = state.enemyTeam[state.enemyActiveIdx];
      const enemySkill = enemyActive.skills[Math.floor(Math.random() * enemyActive.skills.length)];
      
      this.executeAction(enemyActive, mon, enemySkill, 'enemy', () => {
        if (mon.hp <= 0) {
          this.handlePlayerFainted();
        } else {
          this.toggleBattleButtons(true);
        }
      });
    }, 800);
  },


  runAway() {
    if (this.battleState.type !== 'wild') return;
    
    this.writeBattleLog("正在尝试逃跑...");
    this.toggleBattleButtons(false);

    setTimeout(() => {
      if (Math.random() < 0.6) {
        this.writeBattleLog("成功逃跑！💨");
        setTimeout(() => this.endBattle(true, false, true), 800);
      } else {
        this.writeBattleLog("逃跑失败！");
        
        // Enemy attacks
        setTimeout(() => {
          const state = this.battleState;
          const enemyMon = state.enemyTeam[state.enemyActiveIdx];
          const enemySkill = enemyMon.skills[Math.floor(Math.random() * enemyMon.skills.length)];
          const playerMon = this.monstersTeam[state.playerActiveIdx];
          this.executeAction(enemyMon, playerMon, enemySkill, 'enemy', () => {
            if (playerMon.hp <= 0) {
              this.handlePlayerFainted();
            } else {
              this.toggleBattleButtons(true);
            }
          });
        }, 800);
      }
    }, 800);
  },


  endBattle(win, captured = false, ranAway = false) {
    const state = this.battleState;
    document.getElementById('battle-overlay').style.display = 'none';
    document.getElementById('bt-log-box').innerHTML = '';
    const hudEl = document.getElementById('hud');
    if (hudEl) hudEl.style.display = '';
    
    if (win) {
      if (ranAway) {
        // Just escape
      } else if (captured) {
        // Capturing award
        this.gold += 20;
      } else {
        // Victory award
        let goldReward = 50 + state.enemyTeam.length * 40;
        if (state.type === 'trainer') {
          goldReward *= 2;
          state.npcRef.setData('defeated', true);
          
          // Tint NPC grey to show defeated
          state.npcRef.setTint(0x777777);

          // Story Quest updates
          if (state.npcRef.name === 'TrainerJack') {
            window.GameHUD?.setObjective("探索幽暗洞窟，寻找并击败训练师 Rocky！⛰️");
            this.gold += 100;
          } else if (state.npcRef.name === 'TrainerRocky') {
            window.GameHUD?.setObjective("穿过雪山，寻找道馆馆主烈达进行终极对决！❄️");
            this.gold += 200;
          } else if (state.npcRef.name === 'TrainerYeti') {
            this.gold += 300;
          } else if (state.npcRef.name === 'GymLeader') {
            // Defeated Gym Leader! Player Wins!
            this.gymLeaderDefeated = true;
            this.showVictoryScreen();
          }
        }
        this.gold += goldReward;
        this.spawnFloatingText(this.player.x, this.player.y, `胜利！获得金币 +${goldReward} 💰`, "#eab308");
      }
    } else {
      // Player blackout (death)
      this.playerDefeated = true;
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.time.delayedCall(800, () => {
        // Teleport back to start point
        this.player.setPosition(224, 224);
        
        // Heal team
        this.monstersTeam.forEach(m => {
          m.hp = m.maxHp;
        });

        // Deduct money penalty (20% of current gold)
        const loss = Math.floor(this.gold * 0.2);
        this.gold -= loss;

        this.cameras.main.fadeIn(800);
        this.playerDefeated = false;
        
        this.spawnFloatingText(this.player.x, this.player.y, `战斗失败！黑屏传送回泉水，金币损失 -${loss} 💰`, "#ef4444");
        this.updateWorldHUD();
      });
    }

    this.updateWorldHUD();
    this.inBattle = false;
    this.battleState = null;
  },


  showVictoryScreen() {
    this.inBattle = true;
    this.gameStarted = false;
    this.player.setVelocity(0);
    this.setPlayerIdleFrame();

    window.GameHUD?.showGameOver(true, [
      '🏆 传奇诞生！',
      '你击败了从未败北的道馆馆主 烈达，',
      '用羁绊的力量征服了草地、洞窟、雪山与顶峰道馆。',
      '整个像素大陆将永远铭记这位怪兽训练大师的名字！'
    ].join('\n'));
  }
});
