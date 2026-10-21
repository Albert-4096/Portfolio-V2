/* ─── Intro ──────────────────────────────────────────────
   Every visit (bar those the inline script in index.html rules out, before first paint) opens on
   the alberyt mark, big, and turns it into the landscape in one gesture:
     1. the mark's outline draws itself from the apex down both flanks; the cursor holds solid
        while the line data loads, then blinks once: go
     2. the outline thins and turns green: it is now the top contour line of a real 2,250 m
        Retezat summit, and a canvas takes it over, pixel for pixel
     3. the camera lifts off that summit and tilts down into the exact frame js/terrain.js
        renders: contour levels bloom downhill, the A sinks into the real terrain
     4. the live scene takes over from the flat drawing, where the two match line for line, and
        raises the relief itself; then the cursor, the one still point all along, flies to the
        name and types it, and the hero settles
   Phones (static poster) take a shorter cut: a top-down bloom straight into the poster.
   html[data-intro]: pending → hold → fly → over → land → done, or off when it gives up (css/style.css).
   intro:over tells js/terrain.js the drawing has landed on its frame; intro:end, that the page is free.
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
const LINE = { minor: [0.42, 1.8], major: [0.58, 2.5] }; // its contour lines: [alpha, px of its drawing buffer], matched by eye and histogram
const GL_DPR = Math.min(devicePixelRatio, 1.5);          // js/terrain.js's pixel ratio: the shader's lines are that many times thinner in CSS px
const STRIPS = 32, BANDS = 4; // depth strips by across bands: cells for fog

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

export function playIntro({ animate, createTimeline, createDrawable, cubicBezier, eases }) {
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

  /* ── Hold: the cursor stays solid until the lines are in (and for a beat at least), then blinks
     once and the flight starts ── */
  const cap = new Promise((_, no) => setTimeout(no, live ? 1600 : 1000, new Error('intro: lines too slow')));
  let traced = 0;
  // the name is measured for the cursor to type it: its font has to be in first (preloaded by the head script)
  const fonts = Promise.all(['700', '400'].map(w => document.fonts.load(`${w} 1em "IBM Plex Sans"`))).catch(() => {});
  Promise.all([Promise.race([Promise.all([lines, fonts]).then(([d]) => d), cap]), tracing.then(() => { traced = performance.now(); })]).then(([d]) => {
    if (ended) return;
    main = build(d); // from here a skip lands straight away
    const beat = Math.max(0, (live ? 400 : 200) - (performance.now() - traced));
    animate(cursor, { opacity: [{ to: 0, delay: beat, duration: 1 }, { to: 1, delay: 200, duration: 1 }], ease: 'linear' })
      .then(() => { if (!ended) { root.dataset.intro = 'fly'; main.play(); } });
  }, abort);

  /* ── Skip: any intent to use the page lands it at once. Never swallows the event. ── */
  let pressed = false; // skipped by a press: its click is still to come
  // a reload is put back where it was left (Chrome does it twice: at DOMContentLoaded and at load); the intro
  // lands on the hero, so until the flight a scroll is the browser's and the page goes back to the top
  const top = () => scrollY && scrollTo({ top: 0, behavior: 'instant' });
  top();
  const skip = e => {
    if (e && e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
    if (e && e.type === 'visibilitychange' && !document.hidden) return;
    if (e && e.type === 'scroll' && (root.dataset.intro === 'hold' || !scrollY)) return void top();
    if (ended) return;
    pressed = e && (e.type === 'pointerdown' || e.type === 'touchstart');
    main ? main.complete() : abort();
  };
  const SKIPS = ['pointerdown', 'wheel', 'touchstart', 'keydown', 'scroll', 'resize', 'pagehide', 'beforeprint', 'error', 'unhandledrejection'];
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
    dispatchEvent(new Event('intro:over'));
    dispatchEvent(new Event('intro:end'));
  }
  function dropLayer() {
    animate(layer, { opacity: 0, duration: 250, ease: 'out(2)' });
    if (!pressed) return void setTimeout(() => layer.remove(), 250);
    // the press that skipped still has its click to come: catch it, so it can't land on a link it never saw
    const gone = () => layer.remove();
    layer.addEventListener('click', gone, { once: true });
    setTimeout(gone, 800);
  }

  /* ── The flight ─────────────────────────────────────── */
  let canvas;
  function build(d) {
    const s = d.summit;
    const U = A_UNIT * 2 / d.grid;                                        // plane units per mark unit
    const sc = [-1 + 2 * s.c / d.grid, -1 + 2 * s.r / d.grid];            // summit on the plane (x, z)
    const toX = mx => sc[0] + (mx - A_CENTRE[0]) * U, toZ = my => sc[1] + (my - A_CENTRE[1]) * U;
    // the A's field, marched again on every frame of the melt: about 4 px a cell while it's big, half the
    // cells' count four times over once the camera has pulled back
    const step = Math.max(0.08, Math.min(0.2, 4 / kpx));
    const fields = [aField(d, step), aField(d, step * 2)];
    const strips = toStrips(d.levels);
    const bloom = Array.from({ length: s.top - 1 }, () => ({ a: 0 }));   // level top-1 … 1
    const alpha = k => k === s.top ? (st.own ? 1 : 0) : (bloom[s.top - 1 - k] ? bloom[s.top - 1 - k].a : 0);
    // p: the camera; w: the A's field (1, all A … 0, all terrain); front: how far the bloom has spread
    // from the summit (plane units); lift, type: the cursor's flight to the name and its typing
    const st = { p: 0, w: 1, front: 0, own: false, lift: 0, type: 0 };

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
      if (!live) return { C: [T0[0], D0 * ZOOM ** p, T0[2]], uy: 0, uz: -1, fy: -1, fz: 0 };
      const e = inOut2(clamp01((p - 0.15) / 0.85));
      const ph = Math.PI / 2 + (PH1 - Math.PI / 2) * e, D = D0 * (D1 / D0) ** p;
      const T = T0.map((v, i) => lerp(v, LOOK[i], p ** 3)); // late: the summit glides from the centre to its place, never off screen
      const sp = Math.sin(ph), cp = Math.cos(ph);
      return { C: [T[0], T[1] + D * sp, T[2] + D * cp], uy: cp, uz: -sp, fy: -sp, fz: -cp };
    }
    const rest = p => live ? smooth(0.55, 1, p) : 0; // js/terrain.js's ground, weight and vignette settle in
    const FRONT = 3; // past the far corner from any summit: the bloom is everywhere
    const reach = () => 16 * U * (FRONT / (16 * U)) ** st.front; // from the A's rings outwards, at the pace of the zoom

    // bright lines on the open map; the scene's own colour and weight by the time it takes over
    function style(k, a, r, fog) {
      const major = k % 5 === 0 || k === s.top; // the A's outline keeps its index-contour weight
      const ink = major ? mix(ACC, S.ACC, r) : mix(MID, S.MID, r);
      ctx.strokeStyle = rgba(mix(ink, mix(BG, S.BG, r), fog), a * (major ? lerp(0.95, LINE.major[0], r) : lerp(0.7, LINE.minor[0], r)));
      return major ? lerp(1.5, LINE.major[1] / GL_DPR, r) : lerp(1.1, LINE.minor[1] / GL_DPR, r);
    }

    /* ── A field: marched again whenever the melt moves ── */
    let marched = '';
    const segs = [];
    function marchAt(w, f) {
      if (marched === `${w} ${f.step}`) return;
      marched = `${w} ${f.step}`;
      march(f, w, d.ci, s.top, segs, toX, toZ);
    }
    const quad = (c, f) => [[f.x0, f.y0], [f.x1, f.y0], [f.x1, f.y1], [f.x0, f.y1]]
      .map(([mx, my]) => project(c, toX(mx), 0, toZ(my)));
    const summitDepth = c => Math.max((0 - c.C[1]) * c.fy + (sc[1] - c.C[2]) * c.fz, 1e-3);

    function project(c, x, y, z) {
      const dx = x - c.C[0], dy = y - c.C[1], dz = z - c.C[2];
      const zc = Math.max(dy * c.fy + dz * c.fz, 1e-3);
      return [W / 2 + dx / zc * K, H / 2 - (dy * c.uy + dz * c.uz) / zc * K];
    }

    let drawn = '';
    function draw() {
      // once the camera has stopped and the bloom is in, the frame holds: don't redraw it under the scene
      const key = `${st.p} ${st.w} ${st.front} ${st.own} ${bloom.reduce((n, l) => n + l.a, 0)}`;
      if (key === drawn) return;
      drawn = key;
      const p = st.p, c = pose(p), w = st.w, r = rest(p);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const f = w > 0 && fields[D0 / summitDepth(c) > 0.6 ? 0 : 1];
      const q = f && quad(c, f);
      const outline = (clip, rule) => {
        ctx.beginPath(); if (rule) ctx.rect(0, 0, W, H);
        q.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        if (clip) ctx.clip(rule);
      };
      ctx.save(); // the real lines, outside the A's field while there is one
      if (f) outline(true, 'evenodd');
      drawStrips(c, r);
      ctx.restore();
      if (f) { // the A's field
        marchAt(w, f);
        ctx.save(); outline(true);
        drawField(c, r, fogAt(c, sc[1], sc[0]));
        ctx.restore();
      }
      if (st.front < 1) spread(c);
      if (st.own && !st.lift) paint(); // the pinned cursor rides the camera
      if (r > 0) {
        ctx.globalCompositeOperation = 'destination-over';
        drawGround(c, r);
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = r;
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // the A's field: one stroke per level, of loose marched segments
    function drawField(c, r, fog) {
      for (let k = s.top; k >= 1; k--) {
        const a = alpha(k), seg = segs[k];
        if (a <= 0 || !seg || !seg.length) continue;
        ctx.lineWidth = style(k, a, r, fog);
        ctx.beginPath();
        for (let i = 0; i < seg.length; i += 4) {
          const [ax, ay] = project(c, seg[i], 0, seg[i + 1]), [bx, by] = project(c, seg[i + 2], 0, seg[i + 3]);
          ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        }
        ctx.stroke();
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

    // the bloom spreads from the summit as well as downhill, so far-off peaks don't light up before it gets there:
    // a soft disc on the ground (an ellipse once tilted) keeps only what's inside it
    function spread(c) {
      const [px, py] = project(c, sc[0], 0, sc[1]);
      const a = reach() * K / summitDepth(c), b = a * Math.abs(c.fy); // foreshortened by the pitch
      ctx.setTransform(dpr * a, 0, 0, dpr * Math.max(b, 1e-3), dpr * px, dpr * py);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0.7, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = g;
      ctx.fillRect(-1e4, -1e4, 2e4, 2e4);
      ctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // js/terrain.js fogs by distance; on flat ground seen head-on that runs with depth, so: strips of depth
    const fogAt = (c, z, x = Math.max(-1, Math.min(1, c.C[0]))) => smooth(FOG[0], FOG[1], Math.hypot(x - c.C[0], c.C[1], z - c.C[2]));
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
      const box = footprint(c);
      for (let i = 0; i < STRIPS * BANDS; i++) {
        const z0 = -1 + 2 * Math.floor(i / BANDS) / STRIPS, x0 = -1 + 2 * (i % BANDS) / BANDS;
        if (box && (x0 > box[2] || x0 + 2 / BANDS < box[0] || z0 > box[3] || z0 + 2 / STRIPS < box[1])) continue;
        const fog = fogAt(c, z0 + 1 / STRIPS, x0 + 1 / BANDS);
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
    const out4 = eases.out(4);
    let docked = false;
    // until it flies, the cursor sits where the mark put it, on the ground, and shrinks with the distance
    const pinned = () => {
      const c = pose(st.p), x = toX(CURSOR[0] + CURSOR[2] / 2), z = toZ(CURSOR[1] + CURSOR[3] / 2);
      const [px, py] = project(c, x, 0, z), k = D0 / Math.max((0 - c.C[1]) * c.fy + (z - c.C[2]) * c.fz, 1e-3);
      return { x: px - from.width * k / 2, y: py - from.height * k / 2, w: from.width * k, h: from.height * k };
    };
    function paint() {
      if (docked) return; // a skip can run the ride's last frame after the dock
      let cur = pinned();
      if (typing && st.type > 0) {
        // typed, a glyph at a time: the cursor steps to the end of the last one, the name shows up to it
        const n = Math.ceil(st.type * typing.edges.length);
        const x = n ? typing.edges[n - 1] : typing.from;
        cur = { x, y: typing.y, w: typing.w, h: typing.h };
        h1.style.clipPath = `inset(-0.3em ${typing.right - (n ? x : typing.from - 100)}px -0.3em -0.3em)`;
      } else if (typing && st.lift > 0) {
        const e = out4(st.lift), to = { x: typing.from, y: typing.y, w: typing.w, h: typing.h };
        cur = Object.fromEntries(Object.keys(to).map(k => [k, lerp(cur[k], to[k], e)]));
      }
      Object.assign(caret.style, { transform: `translate(${cur.x}px,${cur.y}px)`, width: cur.w + 'px', height: cur.h + 'px' });
    }
    function takeOver() {
      st.own = true;
      flanks.forEach(f => { f.style.opacity = 0; });
      cursor.style.opacity = 0;
      caret.hidden = false;
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
    // the landscape first (the camera, then the scene's own relief rising), then the text
    const t = live
      ? { own: 250, p: [100, 1500], melt: [650, 700], front: [150, 1000], bloom: [150, 90, 25], over: 1600,
          glide: 1900, type: [2350, 520], groups: 2550, cap: 2800, land: 2650 }
      : { own: 200, p: [100, 1500], melt: [450, 500], front: [150, 650], bloom: [150, 60, 15], over: 1000,
          glide: 1150, type: [1500, 440], groups: 1700, cap: 1700, land: 1800 };
    const RINGS = 5; // the A's own rings, above the real summit

    const tl = createTimeline({ autoplay: false, onUpdate: draw, onComplete: () => land() })
      .add(flanks, { stroke: rgba(ACC, 0.95), strokeWidth: '1.5px', duration: 250, ease: 'out(3)' }, 0)
      .call(takeOver, t.own)
      .add(st, { p: [0, 1], duration: t.p[1], ease: live ? cubicBezier(0.6, 0, 0.1, 1) : 'inOut(2)' }, t.p[0])
      // the A holds a moment on its mountain, then sinks into it
      .add(st, { w: [1, 0], duration: t.melt[1], ease: 'inOut(2)' }, t.melt[0])
      // the bloom: the A's rings ripple out one by one, then the terrain's levels follow downhill, quicker,
      // as a front spreads out from the summit
      .add(bloom, { a: [0, 1], duration: 160, ease: 'out(2)',
        delay: (_, i) => i < RINGS ? i * t.bloom[1] : RINGS * t.bloom[1] + (i - RINGS) * t.bloom[2] }, t.bloom[0])
      .add(st, { front: [0, 1], duration: t.front[1], ease: 'linear' }, t.front[0])
      .call(dock, t.type[0] + t.type[1])
      .add(sel('.eyebrow'), { opacity: [0, 1], duration: 400, ease: 'out(2)' }, t.type[0])
      .add(header, { opacity: [0, 1], duration: 500, ease: 'out(2)' }, t.groups)
      .add(sel('.lede, .cta-row'), { opacity: [0, 1], y: [8, 0], duration: 600, ease: 'out(4)' }, t.groups)
      .add([...sel('.hero-proof, .win-banner'), ...below], { opacity: [0, 1], y: [8, 0], duration: 600, ease: 'out(4)' }, t.groups + 80)
      .add(sel('.hero-cap'), { opacity: [0, 1], duration: 400, ease: 'out(2)' }, t.cap)
      .call(handOver, t.over)
      .call(land, t.land);
    if (typing) {
      tl.add(st, { lift: [0, 1], duration: live ? 450 : 400, ease: 'linear', onUpdate: paint }, t.glide)
        .call(paint, t.type[0])
        .add(h1, { opacity: [0, 1], duration: 1 }, t.type[0])
        .add(st, { type: [0, 1], duration: t.type[1], ease: 'linear', onUpdate: paint }, t.type[0]);
    } else {
      tl.add(caret, { opacity: [1, 0], duration: 300, ease: 'out(2)' }, t.glide)
        .add(h1, { opacity: [0, 1], duration: 500, ease: 'out(2)' }, t.type[0]);
    }
    if (!live && poster()) tl.add(poster(), { opacity: [0, 0.55], scale: [1.12, 1], duration: 700, ease: 'out(3)' }, t.over - 50);
    return tl;
  }

  /* ── Hand-over: the drawing has landed on the scene's own frame; the scene (or the poster) takes over ── */
  let gone;
  const faded = new Promise(r => { gone = r; });
  function handOver() {
    if (root.dataset.intro === 'over' || !canvas) return;
    const fade = () => {
      if (!canvas.isConnected) return;
      animate(canvas, { opacity: 0, duration: 300, ease: 'inOut(2)' }).then(() => { canvas.remove(); gone(); });
    };
    if (live && root.dataset.terrain === 'live') {
      // the scene builds and compiles now if it couldn't before; till it's up, the drawing is the backdrop.
      // Listening first: it may reveal synchronously on intro:over.
      addEventListener('terrain:revealed', fade, { once: true });
      addEventListener('terrain:ready', () => { if (root.dataset.terrain !== 'live') fade(); }, { once: true });
      addEventListener('resize', fade, { once: true }); // the drawing is for one size only
      if (innerWidth !== W || innerHeight !== H) fade();  // …and a resize may be what skipped to here
    } else fade();
    root.dataset.intro = 'over';
    dispatchEvent(new Event('intro:over'));
  }

  /* ── Landing: the text is in, the page is free ── */
  function land() {
    if (ended) return;
    ended = true;
    unbind();
    handOver(); // a skip runs both at once
    root.dataset.intro = 'land';
    dropLayer();
    setTimeout(() => dispatchEvent(new Event('intro:end')), 600); // the consent bar waits for this
    // tidy the text up once it's in; done once the drawing is gone too
    const text = main.then(() => document.querySelectorAll('.site-header, .hero [data-enter], .hero-cap, main > :not(.hero), .terrain-static-bg')
      .forEach(el => ['opacity', 'transform', 'translate', 'scale', 'clip-path'].forEach(p => el.style.removeProperty(p))));
    Promise.all([text, faded]).then(() => { root.dataset.intro = 'done'; });
  }
}

/* ── Data ───────────────────────────────────────────── */
async function load() {
  const res = await fetch('/assets/retezat-intro.bin?v=1'); // ?v= as in index.html: bump both after a rebake
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
      const len = vint(), a = new Float32Array(len * 2);
      let x = vint(), z = vint();
      for (let i = 0; i < len; i++) {
        if (i) { x += zz(vint()); z += zz(vint()); }
        a[2 * i] = x * q - 1; a[2 * i + 1] = z * q - 1;
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

// every line cut into runs that each fall in one cell (depth strip by across band), so each can take its own fog
function toStrips(levels) {
  const strips = Array.from({ length: STRIPS * BANDS }, () => []);
  const at = (n, v) => Math.max(0, Math.min(n - 1, Math.floor((v + 1) / 2 * n)));
  const of = (a, i) => at(STRIPS, (a[2 * i + 1] + a[2 * i + 3]) / 2) * BANDS + at(BANDS, (a[2 * i] + a[2 * i + 2]) / 2);
  for (const { k, lines } of levels) for (const a of lines) {
    const n = a.length / 2;
    let i0 = 0, s0 = of(a, 0);
    for (let i = 1; i < n - 1; i++) {
      const s = of(a, i);
      if (s !== s0) { strips[s0].push([a, i0, i, k]); s0 = s; i0 = i; }
    }
    strips[s0].push([a, i0, n - 1, k]);
  }
  return strips;
}

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
  // the right edge of each glyph, for typing it one at a time
  const edges = [...text.textContent].map((_, i) => { range.setStart(text, i); range.setEnd(text, i + 1); return range.getBoundingClientRect().right; });
  return {
    from: rects[0].left, edges, right: h1r.right,
    y: base - m.actualBoundingBoxAscent, w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
    h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
  };
}
