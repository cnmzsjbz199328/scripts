(function (root) {
  var NS = root.ThreeMoves = root.ThreeMoves || {};

  function create(mode) {
    return {
      mode: mode || 'normal',
      started: false,
      phase: 'menu',
      round: 1,
      maxRounds: NS.Config.MAX_ROUNDS,
      playerHp: NS.Config.START_HP,
      enemyHp: NS.Config.START_HP,
      score: 0,
      roundScore: 0,
      playerHand: [],
      enemyHand: [],
      enemyIntent: null,
      result: null,
      gameOverText: '',
      previousPlayer: null,
      previousEnemy: null,
      logs: [],
      selectedIndex: 0,
      testMoves: [],
      timer: null,
      onChange: null,
      player: { x: 0, y: 0, vx: 0, vy: 0, onGround: true },
    };
  }

  function emit(state) {
    if (typeof state.onChange === 'function') state.onChange(state);
  }

  function clearTimer(state) {
    if (state.timer) root.clearTimeout(state.timer);
    state.timer = null;
  }

  function select(state, index) {
    var max = Math.max(0, state.playerHand.length - 1);
    state.selectedIndex = Math.max(0, Math.min(max, index));
    state.player.x = state.selectedIndex;
    state.player.vx = 0;
    emit(state);
  }

  function start(state, mode) {
    clearTimer(state);
    if (mode) state.mode = mode;
    var deal = NS.Systems.Deck.deal(state.mode);
    state.started = true;
    state.phase = 'ready';
    state.round = 1;
    state.playerHp = NS.Config.START_HP;
    state.enemyHp = NS.Config.START_HP;
    state.score = 0;
    state.roundScore = 0;
    state.playerHand = deal.player.slice();
    state.enemyHand = deal.enemy.slice();
    state.enemyIntent = state.enemyHand[0] || null;
    state.result = null;
    state.gameOverText = '';
    state.previousPlayer = null;
    state.previousEnemy = null;
    state.logs = ['新的对决开始了。先观察对手的技能类型。'];
    state.selectedIndex = 0;
    state.testMoves = state.mode === 'test' ? state.playerHand.map(function (card) { return card.id; }) : [];
    state.player.x = 0;
    state.player.y = 0;
    state.player.vx = 0;
    state.player.vy = 0;
    emit(state);
  }

  function removeCard(hand, id) {
    return hand.filter(function (card) { return card.id !== id; });
  }

  function finishResolution(state) {
    state.timer = null;
    if (state.enemyHp <= 0) {
      state.phase = 'won';
      state.gameOverText = '胜利';
      emit(state);
      return;
    }
    if (state.playerHp <= 0) {
      state.phase = 'lost';
      state.gameOverText = '惜败';
      emit(state);
      return;
    }
    if (!state.playerHand.length || !state.enemyHand.length) {
      state.phase = state.enemyHp < state.playerHp ? 'won' : state.playerHp < state.enemyHp ? 'lost' : 'tie';
      state.gameOverText = state.phase === 'won' ? '胜利' : state.phase === 'lost' ? '惜败' : '平局';
      emit(state);
      return;
    }
    state.round += 1;
    state.enemyIntent = state.enemyHand[0];
    state.result = null;
    state.phase = 'ready';
    state.selectedIndex = Math.min(state.selectedIndex, state.playerHand.length - 1);
    state.player.x = state.selectedIndex;
    state.player.y = state.round - 1;
    emit(state);
  }

  function playCard(state, cardId) {
    if (!state.started || state.phase !== 'ready' || !state.enemyIntent) return false;
    var playerCard = state.playerHand.find(function (card) { return card.id === cardId; });
    if (!playerCard) return false;
    var enemyCard = state.enemyIntent;
    var result = NS.Systems.Duel.resolve(playerCard, enemyCard, state.previousPlayer, state.previousEnemy);
    state.result = result;
    state.roundScore = result.playerScore;
    state.score += result.playerScore;
    state.previousPlayer = playerCard.character;
    state.previousEnemy = enemyCard.character;
    state.playerHand = removeCard(state.playerHand, playerCard.id);
    state.enemyHand = removeCard(state.enemyHand, enemyCard.id);
    if (result.outcome === 'lose') state.playerHp -= 1;
    if (result.outcome === 'win') state.enemyHp -= 1;
    state.logs = ['第 ' + state.round + ' 招：' + result.headline + '（' + result.playerScore + ' : ' + result.enemyScore + '）']
      .concat(state.logs).slice(0, 5);
    state.phase = 'resolving';
    state.timer = root.setTimeout(function () { finishResolution(state); }, NS.Config.RESULT_DELAY);
    emit(state);
    return true;
  }

  function advance(state, explicitCardId) {
    if (!state.started) {
      start(state);
      return true;
    }
    if (state.phase !== 'ready') return false;
    var id = explicitCardId;
    if (!id && state.mode === 'test') id = state.testMoves[state.round - 1];
    if (!id) id = state.playerHand[state.selectedIndex] && state.playerHand[state.selectedIndex].id;
    return playCard(state, id);
  }

  function nudge(state, dx, dy) {
    if (!state.started) return;
    if (dx) select(state, state.selectedIndex + dx);
    if (dy) {
      state.player.y = Math.max(0, state.player.y + dy);
      emit(state);
    }
  }

  NS.State = {
    create: create,
    start: start,
    playCard: playCard,
    advance: advance,
    select: select,
    nudge: nudge,
  };
})(window);
