/* ShadowForge — 运行时粒子变形引擎（三权重混合时间轴）。
 * 起终点云按索引天然配对（同锚点采样），本文件只管"怎么飘"：
 *   wSrc(1→0) + wBlob(中段隆起，带湍流/上浮) + wTgt(0→1)，叠 stagger 参差。
 * 渲染用 Blitter（<1k bob 每特效，并发 3~4 个无压力），每个特效自建自毁。
 * 四个动词：morph 变形 / burst 受击迸溅 / dissolve 死亡消散 / absorb 吸魄归体。 */
(function () {
  const sstep = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  Forge.FX = {
    init(scene) {
      this.scene = scene;
      const mkDot = (key, rgb) => {
        if (scene.textures.exists(key)) return;
        const s = 12, cv = document.createElement('canvas');
        cv.width = cv.height = s;
        const ctx = cv.getContext('2d');
        const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        g.addColorStop(0, `rgba(${rgb},1)`);
        g.addColorStop(0.55, `rgba(${rgb},0.72)`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
        scene.textures.addCanvas(key, cv);
      };
      mkDot('fx_dot', '255,255,255');    // 中性白，实际颜色由 tint 决定
      mkDot('fx_gold', '255,214,120');   // 吸魄金尘
    },

    // 固定索引哈希（非随机，同一特效内每帧颜色稳定不闪）→ mix.ratio 比例落 accent，其余落墨色
    _tintFor(i, mix) {
      if (!mix || !mix.ratio) return Forge.C.INK;
      const h = ((i * 2654435761) >>> 0) % 1000 / 1000;
      return h < mix.ratio ? mix.accent : Forge.C.INK;
    },

    _spawn(tex, n, mix) {
      const b = this.scene.add.blitter(0, 0, tex).setDepth(Forge.C.DEPTH.FX);
      const bobs = [];
      for (let i = 0; i < n; i++) {
        const bob = b.create(-99, -99);
        if (tex !== 'fx_gold') bob.tint = this._tintFor(i, mix);   // 金尘保留烘焙色，不参与染色系统
        bobs.push(bob);
      }
      return { b, bobs };
    },

    // ── 变形：src 形态@位置 → dst 形态@位置（位置可不同 = 转移）──
    // o: { src:{cloud,x,y,scale,flip}, dst:{cloud,x,y,scale,flip}, dur, turb, rise, tex, n, mix, onDone }
    // flip：点云统一朝右采样，朝左时传 -1 做水平镜像；mix：{ratio,accent} 玩家渐染色，见 config.js PALETTE
    morph(o) {
      const n = o.n || Forge.FXN.morph;
      const { b, bobs } = this._spawn(o.tex || 'fx_dot', n, o.mix);
      const sc = o.src.cloud, tc = o.dst.cloud;
      const sf = o.src.flip || 1, tf = o.dst.flip || 1;
      const sN = sc.length / 2, tN = tc.length / 2;
      const turb = o.turb ?? 30, rise = o.rise ?? 30;
      const stag = new Float32Array(n), fx = new Float32Array(n),
            fy = new Float32Array(n), ph = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        stag[i] = (Math.random() - 0.5) * 0.18;
        fx[i] = 0.8 + Math.random() * 1.6; fy[i] = 0.8 + Math.random() * 1.6;
        ph[i] = Math.random() * Math.PI * 2;
      }
      const proxy = { t: 0 };
      this.scene.tweens.add({
        targets: proxy, t: 1, duration: o.dur, ease: 'Linear',
        onUpdate: () => {
          const t = proxy.t;
          for (let i = 0; i < n; i++) {
            // 个体时间轴：t 拉伸到 1.2 倍再叠 ±0.09 偏移，保证 t=1 时全员归位
            const lt = Math.min(1, Math.max(0, t * 1.2 - 0.1 + stag[i]));
            const wS = 1 - sstep(0, 0.26, lt);
            const wT = sstep(0.7, 1, lt);
            const wB = Math.max(0, 1 - wS - wT);
            const bt = sstep(0.26, 0.7, lt);
            const si = (i % sN) * 2, ti = (i % tN) * 2;
            const bx = o.src.x + (o.dst.x - o.src.x) * bt
                     + Math.sin(lt * fx[i] * 6.28 + ph[i]) * turb * wB;
            const by = o.src.y + (o.dst.y - o.src.y) * bt
                     - Math.sin(Math.PI * bt) * rise
                     + Math.sin(lt * fy[i] * 6.28 + ph[i] * 1.3) * turb * 0.6 * wB;
            bobs[i].x = wS * (o.src.x + sc[si] * o.src.scale * sf) + wB * bx
                      + wT * (o.dst.x + tc[ti] * o.dst.scale * tf);
            bobs[i].y = wS * (o.src.y + sc[si + 1] * o.src.scale) + wB * by
                      + wT * (o.dst.y + tc[ti + 1] * o.dst.scale);
            bobs[i].alpha = 0.92;
          }
        },
        onComplete: () => { b.destroy(); o.onDone && o.onDone(); },
      });
    },

    // ── 受击迸溅：从点云随机抽子集，向 dirX 侧飞散 + 重力坠落 ──
    burst(o) {
      const n = o.n || Forge.FXN.burst;
      const { b, bobs } = this._spawn(o.tex || 'fx_dot', n, o.mix);
      const c = o.cloud, cN = c.length / 2, fl = o.flip || 1;
      const px = new Float32Array(n), py = new Float32Array(n),
            vx = new Float32Array(n), vy = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const j = ((Math.random() * cN) | 0) * 2;
        px[i] = o.x + c[j] * o.scale * fl; py[i] = o.y + c[j + 1] * o.scale;
        vx[i] = (o.dirX || 1) * (50 + Math.random() * 240) + (Math.random() - 0.5) * 90;
        vy[i] = -(30 + Math.random() * 170);
      }
      const proxy = { t: 0 };
      this.scene.tweens.add({
        targets: proxy, t: 1, duration: o.dur || 460, ease: 'Linear',
        onUpdate: () => {
          const t = proxy.t;
          for (let i = 0; i < n; i++) {
            bobs[i].x = px[i] + vx[i] * t;
            bobs[i].y = py[i] + vy[i] * t + 300 * t * t;
            bobs[i].alpha = 1 - t;
          }
        },
        onComplete: () => b.destroy(),
      });
    },

    // ── 死亡消散：整团上飘扩散、渐隐（不重组）──
    dissolve(o) {
      const n = o.n || Forge.FXN.kill;
      const { b, bobs } = this._spawn(o.tex || 'fx_dot', n, o.mix);
      const c = o.cloud, cN = c.length / 2, fl = o.flip || 1;
      const px = new Float32Array(n), py = new Float32Array(n),
            vx = new Float32Array(n), vy = new Float32Array(n), ph = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const j = ((Math.random() * cN) | 0) * 2;
        px[i] = o.x + c[j] * o.scale * fl; py[i] = o.y + c[j + 1] * o.scale;
        vx[i] = (Math.random() - 0.5) * 70;
        vy[i] = -(24 + Math.random() * 80);
        ph[i] = Math.random() * Math.PI * 2;
      }
      const proxy = { t: 0 };
      this.scene.tweens.add({
        targets: proxy, t: 1, duration: o.dur || 850, ease: 'Sine.easeOut',
        onUpdate: () => {
          const t = proxy.t;
          for (let i = 0; i < n; i++) {
            bobs[i].x = px[i] + vx[i] * t + Math.sin(t * 5 + ph[i]) * 9 * t;
            bobs[i].y = py[i] + vy[i] * t;
            bobs[i].alpha = 0.95 * (1 - t);
          }
        },
        onComplete: () => { b.destroy(); o.onDone && o.onDone(); },
      });
    },

    // ── 吸魄：先炸开一小圈，再全体归拢到移动目标（targetFn 每帧取玩家位置）──
    absorb(o) {
      const n = o.n || Forge.FXN.absorb;
      const { b, bobs } = this._spawn(o.tex || 'fx_gold', n);
      const c = o.cloud, cN = c.length / 2, fl = o.flip || 1;
      const px = new Float32Array(n), py = new Float32Array(n),
            dx = new Float32Array(n), dy = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const j = ((Math.random() * cN) | 0) * 2;
        px[i] = o.x + c[j] * o.scale * fl; py[i] = o.y + c[j + 1] * o.scale;
        const a = Math.random() * Math.PI * 2, r = 18 + Math.random() * 46;
        dx[i] = Math.cos(a) * r; dy[i] = Math.sin(a) * r - 20;
      }
      const proxy = { t: 0 };
      this.scene.tweens.add({
        targets: proxy, t: 1, duration: o.dur || 780, ease: 'Linear',
        onUpdate: () => {
          const t = proxy.t, tgt = o.targetFn();
          for (let i = 0; i < n; i++) {
            if (t < 0.35) {
              const e = sstep(0, 0.35, t);
              bobs[i].x = px[i] + dx[i] * e; bobs[i].y = py[i] + dy[i] * e;
            } else {
              const e = Math.pow((t - 0.35) / 0.65, 1.7);
              bobs[i].x = (px[i] + dx[i]) + (tgt.x - px[i] - dx[i]) * e;
              bobs[i].y = (py[i] + dy[i]) + (tgt.y - py[i] - dy[i]) * e;
            }
            bobs[i].alpha = 0.95;
          }
        },
        onComplete: () => { b.destroy(); o.onDone && o.onDone(); },
      });
    },
  };
})();
