/* ─── Intro ──────────────────────────────────────────────
   Every visit (bar those the inline script in index.html rules out, before first paint) opens on
   the alberyt mark, big, and turns it into the landscape in one gesture. There is one renderer and one
   field: js/terrain.js's own WebGL scene draws all of it, the mark included.
     1. the mark's outline draws itself from the apex down both flanks; the cursor holds solid
        while the scene builds and compiles (it stalls the main thread), then blinks once: go
     2. the outline thins and turns green: it is now the top contour line (2,306 m) of the A as a
        mountain, a ring every 1.1 mark units below it, set on a real Retezat summit; the scene's
        line takes over from the SVG, pixel for pixel, on the bare page
     3. the camera rises over the mark while the A sinks into the summit: its rings flow inward and
        vanish, and the real summit surfaces through. Lines spread out from the outline; terrain
        lines never move, they are only uncovered
     4. the camera pitches down into the scene's resting view as the relief rises, the lines ease into
        the scene's own style and the ground fades in over the page: the map becomes the landscape
     5. the last frame settles into the quiet page background; the cursor, the
        one still point all along, flies to the name and types it, and the hero settles
   Phones fly the same scene. js/terrain.js fades out its last frame and releases the renderer.
   html[data-intro]: pending → hold → fly → over → land → done, or off when it gives up (css/style.css).
   intro:over tells js/terrain.js the flight has landed (or given up); intro:end, that the page is free.
   ─────────────────────────────────────────────────────── */

const root = document.documentElement;

// The mark on its 24-unit grid (brand/build.py), its outline split at the apex to draw down both flanks
const FLANKS = [
  'M9 3.5L6.61 9.75L9 9.75', 'M9 3.5L11.39 9.75L9 9.75',
  'M9 10.75L6.228 10.75L2.5 20.5L6.1 20.5L9 12.915', 'M9 10.75L11.772 10.75L15.5 20.5L11.9 20.5L9 12.915',
];
const FLANK_LEN = [9.08, 24.93]; // above and below the contour band, for an even pen speed
const CURSOR = [17.25, 17.25, 4.5, 3.25];
const A_CENTRE = [9, 12];   // the A's centre: the point it sits on its summit by
const A_SIZE = 0.56;        // the A's height, as a share of the viewport's short side
const A_UNIT = 2.7;         // heightmap cells per mark unit: how big the A stands on its mountain
const GRID = 512;           // cells across the terrain's 2-unit plane, the scale of SUMMITS and A_UNIT
// the real summits the A is set on (heightmap row, col) and how far it sinks to clear them, in contour
// levels: the most the cone ever stands above the terrain there, plus a margin
const SUMMITS = {
  landscape: { row: 379, col: 364, sink: 7 },  // 2,250 m: lands ~82% across, 57% down at rest on 16:10
  portrait: { row: 363, col: 243, sink: 10 },  // 2,031 m: in view at rest on phones and tablets
};
const FLY = 3800;           // ms, from the mark to the resting scene

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const hex = name => {
  const n = parseInt(getComputedStyle(root).getPropertyValue(name).trim().slice(1), 16);
  return [n >> 16, n >> 8 & 255, n & 255];
};

