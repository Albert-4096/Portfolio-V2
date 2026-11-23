/* ─── Motion layer ───────────────────────────────────────
   Crafted moments on top of the CSS entrances and reveals.
     anime.js  · a visit opens on the intro (js/intro.js), which owns the hero entrance
               · otherwise the mark draws itself (once per session)
               · and the hero eyebrow decodes like terminal output
     Motion    · buttons press on a spring
     plain JS  · the hero headline's last words rotate (after the intro; reduced motion keeps the full sentence)

   Both libraries ship as one tree-shaken file, /vendor/motion-kit.min.js
   (scripts/build_motion_kit.sh), fetched only when motion is allowed.
   Start states are set here, never in CSS, so no-JS shows everything.
   Never touches [data-i18n] spans except the visible-language eyebrow and headline.
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
  const hold = [holdMark(), holdEyebrow()].filter(Boolean);
  const giveUp = () => hold.forEach(h => h.restore());
  const deadline = setTimeout(giveUp, ENTRANCE_BUDGET);
  const kit = import('/vendor/motion-kit.min.js');
  kit.then(springButtons, () => {});
  kit.then(k => {
    clearTimeout(deadline);
    hold.forEach(h => h.play(k));
  }, () => { clearTimeout(deadline); giveUp(); });
}

/* ── Headline: "I build <AI agents | data platforms | …>." ──
   The markup is the full sentence, with each word in a [data-w] span. Here the visible language swaps it for a
   screen-reader copy plus an aria-hidden line whose words share one grid cell (see .rot in the stylesheet). */
if (motionOK) {
  const lead = document.querySelector('.hero .lede--lead');
  const HOLD = 2500, OUT = 200, IN = 320;
  const ease = getComputedStyle(root).getPropertyValue('--ease-out').trim() || 'ease-out';
  let el, saved, words, i, timer, live = false;

  const mount = () => {
    el = lead && lead.querySelector(`[data-i18n="${root.dataset.lang}"]`);
    if (!el || !el.querySelector('[data-w]')) { el = null; return; }
    saved = el.innerHTML;
    const prefix = el.firstChild.textContent;
    const full = el.textContent;
    const line = document.createElement('span');
    const rot = document.createElement('span');
    line.setAttribute('aria-hidden', 'true');
    rot.className = 'rot';
    words = [...el.querySelectorAll('[data-w]')].map(w => {
      const t = document.createElement('span');
      t.className = 'rot__w';
      t.textContent = w.textContent + '.';
      rot.append(t);
      return t;
    });
    line.append(prefix, rot);
    el.innerHTML = '<span class="vh"></span>';
    el.firstChild.textContent = full;
    el.append(line);
    i = 0;
    words[0].classList.add('is-on');
  };
  const unmount = () => {
    clearTimeout(timer);
    if (el) el.innerHTML = saved;
    el = null;
  };

  const step = () => {
    const prev = words[i];
    i = (i + 1) % words.length;
    const next = words[i];
    next.classList.add('is-on');
    const lift = '0.3em';
    const out = prev.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateY(-${lift})` }],
      { duration: OUT, easing: ease, fill: 'forwards' });
    next.animate([{ opacity: 0, transform: `translateY(${lift})` }, { opacity: 1, transform: 'none' }],
      { duration: IN, delay: OUT / 2, easing: ease, fill: 'backwards' });
    out.finished.then(() => { prev.classList.remove('is-on'); out.cancel(); }, () => {});
  };
  const schedule = () => {
    clearTimeout(timer);
    if (live && el && !document.hidden) timer = setTimeout(() => { step(); schedule(); }, HOLD);
  };

  mount();
  // wait for the intro to hand the page over, so the words never move under it
  const intro = ['pending', 'hold', 'fly', 'over'].includes(root.dataset.intro);
  const start = () => { live = true; schedule(); };
  intro ? addEventListener('intro:end', start, { once: true }) : start();

  document.addEventListener('visibilitychange', schedule);
  // only the visible language rotates; the other one stays the plain sentence
  new MutationObserver(() => { unmount(); mount(); schedule(); }).observe(root, { attributes: true, attributeFilter: ['data-lang'] });
  // print shows the whole sentence
  addEventListener('beforeprint', unmount);
  addEventListener('afterprint', () => { mount(); schedule(); });
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

/* ── Eyebrow: types itself in, scrambling ahead of a cursor ── */
function holdEyebrow() {
  const el = document.querySelector(`.hero .eyebrow[data-i18n="${root.dataset.lang}"]`);
  if (!el) return null;
  const html = el.innerHTML;
  const text = el.textContent;
  return held(
    () => {
      // keep the line's height so nothing below shifts while it types in
      el.style.minHeight = el.offsetHeight + 'px';
      // screen readers get the real text the whole time; the scramble is aria-hidden
      el.innerHTML = `<span class="vh"></span><span aria-hidden="true"></span>`;
      el.firstChild.textContent = text;
    },
    () => { el.innerHTML = html; el.style.minHeight = ''; },
    ({ animate, scrambleText }) => track(animate(el.lastChild, {
      innerHTML: scrambleText({ text, chars: 'a-z0-9', cursor: '_' }),
      duration: 400, delay: 0,
    })),
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
