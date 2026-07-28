/* ------------------------------------------------------------------
   Harry Thorpe - portfolio
   Real HTML pages, with a small client-side router so the zoom
   transition still runs inside a single document.
   Everything degrades to ordinary page loads if JS is unavailable.
------------------------------------------------------------------ */

const CASE_STUDY_PAGES = new Set([
  'ee-aimee', 'aimee-vision', 'orkestra', 'misw', 'jeenie', 'biggive'
]);

const app = () => document.getElementById('app');

/* ---------------- chrome state (nav, back button) ---------------- */

function syncChrome(pageId) {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const navLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
  (navLink || document.querySelector('.nav-link[data-page="home"]')).classList.add('active');

  const back = document.getElementById('backToWork');
  if (back) {
    if (CASE_STUDY_PAGES.has(pageId)) back.classList.add('is-active', 'is-visible');
    else back.classList.remove('is-active', 'is-visible');
  }
}

/* ---------------- older-work carousel ---------------- */

let carouselRAF = null;
let carouselResize = null;

function initCarousel() {
  if (carouselRAF) { cancelAnimationFrame(carouselRAF); carouselRAF = null; }
  if (carouselResize) { window.removeEventListener('resize', carouselResize); carouselResize = null; }

  const track = document.getElementById('archiveTrack');
  const carousel = document.getElementById('archiveCarousel');
  if (!track || !carousel) return;

  // Duplicate the set so the loop is seamless (guard against double-running).
  if (!track.dataset.cloned) {
    Array.from(track.children).forEach(node => track.appendChild(node.cloneNode(true)));
    track.dataset.cloned = 'true';
  }
  const originals = Array.from(track.children).slice(0, track.children.length / 2);

  let setWidth = 0;
  function measure() {
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    setWidth = originals.reduce((sum, node) => sum + node.getBoundingClientRect().width + gap, 0);
  }
  measure();
  carouselResize = measure;
  window.addEventListener('resize', carouselResize);

  const MAX_SPEED = 0.9;
  let offset = 0, current = MAX_SPEED, target = MAX_SPEED;

  carousel.addEventListener('mouseenter', () => { target = 0.04; });
  carousel.addEventListener('mouseleave', () => { target = MAX_SPEED; });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  (function tick() {
    current += (target - current) * 0.045;
    offset += current;
    if (setWidth > 0 && offset >= setWidth) offset -= setWidth;
    track.style.transform = 'translateX(' + (-offset) + 'px)';
    carouselRAF = requestAnimationFrame(tick);
  })();
}

/* ---------------- back button scroll behaviour ---------------- */

(function () {
  let lastY = window.scrollY, ticking = false;
  const TOP_THRESHOLD = 120, DELTA_MIN = 6;

  function onScroll() {
    const back = document.getElementById('backToWork');
    if (!back || !back.classList.contains('is-active')) { lastY = window.scrollY; ticking = false; return; }
    const y = window.scrollY;
    if (y < TOP_THRESHOLD) back.classList.add('is-visible');
    else if (y < lastY - DELTA_MIN) back.classList.add('is-visible');
    else if (y > lastY + DELTA_MIN) back.classList.remove('is-visible');
    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
})();

/* ---------------- fetching + swapping pages ---------------- */

const cache = new Map();

function fetchPage(url) {
  if (cache.has(url)) return cache.get(url);
  const p = fetch(url, { credentials: 'same-origin' })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const main = doc.getElementById('app');
      if (!main) throw new Error('no #app in ' + url);
      return { html: main.innerHTML, pageId: main.dataset.page, title: doc.title };
    });
  cache.set(url, p);
  return p;
}

function applyPage({ html, pageId, title }, url, { push = true, scroll = 0 } = {}) {
  const main = app();
  main.innerHTML = html;
  main.dataset.page = pageId;
  document.title = title;
  if (push) history.pushState({ url, pageId }, '', url);
  syncChrome(pageId);
  initCarousel();
  window.scrollTo({ top: scroll, behavior: 'instant' });
  // .active never toggles, so restart the fade manually
  main.style.animation = 'none';
  void main.offsetWidth;
  main.style.animation = '';
}

