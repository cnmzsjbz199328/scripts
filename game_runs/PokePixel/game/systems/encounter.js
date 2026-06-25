/* PokePixel — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  triggerRandomEncounter(area) {
    this.player.setVelocity(0);
    this.setPlayerIdleFrame();

    // Trigger visual screen flash + burst effect
    this.cameras.main.flash(400, 255, 255, 255);
    this.spawnBurst(this.player.x, this.player.y, 0xfde047, 16, 80);

    // Pick wild monster based on area
    let possibleMonsters = [];
    if (area === 'Grassland') {
      possibleMonsters = ['叶兔', '炎狐', '水龟'];
    } else if (area === 'Cave') {
      possibleMonsters = ['雷鼠', '岩偶', '影蝠'];
    } else if (area === 'SnowyMountain') {
      possibleMonsters = ['霜狼', '冰晶兽'];
    }

    const monsterName = possibleMonsters[Math.floor(Math.random() * possibleMonsters.length)];
    const wildLevel = Math.floor(Math.random() * 4) + (area === 'Grassland' ? 3 : area === 'Cave' ? 7 : 11);
    
    const monsterInstance = this.createMonsterInstance(monsterName, wildLevel);

    // Stop physics and movement, and trigger battle
    this.time.delayedCall(400, () => {
      this.startBattle('wild', {
        name: "野生 " + monsterInstance.name,
        monsters: [monsterInstance]
      });
    });
  },


  createMonsterInstance(name, level) {
    const template = MONSTER_DB[name];
    if (!template) return null;

    const scale = 1 + (level - 5) * 0.08; // grow stats by level
    const maxHp = Math.floor(template.maxHp * scale);
    const attack = Math.floor(template.attack * scale);
    const defense = Math.floor(template.defense * scale);
    const speed = Math.floor(template.speed * scale);

    return {
      name: name,
      fullName: template.name,
      type: template.type,
      level: level,
      maxHp: maxHp,
      hp: maxHp,
      attack: attack,
      defense: defense,
      speed: speed,
      exp: 0,
      icon: template.icon,
      sprite: template.sprite, // optional animated pet spritesheet key (assets/monsters/<key>.webp)
      color: template.color,
      skills: JSON.parse(JSON.stringify(template.skills))
    };
  },


  startNpcTrainerBattle(npc) {
    this.player.setVelocity(0);
    this.setPlayerIdleFrame();

    const trainerSpeeches = {
      TrainerJack: [
        '⚔️ 训练师 Jack 发起挑战！',
        '"我在草地上训练了好几个月……"',
        '"你这个新人，准备见识一下我的水龟和叶兔！"'
      ],
      TrainerRocky: [
        '⚔️ 训练师 Rocky 拦住了你的去路！',
        '"洞窟是我的主场——岩石与闪电，无人能敌！"',
        '"击败我，才配进入雪山！"'
      ],
      TrainerYeti: [
        '⚔️ 训练师 Yeti 从暴风雪中现身！',
        '"终于有人闯到这里了……寒冰是我的礼物。"',
        '"我的霜狼和冰晶兽会让你领略极地的力量！"'
      ],
      GymLeader: [
        '🏆 道馆馆主 烈达 踏前一步！',
        '"年轻的训练师……你能走到这里，已经让我刮目相看。"',
        '"但这里是顶峰——我的极光龙不曾败北。"',
        '"拿出你最强的伙伴，用羁绊之力挑战极限！"'
      ]
    };

    let enemyTeam = [];
    if (npc.name === 'TrainerJack') {
      enemyTeam = [
        this.createMonsterInstance('水龟', 6),
        this.createMonsterInstance('叶兔', 6)
      ];
    } else if (npc.name === 'TrainerRocky') {
      enemyTeam = [
        this.createMonsterInstance('岩偶', 9),
        this.createMonsterInstance('雷鼠', 10)
      ];
    } else if (npc.name === 'TrainerYeti') {
      enemyTeam = [
        this.createMonsterInstance('霜狼', 13),
        this.createMonsterInstance('冰晶兽', 14)
      ];
    } else if (npc.name === 'GymLeader') {
      enemyTeam = [
        this.createMonsterInstance('冰晶兽', 18),
        this.createMonsterInstance('极光龙', 20)
      ];
    }

    const speech = trainerSpeeches[npc.name];
    const flashDuration = npc.name === 'GymLeader' ? 800 : 500;
    this.cameras.main.flash(flashDuration, 244, 63, 94);

    if (speech) {
      this.showStoryBanner(speech, npc.name === 'GymLeader' ? 3500 : 2500, () => {
        this.startBattle('trainer', {
          name: npc.name === 'GymLeader' ? "道馆馆主 烈达" : `训练师 ${npc.name}`,
          npcRef: npc,
          monsters: enemyTeam
        });
      });
    } else {
      this.time.delayedCall(500, () => {
        this.startBattle('trainer', {
          name: `训练师 ${npc.name}`,
          npcRef: npc,
          monsters: enemyTeam
        });
      });
    }
  }
});
