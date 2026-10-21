/* ─── Motion layer ───────────────────────────────────────
   Crafted moments on top of the CSS entrances and reveals.
     anime.js  · the mark draws itself (once per session)
               · the hero eyebrow decodes like terminal output
               · the homelab tree boots top-down
     Motion    · section rules fill as their section scrolls in
               · buttons press on a spring

   Both libraries ship as one tree-shaken file, /vendor/motion-kit.min.js
   (scripts/build_motion_kit.sh), fetched only when motion is allowed.
   Start states are set here, never in CSS, so no-JS shows everything.
   Never touches [data-i18n] spans except the visible-language eyebrow.
   ─────────────────────────────────────────────────────── */

const root = document.documentElement;
const motionOK = !matchMedia('(prefers-reduced-motion: reduce)').matches;
// a kit that arrives later than this would make the hero flicker: skip its entrance moments instead
const ENTRANCE_BUDGET = 900;

if (motionOK) {
  const t0 = performance.now();
  const hold = [holdMark(), holdEyebrow()].filter(Boolean);
  import('/vendor/motion-kit.min.js').then(kit => {
    const late = performance.now() - t0 > ENTRANCE_BUDGET;
    hold.forEach(h => late ? h.restore() : h.play(kit));
    bootTree(kit);
    fillRules(kit);
    springButtons(kit);
  }, () => hold.forEach(h => h.restore()));
}

/* Everything still running finishes before printing */
const running = new Set();
function track(anim, done) {
  running.add(anim);
  anim.then(() => { running.delete(anim); done && done(); });
  return anim;
}
addEventListener('beforeprint', () => running.forEach(a => a.complete()));

/* ── Mark: stroke traces the A, fill lands, cursor blinks ── */
function holdMark() {
  const svg = document.querySelector('.site-header .alberyt-mark');
  try { if (!svg || sessionStorage.getItem('mark-drawn')) return null; } catch { return null; }
  const [a, cursor] = svg.querySelectorAll('path');
  a.style.cssText = 'fill-opacity:0;stroke:currentColor;stroke-width:1.1;stroke-linejoin:round';
  cursor.style.opacity = 0;
  const restore = () => { a.removeAttribute('style'); cursor.removeAttribute('style'); };
  return {
    restore,
    async play({ animate, createDrawable }) {
      try { sessionStorage.setItem('mark-drawn', '1'); } catch {}
      const [line] = createDrawable(a);
      await track(animate(line, { draw: ['0 0', '0 1'], duration: 900, delay: 150, ease: 'inOut(3)' }));
      await track(animate(a, { fillOpacity: 1, strokeOpacity: 0, duration: 320, ease: 'out(2)' }));
      // two blinks, then hand the cursor back to the stylesheet
      await track(animate(cursor, {
        opacity: [{ to: 1, duration: 1 }, { to: 0, delay: 220, duration: 1 }, { to: 1, delay: 220, duration: 1 }],
      }));
      restore();
      a.removeAttribute('pathLength');
    },
  };
}

/* ── Eyebrow: types itself in, scrambling ahead of a cursor ── */
function holdEyebrow() {
  const el = document.querySelector(`.hero .eyebrow[data-i18n="${root.dataset.lang}"]`);
  if (!el) return null;
  const html = el.innerHTML;
  const text = el.textContent;
  // screen readers get the real text the whole time; the scramble is aria-hidden
  el.innerHTML = `<span class="vh"></span><span aria-hidden="true"></span>`;
  el.firstChild.textContent = text;
  const restore = () => { el.innerHTML = html; };
  return {
    restore,
    async play({ animate, scrambleText }) {
      await track(animate(el.lastChild, {
        innerHTML: scrambleText({ text, chars: 'a-z0-9', cursor: '_' }),
        duration: 1100, delay: 250,
      }));
      restore();
    },
  };
}

/* ── Homelab tree: branches wipe down, then nodes come up in order ── */
function bootTree({ animate, stagger, inView }) {
  const tree = document.querySelector('.tree');
  // already on screen (deep link, reload mid-page): leave it be rather than blank it
  if (!tree || tree.getBoundingClientRect().top < innerHeight) return;
  const branches = tree.querySelectorAll('ul ul');
  const nodes = tree.querySelectorAll('li');
  branches.forEach(b => { b.style.clipPath = 'inset(0 0 100% 0)'; });
  nodes.forEach(n => { n.style.opacity = 0; });
  const clear = () => {
    branches.forEach(b => { b.style.clipPath = ''; });
    nodes.forEach(n => { n.style.opacity = ''; n.style.transform = ''; });
  };
  addEventListener('beforeprint', clear, { once: true });
  inView(tree, () => {
    track(animate(branches, {
      clipPath: ['inset(0 0 100% 0)', 'inset(0 0 0% 0)'],
      duration: 900, delay: stagger(220, { start: 120 }), ease: 'inOut(3)',
    }));
    track(animate(nodes, {
      opacity: [0, 1], x: [-8, 0],
      duration: 420, delay: stagger(65, { start: 80 }), ease: 'out(3)',
    }), clear);
  }, { amount: 0.35 });
}

/* ── Section rules: fill left→right as the heading travels up the viewport ── */
function fillRules({ animateMini, scroll }) {
  document.querySelectorAll('.section .sec-rule').forEach(rule => {
    scroll(
      animateMini(rule, { transform: ['scaleX(0)', 'scaleX(1)'] }, { ease: 'linear' }),
      { target: rule.closest('.sec-head'), offset: ['start end', 'start center'] },
    );
  });
}

/* ── Buttons: a short squash on press, a little overshoot on release ── */
function springButtons({ animateMini, press, spring }) {
  root.classList.add('springs');
  press('.btn', el => {
    animateMini(el, { transform: 'scale(0.96)' }, { type: spring, visualDuration: 0.12, bounce: 0 });
    return () => animateMini(el, { transform: 'scale(1)' }, { type: spring, visualDuration: 0.35, bounce: 0.45 });
  });
}
