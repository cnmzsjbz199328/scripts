(function (root) {
  var NS = root.ThreeMoves = root.ThreeMoves || {};

  function beats(a, b) {
    return (a === 'spade' && b === 'club') ||
      (a === 'club' && b === 'diamond') ||
      (a === 'diamond' && b === 'heart') ||
      (a === 'heart' && b === 'spade');
  }

  function resolve(playerCard, enemyCard, previousPlayer, previousEnemy) {
    var playerValue = playerCard.value;
    var enemyValue = enemyCard.value;
    var playerSuit = playerCard.suit;
    var enemySuit = enemyCard.suit;

    // This deliberately mirrors the source demo: Human God copies the
    // opponent's effective face and type, then receives +1 (capped at 15).
    if (playerCard.joker === 'human') {
      playerValue = Math.min(15, enemyCard.value + 1);
      playerSuit = enemyCard.suit;
    }
    if (enemyCard.joker === 'human') {
      enemyValue = Math.min(15, playerCard.value + 1);
      enemySuit = playerCard.suit;
    }

    var playerCounter = !enemyCard.joker && beats(playerSuit, enemySuit);
    var enemyCounter = !playerCard.joker && beats(enemySuit, playerSuit);
    var perfectPlayer = playerCounter && playerCard.character === enemyCard.character;
    var perfectEnemy = enemyCounter && playerCard.character === enemyCard.character;
    var playerCombo = previousPlayer === playerCard.character;
    var enemyCombo = previousEnemy === enemyCard.character;
    var playerScore = playerValue + (perfectPlayer ? 5 : playerCounter ? 3 : 0) + (playerCombo ? 2 : 0);
    var enemyScore = enemyValue + (perfectEnemy ? 5 : enemyCounter ? 3 : 0) + (enemyCombo ? 2 : 0);
    var outcome = playerScore > enemyScore ? 'win' : playerScore < enemyScore ? 'lose' : 'tie';
    var headline = perfectPlayer ? '完美反制！' : playerCombo ? '角色连携！' :
      outcome === 'win' ? '你赢下这一招' : outcome === 'lose' ? '对手占据上风' : '势均力敌';
    var bonuses = [];
    if (playerCounter) bonuses.push('克制 +' + (perfectPlayer ? 5 : 3));
    if (playerCombo) bonuses.push('连携 +2');
    if (playerCard.joker === 'human') bonuses.push('复制 +1');

    return {
      playerCard: playerCard,
      enemyCard: enemyCard,
      playerScore: playerScore,
      enemyScore: enemyScore,
      outcome: outcome,
      headline: headline,
      detail: bonuses.length ? bonuses.join(' · ') : '直接比较牌面强度',
      playerCounter: playerCounter,
      enemyCounter: enemyCounter,
      perfectPlayer: perfectPlayer,
      perfectEnemy: perfectEnemy,
      playerCombo: playerCombo,
      enemyCombo: enemyCombo,
    };
  }

  NS.Systems = NS.Systems || {};
  NS.Systems.Duel = {
    beats: beats,
    resolve: resolve,
  };
})(window);
