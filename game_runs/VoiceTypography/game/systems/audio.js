"use strict";

// Microphone capture, volume analysis, and speech recognition lifecycle
Object.assign(Stage.prototype, {

  setStatus(text) {
    const el = document.getElementById('statusText');
    if (el) el.textContent = text;
  },

  setLiveDot(on) {
    const dot = document.getElementById('statusDot');
    if (dot) dot.classList.toggle('live', !!on);
  },

  updateToggleButton() {
    const btn = document.getElementById('toggleBtn');
    if (!btn) return;
    btn.textContent = this.listening ? '停止' : '开始';
    btn.classList.toggle('on', this.listening);
  },

  startRecognition() {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      this.setStatus('当前浏览器不支持语音识别，请使用最新版 Chrome');
      return false;
    }
    const r = new Ctor();
    r.lang            = this.lang;
    r.continuous      = true;
    r.interimResults  = true;
    r.onresult        = e => this.onRecognitionResult(e);
    r.onerror         = e => {
      if (e.error === 'no-speech') { this.setStatus('聆听中（未检测到语音）'); return; }
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.setStatus('麦克风权限被拒绝');
        this.stopAll();
        return;
      }
      this.setStatus('识别出错：' + e.error);
    };
    r.onend = () => { if (this.listening) try { r.start(); } catch (_) {} };
    this.recognition = r;
    try {
      r.start();
      this.setStatus('聆听中');
      this.setLiveDot(true);
      return true;
    } catch (e) {
      this.setStatus('启动识别失败');
      return false;
    }
  },

  async startAll() {
    if (this.listening) return;
    this.setStatus('请求麦克风权限…');
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (_) {
      this.setStatus('麦克风权限被拒绝或不可用');
      return;
    }
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src     = this.audioCtx.createMediaStreamSource(this.micStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 1024;
      src.connect(this.analyser);
    } catch (_) {
      this.setStatus('音频分析初始化失败');
    }
    this.listening = true;
    if (!this.startRecognition()) this.listening = false;
    this.updateToggleButton();
  },

  stopAll() {
    this.listening = false;
    if (this.recognition) {
      this.recognition.onend = null;
      try { this.recognition.stop(); } catch (_) {}
      this.recognition = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch (_) {}
      this.audioCtx = null;
      this.analyser = null;
    }
    this.prevInterimTokens = [];
    this.setStatus('已停止');
    this.setLiveDot(false);
    this.updateToggleButton();
  },

  updateVolume() {
    if (this.listening && this.analyser) {
      if (!this._volBuf || this._volBuf.length !== this.analyser.fftSize) {
        this._volBuf = new Uint8Array(this.analyser.fftSize);
      }
      this.analyser.getByteTimeDomainData(this._volBuf);
      let sumSq = 0;
      for (let i = 0; i < this._volBuf.length; i++) {
        const v = (this._volBuf[i] - 128) / 128;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / this._volBuf.length);
      this.smoothVol = this._lerp(this.smoothVol, this._clamp(rms * 5.5, 0, 1), 0.25);
    } else {
      this.smoothVol = this._lerp(this.smoothVol, 0, 0.06);
    }
  }

});
