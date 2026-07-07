/* engine/morph.js — 运行时粒子变形引擎（三权重混合时间轴），源自 ShadowForge。
 * 起终点云按索引天然配对（同锚点采样），本文件只管"怎么飘"：
 *   wSrc(1→0) + wBlob(中段隆起，带湍流/上浮) + wTgt(0→1)，叠 stagger 参差。
 * 渲染用 Blitter（<1k bob 每特效，并发 3~4 个无压力），每个特效自建自毁。
 * 七个动词：morph 变形 / burst 受击迸溅 / dissolve 死亡消散 / absorb 吸魄归体 /
 *          follow 跟随粒子团（弹丸/拖尾）/ ring 粒子冲击环（预警/命中）/ gather 蓄力聚拢（前摇）。
 * 后三个是通用积木：敌我双方的攻击表现与后续新技能都靠它们组合，不要在游戏侧另写特效。
 * 依赖调用方注入的 Forge.C.DEPTH / Forge.FXN / Forge.C.INK（见 ShadowForge/game/config.js）。 */
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
    // o: { src:{cloud,x,y,scale,flip}, dst:{cloud,x,y,scale,flip}, dur, turb, rise, tex, n, mix, drift, onDone }
    // flip：点云统一朝右采样，朝左时传 -1 做水平镜像；mix：{ratio,accent} 玩家渐染色，见 config.js PALETTE
    // drift：{x,y} px/s——src 解体瞬间的残余速度，线性衰减到 0。粒子继承动量向前甩、
    // 越过落点再被拉回 dst 聚形（follow-through），高速位移后的重组必须传，否则有"惯性断层"
    morph(o) {
      const n = o.n || Forge.FXN.morph;
      const { b, bobs } = this._spawn(o.tex || 'fx_dot', n, o.mix);
      const sc = o.src.cloud, tc = o.dst.cloud;
      const sf = o.src.flip || 1, tf = o.dst.flip || 1;
      const sN = sc.length / 2, tN = tc.length / 2;
      const turb = o.turb ?? 30, rise = o.rise ?? 30;
      const dvx = (o.drift && o.drift.x) || 0, dvy = (o.drift && o.drift.y) || 0;
      const dk = (o.dur || 300) / 1000;   // 速度线性衰减的位移积分系数：s(lt) = v0·dur·lt(1-lt/2)
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
            // 惯性漂移：src 锚点（连同中段云途的出发端）随残余速度前移，dst 锚点不动 → 过冲后回聚
            const dis = lt * (1 - lt / 2) * dk;
            const sx = o.src.x + dvx * dis, sy = o.src.y + dvy * dis;
            const bx = sx + (o.dst.x - sx) * bt
                     + Math.sin(lt * fx[i] * 6.28 + ph[i]) * turb * wB;
            const by = sy + (o.dst.y - sy) * bt
                     - Math.sin(Math.PI * bt) * rise
                     + Math.sin(lt * fy[i] * 6.28 + ph[i] * 1.3) * turb * 0.6 * wB;
            bobs[i].x = wS * (sx + sc[si] * o.src.scale * sf) + wB * bx
                      + wT * (o.dst.x + tc[ti] * o.dst.scale * tf);
            bobs[i].y = wS * (sy + sc[si + 1] * o.src.scale) + wB * by
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

    // ── 跟随粒子团：持续吸附在移动源上的小团粒子，弹丸本体/拖尾通用 ──
    // 返回句柄：调用方每帧 setPos(x,y) 喂位置；die() 停止再生，余粒衰减完自毁。
    // o: { x, y, n, rad, life, tex, mix }
    follow(o) {
      const n = o.n || 24;
      const { b, bobs } = this._spawn(o.tex || 'fx_dot', n, o.mix);
      const rad = o.rad ?? 9, life = o.life ?? 240;
      const age = new Float32Array(n);
      let hx = o.x, hy = o.y, dying = false, done = false;
      const seat = (i) => {
        const a = Math.random() * Math.PI * 2, r = Math.random() * rad;
        bobs[i].x = hx + Math.cos(a) * r;
        bobs[i].y = hy + Math.sin(a) * r;
      };
      for (let i = 0; i < n; i++) { age[i] = Math.random() * life; seat(i); }
      const scene = this.scene;
      const tick = (_t, dms) => {
        let alive = 0;
        for (let i = 0; i < n; i++) {
          age[i] += dms;
          if (age[i] >= life) {
            if (dying) { bobs[i].alpha = 0; continue; }
            age[i] %= life; seat(i);
          }
          bobs[i].alpha = 0.9 * (1 - age[i] / life);
          bobs[i].y -= dms * 0.02;   // 微上飘：脱离弹体的粒子化烟散去
          alive++;
        }
        if (dying && !alive && !done) {
          done = true;
          scene.events.off('update', tick);
          b.destroy();
        }
      };
      scene.events.on('update', tick);
      return {
        setPos(x, y) { hx = x; hy = y; },
        die() { dying = true; },
      };
    },

    // ── 粒子冲击环：躺在地面的椭圆环（透视压扁）──
    // mode 'out'：从中心炸开到半径 r 后消散（命中/落地）；
    // mode 'in'：沿攻击半径周界闪烁并微收拢，持续 dur（预备帧预警，标出危险区）。
    // o: { x, y, r, dur, n, mode, tex, mix, onDone }
    ring(o) {
      const n = o.n || 90;
      const { b, bobs } = this._spawn(o.tex || 'fx_dot', n, o.mix);
      const out = o.mode !== 'in';
      const a0 = new Float32Array(n), rr = new Float32Array(n), ph = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        a0[i] = (i / n) * Math.PI * 2 + Math.random() * 0.25;
        rr[i] = 0.85 + Math.random() * 0.3;
        ph[i] = Math.random() * Math.PI * 2;
      }
      const SQ = 0.3;   // 地面透视压扁比
      const proxy = { t: 0 };
      this.scene.tweens.add({
        targets: proxy, t: 1, duration: o.dur || 320, ease: out ? 'Cubic.easeOut' : 'Linear',
        onUpdate: () => {
          const t = proxy.t;
          for (let i = 0; i < n; i++) {
            const R = out ? o.r * rr[i] * (0.15 + 0.85 * t)
                          : o.r * rr[i] * (1.12 - 0.12 * t);
            bobs[i].x = o.x + Math.cos(a0[i]) * R;
            bobs[i].y = o.y + Math.sin(a0[i]) * R * SQ
                      - (out ? 24 * t * Math.abs(Math.sin(ph[i])) : 0);
            bobs[i].alpha = out
              ? 0.95 * (1 - t)
              : (0.45 + 0.35 * Math.sin(t * 14 + ph[i])) * (1 - sstep(0.85, 1, t));
          }
        },
        onComplete: () => { b.destroy(); o.onDone && o.onDone(); },
      });
    },

    // ── 蓄力聚拢：从半径 r 的散点向 (x,y) 收束，dur 结束时全员到位（施法/攻击前摇）──
    // o: { x, y, r, dur, n, tex, mix, onDone }
    gather(o) {
      const n = o.n || 56;
      const { b, bobs } = this._spawn(o.tex || 'fx_dot', n, o.mix);
      const px = new Float32Array(n), py = new Float32Array(n), st = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = o.r * (0.45 + Math.random() * 0.55);
        px[i] = Math.cos(a) * r; py[i] = Math.sin(a) * r * 0.8;
        st[i] = Math.random() * 0.35;   // 参差起步：粒子分批被吸进来
      }
      const proxy = { t: 0 };
      this.scene.tweens.add({
        targets: proxy, t: 1, duration: o.dur || 400, ease: 'Linear',
        onUpdate: () => {
          const t = proxy.t;
          for (let i = 0; i < n; i++) {
            const lt = Math.min(1, Math.max(0, (t - st[i]) / (1 - st[i])));
            const e = lt * lt;   // 越靠近越快，读作"被吸进去"
            bobs[i].x = o.x + px[i] * (1 - e);
            bobs[i].y = o.y + py[i] * (1 - e);
            bobs[i].alpha = lt <= 0 ? 0 : 0.9 * (0.3 + 0.7 * lt);
          }
        },
        onComplete: () => { b.destroy(); o.onDone && o.onDone(); },
      });
    },
  };
})();
