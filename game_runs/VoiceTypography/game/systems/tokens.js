"use strict";

// Token lifecycle: segmentation → live display → history commit
Object.assign(Stage.prototype, {

  tokenize(text) {
    text = (text || '').trim();
    if (!text) return [];
    return this.lang.startsWith('zh') ? Array.from(text) : text.split(/\s+/).filter(Boolean);
  },

  makeToken(text) {
    const r = Math.random();
    return {
      text,
      spawnVolume: this.smoothVol,
      spawnTime:   performance.now(),
      seed:        Math.random() * Math.PI * 2,
      effect:      r > 0.8 ? 'shake' : r > 0.62 ? 'tilt' : 'pulse',
      tilt:        (Math.random() - 0.5) * 0.28
    };
  },

  updateInterim(transcript) {
    const toks      = this.tokenize(transcript);
    const prevCount = this.prevInterimTokens.length;
    if (toks.length < prevCount) {
      // Recogniser revised downward — rebuild from scratch
      this.liveTokens = toks.map(t => this.makeToken(t));
    } else {
      for (const t of toks.slice(prevCount)) { this.liveTokens.push(this.makeToken(t)); }
    }
    this.prevInterimTokens = toks;
  },

  commitLine(transcript) {
    const toks = this.tokenize(transcript);
    for (const t of toks.slice(this.liveTokens.length)) { this.liveTokens.push(this.makeToken(t)); }
    if (this.liveTokens.length) {
      this.historyLines.unshift({
        tokens:         this.liveTokens,
        finalizedAt:    performance.now(),
        jitterOffset:   (Math.random() - 0.5) * 26,
        currentOffset:  0,
        currentOpacity: 1
      });
      if (this.historyLines.length > MAX_HISTORY) this.historyLines.pop();
    }
    this.liveTokens        = [];
    this.prevInterimTokens = [];
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
