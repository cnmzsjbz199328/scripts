(function (root) {
  var NS = root.ThreeMoves = root.ThreeMoves || {};

  var roster = [
    ['奇希莉卡', '2'], ['七星静香', '3'], ['艾莉娜丽洁', '4'], ['克里夫', '5'],
    ['扎诺巴', '6'], ['保罗', '7'], ['基列奴', '8'], ['瑞杰路德', '9'],
    ['佩尔基乌斯', '10'], ['希露菲叶特', 'J'], ['洛琪希', 'Q'], ['艾莉丝', 'K'], ['鲁迪乌斯', 'A'],
  ];
  var suits = ['spade', 'heart', 'diamond', 'club'];
  var suitMeta = {
    spade: { symbol: '♠', name: '攻击', action: '斩击' },
    heart: { symbol: '♥', name: '守护', action: '结界' },
    diamond: { symbol: '♦', name: '能力', action: '爆发' },
    club: { symbol: '♣', name: '特殊', action: '奇袭' },
  };

  function makeCard(character, rank, value, suit, joker) {
    var card = { id: '', character: character, rank: rank, value: value };
    if (suit) card.suit = suit;
    if (joker) card.joker = joker;
    card.id = joker ? 'joker-' + joker : roster.findIndex(function (r) { return r[0] === character; }) + '-' + suit;
    return card;
  }

  function buildDeck() {
    var deck = [];
    roster.forEach(function (entry, index) {
      suits.forEach(function (suit) {
        deck.push(makeCard(entry[0], entry[1], index + 2, suit));
      });
    });
    deck.push(makeCard('龙神奥尔斯帝德', '大王', 15, null, 'dragon'));
    deck.push(makeCard('人神', '小王', 14, null, 'human'));
    return deck;
  }

  function findCard(deck, character, suit) {
    return deck.find(function (card) { return card.character === character && card.suit === suit; });
  }

  function clone(card) {
    return Object.assign({}, card);
  }

  // Deterministic coverage hand used by webdriver/playtest. It exercises a
  // normal counter, perfect counter, same-character combo/tie, Human God,
  // and Dragon God without changing the normal shuffled game.
  function buildTestDeal() {
    var deck = buildDeck();
    var player = [
      findCard(deck, '奇希莉卡', 'diamond'),
      findCard(deck, '艾莉娜丽洁', 'heart'),
      findCard(deck, '艾莉娜丽洁', 'spade'),
      deck.find(function (card) { return card.joker === 'dragon'; }),
      deck.find(function (card) { return card.joker === 'human'; }),
    ].map(clone);
    var enemy = [
      findCard(deck, '克里夫', 'heart'),
      findCard(deck, '艾莉娜丽洁', 'spade'),
      findCard(deck, '艾莉娜丽洁', 'diamond'),
      findCard(deck, '奇希莉卡', 'club'),
      findCard(deck, '鲁迪乌斯', 'heart'),
    ].map(clone);
    return { player: player, enemy: enemy };
  }

  NS.Data = {
    roster: roster,
    suits: suits,
    suitMeta: suitMeta,
    buildDeck: buildDeck,
    buildTestDeal: buildTestDeal,
    testNote: 'webdriver 默认使用确定性牌序，覆盖普通克制、完美反制、连携、人神与龙神。',
  };
})(window);
