"use strict";

const stage = new Stage();

document.getElementById('langSel').addEventListener('change', function () {
  stage.lang = this.value;
  if (stage.listening) { stage.stopAll(); stage.startAll(); }
});

document.getElementById('orientBtn').addEventListener('click', function () {
  stage.orientation  = stage.orientation === 'horizontal' ? 'vertical' : 'horizontal';
  this.textContent   = stage.orientation === 'horizontal' ? '横版 →' : '竖版 ↓';
});

document.getElementById('sensRange').addEventListener('input', function () {
  stage.sensitivity = parseFloat(this.value);
});

document.getElementById('toggleBtn').addEventListener('click', function () {
  if (stage.listening) stage.stopAll();
  else                 stage.startAll();
});

window.addEventListener('beforeunload', () => stage.stopAll());
