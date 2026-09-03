(function (root) {
  var NS = root.ThreeMoves = root.ThreeMoves || {};
  var params = new URLSearchParams(root.location.search);
  var mode = params.get('mode') || (root.navigator.webdriver ? 'test' : 'normal');
  var state = NS.State.create(mode);
  var renderer = new NS.Renderer(state);
  var canvas = document.getElementById('game-canvas');

  var app = {
    state: state,
    renderer: renderer,
    activeScene: 'BootScene',
    mode: mode,
    start: function () {
      NS.Scenes.DuelScene.prototype.create.call(new NS.Scenes.DuelScene(app));
      NS.State.start(state, mode);
    },
    restart: function () {
      app.start();
    },
    play: function (cardId) {
      var played = NS.State.playCard(state, cardId);
      if (played) renderer.render();
    },
    advance: function () {
      var advanced = NS.State.advance(state);
      if (advanced) renderer.render();
      return advanced;
    },
    probe: function () {
      return {
        x: state.player.x,
        y: state.player.y,
        vx: state.player.vx,
        onGround: state.player.onGround,
        hp: state.playerHp,
        maxHp: NS.Config.START_HP,
        act: state.round,
        round: state.round,
        score: state.score,
        roundScore: state.roundScore,
        goalScore: 0,
        deaths: 0,
        deathBudget: 0,
        won: state.phase === 'won',
        lost: state.phase === 'lost',
        tie: state.phase === 'tie',
        cardActive: state.phase === 'ready',
        started: state.started,
        phase: state.phase,
        mode: state.mode,
        nextGoalX: state.selectedIndex,
        worldW: NS.Config.MAX_ROUNDS,
        cellX: NS.Config.MAX_ROUNDS,
        dangerNow: false,
        dangerAhead: false,
        locked: true,
        handCount: state.playerHand.length,
        enemyHandCount: state.enemyHand.length,
        outcome: state.result ? state.result.outcome : null,
      };
    },
  };

  state.onChange = function () {
    renderer.render();
  };
  renderer.bind({
    onStart: app.start,
    onRestart: app.restart,
    onPlay: app.play,
  });
  if (NS.Systems.Effects) NS.Systems.Effects.init(canvas);

  root.__gameState = state;
  root.__probe = app.probe;
  root.__hudStart = function () {
    if (!state.started || state.phase === 'won' || state.phase === 'lost' || state.phase === 'tie') app.start();
    return app.probe();
  };
  root.__advanceCard = function () {
    return app.advance();
  };
  root.ThreeMoves.Game = app;

  document.addEventListener('keydown', function (event) {
    var key = event.key;
    var lower = key.toLowerCase();
    if (lower === 'r') {
      event.preventDefault();
      app.restart();
      return;
    }
    if (!state.started) {
      if (key === 'Enter' || key === ' ' || lower === 'j') {
        event.preventDefault();
        app.start();
      }
      return;
    }
    if (key === 'ArrowLeft' || lower === 'a') {
      event.preventDefault(); NS.State.nudge(state, -1, 0); return;
    }
    if (key === 'ArrowRight' || lower === 'd') {
      event.preventDefault(); NS.State.nudge(state, 1, 0); return;
    }
    if (key === 'ArrowUp' || lower === 'w') {
      event.preventDefault(); NS.State.nudge(state, 0, -1); return;
    }
    if (key === 'ArrowDown' || lower === 's') {
      event.preventDefault(); NS.State.nudge(state, 0, 1); return;
    }
    if (key === ' ' || key === 'Enter' || lower === 'j' || lower === 'z') {
      event.preventDefault(); app.advance();
    }
  });

  new NS.Scenes.BootScene(app).create();
  if (params.has('autostart') || root.navigator.webdriver) app.start();
})(window);
