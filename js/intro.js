/* ─── Intro ──────────────────────────────────────────────
   A first visit (at most every two weeks: the inline script in index.html decides before first
   paint) opens on the alberyt mark, big, and turns it into the landscape in one gesture:
     1. the mark's outline draws itself from the apex down both flanks; the cursor holds solid
        while the line data loads, then blinks once: go
     2. the outline thins and turns green: it is now the top contour line of a real 2,250 m
        Retezat summit, and a canvas takes it over, pixel for pixel
     3. the camera lifts off that summit and tilts down into the exact frame js/terrain.js
        renders: contour levels bloom downhill, the A sinks into the real terrain
     4. the cursor, the one still point, flies to the name and types it; the hero settles; the
        live scene takes over from the flat drawing, where the two match line for line, and
        raises the relief itself
   Phones (static poster) take a shorter cut: a top-down bloom straight into the poster.
   html[data-intro]: pending → hold → fly → land → done, or off when it gives up (css/style.css).
   Lines: /assets/retezat-intro.bin (scripts/bake_intro.py). Camera, fog and colours mirror js/terrain.js.
   ─────────────────────────────────────────────────────── */

const root = document.documentElement;

// The mark on its 24-unit grid (brand/build.py), its outline split at the apex to draw down both flanks
const FLANKS = [
  'M9 3.5L6.61 9.75L9 9.75', 'M9 3.5L11.39 9.75L9 9.75',
  'M9 10.75L6.228 10.75L2.5 20.5L6.1 20.5L9 12.915', 'M9 10.75L11.772 10.75L15.5 20.5L11.9 20.5L9 12.915',
];
const FLANK_LEN = [9.08, 24.93]; // above and below the contour band, for an even pen speed
const PEAK = [
  [[9, 3.5], [11.39, 9.75], [6.61, 9.75]],
  [[2.5, 20.5], [6.228, 10.75], [11.772, 10.75], [15.5, 20.5], [11.9, 20.5], [9, 12.915], [6.1, 20.5]],
];
const CURSOR = [17.25, 17.25, 4.5, 3.25];
const A_CENTRE = [9, 12];   // the A's centre: the point it sits on its summit by
const A_SIZE = 0.56;        // the A's height, as a share of the viewport's short side
const A_UNIT = 2.7;         // grid cells per mark unit (scripts/bake_intro.py A_UNIT)
const RING = 1.1;           // mark units between the A's own contour rings
const REACH = [5.5, 11.5];  // the A's field fades into the real terrain between these distances

