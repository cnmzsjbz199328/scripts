/* MermaidPrincess — 深度常量;由 game-logic.js 顶部平移。 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Depth constants according to the specification
const DEPTH = {
  GROUND:      0,
  DECOR_FLOOR: 100,
  YSORT:       1000,   // objects + entities share this pool: DEPTH.YSORT + y
  DECOR_TOP:   9000,
  EFFECTS:     9500,
};

