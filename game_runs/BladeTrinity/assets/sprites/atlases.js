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
      "height": 1456
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
      },
      "jump": {
        "row": 6,
        "frameCount": 21,
        "fps": 8,
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
      "height": 1456
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
      },
      "jump": {
        "row": 6,
        "frameCount": 21,
        "fps": 10,
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
      "height": 1456
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
      },
      "jump": {
        "row": 6,
        "frameCount": 21,
        "fps": 11,
        "loop": false
      }
    }
  }
};

// 逐帧刀长：attack 行每一帧里，实体剪影最前端距格中心的【纹理像素】。
// 由 tools/rebuild.sh 量图集算出（列不透明像素>=4 才算实体，滤掉刀光细丝）。
// 命中判定用它 × BT.SCALE，而不是一个静态 reach —— 刀伸多远就打多远。
window.BT.REACH = {"sword":[39,40,41,40,40,40,40,41,40,70,79,36,36,36,36,36,38,39,40,78,71],"water":[33,32,29,27,31,39,82,81,51,46,38,84,85,47,47,47,46,46,45,42,38],"north":[58,38,38,37,35,37,44,33,40,35,43,73,47,78,66,65,64,64,64,63,57]};

// 倒地补偿：down 行末帧的【躯干】最低点距脚底基线 202 的纹理像素数。
// 图集每一行都按站立取景，倒地帧因此整体偏高——躺下的人后背悬在地面线上方
// 十几到三十屏幕px，在完全水平的台面前一眼可见。
// 量法：末帧逐行数不透明像素，取宽度>=25px（滤掉头发/衣摆细丝）的最低行，
//   sword 190 / water 186 / north 194 → 202 减之。
// 注意这是"后背贴地"口径，头发会因此沉到地面线下若干px——由前景接地条盖住。
window.BT.DOWN_DROP = { sword: 12, water: 16, north: 8 };