// js/terrain.js at rest
const FOV = 45, CAM = [0, 0.6, 1.4], LOOK = [0, 0.15, 0], FOG = [1.5, 3.8];
const BODY = 0.46;          // the shader's dark ground, as a share of its fog colour
const LINE = { minor: [0.42, 1.8], major: [0.58, 2.5] }; // its contour lines, [alpha, CSS px], matched by eye and histogram
const STRIPS = 64;          // depth strips for fog

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const hex = name => {
  const n = parseInt(getComputedStyle(root).getPropertyValue(name).trim().slice(1), 16);
  return [n >> 16, n >> 8 & 255, n & 255];
};
// three.js reads the CSS colours as sRGB and works in linear, and js/terrain.js's ShaderMaterial writes
// those linear values straight out: the scene's greens are deeper, its ground near black
const scene = c => c.map(v => { v /= 255; return Math.round(255 * (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); });

export function playIntro({ animate, createTimeline, createDrawable, stagger, cubicBezier, eases }) {
  const live = root.dataset.terrain === 'live';
  const W = innerWidth, H = innerHeight; // js/terrain.js sizes its scene the same way
  const kpx = A_SIZE * Math.min(W, H) / 17; // px per mark unit
  const inOut2 = eases.inOut(2);
  const BG = hex('--bg'), ACC = hex('--accent'), MID = mix(hex('--accent-dim'), ACC, 0.5);
  const S = { BG: scene(BG), ACC: scene(ACC), MID: mix(scene(hex('--accent-dim')), scene(ACC), 0.5) };
  const lines = load();
  let ended = false, main = null;

  root.dataset.intro = 'hold';

  /* ── The mark, and a layer that takes the first click so it can't land on a hidden link ── */
  const layer = document.createElement('div');
  layer.className = 'intro';
  layer.setAttribute('aria-hidden', 'true');
  const box = 24 * kpx;
  layer.innerHTML = `<svg class="intro__mark" viewBox="0 0 24 24" style="left:${W / 2 - 12 * kpx}px;top:${H / 2 - 12 * kpx}px;width:${box}px;height:${box}px">${
    FLANKS.map(d => `<path d="${d}"/>`).join('')}<rect class="intro__cursor" x="${CURSOR[0]}" y="${CURSOR[1]}" width="${CURSOR[2]}" height="${CURSOR[3]}"/></svg>`;
  document.body.append(layer);
  const flanks = [...layer.querySelectorAll('path')];
  const cursor = layer.querySelector('.intro__cursor');
  const pen = createDrawable(flanks);
  const tracing = createTimeline({ playbackEase: 'inOut(2)' })
    .add(pen.slice(0, 2), { draw: ['0 0', '0 1'], duration: 700 * FLANK_LEN[0] / (FLANK_LEN[0] + FLANK_LEN[1]), ease: 'linear' })
    .add(pen.slice(2), { draw: ['0 0', '0 1'], duration: 700 * FLANK_LEN[1] / (FLANK_LEN[0] + FLANK_LEN[1]), ease: 'linear' })
    .add(cursor, { opacity: [0, 1], duration: 1, ease: 'linear' });

  /* ── Hold: the cursor stays solid until the lines are in, then blinks once and the flight starts ── */
  const cap = new Promise((_, no) => setTimeout(no, live ? 1600 : 1000, new Error('intro: lines too slow')));
  Promise.all([Promise.race([lines, cap]), tracing.then()]).then(([d]) => {
    if (ended) return;
    const fly = build(d);
    animate(cursor, { opacity: [{ to: 0, duration: 1 }, { to: 1, delay: 260, duration: 1 }], ease: 'linear' })
      .then(() => { if (!ended) { main = fly; root.dataset.intro = 'fly'; main.play(); } });
    main = fly; // a skip during the blink lands straight away
  }, abort);

  /* ── Skip: any intent to use the page lands it at once. Never swallows the event. ── */
  const skip = e => {
    if (e && e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
    if (e && e.type === 'visibilitychange' && !document.hidden) return;
    if (ended) return;
    main ? main.complete() : abort();
  };
  const SKIPS = ['pointerdown', 'wheel', 'touchstart', 'keydown', 'scroll', 'resize', 'pagehide', 'error', 'unhandledrejection'];
  SKIPS.forEach(t => addEventListener(t, skip, { passive: true }));
  document.addEventListener('visibilitychange', skip);
  const ceiling = setTimeout(skip, 9000);
  const unbind = () => {
    SKIPS.forEach(t => removeEventListener(t, skip, { passive: true }));
    document.removeEventListener('visibilitychange', skip);
    clearTimeout(ceiling);
  };

  // gave up before anything landed: the page enters the usual way
  function abort() {
    if (ended) return;
    ended = true;
    unbind();
    root.dataset.intro = 'off';
    dropLayer();
    canvas?.remove();
    dispatchEvent(new Event('intro:land'));
    dispatchEvent(new Event('intro:end'));
  }
  function dropLayer() {
    // keep catching pointer events a moment, so the click that skipped can't fall through to a link
    animate(layer, { opacity: 0, duration: 250, ease: 'out(2)' }).then(() => layer.remove());
  }

  /* ── The flight ─────────────────────────────────────── */
  let canvas;
  function build(d) {
    const s = d.summit;
    const U = A_UNIT * 2 / d.grid;                                        // plane units per mark unit
    const sc = [-1 + 2 * s.c / d.grid, -1 + 2 * s.r / d.grid];            // summit on the plane (x, z)
    const toX = mx => sc[0] + (mx - A_CENTRE[0]) * U, toZ = my => sc[1] + (my - A_CENTRE[1]) * U;
    const field = aField(d, Math.max(0.08, Math.min(0.2, 3 / kpx)));
    const strips = toStrips(d.levels);
    const bloom = Array.from({ length: s.top - 1 }, () => ({ a: 0 }));   // level top-1 … 1
    const alpha = k => k === s.top ? (st.own ? 1 : 0) : (bloom[s.top - 1 - k] ? bloom[s.top - 1 - k].a : 0);
    const st = { p: 0, own: false };

    const dpr = Math.min(devicePixelRatio, live ? 1.5 : 2);
    canvas = document.createElement('canvas');
    canvas.className = 'intro-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    document.body.append(canvas);
    const ctx = canvas.getContext('2d');
    ctx.lineCap = ctx.lineJoin = 'round';

    // js/terrain.js's overlay, drawn into the canvas as the ground comes in, so the hand-over is seamless
    const ov = document.querySelector('.terrain-overlay')?.getBoundingClientRect() || { left: 0, top: 0, width: W, height: H };
    const vx = ov.left + ov.width / 2, vy = ov.top + ov.height / 2;
    const vignette = ctx.createRadialGradient(vx, vy, 0, vx, vy, Math.hypot(ov.width, ov.height) / 2);
    vignette.addColorStop(0, rgba(BG, 0.1)); vignette.addColorStop(1, rgba(BG, 0.6));

    /* camera: top-down over the mark's centre, at the height that makes the A its on-screen size,
       to js/terrain.js's resting camera; zoom in log space, the pitch waits for the lift-off */
    const K = H / 2 / Math.tan(FOV * Math.PI / 360);
    const T0 = [toX(12), 0, toZ(12)], D0 = U * K / kpx;
    const D1 = Math.hypot(CAM[1] - LOOK[1], CAM[2] - LOOK[2]), PH1 = Math.atan2(CAM[1] - LOOK[1], CAM[2] - LOOK[2]);
    const ZOOM = 2.4; // phones only pull up
    function pose(p) {
      if (!live) return { C: [T0[0], D0 * ZOOM ** p, T0[2]], uy: 0, uz: -1, fy: -1, fz: 0, top: true };
      const e = inOut2(clamp01((p - 0.15) / 0.85));
      const ph = Math.PI / 2 + (PH1 - Math.PI / 2) * e, D = D0 * (D1 / D0) ** p;
      const T = T0.map((v, i) => lerp(v, LOOK[i], inOut2(p)));
      const sp = Math.sin(ph), cp = Math.cos(ph);
      return { C: [T[0], T[1] + D * sp, T[2] + D * cp], uy: cp, uz: -sp, fy: -sp, fz: -cp, top: e === 0 };
    }
    const melt = p => 1 - inOut2(clamp01((p - (live ? 0.1 : 0.3)) / 0.45));
    const rest = p => live ? smooth(0.55, 1, p) : 0; // js/terrain.js's ground, weight and vignette settle in

    // bright lines on the open map; the scene's own colour and weight by the time it takes over
    function style(k, a, r, fog) {
      const major = k % 5 === 0 || k === s.top; // the A's outline keeps its index-contour weight
      const ink = major ? mix(ACC, S.ACC, r) : mix(MID, S.MID, r);
      ctx.strokeStyle = rgba(mix(ink, mix(BG, S.BG, r), fog), a * (major ? lerp(0.95, LINE.major[0], r) : lerp(0.7, LINE.minor[0], r)));
      return major ? lerp(1.5, LINE.major[1], r) : lerp(1.1, LINE.minor[1], r);
    }

    /* ── A field: marched again whenever the melt moves ── */
    let marchedW = -1;
    const segs = [];
    function marchAt(w) {
      if (w === marchedW) return;
      marchedW = w;
      march(field, w, d.ci, s.top, segs, toX, toZ);
    }
    const quad = c => [[field.x0, field.y0], [field.x1, field.y0], [field.x1, field.y1], [field.x0, field.y1]]
      .map(([mx, my]) => project(c, toX(mx), 0, toZ(my)));

    function project(c, x, y, z) {
      const dx = x - c.C[0], dy = y - c.C[1], dz = z - c.C[2];
      const zc = Math.max(dy * c.fy + dz * c.fz, 1e-3);
      return [W / 2 + dx / zc * K, H / 2 - (dy * c.uy + dz * c.uz) / zc * K];
    }

    function draw() {
      const p = st.p, c = pose(p), w = melt(p), r = rest(p);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (r > 0) drawGround(c, r);
      if (w > 0) {
        marchAt(w);
        const q = quad(c);
        ctx.save(); // the real lines, outside the A's field
        ctx.beginPath(); ctx.rect(0, 0, W, H); q.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.clip('evenodd');
        drawFlat(c, (k, path) => {
          for (const a of d.levels[k - 1].lines) path(a);
        });
        ctx.restore();
        ctx.save(); // the A's field
        ctx.beginPath(); q.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.clip();
        drawFlat(c, (k, path, seg) => { if (segs[k]) seg(segs[k]); }, s.top);
        ctx.restore();
      } else drawStrips(c, r);
      if (r > 0) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = r;
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // straight down, one stroke per level, through a transform; tilted, projected point by point
    function drawFlat(c, each, top = d.levels.length) {
      const affine = c.top, s0 = K / c.C[1];
      const box = affine
        ? [c.C[0] - W / 2 / s0, c.C[2] - H / 2 / s0, c.C[0] + W / 2 / s0, c.C[2] + H / 2 / s0]
        : footprint(c);
      for (let k = top; k >= 1; k--) {
        const a = alpha(k);
        if (a <= 0) continue;
        const lw = style(k, a, 0, 0);
        ctx.beginPath();
        if (affine) {
          ctx.setTransform(dpr * s0, 0, 0, dpr * s0, dpr * (W / 2 - c.C[0] * s0), dpr * (H / 2 - c.C[2] * s0));
          ctx.lineWidth = lw / s0;
        } else ctx.lineWidth = lw;
        each(k, line => {
          if (box && !overlaps(line.box, box)) return;
          for (let i = 0; i < line.length; i += 2) {
            const x = line[i], z = line[i + 1];
            if (affine) i ? ctx.lineTo(x, z) : ctx.moveTo(x, z);
            else { const [sx, sy] = project(c, x, 0, z); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }
          }
        }, seg => {
          for (let i = 0; i < seg.length; i += 4) {
            if (affine) { ctx.moveTo(seg[i], seg[i + 1]); ctx.lineTo(seg[i + 2], seg[i + 3]); }
            else {
              const [ax, ay] = project(c, seg[i], 0, seg[i + 1]), [bx, by] = project(c, seg[i + 2], 0, seg[i + 3]);
              ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
            }
          }
        });
        ctx.stroke();
        if (affine) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }

    // what ground is on screen, to skip lines that can't be
    function footprint(c) {
      const b = [Infinity, Infinity, -Infinity, -Infinity];
      for (const [sx, sy] of [[0, 0], [W, 0], [0, H], [W, H]]) {
        const a = (sx - W / 2) / K, v = (H / 2 - sy) / K;
        const dy = v * c.uy + c.fy, dz = v * c.uz + c.fz;
        if (dy > -1e-3) return null; // the horizon is in view
        const t = -c.C[1] / dy, x = c.C[0] + a * t, z = c.C[2] + dz * t;
        b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], z); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], z);
      }
      return b;
    }

    // js/terrain.js fogs by distance; on flat ground seen head-on that runs with depth, so: strips of depth
    const fogAt = (c, z) => smooth(FOG[0], FOG[1], Math.hypot(Math.max(-1, Math.min(1, c.C[0])) - c.C[0], c.C[1], z - c.C[2]));
    const ground = S.BG.map(v => v * BODY);
    function drawGround(c, r) {
      // the scene's dark ground, one gradient down its length so the strips leave no seams
      const y0 = project(c, c.C[0], 0, -1)[1], y1 = project(c, c.C[0], 0, 1)[1];
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      for (let i = 0; i <= 8; i++) {
        const z = -1 + i / 4;
        g.addColorStop(clamp01((project(c, c.C[0], 0, z)[1] - y0) / (y1 - y0)), rgba(mix(ground, S.BG, fogAt(c, z)), r));
      }
      ctx.beginPath();
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([x, z], i) => { const [sx, sy] = project(c, x, 0, z); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
      ctx.fillStyle = g;
      ctx.fill();
    }
    function drawStrips(c, r) {
      for (let i = 0; i < STRIPS; i++) {
        const fog = fogAt(c, -1 + 2 * (i + 0.5) / STRIPS);
        for (const major of [false, true]) {
          let any = false;
          ctx.beginPath();
          for (const [a, i0, i1, k] of strips[i]) {
            if ((k % 5 === 0) !== major) continue;
            const al = alpha(k);
            if (al < 1) { partial.push(a, i0, i1, k, al); continue; }
            any = true;
            path(c, a, i0, i1);
          }
          if (any) { ctx.lineWidth = style(major ? 5 : 1, 1, r, fog); ctx.stroke(); }
        }
        // levels still blooming in, each with its own alpha
        for (let q = 0; q < partial.length; q += 5) {
          ctx.beginPath();
          path(c, partial[q], partial[q + 1], partial[q + 2]);
          ctx.lineWidth = style(partial[q + 3], partial[q + 4], r, fog);
          ctx.stroke();
        }
        partial.length = 0;
      }
    }
    const partial = [];
    function path(c, a, i0, i1) {
      for (let i = i0; i <= i1; i++) {
        const [sx, sy] = project(c, a[2 * i], 0, a[2 * i + 1]);
        i > i0 ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
      }
    }

    /* ── The text: the cursor flies to the name and types it ── */
    const hero = document.querySelector('.hero');
    const h1 = hero.querySelector('h1');
    const typing = measure(h1); // null when the name wraps: then it just fades in
    const caret = layer.appendChild(document.createElement('div'));
    caret.className = 'intro__caret';
    caret.hidden = true;
    const from = cursor.getBoundingClientRect();
    const cur = { x: from.left, y: from.top, w: from.width, h: from.height };
    let docked = false;
    const paint = () => {
      if (docked) return; // a skip can run the ride's last frame after the dock
      Object.assign(caret.style, { transform: `translate(${cur.x}px,${cur.y}px)`, width: cur.w + 'px', height: cur.h + 'px' });
      // the name shows up to the cursor's left edge
      if (typing) h1.style.clipPath = `inset(-0.3em ${Math.max(0, typing.right - cur.x)}px -0.3em -0.3em)`;
    };
    function takeOver() {
      st.own = true;
      flanks.forEach(f => { f.style.opacity = 0; });
      cursor.style.opacity = 0;
      caret.hidden = false;
      paint();
      draw();
    }
    function dock() {
      docked = true;
      h1.style.clipPath = '';
      h1.classList.add('caret-on');
      caret.remove();
    }

    const sel = q => [...hero.querySelectorAll(q)];
    const header = document.querySelector('.site-header');
    const below = [...document.querySelectorAll('main > :not(.hero)')].filter(el => el.getBoundingClientRect().top < H);
    const poster = () => document.querySelector('.terrain-static-bg');
    const t = live
      ? { own: 250, p: [100, 1800], bloom: [150, 40], glide: 1050, type: [1450, 400], groups: 1650, cap: 1900, land: 1900 }
      : { own: 200, p: [100, 1500], bloom: [150, 30], glide: 600, type: [1000, 350], groups: 1150, cap: 1300, land: 1650 };

    const tl = createTimeline({ autoplay: false, onUpdate: draw, onComplete: () => land() })
      .add(flanks, { stroke: rgba(ACC, 0.95), strokeWidth: '1.5px', duration: 250, ease: 'out(3)' }, 0)
      .call(takeOver, t.own)
      .add(st, { p: [0, 1], duration: t.p[1], ease: live ? cubicBezier(0.6, 0, 0.1, 1) : 'inOut(2)' }, t.p[0])
      .add(bloom, { a: [0, 1], duration: 240, ease: 'out(2)', delay: stagger(t.bloom[1], { ease: 'in(1.5)' }) }, t.bloom[0])
      .call(dock, t.type[0] + t.type[1])
      .add(sel('.eyebrow'), { opacity: [0, 1], duration: 400, ease: 'out(2)' }, t.type[0])
      .add(header, { opacity: [0, 1], duration: 500, ease: 'out(2)' }, t.groups)
      .add(sel('.lede, .cta-row'), { opacity: [0, 1], y: [8, 0], duration: 600, ease: 'out(4)' }, t.groups)
      .add([...sel('.hero-proof, .win-banner'), ...below], { opacity: [0, 1], y: [8, 0], duration: 600, ease: 'out(4)' }, t.groups + 80)
      .add(sel('.hero-cap'), { opacity: [0, 1], duration: 400, ease: 'out(2)' }, t.cap)
      .call(land, t.land);
    if (typing) {
      h1.style.clipPath = `inset(-0.3em ${typing.right - typing.from}px -0.3em -0.3em)`;
      tl.add(cur, { x: typing.from, y: typing.y, w: typing.w, h: typing.h, duration: live ? 450 : 400, ease: 'out(4)', onUpdate: paint }, t.glide)
        .add(h1, { opacity: [0, 1], duration: 1 }, t.type[0])
        .add(cur, { x: typing.to, duration: t.type[1], ease: 'out(3)', onUpdate: paint }, t.type[0]);
    } else {
      tl.add(caret, { opacity: [1, 0], duration: 300, ease: 'out(2)' }, t.glide)
        .add(h1, { opacity: [0, 1], duration: 500, ease: 'out(2)' }, t.type[0]);
    }
    if (!live) {
      if (poster()) tl.add(poster(), { opacity: [0, 0.55], scale: [1.12, 1], duration: 700, ease: 'out(3)' }, 1000);
      tl.add(canvas, { opacity: [1, 0], duration: 600, ease: 'inOut(2)' }, 1050);
    }
    return tl;
  }

  /* ── Landing: the text is in, the live scene (or the poster) takes over under the drawing ── */
  function land() {
    if (ended) return;
    ended = true;
    unbind();
    let gone;
    const faded = new Promise(r => { gone = r; });
    const fade = () => {
      if (!canvas.isConnected) return;
      animate(canvas, { opacity: 0, duration: 300, ease: 'inOut(2)' }).then(() => { canvas.remove(); gone(); });
    };
    if (live && root.dataset.terrain === 'live') {
      // the scene compiles now if it couldn't during the flight; till it's up, the drawing is the backdrop.
      // Listening first: it may reveal synchronously on intro:land.
      addEventListener('terrain:revealed', fade, { once: true });
      addEventListener('terrain:ready', () => { if (root.dataset.terrain !== 'live') fade(); }, { once: true });
      addEventListener('resize', fade, { once: true }); // the drawing is for one size only
    } else fade();
    root.dataset.intro = 'land';
    dispatchEvent(new Event('intro:land'));
    dropLayer();
    setTimeout(() => dispatchEvent(new Event('intro:end')), 600); // the consent bar waits for this
    // tidy up once both the text and the drawing are done
    Promise.all([main.then(), faded]).then(finish);
  }
  function finish() {
    document.querySelectorAll('.site-header, .hero [data-enter], .hero-cap, main > :not(.hero), .terrain-static-bg')
      .forEach(el => ['opacity', 'transform', 'translate', 'scale', 'clip-path'].forEach(p => el.style.removeProperty(p)));
    root.dataset.intro = 'done';
  }
}

/* ── Data ───────────────────────────────────────────── */
async function load() {
  const res = await fetch('/assets/retezat-intro.bin');
  if (!res.ok) throw new Error(`intro: ${res.status}`);
  return parse(await res.arrayBuffer());
}

function parse(buf) {
  const b = new Uint8Array(buf), dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x315a5452) throw new Error('intro: not RTZ1'); // 'RTZ1'
  let at = 4;
  const u16 = () => { at += 2; return dv.getUint16(at - 2, true); };
  const f32 = () => { at += 4; return dv.getFloat32(at - 4, true); };
  const vint = () => { let v = 0, m = 1, x; do { x = b[at++]; v += (x & 127) * m; m *= 128; } while (x & 128); return v; };
  const zz = v => v % 2 ? -(v + 1) / 2 : v / 2;
  const grid = u16(), ci = f32();
  const q = 2 / grid / 8; // 1/8 cell fixed point → plane units
  const levels = [];
  for (let n = b[at++]; n--;) {
    const k = b[at++], lines = [];
    for (let m = vint(); m--;) {
      const len = vint(), a = new Float32Array(len * 2), box = a.box = [Infinity, Infinity, -Infinity, -Infinity];
      let x = vint(), z = vint();
      for (let i = 0; i < len; i++) {
        if (i) { x += zz(vint()); z += zz(vint()); }
        const px = a[2 * i] = x * q - 1, pz = a[2 * i + 1] = z * q - 1;
        box[0] = Math.min(box[0], px); box[1] = Math.min(box[1], pz); box[2] = Math.max(box[2], px); box[3] = Math.max(box[3], pz);
      }
      lines.push(a);
    }
    levels.push({ k, lines });
  }
  // the bake's predictor (left + up - up-left) undone
  const unpredict = (rows, cols, next) => {
    const g = new Float64Array(rows * cols);
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const o = i * cols + j;
      g[o] = next(i && j ? g[o - 1] + g[o - cols] - g[o - cols - 1] : j ? g[o - 1] : i ? g[o - cols] : 0);
    }
    return g;
  };
  let summit;
  for (let n = b[at++]; n--;) {
    const aspect = b[at++], top = b[at++], r = u16(), c = u16(), r0 = u16(), c0 = u16(), rows = u16(), cols = u16();
    const h = unpredict(rows, cols, p => p + zz(vint()));
    if (!summit || aspect === 0) summit = { top, r, c, r0, c0, rows, cols, h: Float32Array.from(h, v => v / 4095) };
  }
  return { grid, ci, levels, summit };
}

