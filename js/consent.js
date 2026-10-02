/* ─── Analytics consent ───────────────────────────────────
   Opt-in only: nothing from analytics.alberyt.xyz loads until "allow".
   The only cookie is the one that remembers the choice. */
(function () {
  const COOKIE = 'cookie_consent';
  const VERSION = 1; // bump when the policy changes: old choices get re-prompted
  const MAX_AGE_DAYS = 182;
  const ID = 'd1cc2d72-388b-4550-8c39-772046a13e23';
  const ORIGIN = 'https://analytics.alberyt.xyz';

  const T = (en, ro) => `<span data-i18n="en">${en}</span><span data-i18n="ro">${ro}</span>`;
  const MARKUP = `
    <h2 id="consent-title" class="consent__title">${T('Can I count your visit?', 'Pot să-ți număr vizita?')}</h2>
    <p id="consent-text" class="consent__text">
      ${T(
        "If you say yes, I'll load Umami from my own server to see what people read, and record about 15% of visits (max 5 min, form fields masked). Nothing loads otherwise.",
        'Dacă spui da, încarc Umami de pe serverul meu ca să văd ce citesc oamenii și înregistrez cam 15% din vizite (max. 5 min, câmpurile de formular ascunse). Altfel nu se încarcă nimic.'
      )}
      <a href="/privacy.html">${T('Details', 'Detalii')}</a>
    </p>
    <div class="consent__actions">
      <button type="button" class="btn btn--ghost btn--sm" data-act="allow">${T('Allow analytics', 'Permite statistici')}</button>
      <button type="button" class="btn btn--ghost btn--sm" data-act="decline">${T('No thanks', 'Nu, mersi')}</button>
    </div>`;

  function readConsent() {
    const hit = document.cookie.split('; ').find(r => r.startsWith(COOKIE + '='));
    if (!hit) return null;
    try {
      const c = JSON.parse(decodeURIComponent(hit.slice(COOKIE.length + 1)));
      return c.v === VERSION ? c : null;
    } catch { return null; }
  }
  function writeConsent(analytics) {
    const value = JSON.stringify({ analytics, v: VERSION, t: Date.now() });
    const expires = new Date(Date.now() + MAX_AGE_DAYS * 864e5).toUTCString();
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE}=${encodeURIComponent(value)}; Expires=${expires}; Path=/; SameSite=Lax${secure}`;
  }
  function dnt() {
    const v = navigator.doNotTrack || window.doNotTrack;
    return v === '1' || v === 'yes';
  }

  function loadAnalytics() {
    if (document.getElementById('analytics-script')) return;
    try { localStorage.removeItem('umami.disabled'); } catch {}
    const add = (id, src, attrs) => {
      const s = document.createElement('script');
      s.id = id; s.defer = true; s.src = src;
      s.setAttribute('data-website-id', ID);
      for (const k in attrs) s.setAttribute(k, attrs[k]);
      document.head.appendChild(s);
    };
    add('analytics-script', ORIGIN + '/script.js', {});
    add('analytics-recorder', ORIGIN + '/recorder.js', {
      'data-sample-rate': '0.15', 'data-mask-level': 'moderate', 'data-max-duration': '300000',
    });
  }
  function unloadAnalytics() {
    document.getElementById('analytics-script')?.remove();
    document.getElementById('analytics-recorder')?.remove();
    try { localStorage.setItem('umami.disabled', '1'); } catch {}
  }

  let card;
  function build() {
    card = document.createElement('div');
    card.id = 'consent';
    card.className = 'consent';
    card.setAttribute('role', 'region');
    card.setAttribute('aria-labelledby', 'consent-title');
    card.dataset.ariaEn = 'Analytics consent';
    card.dataset.ariaRo = 'Acord pentru statistici';
    card.setAttribute('aria-label', document.documentElement.dataset.lang === 'ro' ? card.dataset.ariaRo : card.dataset.ariaEn);
    card.hidden = true;
    card.innerHTML = MARKUP;
    document.body.appendChild(card);
    card.addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const allow = btn.dataset.act === 'allow';
      writeConsent(allow);
      allow ? loadAnalytics() : unloadAnalytics();
      hide();
    });
  }
  function show(focus) {
    if (!card) build();
    card.hidden = false;
    document.documentElement.classList.add('consent-open');
    card.classList.remove('is-leaving');
    requestAnimationFrame(() => card.classList.add('is-visible'));
    if (focus) card.querySelector('button').focus();
  }
  function hide() {
    card.classList.remove('is-visible');
    card.classList.add('is-leaving');
    setTimeout(() => {
      card.hidden = true;
      card.classList.remove('is-leaving');
      document.documentElement.classList.remove('consent-open');
    }, 160);
  }

  function init() {
    document.getElementById('privacy-settings')?.addEventListener('click', () => show(true));
    const c = readConsent();
    if (c) { if (c.analytics) loadAnalytics(); return; }
    if (dnt()) return; // respect Do-Not-Track; opt in through "privacy settings"
    // desktop: 600 ms after load. phones: after the first scroll (or 8 s), so the hero is never covered.
    // Focus stays where the visitor is.
    const go = () => {
      if (!matchMedia('(max-width: 599px)').matches) { setTimeout(() => show(false), 600); return; }
      let shown = false;
      const once = () => { if (shown) return; shown = true; removeEventListener('scroll', once); show(false); };
      addEventListener('scroll', once, { passive: true });
      setTimeout(once, 8000);
    };
    document.readyState === 'complete' ? go() : addEventListener('load', go);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
