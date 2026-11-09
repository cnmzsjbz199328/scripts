/* StoryRuntime — renderer-agnostic automatic branching narrative runner. */
(function (global) {
  'use strict';

  class StoryRuntime {
    constructor(story, view, options = {}) {
      this.story = story;
      this.view = view;
      this.options = options;
      this.paceMul = Number.isFinite(options.paceMul) ? options.paceMul : 1;
      this.pace = options.pace || { typeCps: 30, charMs: 150, tailMs: 900, minMs: 1800, cardMs: 2500, choiceDelay: 0 };
      this.fast = Boolean(options.fast);
      this.schedule = options.schedule || ((fn, ms) => {
        const id = setTimeout(fn, ms);
        return { cancel: () => clearTimeout(id) };
      });
      this.onEvent = options.onEvent || (() => {});
      this.seenCards = new Set();
      this.timer = null;
      this.typeTimer = null;
      this.pendingCardDone = null;
      const initialVars = {};
      for (const [key, def] of Object.entries(story.meta?.vars || {})) initialVars[key] = def.init;
      this.state = {
        nodeId: null, pov: 'wang', vars: initialVars, flags: new Set(), achs: new Set(), path: [],
        lineIdx: 0, typing: false, choicesOpen: false, choiceCount: 0, ended: false,
        endingId: null, bg: null, cg: null, stage: { L: null, C: null, R: null },
        started: false, cardActive: false,
      };
      this.visibleChoices = [];
    }

    start(nodeId = this.story.startNodeId, debug = {}) {
      if (this.state.started && !this.state.ended) return false;
      this.state.started = true;
      this.state.ended = false;
      this.state.endingId = null;
      this.state.flags = new Set(debug.flags || []);
      this.state.path = [];
      this.seenCards.clear();
      this.state.vars = {};
      for (const [key, def] of Object.entries(this.story.meta?.vars || {})) this.state.vars[key] = def.init;
      for (const [key, value] of Object.entries(debug.vars || {})) {
        const def = this.story.meta?.vars?.[key];
        if (def) this.state.vars[key] = Math.min(def.max, Math.max(def.min, Number(value)));
      }
      this.enter(nodeId);
      return true;
    }

    jump(nodeId, debug = {}) {
      if (!this.story.nodes?.[nodeId]) return false;
      this.cancelTimers();
      this.state.flags = new Set(debug.flags || []);
      for (const [key, def] of Object.entries(this.story.meta?.vars || {})) this.state.vars[key] = def.init;
      for (const [key, value] of Object.entries(debug.vars || {})) {
        const def = this.story.meta?.vars?.[key];
        if (def) this.state.vars[key] = Math.min(def.max, Math.max(def.min, Number(value)));
      }
      this.state.path = [];
      this.state.started = true;
      this.state.ended = false;
      this.state.endingId = null;
      this.enter(nodeId);
      return true;
    }

    enter(nodeId) {
      this.cancelTimers();
      const node = this.story.nodes[nodeId];
      if (!node) return this.fail(`Unknown story node: ${nodeId}`);
      this.state.nodeId = nodeId;
      this.state.lineIdx = 0;
      this.state.typing = false;
      this.state.choicesOpen = false;
      this.state.choiceCount = 0;
      this.state.cardActive = false;
      this.visibleChoices = [];
      this.state.pov = node.pov || this.state.pov || 'wang';
      this.state.bg = node.scene || this.state.bg;
      this.state.cg = node.cg || null;
      if (this.view.setPov) this.view.setPov(this.state.pov);
      if (node.scene && this.view.setScene) this.view.setScene(node.scene);
      if (this.view.setCG) this.view.setCG(node.cg || null);

      const before = { ...this.state.vars };
      this.applyEffects(node.onEnter);
      this.notifyVars(before);
      this.view.onAch?.(node.onEnter?.unlockAchievement);
      this.onEvent({ type: 'node', nodeId, pov: this.state.pov });

      if (node.card && !this.seenCards.has(node.card)) {
        this.seenCards.add(node.card);
        this.state.cardActive = true;
        this.pendingCardDone = () => {
          this.pendingCardDone = null;
          this.state.cardActive = false;
          this.view.hideCard?.();
          this.beginNode(node);
        };
        this.view.showCard?.(node.card, this.state.pov);
        this.timer = this.schedule(() => this.pendingCardDone?.(), this.delay(this.pace.cardMs ?? 2500));
        return;
      }
      this.beginNode(node);
    }

    beginNode(node) {
      if (Array.isArray(node.segments) && node.segments.length) {
        this.playSegment(node, 0);
        return;
      }
      this.followExit(node);
    }

    playSegment(node, index) {
      const segment = node.segments[index];
      if (!segment) return this.followExit(node);
      this.state.lineIdx = index;
      if (segment.stage) {
        if (segment.stage.clear) this.state.stage = { L: null, C: null, R: null };
        for (const slot of ['L', 'C', 'R']) {
          if (Object.hasOwn(segment.stage, slot)) this.state.stage[slot] = segment.stage[slot];
        }
        this.view.setStage?.(this.state.stage, segment.speaker || null, this.state.pov);
      } else if (segment.speaker) {
        this.view.setSpeaker?.(segment.speaker, this.state.pov);
      }
      if (segment.fx) this.view.fx?.(segment.fx);
      this.state.typing = true;
      this.view.typeLine?.(segment, () => { this.state.typing = false; });
      const textLength = Array.from(segment.text || '').length;
      const pace = this.pace;
      const wait = Math.max(pace.minMs ?? 1800, textLength * (pace.charMs ?? 150) + (pace.tailMs ?? 900));
      this.timer = this.schedule(() => this.finishSegment(node, index), this.delay(wait));
    }

    finishSegment(node, index) {
      this.cancelTimerOnly();
      if (this.state.typing) {
        this.view.completeTyping?.();
        this.state.typing = false;
      }
      if (index + 1 < (node.segments || []).length) {
        this.playSegment(node, index + 1);
        return;
      }
      this.followExit(node);
    }

    followExit(node) {
      if (node.isEnding) {
        this.state.ended = true;
        this.state.endingId = node.ending.id;
        this.state.choicesOpen = false;
        this.state.choiceCount = 0;
        this.view.showEnding?.(node);
        this.onEvent({ type: 'ending', endingId: node.ending.id });
        return;
      }
      if (node.next) return this.enter(node.next);
      if (node.routes) {
        const route = node.routes.find((candidate) => this.condition(candidate.if));
        if (!route) return this.fail(`No route matched in ${this.state.nodeId}`);
        return this.enter(route.next);
      }
      if (node.choices) {
        this.visibleChoices = node.choices.filter((choice) => !choice.if || this.condition(choice.if));
        this.state.choiceCount = this.visibleChoices.length;
        this.state.choicesOpen = true;
        if (this.state.choiceCount < 2) return this.fail(`Choice node ${this.state.nodeId} has fewer than two visible options`);
        this.view.showChoices?.(this.visibleChoices, (index) => this.choose(index));
        this.onEvent({ type: 'choices', nodeId: this.state.nodeId, count: this.state.choiceCount });
        return;
      }
      this.fail(`Node ${this.state.nodeId} has no exit`);
    }

    advance() {
      if (!this.state.started || this.state.ended || this.state.choicesOpen) return false;
      if (this.state.cardActive) {
        this.cancelTimerOnly();
        this.pendingCardDone?.();
        return true;
      }
      if (this.state.typing) {
        this.cancelTypeTimer();
        this.view.completeTyping?.();
        this.state.typing = false;
        return true;
      }
      const node = this.story.nodes[this.state.nodeId];
      if (!node) return false;
      this.cancelTimerOnly();
      this.finishSegment(node, this.state.lineIdx);
      return true;
    }

    choose(index) {
      if (!this.state.choicesOpen || index < 0 || index >= this.visibleChoices.length) return false;
      const node = this.story.nodes[this.state.nodeId];
      const choice = this.visibleChoices[index];
      this.state.choicesOpen = false;
      this.state.choiceCount = 0;
      this.view.selectChoice?.(index);
      const before = { ...this.state.vars };
      this.applyEffects(choice.changes);
      this.notifyVars(before);
      if (choice.text?.startsWith('「') && choice.echo !== false) {
        this.view.echoChoice?.(choice.text, this.state.pov);
      }
      this.state.path.push({ nodeId: node.id || this.state.nodeId, choiceIndex: index, text: choice.text });
      const delay = choice.text?.startsWith('「') && choice.echo !== false ? this.delay(700) : this.delay(280);
      this.timer = this.schedule(() => this.enter(choice.next), delay);
      this.onEvent({ type: 'choice', nodeId: this.state.nodeId, choiceIndex: index, next: choice.next });
      return true;
    }

    condition(expression) {
      const exp = String(expression || '').trim();
      if (exp === 'default') return true;
      let match = exp.match(/^hasFlag\s+'([^']+)'$/);
      if (match) return this.state.flags.has(match[1]);
      match = exp.match(/^!hasFlag\s+'([^']+)'$/);
      if (match) return !this.state.flags.has(match[1]);
      match = exp.match(/^([A-Za-z_]\w*)\s*(>=|<=|==|>|<)\s*(-?\d+(?:\.\d+)?)$/);
      if (!match) return false;
      const [, name, op, raw] = match;
      const left = Number(this.state.vars[name]);
      const right = Number(raw);
      return ({ '>=': left >= right, '<=': left <= right, '>': left > right, '<': left < right, '==': left === right })[op];
    }

    applyEffects(effects) {
      if (!effects) return;
      for (const [name, amount] of Object.entries(effects.add || {})) {
        const def = this.story.meta.vars[name];
        if (!def) continue;
        this.state.vars[name] = Math.max(def.min, Math.min(def.max, this.state.vars[name] + amount));
      }
      for (const [name, value] of Object.entries(effects.set || {})) {
        const def = this.story.meta.vars[name];
        if (!def) continue;
        this.state.vars[name] = Math.max(def.min, Math.min(def.max, value));
      }
      const newFlags = effects.addFlag == null ? [] : Array.isArray(effects.addFlag) ? effects.addFlag : [effects.addFlag];
      for (const flag of newFlags) this.state.flags.add(flag);
      if (effects.unlockAchievement) {
        this.state.achs.add(effects.unlockAchievement);
        this.view.onAch?.(effects.unlockAchievement);
      }
    }

    notifyVars(before) {
      const delta = {};
      for (const [key, value] of Object.entries(this.state.vars)) if (value !== before[key]) delta[key] = value - before[key];
      if (Object.keys(delta).length) this.view.onVars?.(delta, { ...this.state.vars }, this.state.pov);
    }

    delay(ms) { return Math.max(0, Math.round(ms * (this.fast ? 0.02 : this.paceMul))); }
    cancelTimerOnly() { if (this.timer?.cancel) this.timer.cancel(); this.timer = null; }
    cancelTypeTimer() { if (this.typeTimer?.cancel) this.typeTimer.cancel(); this.typeTimer = null; this.view.cancelTyping?.(); }
    cancelTimers() {
      this.cancelTimerOnly();
      this.cancelTypeTimer();
      this.pendingCardDone = null;
    }
    fail(message) { this.onEvent({ type: 'error', message }); console.error(`[StoryRuntime] ${message}`); }

    probe() {
      const type = this.story.nodes[this.state.nodeId]?.ending?.type;
      return {
        started: this.state.started, nodeId: this.state.nodeId, pov: this.state.pov,
        vars: { ...this.state.vars }, flags: [...this.state.flags], achievements: [...this.state.achs],
        lineIdx: this.state.lineIdx, typing: this.state.typing, choicesOpen: this.state.choicesOpen,
        choiceCount: this.state.choiceCount, ended: this.state.ended, endingId: this.state.endingId,
        won: type === 'normal' || type === 'true', pathLen: this.state.path.length,
        bg: this.state.bg, cg: this.state.cg, stage: { ...this.state.stage },
      };
    }
  }

  global.StoryRuntime = StoryRuntime;
})(window);
