// BladeTrinity 精灵图集元数据 —— 由 tools/rebuild.sh 生成，勿手改
// 架构铁律：元数据走 <script> + window 命名空间，不 fetch json（见 CLAUDE.md）
window.BT = window.BT || {};
window.BT.ATLAS = {
  "sword": {
    "frameSize": {
      "width": 192,
      "height": 208
    },
    "dimensions": {
      "width": 4032,
      "height": 1248
    },
    "animations": {
      "walk": {
        "row": 0,
        "frameCount": 21,
        "fps": 12,
        "loop": true
      },
      "idle": {
        "row": 1,
        "frameCount": 21,
        "fps": 12,
        "loop": true
      },
      "attack": {
        "row": 2,
        "frameCount": 21,
        "fps": 10,
        "loop": false
      },
      "guard": {
        "row": 3,
        "frameCount": 21,
        "fps": 9,
        "loop": false
      },
      "hurt": {
        "row": 4,
        "frameCount": 18,
        "fps": 10,
        "loop": false
      },
      "down": {
        "row": 5,
        "frameCount": 16,
        "fps": 13,
        "loop": false
      }
    }
  },
  "water": {
    "frameSize": {
      "width": 192,
      "height": 208
    },
    "dimensions": {
      "width": 4032,
      "height": 1248
    },
    "animations": {
      "walk": {
        "row": 0,
        "frameCount": 21,
        "fps": 13,
        "loop": true
      },
      "idle": {
        "row": 1,
        "frameCount": 21,
        "fps": 12,
        "loop": true
      },
      "attack": {
        "row": 2,
        "frameCount": 21,
        "fps": 8,
        "loop": false
      },
      "guard": {
        "row": 3,
        "frameCount": 21,
        "fps": 7,
        "loop": false
      },
      "hurt": {
        "row": 4,
        "frameCount": 18,
        "fps": 10,
        "loop": false
      },
      "down": {
        "row": 5,
        "frameCount": 16,
        "fps": 13,
        "loop": false
      }
    }
  },
  "north": {
    "frameSize": {
      "width": 192,
      "height": 208
    },
    "dimensions": {
      "width": 4032,
      "height": 1248
    },
    "animations": {
      "walk": {
        "row": 0,
        "frameCount": 21,
        "fps": 13,
        "loop": true
      },
      "idle": {
        "row": 1,
        "frameCount": 21,
        "fps": 13,
        "loop": true
      },
      "attack": {
        "row": 2,
        "frameCount": 21,
        "fps": 8,
        "loop": false
      },
      "guard": {
        "row": 3,
        "frameCount": 21,
        "fps": 7,
        "loop": false
      },
      "hurt": {
        "row": 4,
        "frameCount": 18,
        "fps": 9,
        "loop": false
      },
      "down": {
        "row": 5,
        "frameCount": 16,
        "fps": 12,
        "loop": false
      }
    }
  }
};

// 逐帧刀长：attack 行每一帧里，实体剪影最前端距格中心的【纹理像素】。
// 由 tools/rebuild.sh 量图集算出（列不透明像素>=4 才算实体，滤掉刀光细丝）。
// 命中判定用它 × BT.SCALE，而不是一个静态 reach —— 刀伸多远就打多远。
window.BT.REACH = {"sword":[39,40,41,40,40,40,40,41,40,70,79,36,36,36,36,36,38,39,40,78,71],"water":[33,32,29,27,31,39,82,81,51,46,38,84,85,47,47,47,46,46,45,42,38],"north":[58,38,38,37,35,37,44,33,40,35,43,73,47,78,66,65,64,64,64,63,57]};
