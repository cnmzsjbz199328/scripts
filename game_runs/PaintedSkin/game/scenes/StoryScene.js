window.HuaPi = window.HuaPi || {};
window.HuaPi.StoryScene = class StoryScene extends Phaser.Scene {
  constructor() { super({ key: 'StoryScene' }); }

  preload() {
    const art = window.HuaPi.ART || { bg: {}, cg: {}, lihui: {} };
    for (const [id, src] of Object.entries(art.bg || {})) if (src) this.load.image(`bg:${id}`, src);
    for (const [id, src] of Object.entries(art.cg || {})) if (src) this.load.image(`cg:${id}`, src);
    for (const [id, src] of Object.entries(art.lihui || {})) if (src) this.load.image(`lihui:${id}`, src);
    for (const [id, src] of Object.entries(art.avatar || {})) if (src) this.load.image(`avatar:${id}`, src);
  }

  create() {
    const game = window.HuaPi.Game;
    game.scene = this;
    this.cameras.main.setBackgroundColor(window.HuaPi.Config.BACKGROUND);
    const story = window.HuaPi.STORY;
    const view = new window.HuaPi.ViewSystem(this, story, window.HuaPi.ART || {}, null);
    const params = new URLSearchParams(window.location.search);
    const paceRaw = Number(params.get('pace'));
    const paceMul = Number.isFinite(paceRaw) && paceRaw > 0 ? Math.min(5, Math.max(0.1, paceRaw)) : 1;
    const schedule = (fn, ms) => {
      const event = this.time.delayedCall(ms, fn);
      return { cancel: () => event.remove(false) };
    };
    const runtime = new window.StoryRuntime(story, view, {
      pace: window.HuaPi.Config.PACE,
      paceMul,
      fast: game.fast || params.has('fast'),
      schedule,
      onEvent: (event) => game.events.push({ ...event, at: performance.now() }),
    });
    view.runtime = runtime;
    view.panel.runtime = runtime;
    game.runtime = runtime;
    game.view = view;
    window.__gameState = runtime.state;
    view.panel.setHeart(runtime.state.vars.xin || 0);

    const vars = {};
    for (const entry of (params.get('vars') || '').split(',').filter(Boolean)) {
      const [name, value] = entry.split(':');
      if (name) vars[name] = Number(value);
    }
    const flags = (params.get('flags') || '').split(',').filter(Boolean);
    const node = params.get('node');
    if (node && story.nodes[node]) runtime.jump(node, { vars, flags });
    else runtime.start(story.startNodeId, { vars, flags });

    game.botChoices = (params.get('bot') || '').split(',').filter((part) => part !== '').map((part) => Number(part));
    game.botIndex = 0;
    game.autoBot = game.botChoices.length > 0;
    runtime.onEvent = (event) => {
      game.events.push({ ...event, at: performance.now() });
      if (event.type === 'choices' && game.autoBot) {
        const index = game.botChoices[game.botIndex++];
        this.time.delayedCall(0, () => runtime.choose(Number.isInteger(index) ? index : 0));
      }
    };

    const keyboard = this.input.keyboard;
    keyboard.on('keydown-SPACE', () => runtime.advance());
    keyboard.on('keydown-ENTER', () => runtime.advance());
    keyboard.on('keydown-RIGHT', () => runtime.advance());
    keyboard.on('keydown-ONE', () => runtime.choose(0));
    keyboard.on('keydown-TWO', () => runtime.choose(1));
    keyboard.on('keydown-THREE', () => runtime.choose(2));
    keyboard.on('keydown-R', () => { if (runtime.state.ended) window.location.reload(); });
    this.input.on('pointerdown', (pointer, currentlyOver = []) => {
      if (currentlyOver.length || runtime.state.choicesOpen || runtime.state.ended) return;
      runtime.advance();
    });
    this.events.once('shutdown', () => view.destroy());
  }
};
