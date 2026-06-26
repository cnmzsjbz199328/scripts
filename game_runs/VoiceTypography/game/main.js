"use strict";

const stage = new Stage();

// Available orientation modes — extend here when Effect 3 (circular) is added
// Available modes — extend here when Effect 3 (circular) is added
const MODES = ['horizontal', 'vertical'];

// Click anywhere on the canvas to randomly switch to a different mode
document.getElementById('stage').addEventListener('click', function () {
  const others      = MODES.filter(m => m !== stage.orientation);
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
