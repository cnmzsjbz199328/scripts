(function (root) {
  var NS = root.ThreeMoves = root.ThreeMoves || {};

  function shuffle(items) {
    var copy = items.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i]; copy[i] = copy[j]; copy[j] = temp;
    }
    return copy;
  }

  function deal(mode) {
    if (mode === 'test') return NS.Data.buildTestDeal();
    var deck = shuffle(NS.Data.buildDeck());
    return { player: deck.slice(0, 5), enemy: deck.slice(5, 10) };
  }

  NS.Systems = NS.Systems || {};
  NS.Systems.Deck = {
    shuffle: shuffle,
    deal: deal,
  };
})(window);
