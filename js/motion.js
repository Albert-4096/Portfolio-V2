/* ─── Motion layer ───────────────────────────────────────
   Crafted moments on top of the CSS entrances and reveals.
     anime.js  · a visit opens on the intro (js/intro.js), which owns the hero entrance
               · otherwise the mark draws itself (once per session)
     Motion    · buttons press on a spring

   Both libraries ship as one tree-shaken file, /vendor/motion-kit.min.js
   (scripts/build_motion_kit.sh), fetched only when motion is allowed.
   Start states are set here, never in CSS, so no-JS shows everything.
   Never touches [data-i18n] spans.
   ─────────────────────────────────────────────────────── */

const root = document.documentElement;
const motionOK = !matchMedia('(prefers-reduced-motion: reduce)').matches;
// the hero never stays held back longer than this, however slow the kit or the terrain
const ENTRANCE_BUDGET = 1200;

if (motionOK && root.dataset.intro === 'pending') {
  // the head script picked this visit for the intro and preloaded both modules; past this budget it gives up
  root.dataset.intro = 'hold';
  const late = new Promise((_, no) => setTimeout(no, ENTRANCE_BUDGET));
  const kit = import('/vendor/motion-kit.min.js');
  kit.then(springButtons, () => {});
  Promise.race([Promise.all([kit, import('/js/intro.js')]), late]).then(([k, intro]) => {
    intro.playIntro(k);
  }).catch(() => {
    if (root.dataset.intro !== 'hold') return;
    document.querySelectorAll('.intro').forEach(el => el.remove());
    root.dataset.intro = 'off';
    dispatchEvent(new Event('intro:over'));
    dispatchEvent(new Event('intro:end'));
  });
} else if (motionOK) {
  const hold = [holdMark()].filter(Boolean);
  const giveUp = () => hold.forEach(h => h.restore());
  const deadline = setTimeout(giveUp, ENTRANCE_BUDGET);
  const kit = import('/vendor/motion-kit.min.js');
  kit.then(springButtons, () => {});
  kit.then(k => {
    clearTimeout(deadline);
    hold.forEach(h => h.play(k));
  }, () => { clearTimeout(deadline); giveUp(); });
}

/* A held element: blanked now, played once the kit lands, or restored as-is if it doesn't in time */
function held(blank, restore, play) {
  let done = false;
  blank();
  const finish = () => { if (!done) { done = true; restore(); } };
  return {
    restore: finish,
    play(kit) { if (!done) play(kit).then(finish); },
  };
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
  return held(
    () => { a.style.visibility = 'hidden'; cursor.style.opacity = 0; },
    () => { a.removeAttribute('style'); a.removeAttribute('pathLength'); cursor.removeAttribute('style'); },
    async ({ animate, createDrawable }) => {
      try { sessionStorage.setItem('mark-drawn', '1'); } catch {}
      const [line] = createDrawable(a);
      a.style.cssText = 'fill-opacity:0;stroke:currentColor;stroke-width:1.1;stroke-linejoin:round';
      await track(animate(line, { draw: ['0 0', '0 1'], duration: 900, delay: 100, ease: 'inOut(3)' }));
      await track(animate(a, { fillOpacity: 1, strokeOpacity: 0, duration: 320, ease: 'out(2)' }));
      // two blinks, then the cursor goes back to the stylesheet
      await track(animate(cursor, {
        opacity: [{ to: 1, duration: 1 }, { to: 0, delay: 220, duration: 1 }, { to: 1, delay: 220, duration: 1 }],
      }));
    },
  );
}

/* ── Buttons: a short squash on press, a little overshoot on release ── */
function springButtons({ animateMini, press, spring }) {
  root.classList.add('springs');
  press('.btn', el => {
    animateMini(el, { transform: 'scale(0.96)' }, { type: spring, visualDuration: 0.12, bounce: 0 });
    return () => animateMini(el, { transform: 'scale(1)' }, { type: spring, visualDuration: 0.18, bounce: 0 });
  });
}
