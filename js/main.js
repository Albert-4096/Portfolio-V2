/* ─── Language switching (RO/EN, in place) ─────────────── */
function setLang(l) {
  const d = document.documentElement;
  if (d.dataset.lang === l) return;
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    d.classList.add('lang-swapping');
    clearTimeout(setLang.t);
    setLang.t = setTimeout(() => d.classList.remove('lang-swapping'), 320);
  }
  // keep the reader's place: the swap hides/shows nodes, so compensate with a node that stays visible
  const hh = document.querySelector('.site-header').offsetHeight;
  const anchor = [...document.querySelectorAll('main :is(h2,h3,p,li,.card), .site-footer p')]
    .find(e => !e.closest('[data-i18n]') && e.getClientRects().length && e.getBoundingClientRect().top >= hh);
  const before = anchor && anchor.getBoundingClientRect().top;
  d.lang = l;
  d.dataset.lang = l;
  try { localStorage.setItem('lang', l); } catch {}
  const u = l === 'ro' ? '/ro/' : '/';
  history.replaceState(null, '', u + location.search + location.hash);
  document.querySelector('link[rel=canonical]').href = 'https://alberyt.xyz' + u;
  document.title = SITE_META[l].title;
  document.querySelector('meta[name=description]').content = SITE_META[l].desc;
  applyAttrs(l);
  if (anchor) {
    const dy = anchor.getBoundingClientRect().top - before;
    if (Math.abs(dy) > 1) scrollTo({ top: scrollY + dy, behavior: 'instant' });
  }
}
function applyAttrs(l) {
  document.querySelectorAll('[data-aria-en]').forEach(e =>
    e.setAttribute('aria-label', e.dataset[l === 'ro' ? 'ariaRo' : 'ariaEn']));
  document.querySelectorAll('.lang-opt').forEach(a =>
    a.hreflang === l ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
}
document.querySelectorAll('.lang-opt, .footer-links a[hreflang]').forEach(a =>
  a.addEventListener('click', e => { e.preventDefault(); setLang(a.hreflang); }));
applyAttrs(document.documentElement.dataset.lang);

/* ─── Mobile menu (popover) ────────────────────────────── */
const nav = document.getElementById('site-nav');
const menuBtn = document.querySelector('.menu-btn');
if (nav && menuBtn && nav.showPopover) {
  nav.addEventListener('toggle', e => {
    const open = e.newState === 'open';
    menuBtn.setAttribute('aria-expanded', open);
    if (!open && nav.contains(document.activeElement)) menuBtn.focus();
  });
  menuBtn.setAttribute('aria-expanded', 'false');
  nav.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => { if (nav.matches(':popover-open')) nav.hidePopover(); }));
  matchMedia('(min-width: 900px)').addEventListener('change', e => {
    if (e.matches && nav.matches(':popover-open')) nav.hidePopover();
  });
}

/* ─── Scrollspy (desktop nav) ──────────────────────────── */
const navLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
const spy = new IntersectionObserver(entries => {
  for (const en of entries) {
    if (!en.isIntersecting) {
      const own = navLinks.find(a => a.getAttribute('href') === '#' + en.target.id);
      if (own && own.getAttribute('aria-current') && en.boundingClientRect.top > 0) own.removeAttribute('aria-current');
      continue;
    }
    navLinks.forEach(a => a.getAttribute('href') === '#' + en.target.id
      ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current'));
  }
}, { rootMargin: '-45% 0px -50% 0px' });
navLinks.forEach(a => {
  const sec = document.querySelector(a.getAttribute('href'));
  if (sec) spy.observe(sec);
});

/* ─── Scroll reveals ───────────────────────────────────── */
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const targets = [...document.querySelectorAll(
    'main :is(.sec-head, .card, .log, .bridge__who, .bridge__how, .tree, .chips)[data-reveal]')]
    .filter(el => !el.closest('.hero'));
  const done = el => { el.classList.add('is-in'); el.removeAttribute('data-reveal'); };
  const seen = new Map();
  targets.forEach(el => {
    const i = seen.get(el.parentElement) || 0;
    seen.set(el.parentElement, i + 1);
    el.style.setProperty('--i', Math.min(i, 4));
  });
  // above-the-fold targets first, then switch reveals on: nothing flickers
  const below = targets.filter(el => {
    if (el.getBoundingClientRect().top < innerHeight) { done(el); return false; }
    return true;
  });
  document.documentElement.classList.add('reveal-on');
  const io = new IntersectionObserver(entries => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const el = en.target;
      io.unobserve(el);
      el.classList.add('is-in');
      // hand the element back to its own hover transitions once the reveal ends
      el.addEventListener('transitionend', ev => {
        if (ev.target === el && ev.propertyName === 'opacity') el.removeAttribute('data-reveal');
      }, { once: true });
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  below.forEach(el => io.observe(el));
}

/* ─── Copy email ───────────────────────────────────────── */
document.querySelectorAll('[data-copy]').forEach(btn => {
  if (!navigator.clipboard) { btn.hidden = true; return; }
  const status = document.getElementById('copy-status');
  btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(btn.dataset.copy); } catch { return; }
    const orig = btn.innerHTML;
    const ro = document.documentElement.dataset.lang === 'ro';
    btn.innerHTML = `<span data-i18n="en">${btn.dataset.copiedEn}</span><span data-i18n="ro">${btn.dataset.copiedRo}</span>`;
    if (status) status.textContent = ro ? btn.dataset.statusRo : btn.dataset.statusEn;
    clearTimeout(btn.t);
    btn.t = setTimeout(() => { btn.innerHTML = orig; if (status) status.textContent = ''; }, 1600);
  });
});

/* ─── Print the CV ─────────────────────────────────────── */
document.querySelectorAll('[data-print-cv]').forEach(b => b.addEventListener('click', () => window.print()));
