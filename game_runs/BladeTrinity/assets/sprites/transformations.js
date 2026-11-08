// BladeTrinity 蓄力变装图集元数据 —— 由 tools/build-transform.mjs 生成，勿手改
// 架构铁律：元数据走 <script> + window 命名空间，不 fetch json（见 CLAUDE.md）
// 每派一行：chargeFrames 随蓄力进度 clamp(p,0,1) 选帧，p=1 固定 holdFrame（见 game/systems/transformation.js）
window.BT = window.BT || {};
window.BT.TRANSFORM_ATLAS = {
  "sword": {
    "texture": "assets/sprites/transform/sword.webp",
    "frameSize": {
      "width": 192,
      "height": 208
    },
    "cols": 19,
    "rows": 1,
    "chargeFrames": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17
    ],
    "holdFrame": 18,
    "baselineY": 202,
    "facing": "left",
    "srcFacing": "right",
    "srcFrames": [
      8,
      9,
      11,
      12,
      13,
      14,
      16,
      17,
      18,
      20,
      21,
      22,
      24,
      25,
      26,
      27,
      29,
      30
    ],
    "srcHoldFrame": 32,
    "srcSegments": {
      "original": [
        0,
        7
      ],
      "change": [
        8,
        30
      ],
      "hold": [
        31,
        70
      ],
      "release": [
        71,
        104
      ],
      "recover": [
        105,
        143
      ]
    },
    "sourceStatus": "user_accepted",
    "previewFps": 24,
    "sha256": "99E1DFFB2520B5EAC617F8481A129BDE55B691F58022208DA4C47A2B1AD8126A"
  },
  "water": {
    "texture": "assets/sprites/transform/water.webp",
    "frameSize": {
      "width": 192,
      "height": 208
    },
    "cols": 21,
    "rows": 1,
    "chargeFrames": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19
    ],
    "holdFrame": 20,
    "baselineY": 202,
    "facing": "left",
    "srcFacing": "left",
    "srcFrames": [
      5,
      8,
      10,
      13,
      15,
      18,
      20,
      23,
      25,
      28,
      30,
      33,
      35,
      38,
      40,
      43,
      45,
      48,
      50,
      53
    ],
    "srcHoldFrame": 57,
    "srcSegments": {
      "original": [
        0,
        4
      ],
      "change": [
        5,
        53
      ],
      "hold": [
        54,
        59
      ],
      "release": [
        60,
        104
      ],
      "finish": [
        105,
        143
      ]
    },
    "sourceStatus": "user_accepted",
    "previewFps": 24,
    "sha256": "A17C658DA97C3503D4BC3F86A5E533EE8B5C3CF722E0289409D1E0628BDEB478"
  },
  "north": {
    "texture": "assets/sprites/transform/north.webp",
    "frameSize": {
      "width": 192,
      "height": 208
    },
    "cols": 21,
    "rows": 1,
    "chargeFrames": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19
    ],
    "holdFrame": 20,
    "baselineY": 202,
    "facing": "left",
    "srcFacing": "left",
    "srcFrames": [
      10,
      12,
      13,
      15,
      17,
      18,
      20,
      22,
      23,
      25,
      27,
      29,
      30,
      32,
      34,
      35,
      37,
      39,
      40,
      42
    ],
    "srcHoldFrame": 45,
    "srcSegments": {
      "original": [
        0,
        7
      ],
      "change": [
        8,
        42
      ],
      "hold": [
        43,
        61
      ],
      "release": [
        62,
        104
      ],
      "finish": [
        105,
        143
      ]
    },
    "sourceStatus": "candidate_v6（未经用户最终验收）",
    "previewFps": 24,
    "sha256": "28AED1FBDADB97982BC7166364D5E2A020C0726181130550A9E2849D74D7E522"
  }
};