export function playIntro({ animate, createTimeline, createDrawable, eases }) {
  const W = innerWidth, H = innerHeight; // js/terrain.js sizes its scene the same way
  const kpx = A_SIZE * Math.min(W, H) / 17; // px per mark unit
  const ACC = hex('--accent');
  let ended = false, main = null, st = null, broken = false;

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

  /* ── Hold: the cursor stays solid until the scene is built and compiled (that stalls the main thread, so
     it waits for the trace to be done: a stroke mid-way would stutter) and for a beat at least, then blinks
     once and the flight starts ── */
  const cap = new Promise((_, no) => setTimeout(no, 4000, new Error('intro: scene too slow')));
  let traced = 0;
  // the name is measured for the cursor to type it: its font has to be in first (preloaded by the head script)
  const fonts = Promise.all(['700', '400'].map(w => document.fonts.load(`${w} 1em "IBM Plex Sans"`))).catch(() => {});
  const staged = (async () => {
    await tracing;
    traced = performance.now();
    const { stage } = await import('/js/terrain.js'); // the page's own module instance: same URL
    return stage();
  })();
  Promise.race([Promise.all([staged, fonts]).then(([s]) => s), cap]).then(s => {
    if (ended) return;
    if (!s) return abort(); // no WebGL, or no assets: the page enters the usual way
    st = s;
    main = build(); // from here a skip lands straight away
    const beat = Math.max(0, (st.still ? 200 : 400) - (performance.now() - traced));
    animate(cursor, { opacity: [{ to: 0, delay: beat, duration: 1 }, { to: 1, delay: 200, duration: 1 }], ease: 'linear' })
      .then(() => { if (!ended) { root.dataset.intro = 'fly'; main.play(); } });
  }).catch(abort);

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
  // not 'error' or 'unhandledrejection': an unrelated script failing on the page is no reason to end it
  const SKIPS = ['pointerdown', 'wheel', 'touchstart', 'keydown', 'scroll', 'resize', 'pagehide', 'beforeprint'];
  SKIPS.forEach(t => addEventListener(t, skip, { passive: true }));
  document.addEventListener('visibilitychange', skip);
  const ceiling = setTimeout(skip, 9000); // the cap, the blink and the flight add up to a little over 8 s
  const unbind = () => {
    SKIPS.forEach(t => removeEventListener(t, skip, { passive: true }));
    document.removeEventListener('visibilitychange', skip);
    clearTimeout(ceiling);
  };

  // gave up before anything landed: the page enters the usual way (js/terrain.js sees 'off' and does too)
  function abort() {
    if (ended) return;
    ended = true;
    unbind();
    root.dataset.intro = 'off';
    dropLayer();
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
  function build() {
    const { rest, ci, still } = st;
    const io = eases.inOut(2), out4 = eases.out(4);

    // the A on a real summit: its centre on it, `unit` plane units to a mark unit
    const place = SUMMITS[W / H >= 1.35 ? 'landscape' : 'portrait'];
    const U = A_UNIT * 2 / GRID;
    const sx = -1 + 2 * place.col / GRID, sz = -1 + 2 * place.row / GRID; // the summit on the plane (x, z)
    const a = { origin: [sx - A_CENTRE[0] * U, sz - A_CENTRE[1] * U], unit: U, top: 20 * ci };
    const sunk = place.sink * ci;
    const toX = mx => a.origin[0] + mx * U, toZ = my => a.origin[1] + my * U;

    /* camera: top-down over the mark's centre, at the height that makes the A its on-screen size (the SVG
       mark, to the pixel), to the scene's resting camera; it rises in log space, slowly while the A sinks,
       and pitches down late */
    const tanH = Math.tan(rest.fov * Math.PI / 360), K = H / 2 / tanH;
    const T0 = [toX(12), 0, toZ(12)], D0 = U * K / kpx;
    const ry = rest.pos[1] - rest.look[1], rz = rest.pos[2] - rest.look[2];
    const D1 = Math.hypot(ry, rz), PH1 = Math.atan2(ry, rz);
    let cam; // the pose of the frame last drawn, for the cursor

    // every value of the flight at t ms: the last frame is exactly `rest`
    function frameAt(t) {
      const span = (t0, t1) => clamp01((t - t0) / (t1 - t0));
      // the tilt sets off while the A's last rings are still sinking: there is never a flat map just sitting there
      const zoom = smooth(0, 1, span(150, FLY) ** 1.5), pitch = io(span(1000, FLY)), glide = io(span(1000, FLY));
      const D = D0 * (D1 / D0) ** zoom, ph = Math.PI / 2 + (PH1 - Math.PI / 2) * pitch;
      // looking down, the view stays on the plane (the summit may be near its edge): the clamp lets go as it pitches
      const hh = D * tanH, hw = hh * W / H;
      const keep = (v, half) => lerp(Math.max(-half, Math.min(half, v)), v, pitch);
      const T = [
        keep(lerp(T0[0], rest.look[0], glide), Math.max(0, 0.97 - hw)),
        lerp(T0[1], rest.look[1], glide),
        keep(lerp(T0[2], rest.look[2], glide), Math.max(0, 0.97 - hh)),
      ];
      const sp = Math.sin(ph), cp = Math.cos(ph);
      cam = { C: [T[0], T[1] + D * sp, T[2] + D * cp], uy: cp, uz: -sp, fy: -sp, fz: -cp };
      return {
        pos: cam.C, look: T, up: [0, cp, -sp], a,
        reveal: 42 * io(span(200, 1400)) + 2000 * span(1350, 1900) ** 2, // mark units: the lines spread from the outline, then are everywhere
        sink: sunk * io(span(700, 1800)),
        relief: io(span(1500, 3200)),
        body: io(span(1300, 2800)),
        ink: 1 - io(span(1500, 3000)),
      };
    }

    function project(c, x, y, z) {
      const dx = x - c.C[0], dy = y - c.C[1], dz = z - c.C[2];
      const zc = Math.max(dy * c.fy + dz * c.fz, 1e-3);
      return [W / 2 + dx / zc * K, H / 2 - (dy * c.uy + dz * c.uz) / zc * K];
    }

    // t: the flight's clock; lift, type: the cursor's flight to the name and its typing
    const s = { t: 0, lift: 0, type: 0, own: false };
    let drawn = -1, handed = false; // the clock of the last frame drawn; the scene has taken over
    // a throwing frame ends the flight where it is: the page lands, and the text finishes without the scene
    function tick() {
      if (broken || handed) return;
      try { st.frame(frameAt(drawn = s.t)); } catch (err) {
        broken = true;
        console.warn('[intro] frame failed, landing:', err);
        land();
        queueMicrotask(() => tl.complete());
        return;
      }
      if (s.own) paint();
    }
    st.frame(frameAt(0)); // the canvas shows the right picture from the moment it is visible

    /* ── The text: the cursor flies to the name and types it ── */
    const hero = document.querySelector('.hero');
    const h1 = hero.querySelector('h1');
    const typing = measure(h1); // null when the name wraps: then it just fades in
    const caret = layer.appendChild(document.createElement('div'));
    caret.className = 'intro__caret';
    caret.hidden = true;
    const from = cursor.getBoundingClientRect();
    let docked = false;
    // until it flies, the cursor sits where the mark put it, on the ground, and shrinks with the distance
    const pinned = () => {
      const c = cam, x = toX(CURSOR[0] + CURSOR[2] / 2), z = toZ(CURSOR[1] + CURSOR[3] / 2);
      const [px, py] = project(c, x, 0, z), k = D0 / Math.max((0 - c.C[1]) * c.fy + (z - c.C[2]) * c.fz, 1e-3);
      return { x: px - from.width * k / 2, y: py - from.height * k / 2, w: from.width * k, h: from.height * k };
    };
    function paint() {
      if (docked) return; // a skip can run the ride's last frame after the dock
      let cur = pinned();
      if (typing && s.lift >= 1) {
        // typed, a glyph at a time: the cursor steps to the end of the last one, the name shows up to it
        const n = Math.ceil(s.type * typing.edges.length);
        const x = n ? typing.edges[n - 1] : typing.from;
        cur = { x, y: typing.y, w: typing.w, h: typing.h };
        caret.style.animation = s.type ? '' : 'caret 1.06s steps(1, end) infinite'; // waiting on the name
        h1.style.clipPath = `inset(-0.3em ${typing.right - (n ? x : typing.from - 100)}px -0.3em -0.3em)`;
      } else if (typing && s.lift > 0) {
        const e = out4(s.lift), to = { x: typing.from, y: typing.y, w: typing.w, h: typing.h };
        cur = Object.fromEntries(Object.keys(to).map(k => [k, lerp(cur[k], to[k], e)]));
      }
      Object.assign(caret.style, { transform: `translate(${cur.x}px,${cur.y}px)`, width: cur.w + 'px', height: cur.h + 'px' });
    }
    function takeOver() {
      s.own = true;
      flanks.forEach(f => { f.style.opacity = 0; });
      cursor.remove(); // gone, not hidden: a skip mid-blink would have the blink's last step show it again
      caret.hidden = false;
      paint();
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
    const vignette = document.querySelector('.terrain-overlay'); // js/terrain.js's, faded in with the ground
    // the cursor leaves the ground before the relief lifts it (1500), then waits on the name, blinking like a prompt,
    // until the landscape is in: the text comes last
    const LIFT = [1350, 450], TYPE = [2850, 520];

    // one linear clock; the scene, the cursor and the text are all read off it
    const tl = createTimeline({ autoplay: false, onUpdate: tick, onComplete: () => land() })
      .add(s, { t: [0, FLY], duration: FLY, ease: 'linear' }, 0)
      // the SVG's outline turns the scene's bright green, then the GL line underneath, the same line, is all there is
      .add(flanks, { stroke: rgba(ACC, 0.95), strokeWidth: '1.5px', duration: 250, ease: 'out(3)' }, 0)
      .call(takeOver, 250)
      .call(dock, TYPE[0] + TYPE[1])
      .add(sel('.eyebrow'), { opacity: [0, 1], duration: 400, ease: 'out(2)' }, TYPE[0])
      .add(header, { opacity: [0, 1], duration: 500, ease: 'out(2)' }, TYPE[0] + 200)
      .add(sel('.lede, .cta-row'), { opacity: [0, 1], y: [8, 0], duration: 600, ease: 'out(4)' }, TYPE[0] + 200)
      .add([...sel('.hero-proof, .win-banner'), ...below], { opacity: [0, 1], y: [8, 0], duration: 600, ease: 'out(4)' }, TYPE[0] + 280);

    if (vignette) tl.add(vignette, { opacity: [0, 1], duration: 1500, ease: 'inOut(2)' }, 1500);
    // Keep the softer landing of the original phone intro.
    if (still) tl.add(st.canvas, { opacity: [1, 0.55], duration: FLY - 2800, ease: 'inOut(2)' }, 2800);
    if (typing) {
      tl.add(s, { lift: [0, 1], duration: LIFT[1], ease: 'linear' }, LIFT[0])
        .add(h1, { opacity: [0, 1], duration: 1 }, TYPE[0])
        .add(s, { type: [0, 1], duration: TYPE[1], ease: 'linear' }, TYPE[0]);
    } else {
      tl.add(caret, { opacity: [1, 0], duration: 300, ease: 'out(2)' }, LIFT[0])
        .add(h1, { opacity: [0, 1], duration: 500, ease: 'out(2)' }, TYPE[0]);
    }

    /* ── Hand-over: the flight's last frame is the resting scene; it fades into the quiet page background ── */
    function handOver() {
      if (handed) return;
      handed = true;
      // a timeline that completes skips its last update, and a skip jumps straight here: draw the last frame now
      try { if (!broken && drawn < FLY) st.frame(frameAt(FLY)); } catch (err) { console.warn('[intro] frame failed:', err); }
      try { st.release(); } catch (err) { console.warn('[intro] release failed:', err); }
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
      // tidy the text (and the vignette) up once it's in; done after
      tl.then(() => document.querySelectorAll('.site-header, .hero [data-enter], main > :not(.hero), .terrain-overlay')
        .forEach(el => ['opacity', 'transform', 'translate', 'scale', 'clip-path'].forEach(p => el.style.removeProperty(p))))
        .then(() => { root.dataset.intro = 'done'; });
    }
    return tl;
  }
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
