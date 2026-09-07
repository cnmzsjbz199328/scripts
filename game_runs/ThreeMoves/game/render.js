(function (root) {
  var NS = root.ThreeMoves = root.ThreeMoves || {};

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function cardFace(card, compact) {
    var meta = card.suit ? NS.Data.suitMeta[card.suit] : null;
    var classes = ['card-face', 'suit-' + (card.suit || 'joker')];
    if (card.joker) classes.push('joker-' + card.joker);
    if (compact) classes.push('compact');
    var typeLabel = card.joker === 'dragon' ? '龙神' : card.joker === 'human' ? '人神'
      : meta.symbol + ' ' + meta.name;
    return '<div class="' + classes.join(' ') + '">' +
      '<div class="card-head">' +
        '<span class="card-rank">' + escapeHtml(card.rank) + '</span>' +
        '<span class="card-type">' + escapeHtml(typeLabel) + '</span>' +
      '</div>' +
      '<div class="media-slot" aria-label="' + escapeHtml(card.character) + ' 动态素材占位">' +
        '<span class="media-initial">' + escapeHtml(card.character.slice(0, 1)) + '</span>' +
      '</div>' +
      '<div class="card-name">' + escapeHtml(card.character) + '</div>' +
    '</div>';
  }

  function enemyIntentBack(intent) {
    if (!intent) return '<div class="card-back"><span>Ⅲ</span></div>';
    var sym, label;
    if (intent.joker === 'dragon') { sym = '✦'; label = '未知强敌'; }
    else if (intent.joker === 'human') { sym = '?'; label = '命运干涉'; }
    else { var m = NS.Data.suitMeta[intent.suit]; sym = m.symbol; label = m.name; }
    return '<div class="card-back intent suit-' + (intent.suit || 'joker') + '">' +
      '<span class="intent-sym">' + escapeHtml(sym) + '</span>' +
      '<span class="intent-name">' + escapeHtml(label) + '</span>' +
      '<span class="intent-sub">点数待揭晓</span>' +
    '</div>';
  }

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function hearts(value, max) {
    var html = '';
    for (var i = 0; i < max; i += 1) html += '<span class="heart-icon ' + (i < value ? 'alive' : 'lost') + '">♥</span>';
    return html;
  }

  function Renderer(state) {
    this.state = state;
    this.lastResultKey = '';
    this.lastAnimKey = '';
    this.lastPreloadKey = '';
    this.animDone = false;
    this.animDoneCount = 0;
    this.helpOpen = false;
    this.onStart = function () {};
    this.onRestart = function () {};
    this.onPlay = function () {};
  }

  Renderer.prototype.bind = function (handlers) {
    this.onStart = handlers.onStart || this.onStart;
    this.onRestart = handlers.onRestart || this.onRestart;
    this.onPlay = handlers.onPlay || this.onPlay;
    var start = document.getElementById('start-btn');
    var restart = document.getElementById('restart-btn');
    var reset = document.getElementById('reset-btn');
    var hand = document.getElementById('player-hand');
    var help = document.getElementById('help-btn');
    var rulesClose = document.getElementById('rules-pop-close');
    if (start) start.addEventListener('click', this.onStart);
    if (restart) restart.addEventListener('click', this.onRestart);
    if (reset) reset.addEventListener('click', this.onRestart);
    if (help) help.addEventListener('click', function () {
      this.helpOpen = !this.helpOpen;
      this.render();
    }.bind(this));
    if (rulesClose) rulesClose.addEventListener('click', function () {
      this.helpOpen = false;
      if (NS.State.dismissPrimer) NS.State.dismissPrimer(this.state);
      else this.render();
    }.bind(this));
    if (hand) {
      hand.addEventListener('click', function (event) {
        var button = event.target.closest('[data-card-id]');
        if (button) {
          this.helpOpen = false;
          this.onPlay(button.getAttribute('data-card-id'));
        }
      }.bind(this));
    }
    var restartGame = function () {
      if (NS.SpriteAnim) NS.SpriteAnim.stopAll();
      this.onRestart();
    }.bind(this);
    if (restart) restart.addEventListener('click', restartGame);
    if (reset) reset.addEventListener('click', restartGame);
  };

  Renderer.prototype.render = function () {
    var state = this.state;
    var result = state.result;
    var started = state.started;
    var terminal = state.phase === 'won' || state.phase === 'lost' || state.phase === 'tie';
    var startScreen = document.getElementById('start-screen');
    var gameOver = document.getElementById('gameover-screen');
    if (startScreen) startScreen.style.display = started ? 'none' : 'flex';
    if (gameOver) gameOver.style.display = terminal ? 'flex' : 'none';

    setText('round-value', 'ROUND ' + state.round + ' / ' + state.maxRounds);
    setText('player-hp-value', state.playerHp + ' / ' + NS.Config.START_HP);
    setText('enemy-hp-value', state.enemyHp + ' / ' + NS.Config.START_HP);
    setText('score-value', String(state.score));
    setText('hand-count', String(state.playerHand.length));
    setText('enemy-count', String(state.enemyHand.length));
    setText('player-hp', '');
    setText('enemy-hp', '');
    var playerHp = document.getElementById('player-hp');
    var enemyHp = document.getElementById('enemy-hp');
    if (playerHp) playerHp.innerHTML = hearts(state.playerHp, NS.Config.START_HP);
    if (enemyHp) enemyHp.innerHTML = hearts(state.enemyHp, NS.Config.START_HP);

    var enemyPlayed = document.getElementById('enemy-played');
    var playerPlayed = document.getElementById('player-played');
    if (enemyPlayed) enemyPlayed.innerHTML = result ? cardFace(result.enemyCard, true) + '<b class="score-badge">' + result.enemyScore + '</b>' : enemyIntentBack(state.enemyIntent);
    if (playerPlayed) playerPlayed.innerHTML = result ? cardFace(result.playerCard, true) + '<b class="score-badge">' + result.playerScore + '</b>' : '<div class="empty-card"><span>+</span></div>';
    var duelStage = document.getElementById('duel-stage');
    if (duelStage) duelStage.className = 'duel-stage' + (result ? ' outcome-' + result.outcome : '');
    setText('impact-headline', result ? result.headline : 'VS');
    setText('impact-detail', result ? result.detail : '');
    setText('action-hint', state.phase === 'resolving' ? '结算中…' : terminal ? '按 R 重开' : (state.round === 1 && !result ? '点击出牌' : ''));

    var rulesPop = document.getElementById('rules-pop');
    if (rulesPop) {
      var showRules = this.helpOpen ||
        (started && state.phase === 'ready' && state.round === 1 && !result && !state.primerSeen);
      rulesPop.hidden = !showRules;
    }

    var hand = document.getElementById('player-hand');
    if (hand) {
      hand.innerHTML = state.playerHand.map(function (card, index) {
        var selected = index === state.selectedIndex;
        return '<button class="hand-card' + (selected ? ' selected' : '') + '" data-card-id="' + escapeHtml(card.id) + '" aria-label="打出 ' + escapeHtml(card.character + ' ' + card.rank) + '" aria-pressed="' + selected + '" ' + (state.phase !== 'ready' ? 'disabled' : '') + '>' + cardFace(card, false) + '</button>';
      }).join('');
    }

    var table = document.getElementById('battle-table');
    if (table) table.className = 'battle-table' + (result ? ' has-result outcome-' + result.outcome : '');
    var title = document.getElementById('gameover-title');
    var message = document.getElementById('gameover-message');
    if (title) {
      title.textContent = state.gameOverText || 'DUEL COMPLETE';
      title.className = state.phase === 'won' ? 'win' : state.phase === 'lost' ? 'lose' : 'tie';
    }
    if (message) message.textContent = state.gameOverText ? '最终生命：你 ' + state.playerHp + ' · ' + state.enemyHp + ' 对手\n累计得分：' + state.score : '';

    var wrapper = document.getElementById('game-wrapper');
    if (wrapper) wrapper.style.setProperty('--cursor-x', String(state.player.x));
    var resultKey = result ? state.round + ':' + result.outcome + ':' + result.playerCard.id : '';
    if (resultKey && resultKey !== this.lastResultKey && NS.Systems.Effects) NS.Systems.Effects.burst(result.outcome);
    if (!resultKey) {
      if (this.lastAnimKey && NS.SpriteAnim) NS.SpriteAnim.stopAll();
      this.lastAnimKey = '';
      this.animDone = false;
      this.animDoneCount = 0;
    }
    var playerSlot = playerPlayed && playerPlayed.querySelector('.media-slot');
    var enemySlot = enemyPlayed && enemyPlayed.querySelector('.media-slot');
    var remountInterrupted = resultKey && resultKey === this.lastAnimKey && !this.animDone &&
      ((!playerSlot || !playerSlot.querySelector('.sprite-anim')) || (!enemySlot || !enemySlot.querySelector('.sprite-anim')));
    if (resultKey && (resultKey !== this.lastAnimKey || remountInterrupted) && state.phase === 'resolving' && NS.SpriteAnim && !isBotMode(state)) {
      var playerMedia = NS.Media && NS.Media.getCardMedia ? NS.Media.getCardMedia(result.playerCard) : null;
      var enemyMedia = NS.Media && NS.Media.getCardMedia ? NS.Media.getCardMedia(result.enemyCard) : null;
      var animationKey = resultKey;
      this.lastAnimKey = resultKey;
      this.animDone = false;
      this.animDoneCount = 0;
      var markDone = function () {
        if (this.lastAnimKey !== animationKey) return;
        this.animDoneCount += 1;
        this.animDone = this.animDoneCount >= 2;
      }.bind(this);
      NS.SpriteAnim.playOnce(playerSlot, playerMedia, result.playerCard.suit, markDone);
      NS.SpriteAnim.playOnce(enemySlot, enemyMedia, result.enemyCard.suit, markDone);
    }
    if (state.phase === 'ready' && NS.SpriteAnim && NS.Media && NS.Media.getCardMedia) {
      var preloadIds = state.playerHand.map(function (card) { return card.id; });
      preloadIds.push(state.enemyIntent ? state.enemyIntent.id : '');
      var preloadKey = preloadIds.join('|');
      if (preloadKey !== this.lastPreloadKey) {
        NS.SpriteAnim.preload(state.playerHand.map(NS.Media.getCardMedia).concat(state.enemyIntent ? [NS.Media.getCardMedia(state.enemyIntent)] : []));
        this.lastPreloadKey = preloadKey;
      }
    }
    this.lastResultKey = resultKey;
  };

  function isBotMode(state) {
    return !!(root.navigator && root.navigator.webdriver) || state.mode === 'test';
  }

  NS.Renderer = Renderer;
})(window);
