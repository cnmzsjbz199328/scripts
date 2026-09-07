(function (root) {
  var NS = root.ThreeMoves = root.ThreeMoves || {};
  var canvas;
  var ctx;
  var particles = [];
  var lastTime = 0;
  var dpr = 2;

  function init(target) {
    canvas = target;
    if (!canvas) return;
    dpr = 2;
    canvas.width = NS.Config.WIDTH * dpr;
    canvas.height = NS.Config.HEIGHT * dpr;
    ctx = canvas.getContext('2d');
    if (!ctx) return;
    root.requestAnimationFrame(loop);
  }

  function burst(outcome) {
    var color = outcome === 'win' ? '#f2c86e' : outcome === 'lose' ? '#ef5570' : '#9da3b8';
    for (var i = 0; i < 22; i += 1) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 0.45 + Math.random() * 1.8;
      particles.push({
        x: 480 + Math.cos(angle) * 14,
        y: 232 + Math.sin(angle) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.45,
        life: 1,
        color: color,
        size: 1 + Math.random() * 2.6,
      });
    }
  }

  function drawGrid() {
    var w = NS.Config.WIDTH;
    var h = NS.Config.HEIGHT;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var bg = ctx.createRadialGradient(480, 232, 20, 480, 232, 540);
    bg.addColorStop(0, '#1b1836');
    bg.addColorStop(0.46, '#101425');
    bg.addColorStop(1, '#070913');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#c9b16d';
    ctx.lineWidth = 1;
    for (var x = 20; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (var y = 20; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    var glow = ctx.createRadialGradient(480, 224, 4, 480, 224, 170);
    glow.addColorStop(0, 'rgba(242,200,110,0.06)');
    glow.addColorStop(1, 'rgba(242,200,110,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(300, 44, 360, 360);
  }

  function loop(time) {
    if (!ctx) return;
    var dt = Math.min(36, time - lastTime || 16);
    lastTime = time;
    drawGrid();
    particles = particles.filter(function (p) { return p.life > 0; });
    particles.forEach(function (p) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.0018 * dt;
      p.life -= dt / 900;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    root.requestAnimationFrame(loop);
  }

  NS.Systems = NS.Systems || {};
  NS.Systems.Effects = { init: init, burst: burst };
})(window);
