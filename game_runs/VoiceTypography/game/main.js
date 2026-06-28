"use strict";

const stage = new Stage();

// Click anywhere on the canvas to manually switch to a different mode (LAYOUT_MODES from config.js)
document.getElementById('stage').addEventListener('click', function () {
  const others      = LAYOUT_MODES.filter(m => m !== stage.orientation);
  stage.orientation = others[Math.floor(Math.random() * others.length)];
});

document.getElementById('langSel').addEventListener('change', function () {
  stage.lang = this.value;
  if (stage.listening) { stage.stopAll(); stage.startAll(); }
});

document.getElementById('sensRange').addEventListener('input', function () {
  stage.sensitivity = parseFloat(this.value);
});

document.getElementById('toggleBtn').addEventListener('click', function () {
  if (stage.listening) stage.stopAll();
  else                 stage.startAll();
});

window.addEventListener('beforeunload', () => stage.stopAll());
