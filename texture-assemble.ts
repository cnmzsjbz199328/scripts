/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

async function assembleTexture(projectName: string) {
  const runDir = path.join('./texture_runs', projectName);
  const manifestPath = path.join(runDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`Project not found. Run: npx tsx scripts/texture-prepare.ts ${projectName}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  console.log(`Assembling texture library for project "${projectName}"...`);

  // Scan output directory to make sure files exist
  const outputDir = path.join(runDir, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.png'));
  console.log(`Found ${files.length} processed texture(s) in output folder.`);

  // Clean manifest textures that no longer exist on disk
  const activeTextures: Record<string, any> = {};
  for (const filename of files) {
    if (manifest.textures[filename]) {
      activeTextures[filename] = manifest.textures[filename];
    } else {
      // If file exists but not in manifest (e.g. copied manually), register it with defaults
      const parts = filename.replace('.png', '').split('_');
      const material = parts[0];
      const suffix = parts.slice(1).join('_');
      activeTextures[filename] = {
        material,
        suffix: suffix || '',
        size: 512,
        grid_source: 'manual',
        updated_at: new Date().toISOString()
      };
    }
  }
  manifest.textures = activeTextures;
  manifest.status = 'assembled';
  manifest.updated_at = new Date().toISOString();

  // Save updated manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Generate the premium preview HTML
  const htmlPath = path.join(runDir, 'preview.html');
  const htmlContent = getPreviewHtml(projectName, manifest.textures);
  fs.writeFileSync(htmlPath, htmlContent);

  console.log(`Successfully generated interactive preview: ${htmlPath}`);
}

function getPreviewHtml(projectName: string, textures: Record<string, any>): string {
  const texturesJson = JSON.stringify(textures, null, 2);

  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>游戏贴图平铺预览 - ${projectName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #090d16;
      --bg-card: rgba(22, 28, 45, 0.65);
      --border-color: rgba(255, 255, 255, 0.08);
      --accent: #3b82f6;
      --accent-hover: #60a5fa;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Outfit', 'Noto Sans SC', sans-serif;
      background-color: var(--bg-dark);
      color: var(--text-main);
      height: 100vh;
      overflow: hidden;
      display: flex;
    }

    /* Layout */
    .sidebar {
      width: 400px;
      height: 100vh;
      background: var(--bg-card);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      padding: 2rem;
      z-index: 10;
      box-shadow: 10px 0 30px rgba(0, 0, 0, 0.25);
    }

    .main-viewport {
      flex: 1;
      height: 100vh;
      position: relative;
      background-color: #0d111a;
      background-image: 
        radial-gradient(var(--border-color) 1px, transparent 1px),
        radial-gradient(var(--border-color) 1px, transparent 1px);
      background-size: 20px 20px;
      background-position: 0 0, 10px 10px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    /* Sidebar Content */
    header {
      margin-bottom: 2.5rem;
    }

    header h1 {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      margin-bottom: 0.25rem;
      background: linear-gradient(135deg, #fff 0%, var(--text-muted) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    header p {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .section-title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .control-group {
      margin-bottom: 2rem;
    }

    /* Form Elements */
    .select-wrapper {
      position: relative;
      width: 100%;
    }

    select {
      width: 100%;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border-color);
      padding: 0.85rem 1rem;
      border-radius: 10px;
      color: var(--text-main);
      font-family: inherit;
      font-size: 0.95rem;
      appearance: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    select:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }

    .select-wrapper::after {
      content: '↓';
      font-family: monospace;
      position: absolute;
      right: 1.25rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      pointer-events: none;
    }

    /* Sliders and Toggles */
    .slider-container {
      background: rgba(15, 23, 42, 0.4);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1rem;
    }

    .slider-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.75rem;
      font-size: 0.9rem;
    }

    .slider-val {
      font-weight: 600;
      color: var(--accent);
    }

    input[type="range"] {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      outline: none;
      -webkit-appearance: none;
      cursor: pointer;
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
      transition: all 0.1s ease;
    }

    input[type="range"]::-webkit-slider-thumb:hover {
      transform: scale(1.15);
    }

    .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
    }

    .toggle-row span {
      font-size: 0.9rem;
    }

    /* Switch styling */
    .switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider-switch {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(255, 255, 255, 0.1);
      transition: .3s;
      border-radius: 24px;
      border: 1px solid var(--border-color);
    }

    .slider-switch:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
    }

    input:checked + .slider-switch {
      background-color: var(--accent);
    }

    input:checked + .slider-switch:before {
      transform: translateX(20px);
    }

    /* Metadata Panel */
    .metadata-card {
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1.25rem;
      margin-top: auto;
      font-size: 0.85rem;
    }

    .metadata-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .metadata-row:last-child {
      margin-bottom: 0;
    }

    .metadata-lbl {
      color: var(--text-muted);
    }

    .metadata-val {
      font-weight: 500;
      color: var(--text-main);
    }

    /* Viewport Area */
    .preview-container {
      position: relative;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    /* Box view mode */
    .preview-container.mode-box {
      width: 600px;
      height: 600px;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      overflow: hidden;
    }

    /* Full screen view mode */
    .preview-container.mode-full {
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
    }

    .tiled-texture {
      width: 100%;
      height: 100%;
      background-repeat: repeat;
      background-position: center;
      transition: background-size 0.05s linear;
    }

    .grid-overlay {
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      display: none;
      transition: background-size 0.05s linear;
    }

    .grid-overlay.active {
      display: block;
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      max-width: 320px;
    }

    .empty-state h3 {
      font-size: 1.25rem;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      font-size: 0.85rem;
      color: var(--text-muted);
      line-height: 1.5;
    }
  </style>
</head>
<body>

  <div class="sidebar">
    <header>
      <h1>贴图平铺预览</h1>
      <p>项目: ${projectName}</p>
    </header>

    <div class="control-group">
      <div class="section-title">选择贴图</div>
      <div class="select-wrapper">
        <select id="textureSelect" onchange="updatePreview()">
          <!-- Dynamically populated -->
        </select>
      </div>
    </div>

    <div class="control-group">
      <div class="section-title">显示与平铺设置</div>
      <div class="slider-container">
        
        <div class="toggle-row">
          <span>全屏预览</span>
          <label class="switch">
            <input type="checkbox" id="fullScreenToggle" onchange="toggleViewMode()">
            <span class="slider-switch"></span>
          </label>
        </div>

        <div class="toggle-row" style="border-bottom: 1px solid var(--border-color); margin-bottom: 0.75rem; padding-bottom: 0.75rem;">
          <span>显示网格接缝线</span>
          <label class="switch">
            <input type="checkbox" id="gridToggle" onchange="toggleGrid()">
            <span class="slider-switch"></span>
          </label>
        </div>

        <div id="repeatControlBox">
          <div class="slider-header">
            <span>重复次数 (对角)</span>
            <span class="slider-val" id="repeatVal">4x</span>
          </div>
          <input type="range" id="repeatSlider" min="1" max="12" value="4" step="1" oninput="updateTiling()">
        </div>

        <div id="pixelControlBox" style="display: none;">
          <div class="slider-header">
            <span>单元尺寸 (px)</span>
            <span class="slider-val" id="pixelVal">256px</span>
          </div>
          <input type="range" id="pixelSlider" min="64" max="1024" value="256" step="16" oninput="updateTiling()">
        </div>

      </div>
    </div>

    <div class="metadata-card" id="metadataCard">
      <div class="section-title" style="margin-bottom: 0.5rem;">资产元数据</div>
      <div class="metadata-row">
        <span class="metadata-lbl">材质类别</span>
        <span class="metadata-val" id="metaMaterial">-</span>
      </div>
      <div class="metadata-row">
        <span class="metadata-lbl">变体后缀</span>
        <span class="metadata-val" id="metaSuffix">-</span>
      </div>
      <div class="metadata-row">
        <span class="metadata-lbl">输出尺寸</span>
        <span class="metadata-val" id="metaSize">-</span>
      </div>
      <div class="metadata-row">
        <span class="metadata-lbl">生成源</span>
        <span class="metadata-val" id="metaSource">-</span>
      </div>
    </div>
  </div>

  <div class="main-viewport" id="viewport">
    <div id="emptyView" class="empty-state">
      <h3>暂无导入贴图</h3>
      <p>请先运行脚本导入您的贴图资产：<br><code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 6px;">npx tsx scripts/texture-process.ts ...</code></p>
    </div>

    <div id="previewContainer" class="preview-container mode-box" style="display: none;">
      <div id="tiledTexture" class="tiled-texture"></div>
      <div id="gridOverlay" class="grid-overlay"></div>
    </div>
  </div>

  <script>
    const TEXTURES = ${texturesJson};

    const textureSelect = document.getElementById('textureSelect');
    const previewContainer = document.getElementById('previewContainer');
    const emptyView = document.getElementById('emptyView');
    const tiledTexture = document.getElementById('tiledTexture');
    const gridOverlay = document.getElementById('gridOverlay');
    const gridToggle = document.getElementById('gridToggle');
    const fullScreenToggle = document.getElementById('fullScreenToggle');

    const repeatSlider = document.getElementById('repeatSlider');
    const repeatVal = document.getElementById('repeatVal');
    const pixelSlider = document.getElementById('pixelSlider');
    const pixelVal = document.getElementById('pixelVal');

    const repeatControlBox = document.getElementById('repeatControlBox');
    const pixelControlBox = document.getElementById('pixelControlBox');

    // Populate dropdown
    const fileKeys = Object.keys(TEXTURES);
    if (fileKeys.length > 0) {
      emptyView.style.display = 'none';
      previewContainer.style.display = 'block';

      fileKeys.forEach(filename => {
        const option = document.createElement('option');
        option.value = filename;
        option.textContent = filename;
        textureSelect.appendChild(option);
      });

      // Select first texture by default
      updatePreview();
    }

    function updatePreview() {
      const filename = textureSelect.value;
      if (!filename) return;

      const meta = TEXTURES[filename];
      const imgUrl = 'output/' + filename;

      // Update image
      tiledTexture.style.backgroundImage = 'url("' + imgUrl + '")';

      // Update metadata
      document.getElementById('metaMaterial').textContent = meta.material;
      document.getElementById('metaSuffix').textContent = meta.suffix || '(无)';
      document.getElementById('metaSize').textContent = meta.size + ' × ' + meta.size + ' px';
      document.getElementById('metaSource').textContent = meta.grid_source;

      updateTiling();
    }

    function toggleViewMode() {
      const isFull = fullScreenToggle.checked;
      if (isFull) {
        previewContainer.className = 'preview-container mode-full';
        repeatControlBox.style.display = 'none';
        pixelControlBox.style.display = 'block';
      } else {
        previewContainer.className = 'preview-container mode-box';
        repeatControlBox.style.display = 'block';
        pixelControlBox.style.display = 'none';
      }
      updateTiling();
    }

    function toggleGrid() {
      const isGrid = gridToggle.checked;
      if (isGrid) {
        gridOverlay.classList.add('active');
      } else {
        gridOverlay.classList.remove('active');
      }
    }

    function updateTiling() {
      const isFull = fullScreenToggle.checked;
      let sizeStr = '';

      if (isFull) {
        const px = pixelSlider.value;
        pixelVal.textContent = px + 'px';
        sizeStr = px + 'px ' + px + 'px';
      } else {
        const repeat = repeatSlider.value;
        repeatVal.textContent = repeat + 'x';
        const percentage = (100 / repeat).toFixed(4) + '%';
        sizeStr = percentage + ' ' + percentage;
      }

      tiledTexture.style.backgroundSize = sizeStr;

      // Update grid overlay background size and image
      gridOverlay.style.backgroundSize = sizeStr;
      gridOverlay.style.backgroundImage = 'linear-gradient(to right, rgba(239, 68, 68, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(239, 68, 68, 0.4) 1px, transparent 1px)';
    }
  </script>
</body>
</html>
`;
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: npx tsx scripts/texture-assemble.ts <ProjectName>");
  process.exit(1);
}

assembleTexture(args[0]).catch(console.error);
