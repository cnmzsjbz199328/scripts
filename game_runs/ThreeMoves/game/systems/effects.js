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
        y: 298 + Math.sin(angle) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.45,
        life: 1,
        color: color,
        size: 1 + Math.random() * 2.6,
      });
    }
  }

  function drawGrid(t) {
    var w = NS.Config.WIDTH;
    var h = NS.Config.HEIGHT;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var bg = ctx.createRadialGradient(490, 255, 20, 490, 255, 520);
    bg.addColorStop(0, '#262043');
    bg.addColorStop(0.42, '#111528');
    bg.addColorStop(1, '#070913');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 0.11;
    ctx.strokeStyle = '#c9b16d';
    ctx.lineWidth = 1;
    for (var x = 18; x < w; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (var y = 16; y < h; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    var pulse = 0.5 + Math.sin(t / 1600) * 0.08;
    ctx.save();
    ctx.translate(355, 272);
    ctx.scale(1.3, 0.64);
    ctx.strokeStyle = 'rgba(242,200,110,' + pulse + ')';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath(); ctx.arc(0, 0, 214, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.strokeStyle = 'rgba(122,105,216,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(160, 282); ctx.lineTo(548, 282); ctx.stroke();
    ctx.strokeStyle = 'rgba(242,200,110,0.35)';
    ctx.beginPath(); ctx.moveTo(296, 100); ctx.lineTo(296, 454); ctx.stroke();

    var glow = ctx.createRadialGradient(480, 288, 2, 480, 288, 100);
    glow.addColorStop(0, 'rgba(242,200,110,0.18)');
    glow.addColorStop(1, 'rgba(242,200,110,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(380, 188, 200, 200);
  }

  function loop(time) {
    if (!ctx) return;
    var dt = Math.min(36, time - lastTime || 16);
    lastTime = time;
    drawGrid(time);
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
