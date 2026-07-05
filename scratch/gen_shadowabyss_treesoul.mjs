// ShadowAbyss「树魂」（自杀者荆棘树林,divine-comedy.json dc_wood_suicides）：
// 程序化 SVG 扭曲树形剪影，代替人形——这个角色本就不是"站着说话的人"，
// 硬套 Mixamo 人形模型会文不对题，改用参数化树形生成 4 帧极轻微枝条颤动。
// 输出：game_runs/ShadowAbyss/assets/3d/treesoul_idle_{0..3}.png（192x208，同其余路人剪影一致尺寸）
import sharp from 'sharp';
import fs from 'node:fs';

const W = 192, H = 208;
const COLOR = '#1b2436';
const OUT = 'game_runs/ShadowAbyss/assets/3d';

function branch(x0, y0, ang, len, depth, wobble) {
  if (depth <= 0) return '';
  const a = ang + wobble;
  const x1 = x0 + Math.cos(a) * len;
  const y1 = y0 + Math.sin(a) * len;
  const midx = x0 + Math.cos(a) * len * 0.5 + Math.sin(a) * (6 - depth);
  const midy = y0 + Math.sin(a) * len * 0.5 - Math.cos(a) * (6 - depth);
  const d = `M ${x0.toFixed(1)} ${y0.toFixed(1)} Q ${midx.toFixed(1)} ${midy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  let out = `<path d="${d}" stroke="${COLOR}" stroke-width="${(depth * 1.6).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
  if (depth > 1) {
    out += branch(x1, y1, a - 0.55, len * 0.72, depth - 1, wobble * 0.6);
    out += branch(x1, y1, a + 0.5, len * 0.68, depth - 1, wobble * 0.6);
    if (depth === 2) {
      const tx = x1 + Math.cos(a + 1.4) * 8, ty = y1 + Math.sin(a + 1.4) * 8;
      out += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" stroke="${COLOR}" stroke-width="1.2"/>`;
    }
  }
  return out;
}

for (let f = 0; f < 4; f++) {
  const wobble = Math.sin(f / 4 * Math.PI * 2) * 0.03;
  const trunkTopX = 96 + Math.sin(f) * 1.5;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  // 扭曲主干（略微 S 形，暗示痛苦的躯体残留）
  svg += `<path d="M 88 208 C 82 170 100 150 90 120 C 80 96 104 80 96 50 C 92 36 100 26 ${trunkTopX.toFixed(1)} 18"
    stroke="${COLOR}" stroke-width="15" fill="none" stroke-linecap="round"/>`;
  // 树皮节疤/痛苦的面容（一道裂口当作"嘴"，呼应"树竟流出黑血,并发出哭喊"）
  svg += `<ellipse cx="92" cy="96" rx="7" ry="10" fill="none" stroke="${COLOR}" stroke-width="2"/>`;
  svg += `<path d="M 86 108 Q 92 ${114 + wobble * 40} 98 108" stroke="${COLOR}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  // 主枝干（左右各两条，逐级细分出荆棘状分叉）
  svg += branch(90, 118, Math.PI * 1.15, 46, 4, wobble);
  svg += branch(96, 70, Math.PI * 1.75, 40, 4, -wobble);
  svg += branch(94, 45, Math.PI * 1.4, 34, 3, wobble * 1.3);
  // 地面根须
  svg += `<path d="M 88 208 Q 70 198 54 206 M 96 208 Q 116 196 134 204" stroke="${COLOR}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  svg += '</svg>';
  await sharp(Buffer.from(svg)).png().toFile(`${OUT}/treesoul_idle_${f}.png`);
}
console.log('✓ 4 帧 → ' + OUT + '/treesoul_idle_[0..3].png');