/* ── The A's field: the A as a contour mesa (outline at the summit's top level, a ring every RING
   units), blended into the real heights so its lower rings bend into the terrain's ── */
function aField(d, step) {
  const s = d.summit, ci = d.ci;
  const lo = [2.5 - REACH[1] - 0.5, 3.5 - REACH[1] - 0.5], hi = [15.5 + REACH[1] + 0.5, 20.5 + REACH[1] + 0.5];
  // on a grid through the apex, so the sharpest corner comes out exact
  const x0 = 9 - Math.ceil((9 - lo[0]) / step) * step, y0 = 3.5 - Math.ceil((3.5 - lo[1]) / step) * step;
  const nx = Math.ceil((hi[0] - x0) / step) + 1, ny = Math.ceil((hi[1] - y0) / step) + 1;
  const real = new Float32Array(nx * ny), delta = new Float32Array(nx * ny);
  for (let j = 0, o = 0; j < ny; j++) for (let i = 0; i < nx; i++, o++) {
    const mx = x0 + i * step, my = y0 + j * step;
    const sd = sdf(mx, my);
    const h = patchAt(s, s.r + (my - A_CENTRE[1]) * A_UNIT, s.c + (mx - A_CENTRE[0]) * A_UNIT);
    const fa = sd < 0 ? s.top * ci - sd * ci * 0.5 : s.top * ci - sd * ci / RING; // a low dome inside, so the outline can shrink away
    real[o] = h;
    delta[o] = (1 - smooth(REACH[0], REACH[1], sd)) * Math.max(0, fa - h);
  }
  return { x0, y0, x1: x0 + (nx - 1) * step, y1: y0 + (ny - 1) * step, nx, ny, step, real, delta, f: new Float32Array(nx * ny) };
}

