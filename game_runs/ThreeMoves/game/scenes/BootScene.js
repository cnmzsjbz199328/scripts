(function (root) {
  var NS = root.ThreeMoves = root.ThreeMoves || {};
  NS.Scenes = NS.Scenes || {};

  function BootScene(app) { this.app = app; this.key = 'BootScene'; }
  BootScene.prototype.create = function () {
    this.app.activeScene = this.key;
    this.app.renderer.render();
  };

  NS.Scenes.BootScene = BootScene;
})(window);
