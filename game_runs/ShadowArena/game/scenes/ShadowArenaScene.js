/* ShadowArena — §4B 原型分割；方法体逐字保留。 */
class ShadowArenaScene extends Phaser.Scene {
  constructor() { super('ShadowArenaScene'); }


  preload() {
    this.load.svg('stage', 'assets/svg/stage.svg', { width: GAME_W, height: GAME_H });
    this.load.svg('shuriken', 'assets/svg/shuriken.svg', { width: 24, height: 24 });
    this.load.svg('qiwave', 'assets/svg/qiwave.svg', { width: 44, height: 36 });
    for (const id of ROSTER)
      for (const [act, a] of Object.entries(ACT))
        for (let i = 0; i < a.n; i++)
          this.load.svg(`${id}_${act}_${i}`, `assets/svg/${id}_${act}_${i}.svg`, { width: FRAME_W, height: FRAME_H });
  }


  create() {
    this.add.image(0, 0, 'stage').setOrigin(0, 0).setDepth(-100);
    for (const id of ROSTER) {
      for (const [act, a] of Object.entries(ACT)) {
        const key = `${id}_${act}`;
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key, frameRate: a.fps, repeat: a.loop ? -1 : 0,
          frames: Array.from({ length: a.n }, (_, i) => ({ key: `${id}_${act}_${i}` })),
        });
      }
    }

    this.floor = this.add.rectangle(GAME_W / 2, FLOOR_Y + 40, GAME_W, 80, 0x000000, 0);
    this.physics.add.existing(this.floor, true);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,J,K,L,SPACE,ENTER');

    this.phase = 'select';
    this.projectiles = this.physics.add.group({ allowGravity: false });
    this._buildSelect();
    if (window.GameHUD) window.GameHUD.onStart(() => {});

    // ── game-playtest 探针（俯视模式上报；select 阶段自动选人开打；fight 阶段逼近出拳）──
    window.__probe = () => {
      if (this.phase === 'select') {
        this._selectConfirm();   // 逐 tick 推进：先选 P1，再选 P2 → 开打
        return { x: 0, y: 0, vx: 0, onGround: true, hp: 1, maxHp: 1, score: 0, goalScore: 1, act: 0, deaths: 0, deathBudget: 1, won: false, lost: false, cardActive: false, started: false, nextGoalX: 0, worldW: GAME_W, cellX: GAME_W, moveX: 0, moveY: 0, attack: false, dangerNow: false, dangerAhead: false };
      }
      const a = this.p1, e = this.p2;
      if (!a || !e) return null;
      const sp = a.sprite, dx = e.sprite.x - sp.x, dist = Math.abs(dx);
      const inRange = dist < (a.def.reach + 6);
      return {
        x: sp.x, y: sp.y, vx: sp.body.velocity.x, onGround: sp.body.blocked.down,
        hp: a.hp, maxHp: a.maxHp, score: (e.maxHp - e.hp), goalScore: e.maxHp,
        act: 1, deaths: 0, deathBudget: 1,
        won: !!this._won, lost: !!this._lost,
        cardActive: false, started: this.phase === 'fight',
        nextGoalX: e.sprite.x, worldW: GAME_W, cellX: GAME_W,
        moveX: inRange ? 0 : Math.sign(dx), moveY: 0, attack: inRange,
        dangerNow: false, dangerAhead: false,
      };
    };
  }


  update(time) {
    if (this.phase === 'select') {
      if (Phaser.Input.Keyboard.JustDown(this.keys.A) || Phaser.Input.Keyboard.JustDown(this.cursors.left)) this._selectMove(-1);
      if (Phaser.Input.Keyboard.JustDown(this.keys.D) || Phaser.Input.Keyboard.JustDown(this.cursors.right)) this._selectMove(1);
      if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.J) || Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) this._selectConfirm();
      return;
    }
    if (this.phase === 'over') { this._fighterPhysics(); return; }
    if (this.phase !== 'fight') return;

    this._faceEachOther();
    this._controlPlayer();
    this._controlAI(time);
    for (const f of this.fighters) this._resolveMelee(f);
    for (const f of this.fighters)
      if (['punch', 'kick', 'hurt', 'special'].includes(f.state) && time > f.stateUntil) this._setState(f, 'idle');
    this._projectiles();
    this._fighterPhysics();
  }
}