function sdf(x, y) {
  let d2 = Infinity, inside = false;
  for (const poly of PEAK) {
    let odd = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [ax, ay] = poly[j], [bx, by] = poly[i], ex = bx - ax, ey = by - ay;
      const t = clamp01(((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey));
      const dx = x - ax - ex * t, dy = y - ay - ey * t;
      if (dx * dx + dy * dy < d2) d2 = dx * dx + dy * dy;
      if ((ay > y) !== (by > y) && x < ax + (y - ay) / ey * ex) odd = !odd;
    }
    inside ||= odd;
  }
  return inside ? -Math.sqrt(d2) : Math.sqrt(d2);
}

function patchAt(s, row, col) {
  const r = Math.max(0, Math.min(s.rows - 1.001, row - s.r0)), c = Math.max(0, Math.min(s.cols - 1.001, col - s.c0));
  const i = Math.floor(r), j = Math.floor(c), tr = r - i, tc = c - j, o = i * s.cols + j;
  return lerp(lerp(s.h[o], s.h[o + 1], tc), lerp(s.h[o + s.cols], s.h[o + s.cols + 1], tc), tr);
}

// marching squares, segments only (one stroke per level joins them), straight onto the plane
const CASES = [null, [3, 2], [2, 1], [3, 1], [0, 1], null, [0, 2], [3, 0], [3, 0], [0, 2], null, [0, 1], [3, 1], [2, 1], [3, 2]];
function march(F, w, ci, top, out, toX, toZ) {
  const { nx, ny, real, delta, f, x0, y0, step } = F;
  for (let i = 0; i < f.length; i++) f[i] = real[i] + w * delta[i];
  for (let k = 0; k <= top; k++) (out[k] ||= []).length = 0;
  const e = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const o = j * nx + i, a = f[o], b = f[o + 1], c = f[o + nx + 1], dd = f[o + nx];
    const lo = Math.min(a, b, c, dd), hi = Math.max(a, b, c, dd);
    const k1 = Math.min(top, Math.ceil(hi / ci) - 1);
    for (let k = Math.max(1, Math.ceil(lo / ci)); k <= k1; k++) {
      const v = k * ci;
      const code = (a > v) * 8 + (b > v) * 4 + (c > v) * 2 + (dd > v);
      if (code === 0 || code === 15) continue;
      // edge crossings: top, right, bottom, left
      e[0] = i + (v - a) / (b - a); e[1] = j;
      e[2] = i + 1; e[3] = j + (v - b) / (c - b);
      e[4] = i + (v - dd) / (c - dd); e[5] = j + 1;
      e[6] = i; e[7] = j + (v - a) / (dd - a);
      let pairs = CASES[code];
      if (!pairs) { // saddle, settled by the cell centre
        const up = (a + b + c + dd) / 4 > v;
        pairs = code === 5 ? (up ? [3, 0, 2, 1] : [3, 2, 0, 1]) : (up ? [0, 1, 3, 2] : [3, 0, 2, 1]);
      }
      const seg = out[k];
      for (let n = 0; n < pairs.length; n += 2) {
        const p = pairs[n] * 2, q = pairs[n + 1] * 2;
        seg.push(toX(x0 + e[p] * step), toZ(y0 + e[p + 1] * step), toX(x0 + e[q] * step), toZ(y0 + e[q + 1] * step));
      }
    }
  }
}

