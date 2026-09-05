(function (root) {
  var NS = root.ThreeMoves = root.ThreeMoves || {};
  var base = 'assets/media/';

  var characters = {
    Kishirika: { base: base + 'characters/Kishirika_base.png' },
    Nanahoshi: { base: base + 'characters/Nanahoshi_base.png' },
    Eris: { base: base + 'characters/Eris_base.png' },
    Cliff: { base: base + 'characters/Cliff_base.png' },
    Zanoba: { base: base + 'characters/Zanoba_base.png' },
    Paul: { base: base + 'characters/Paul_base.png' },
    Ghislaine: { base: base + 'characters/Ghislaine_base.png' },
    Ruijerd: { base: base + 'characters/Ruijerd_base.png' },
    Perugius: { base: base + 'characters/Perugius_base.png' },
    Sylphiette: { base: base + 'characters/Sylphiette_base.png' },
    Roxy: { base: base + 'characters/Roxy_base.png' },
    ErisGreyrat: { base: base + 'characters/ErisGreyrat_base.png' },
    Rudeus: { base: base + 'characters/Rudeus_base.png' }
  };

  var jokers = {
    Orsted: { base: base + 'jokers/Orsted_base.png' },
    Hitogami: { base: base + 'jokers/Hitogami_base.png' }
  };

  var characterIdsByDisplayName = {
    '奇希莉卡': 'Kishirika',
    '七星静香': 'Nanahoshi',
    '艾莉娜丽洁': 'Eris',
    '克里夫': 'Cliff',
    '扎诺巴': 'Zanoba',
    '保罗': 'Paul',
    '基列奴': 'Ghislaine',
    '瑞杰路德': 'Ruijerd',
    '佩尔基乌斯': 'Perugius',
    '希露菲叶特': 'Sylphiette',
    '洛琪希': 'Roxy',
    '艾莉丝': 'ErisGreyrat',
    '鲁迪乌斯': 'Rudeus'
  };

  function getCardMedia(card) {
    if (!card) return null;
    if (card.joker === 'dragon') return jokers.Orsted;
    if (card.joker === 'human') return jokers.Hitogami;
    var id = characterIdsByDisplayName[card.character];
    return id ? characters[id] : null;
  }

  var media = {
    characters: characters,
    jokers: jokers,
    avatars: {},
    effects: {},
    characterIdsByDisplayName: characterIdsByDisplayName,
    getCharacterMedia: function (id) { return characters[id] || null; },
    getJokerMedia: function (id) { return jokers[id] || null; },
    getCardMedia: getCardMedia
  };

  function mediaForLabel(label) {
    var names = Object.keys(characterIdsByDisplayName);
    for (var i = 0; i < names.length; i += 1) {
      if (label.indexOf(names[i]) === 0) return characters[characterIdsByDisplayName[names[i]]];
    }
    if (label.indexOf('龙神奥尔斯帝德') === 0) return jokers.Orsted;
    if (label.indexOf('人神') === 0) return jokers.Hitogami;
    return null;
  }

  function hydrateSlots() {
    var slots = document.querySelectorAll('.media-slot');
    for (var i = 0; i < slots.length; i += 1) {
      var slot = slots[i];
      var mediaItem = mediaForLabel(slot.getAttribute('aria-label') || '');
      if (!mediaItem) continue;
      if (!slot.querySelector('.media-art')) {
        var image = document.createElement('img');
        image.className = 'media-art';
        image.src = mediaItem.base;
        image.alt = '';
        image.loading = 'lazy';
        image.addEventListener('error', function () { this.remove(); });
        slot.appendChild(image);
      }
      var status = slot.querySelector('.media-status');
      if (status && status.textContent !== '静态基准') status.textContent = '静态基准';
    }
  }

  root.ThreeMovesMedia = media;
  NS.Media = media;
  if (root.MutationObserver) {
    new MutationObserver(hydrateSlots).observe(document.body, { childList: true, subtree: true });
  }
  hydrateSlots();
})(window);
