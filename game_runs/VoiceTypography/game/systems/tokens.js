"use strict";

// Token lifecycle: segmentation → live display → background commit
Object.assign(Stage.prototype, {

  tokenize(text) {
    text = (text || '').trim();
    if (!text) return [];
    return this.lang.startsWith('zh') ? Array.from(text) : text.split(/\s+/).filter(Boolean);
  },

  makeToken(text) {
    // Markov chain transition table: current effect → [P(pulse), P(tilt), P(shake)]
    // Encourages runs of the same effect rather than every-char random switching.
    const T = {
      pulse: [0.65, 0.25, 0.10],
      tilt:  [0.30, 0.50, 0.20],
      shake: [0.35, 0.20, 0.45]
    };
    const probs = T[this._lastEffect].slice();
    // Loud speech biases toward shake
    const volBoost = Math.max(0, this.smoothVol * this.sensitivity - 0.5) * 0.5;
    probs[2] = Math.min(0.80, probs[2] + volBoost);
    const norm = probs[0] + probs[1] + probs[2];
    const r    = Math.random() * norm;
    const effect = r < probs[0] ? 'pulse' : r < probs[0] + probs[1] ? 'tilt' : 'shake';
    this._lastEffect = effect;

    return {
      text,
      spawnVolume: this.smoothVol,
      spawnPitch:  this.freqPitch,
      spawnTime:   performance.now(),
      seed:        Math.random() * Math.PI * 2,
      effect,
      tilt:        (Math.random() - 0.5) * 0.28
    };
  },

  // Push current liveTokens as a new bgLine and switch orientation.
  // Called both mid-sentence (threshold hit) and at isFinal.
  _commitSegment() {
    if (!this.liveTokens.length) return;
    const cx = this.logicalWidth / 2;
    const cy = this.logicalHeight / 2;
    const sp = this._scatterPos();

    this.bgLines.push({
      tokens:    this.liveTokens,
      createdAt: performance.now(),
      cx, cy,
      tilt:  0,
      scale: 1.0,
      alpha: 0.9,
      tcx:    sp.x,
      tcy:    sp.y,
      tTilt:  this._randTilt(),
      tScale: 0.55 + Math.random() * 0.70,
      tAlpha: 0.70 + Math.random() * 0.22,
      dying: false
    });

    const alive = this.bgLines.filter(l => !l.dying);
    if (alive.length > BG_MAX) {
      alive[0].dying  = true;
      alive[0].tAlpha = 0;
    }

    this._interimOffset += this.liveTokens.length;
    const _others = LAYOUT_MODES.filter(m => m !== this.orientation);
    this.orientation = _others[Math.floor(Math.random() * _others.length)];
    this._splitThreshold = 5 + Math.floor(Math.random() * 4);  // next threshold: 5–8
    this.liveTokens        = [];
    this.prevInterimTokens = [];
    this._circlePhase      = [];
  },

  // Interim (not final) result: show only the slice of tokens after what's
  // already been committed this session (_interimOffset).
  updateInterim(transcript) {
    const toks        = this.tokenize(transcript);
    const displayToks = toks.slice(this._interimOffset);
    const prevCount   = this.prevInterimTokens.length;

    if (displayToks.length < prevCount) {
      // Recogniser revised downward — rebuild display window from scratch
      this.liveTokens = displayToks.map(t => this.makeToken(t));
    } else {
      for (const t of displayToks.slice(prevCount)) { this.liveTokens.push(this.makeToken(t)); }
    }
    this.prevInterimTokens = displayToks;

    // Auto-split mid-sentence when enough tokens have accumulated
    if (this.liveTokens.length >= this._splitThreshold) {
      this._commitSegment();
    }
  },

  // Final result: commit any remaining tokens, then reset session state.
  commitLine(transcript) {
    const toks      = this.tokenize(transcript);
    if (toks.length < this._interimOffset) {
      // Recognizer finalized a transcript shorter than what was already auto-split
      // and committed. Discard any stale interim tokens — they were retracted.
      this.liveTokens        = [];
      this.prevInterimTokens = [];
    } else {
      const remaining = toks.slice(this._interimOffset);
      for (const t of remaining.slice(this.liveTokens.length)) { this.liveTokens.push(this.makeToken(t)); }
    }

    this._commitSegment();     // commits and switches orientation; also sets _splitThreshold
    this._interimOffset = 0;  // reset for the next sentence
  },

  onRecognitionResult(event) {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res        = event.results[i];
      const transcript = res[0] ? res[0].transcript : '';
      if (res.isFinal) this.commitLine(transcript);
      else             this.updateInterim(transcript);
    }
  }

});