// every line cut into runs that each fall in one depth strip, so each can take its own fog
function toStrips(levels) {
  const strips = Array.from({ length: STRIPS }, () => []);
  const of = z => Math.max(0, Math.min(STRIPS - 1, Math.floor((z + 1) / 2 * STRIPS)));
  for (const { k, lines } of levels) for (const a of lines) {
    const n = a.length / 2;
    let i0 = 0, s0 = of((a[1] + a[3]) / 2);
    for (let i = 1; i < n - 1; i++) {
      const s = of((a[2 * i + 1] + a[2 * i + 3]) / 2);
      if (s !== s0) { strips[s0].push([a, i0, i, k]); s0 = s; i0 = i; }
    }
    strips[s0].push([a, i0, n - 1, k]);
  }
  return strips;
}

const overlaps = (a, b) => a[2] >= b[0] && a[0] <= b[2] && a[3] >= b[1] && a[1] <= b[3];

// where the cursor types the name: from the first letter to where the h1's own caret (::after) sits
function measure(h1) {
  const text = [...h1.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
  if (!text) return null;
  const range = document.createRange();
  range.selectNodeContents(text);
  const rects = [...range.getClientRects()];
  if (new Set(rects.map(r => Math.round(r.top))).size > 1) return null; // wrapped: just fade it in
  const probe = h1.appendChild(document.createElement('span'));
  probe.textContent = '_';
  probe.style.fontWeight = 400;
  const r = probe.getBoundingClientRect(), cs = getComputedStyle(probe);
  const font = `400 ${cs.fontSize} ${cs.fontFamily}`; // read before the probe goes: computed styles are live
  probe.remove();
  const m = Object.assign(document.createElement('canvas').getContext('2d'), { font }).measureText('_');
  const base = r.top + m.fontBoundingBoxAscent;
  const h1r = h1.getBoundingClientRect();
  return {
    from: rects[0].left, to: r.left - m.actualBoundingBoxLeft, right: h1r.right,
    y: base - m.actualBoundingBoxAscent, w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
    h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
  };
}
