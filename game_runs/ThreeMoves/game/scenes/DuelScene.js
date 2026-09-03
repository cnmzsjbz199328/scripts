(function (root) {
  var NS = root.ThreeMoves = root.ThreeMoves || {};
  NS.Scenes = NS.Scenes || {};

  function DuelScene(app) { this.app = app; this.key = 'DuelScene'; }
  DuelScene.prototype.create = function () {
    this.app.activeScene = this.key;
    this.app.renderer.render();
  };
  DuelScene.prototype.update = function () {};

  NS.Scenes.DuelScene = DuelScene;
})(window);
