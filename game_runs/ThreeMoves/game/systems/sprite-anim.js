(function (root) {
  var NS = root.ThreeMoves = root.ThreeMoves || {};
  var FRAME_COUNT = 9;
  var active = [];
  var sheetCache = Object.create(null);

  function finish(callback) {
    if (typeof callback === 'function') callback();
  }

  function ensureSheet(media) {
    if (!media || !media.spritesheet || !root.Image) return null;
    var src = media.spritesheet;
    if (sheetCache[src]) return sheetCache[src];

    var entry = { image: new root.Image(), status: 'loading' };
    entry.image.onload = function () { entry.status = 'loaded'; };
    entry.image.onerror = function () {
      entry.status = 'error';
      var pending = active.slice();
      for (var i = 0; i < pending.length; i += 1) {
        if (pending[i].sheetSrc === src && typeof pending[i].abort === 'function') pending[i].abort();
      }
    };
    entry.image.src = src;
    sheetCache[src] = entry;
    return entry;
  }

  function setFrame(layer, frame, row) {
    layer.style.backgroundPositionX = (frame / 8 * 100) + '%';
    layer.style.backgroundPositionY = (row / 3 * 100) + '%';
  }

  function removeActive(item) {
    var index = active.indexOf(item);
    if (index !== -1) active.splice(index, 1);
  }

  function playOnce(slotEl, media, suit, done) {
    if (!NS.Config || NS.Config.ANIM_ENABLED === false || !slotEl || !media || !media.spritesheet) {
      finish(done);
      return;
    }

    var row = api.ROW_BY_SUIT[suit];
    if (row === undefined) {
      finish(done);
      return;
    }

    var sheet = ensureSheet(media);
    if (!sheet || sheet.status === 'error') {
      finish(done);
      return;
    }

    var layer = document.createElement('div');
    layer.className = 'sprite-anim';
    layer.setAttribute('aria-hidden', 'true');
    layer.style.backgroundImage = 'url("' + media.spritesheet + '")';
    setFrame(layer, 0, row);
    slotEl.appendChild(layer);

    var item = { slot: slotEl, layer: layer, raf: 0, done: done, sheetSrc: media.spritesheet, finished: false };
    active.push(item);

    function cleanup(callDone) {
      if (item.finished) return;
      item.finished = true;
      if (item.raf && root.cancelAnimationFrame) root.cancelAnimationFrame(item.raf);
      removeActive(item);
      if (layer.parentNode) layer.parentNode.removeChild(layer);
      if (callDone) finish(done);
    }
    item.abort = function () { cleanup(true); };

    if (!root.requestAnimationFrame) {
      setFrame(layer, 8, row);
      cleanup(true);
      return;
    }

    var startedAt = root.performance && root.performance.now ? root.performance.now() : Date.now();
    var fps = Number(NS.Config.ANIM_FPS) > 0 ? Number(NS.Config.ANIM_FPS) : 12;
    function tick(now) {
      if (!slotEl.isConnected) {
        cleanup(false);
        return;
      }
      var elapsed = Math.max(0, now - startedAt);
      var frame = Math.floor(elapsed * fps / 1000);
      if (frame >= FRAME_COUNT) {
        cleanup(true);
        return;
      }
      setFrame(layer, frame, row);
      item.raf = root.requestAnimationFrame(tick);
    }
    item.raf = root.requestAnimationFrame(tick);
  }

  function preload(mediaList) {
    if (!NS.Config || NS.Config.ANIM_ENABLED === false || !Array.isArray(mediaList)) return;
    for (var i = 0; i < mediaList.length; i += 1) ensureSheet(mediaList[i]);
  }

  function stopAll() {
    var items = active.slice();
    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];
      if (item.raf && root.cancelAnimationFrame) root.cancelAnimationFrame(item.raf);
      item.finished = true;
      if (item.layer && item.layer.parentNode) item.layer.parentNode.removeChild(item.layer);
    }
    active.length = 0;
  }

  var api = {
    ROW_BY_SUIT: { spade: 0, heart: 1, diamond: 2, club: 3 },
    preload: preload,
    playOnce: playOnce,
    stopAll: stopAll,
  };

  NS.SpriteAnim = api;
})(window);
