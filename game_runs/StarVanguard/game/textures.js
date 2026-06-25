/* StarVanguard — 程序化像素纹理生成器;由 game-logic.js 平移。 */
function createPixelTexture(scene, key, grid, pixelSize = 3) {
  const PALETTE = {
    '.': 'rgba(0,0,0,0)',
    'k': '#1e293b', // Outline slate-800
    'w': '#94a3b8', // Gray slate-400
    'W': '#ffffff', // White
    'b': '#1d4ed8', // Blue-700
    'B': '#3b82f6', // Blue-500
    'c': '#0891b2', // Cyan-600
    'C': '#22d3ee', // Cyan-400
    'r': '#b91c1c', // Red-700
    'R': '#ef4444', // Red-500
    'y': '#ca8a04', // Yellow-600
    'Y': '#fde047', // Yellow-300
    'g': '#15803d', // Green-700
    'G': '#22c55e', // Green-500
    'p': '#7e22ce', // Purple-700
    'P': '#c084fc', // Purple-400
    'o': '#c2410c', // Orange-700
    'O': '#f97316', // Orange-500
    's': '#475569', // Stone slate-600
    'S': '#64748b', // Light Stone slate-500
    'K': '#0f172a', // Dark slate-900
  };

  const height = grid.length;
  const width = grid[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = width * pixelSize;
  canvas.height = height * pixelSize;
  const ctx = canvas.getContext('2d');
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const char = grid[y][x];
      if (char && char !== '.' && PALETTE[char]) {
        ctx.fillStyle = PALETTE[char];
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
  }
  scene.textures.addCanvas(key, canvas);
}
