(function (root) {
  var NS = root.ThreeMoves = root.ThreeMoves || {};
  var base = 'assets/media/';

  var characters = {
    Kishirika: { base: base + 'characters/Kishirika_base.png', spritesheet: base + 'characters/Kishirika_spritesheet.webp', charJson: base + 'characters/Kishirika_char.json' },
    Nanahoshi: { base: base + 'characters/Nanahoshi_base.png', spritesheet: base + 'characters/Nanahoshi_spritesheet.webp', charJson: base + 'characters/Nanahoshi_char.json' },
    Eris: { base: base + 'characters/Eris_base.png', spritesheet: base + 'characters/Eris_spritesheet.webp', charJson: base + 'characters/Eris_char.json' },
    Cliff: { base: base + 'characters/Cliff_base.png', spritesheet: base + 'characters/Cliff_spritesheet.webp', charJson: base + 'characters/Cliff_char.json' },
    Zanoba: { base: base + 'characters/Zanoba_base.png', spritesheet: base + 'characters/Zanoba_spritesheet.webp', charJson: base + 'characters/Zanoba_char.json' },
    Paul: { base: base + 'characters/Paul_base.png', spritesheet: base + 'characters/Paul_spritesheet.webp', charJson: base + 'characters/Paul_char.json' },
    Ghislaine: { base: base + 'characters/Ghislaine_base.png', spritesheet: base + 'characters/Ghislaine_spritesheet.webp', charJson: base + 'characters/Ghislaine_char.json' },
    Ruijerd: { base: base + 'characters/Ruijerd_base.png', spritesheet: base + 'characters/Ruijerd_spritesheet.webp', charJson: base + 'characters/Ruijerd_char.json' },
    Perugius: { base: base + 'characters/Perugius_base.png', spritesheet: base + 'characters/Perugius_spritesheet.webp', charJson: base + 'characters/Perugius_char.json' },
    Sylphiette: { base: base + 'characters/Sylphiette_base.png', spritesheet: base + 'characters/Sylphiette_spritesheet.webp', charJson: base + 'characters/Sylphiette_char.json' },
    Roxy: { base: base + 'characters/Roxy_base.png' },
    ErisGreyrat: { base: base + 'characters/ErisGreyrat_base.png', spritesheet: base + 'characters/ErisGreyrat_spritesheet.webp', charJson: base + 'characters/ErisGreyrat_char.json' },
    Rudeus: { base: base + 'characters/Rudeus_base.png', spritesheet: base + 'characters/Rudeus_spritesheet.webp', charJson: base + 'characters/Rudeus_char.json' }
  };

  var jokers = {
    Orsted: { base: base + 'jokers/Orsted_base.png', spritesheet: base + 'jokers/Orsted_joker.webp', sheetCols: 9, sheetRows: 1 },
    Hitogami: { base: base + 'jokers/Hitogami_base.png', spritesheet: base + 'jokers/Hitogami_joker.webp', sheetCols: 9, sheetRows: 1 }
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
