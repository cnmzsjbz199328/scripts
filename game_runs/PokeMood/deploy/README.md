# PokeMood 独立部署

把 PokeMood 从 showreel 里单拎出来，部署成一个自己的 Cloudflare Pages 站点。
**游戏仍然留在本仓库、留在 showreel 里**，源码只有一份，这里只是多一条出口。

## 为什么要单独部署

showreel 下的 `/PokeMood/` 是子路径，PWA 的 `scope` / `start_url` 只能挂在站点根，
装到手机主屏后作用域会和 hub 打架。独立站拿到自己的根域名后：

- 可以注册 Service Worker + manifest → Android Chrome 会提示「安装应用」
- 装完从主屏启动，**没有地址栏、没有底部功能条**，才是真全屏

⚠️ 只是「单独部署」并不会自动去掉浏览器功能键 —— 功能键是浏览器 UI，不归页面管。
真正去掉它的是下面两条，独立站是让这两条能成立的前提：

1. **点「开始」时请求全屏**（`index.html` 里的 `enterFullscreen`）。桌面 / Android Chrome 有效。
2. **添加到主屏幕，以 PWA 打开**（`manifest.webmanifest` 的 `display: fullscreen`）。
   iOS Safari 不给网页调全屏 API，这是 iPhone 上**唯一**能去掉功能条的路径：
   分享 → 添加到主屏幕 → 从主屏图标启动。

## 构建

```bash
npm run pokemood:build          # → game_runs/PokeMood/dist/（约 30MB，已 gitignore）
npx serve game_runs/PokeMood/dist   # 本地预览
```

`dist/` 是组装出来的，不是手写的，**不要直接改 dist 里的文件** —— 下次构建就没了。
改游戏改 `game_runs/PokeMood/`，改部署产物结构改 `deploy/build.mjs`。

构建脚本做的事：拷 `game/` 与 `assets/`（跳过 `raw/` 中间产物）、把仓库外的
`../_engine/hud.js|audio.js` 拷进 `engine/` 并改写 index.html 的引用、生成
manifest + 图标 + Service Worker + `_headers`。

## 部署（二选一）

**A. 手动上传（最快，先看效果用这个）**

```bash
npm run pokemood:deploy         # build + wrangler pages deploy
```

首次会让你在 Cloudflare 里创建 `pokemood` 项目并登录，之后每次一条命令即可。
拿到 `https://pokemood.pages.dev`。

**B. Git 集成（每次 push 自动部署）**

Cloudflare Dashboard → Workers & Pages → Create → Pages → 连接本仓库：

| 项 | 值 |
|---|---|
| 生产分支 | `master` |
| 构建命令 | `node game_runs/PokeMood/deploy/build.mjs` |
| 输出目录 | `game_runs/PokeMood/dist` |
| 根目录 | 留空（仓库根） |

> 构建需要 `sharp`（生成 PWA 图标），仓库根 `package.json` 里已有；
> Pages 默认会跑 `npm install`。

两者和 showreel 那个 Pages 项目互不影响 —— 同一个仓库可以挂多个 Pages 项目。

## 移动端注意

- `index.html` 已关掉下拉刷新 / 双指缩放 / 长按选中（`touch-action: none` +
  `overscroll-behavior: none`）—— 否则 rub 手势一拖就触发浏览器下拉刷新。
- 画布宽度随屏幕比例在 660～900 之间伸缩（`config.js` 的 `pmCanvasWidth`），
  竖屏手机取 660，角色能占满屏宽；上下留边是素材 580×720 竖构图的固有比例。
- 首屏只等 10 张核心图集（`CORE_ANIMS`），其余 12 张后台补 —— 移动网络下别改成一次全等。