/* ---------------- zoom-into-project transition ---------------- */

function zoomInto(card, url) {
  const visual = card.querySelector('.project-visual');
  const grid = card.closest('.featured-grid');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const pending = fetchPage(url);

  // No motion, or something missing: just swap.
  if (!visual || !grid || reduce) {
    pending.then(p => applyPage(p, url)).catch(() => { location.href = url; });
    return;
  }

  const rect = visual.getBoundingClientRect();
  const clone = document.createElement('div');
  clone.id = 'zoomLayer';
  clone.innerHTML = visual.innerHTML;
  clone.style.top = rect.top + 'px';
  clone.style.left = rect.left + 'px';
  clone.style.width = rect.width + 'px';
  clone.style.height = rect.height + 'px';
  clone.style.borderRadius = '6px';
  clone.style.transition = 'none';
  document.body.appendChild(clone);

  grid.classList.add('is-zooming');
  card.classList.add('is-zooming-source');

  const EASE = 'cubic-bezier(.66,0,.2,1)';
  const DUR = 0.72;

  requestAnimationFrame(() => {
    clone.style.transition =
      `top ${DUR}s ${EASE}, left ${DUR}s ${EASE}, width ${DUR}s ${EASE}, ` +
      `height ${DUR}s ${EASE}, border-radius ${DUR}s ${EASE}`;
    requestAnimationFrame(() => {
      clone.style.top = '0px';
      clone.style.left = '0px';
      clone.style.width = '100vw';
      clone.style.height = '100vh';
      clone.style.borderRadius = '0px';
    });
  });

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    // Wait for the page too, so we never reveal an empty screen.
    pending.then(p => {
      applyPage(p, url);
      clone.style.transition = 'opacity 0.5s ease';
      requestAnimationFrame(() => { clone.style.opacity = '0'; });
      setTimeout(() => {
        clone.remove();
        grid.classList.remove('is-zooming');
        card.classList.remove('is-zooming-source');
      }, 520);
    }).catch(() => { location.href = url; });
  };

  clone.addEventListener('transitionend', ev => {
    if (ev.propertyName === 'width' || ev.propertyName === 'height') finish();
  });
  setTimeout(finish, 950);
}

/* ---------------- link interception ---------------- */

function isInternal(a) {
  if (!a) return false;
  if (a.target === '_blank' || a.hasAttribute('download')) return false;
  if (a.origin !== location.origin) return false;
  const p = a.pathname;
  return p.endsWith('.html') || p === '/' || p.endsWith('/');
}

document.addEventListener('click', e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a');
  if (!isInternal(a)) return;

  const url = a.getAttribute('href');
  e.preventDefault();

  const card = a.closest('.project-card') || (a.classList.contains('project-card') ? a : null);
  if (card && card.querySelector('.project-visual')) {
    zoomInto(card, url);
  } else {
    fetchPage(url)
      .then(p => applyPage(p, url))
      .catch(() => { location.href = url; });
  }
});

/* Prefetch on hover/touch so the swap feels instant. */
['mouseover', 'touchstart'].forEach(evt => {
  document.addEventListener(evt, e => {
    const a = e.target.closest('a');
    if (isInternal(a)) fetchPage(a.getAttribute('href')).catch(() => {});
  }, { passive: true });
});

/* ---------------- history ---------------- */

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const scrollPositions = new Map();
window.addEventListener('beforeunload', () => {
  scrollPositions.set(location.href, window.scrollY);
});
document.addEventListener('click', () => {
  scrollPositions.set(location.href, window.scrollY);
}, true);

window.addEventListener('popstate', e => {
  const url = location.pathname + location.search;
  fetchPage(url)
    .then(p => applyPage(p, url, { push: false, scroll: scrollPositions.get(location.href) || 0 }))
    .catch(() => { location.reload(); });
});

/* ---------------- boot ---------------- */

history.replaceState({ url: location.pathname, pageId: app()?.dataset.page }, '', location.href);
syncChrome(app()?.dataset.page || 'home');
initCarousel();
