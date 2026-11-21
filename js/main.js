/* ============================================================
   main.js — Navigation, theme, animations, slider & utilities
   ============================================================ */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Preloader ---------- */
  window.addEventListener('load', () => {
    const pre = document.getElementById('preloader');
    if (!pre) return;
    pre.classList.add('done');
    setTimeout(() => pre.remove(), 700);
  });
  // Safety net: never trap the user behind the preloader.
  setTimeout(() => {
    const pre = document.getElementById('preloader');
    if (pre) { pre.classList.add('done'); setTimeout(() => pre.remove(), 700); }
  }, 2600);

  /* ---------- Sticky navbar + scroll progress ---------- */
  const navbar = document.getElementById('navbar');
  const scrollBar = document.getElementById('scrollBar');

  function onScroll() {
    const y = window.scrollY;
    if (navbar) navbar.classList.toggle('scrolled', y > 40);
    if (scrollBar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollBar.style.width = max > 0 ? (y / max) * 100 + '%' : '0%';
    }
    toggleScrollTop(y);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile drawer ---------- */
  const navLinks = document.getElementById('navLinks');
  const menuBtn = document.getElementById('menuBtn');
  const navOverlay = document.getElementById('navOverlay');

  function setDrawer(open) {
    navLinks.classList.toggle('open', open);
    navOverlay.classList.toggle('show', open);
    // The hamburger is a pure-CSS icon: .open morphs the three lines into a cross.
    menuBtn.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    // Class on <body> restyles the header chips for contrast over the drawer.
    document.body.classList.toggle('nav-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  function closeDrawer() { setDrawer(false); }

  if (menuBtn && navLinks && navOverlay) {
    menuBtn.addEventListener('click', () => {
      setDrawer(!navLinks.classList.contains('open'));
    });
    navOverlay.addEventListener('click', closeDrawer);
    navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) closeDrawer();
    });
    // Block background page scrolling while swiping on the overlay (iOS Safari).
    navOverlay.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  }

  /* ---------- Scroll-spy (active nav link) ---------- */
  const spyLinks = navLinks ? Array.from(navLinks.querySelectorAll('.nav-link')) : [];
  const spySections = spyLinks
    .map(l => document.querySelector(l.getAttribute('href')))
    .filter(Boolean);

  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      spyLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + entry.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  spySections.forEach(s => spy.observe(s));

  /* ---------- Dark / Light theme ---------- */
  const THEME_KEY = 'barikhoj_theme';
  const themeIcon = document.getElementById('themeToggle') ? document.getElementById('themeToggle').querySelector('i') : null;

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* noop */ }
    if (themeIcon) themeIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
  let stored = null;
  try { stored = localStorage.getItem(THEME_KEY); } catch (e) { /* noop */ }
  setTheme(stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------- Typing effect (hero headline) ---------- */
  const WORDS = {
    bn: ['বাড়ি', 'অ্যাপার্টমেন্ট', 'ডুপ্লেক্স', 'অফিস স্পেস'],
    en: ['Dream Home', 'Apartment', 'Duplex', 'Office Space']
  };
  const typedEl = document.getElementById('typedText');
  const typingState = { word: 0, char: 0, deleting: false };

  function tick() {
    if (!typedEl) return;
    const list = WORDS[I18N.lang] || WORDS.bn;
    const current = list[typingState.word % list.length];

    if (!typingState.deleting) {
      typingState.char++;
      typedEl.textContent = current.slice(0, typingState.char);
      if (typingState.char === current.length) {
        typingState.deleting = true;
        setTimeout(tick, 1900);
        return;
      }
      setTimeout(tick, reduceMotion ? 0 : 90);
    } else {
      typingState.char--;
      typedEl.textContent = current.slice(0, typingState.char);
      if (typingState.char === 0) {
        typingState.deleting = false;
        typingState.word++;
        setTimeout(tick, 350);
        return;
      }
      setTimeout(tick, reduceMotion ? 0 : 45);
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (!reduceMotion) tick();
    else if (typedEl) typedEl.textContent = (WORDS[I18N.lang] || WORDS.bn)[0];
  });
  document.addEventListener('langchange', () => {
    typingState.word = 0; typingState.char = 0; typingState.deleting = false;
    if (reduceMotion && typedEl) typedEl.textContent = (WORDS[I18N.lang] || WORDS.bn)[0];
  });

  /* ---------- Animated counters ---------- */
  const fmtNumber = n => {
    const base = Number(n).toLocaleString('en-US');
    return I18N.digitize(base);
  };

  function renderStat(el, value, animate) {
    const suffix = el.dataset.suffix || '';
    const target = Number(el.dataset.count) || 0;
    if (animate && !reduceMotion) {
      const dur = 1600;
      const start = performance.now();
      (function step(now) {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmtNumber(Math.round(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(step);
      })(start);
    } else {
      el.textContent = fmtNumber(target) + suffix;
    }
    el._done = true;
  }

  const statEls = Array.from(document.querySelectorAll('.stat-num'));
  const statObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target._done) {
        renderStat(entry.target, Number(entry.target.dataset.count), true);
        statObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  statEls.forEach(el => statObs.observe(el));

  document.addEventListener('DOMContentLoaded', () => statEls.forEach(el => renderStat(el, 0, false)));
  document.addEventListener('langchange', () => statEls.forEach(el => {
    if (el._done) renderStat(el, 0, false);
  }));

  /* ---------- Reveal-on-scroll ---------- */
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  /**
   * Observe every [data-reveal] element inside `root`.
   * Re-usable: properties.js calls it after each dynamic render so
   * freshly created cards animate in with the same scroll-reveal system.
   */
  function observeReveals(root) {
    (root || document).querySelectorAll('[data-reveal]').forEach(el => {
      if (el._rvSeen) return; // don't double-observe static elements
      el._rvSeen = true;
      const delay = parseFloat(el.dataset.delay || '0');
      el.style.setProperty('--rd', delay + 's');
      revealObs.observe(el);
    });
  }
  window.observeReveals = observeReveals;
  observeReveals();

  /* ---------- Testimonials slider ---------- */
  const track = document.getElementById('tTrack');
  const dotsBox = document.getElementById('tDots');
  let tIndex = 0;
  let tTimer = null;

  function slidesCount() { return track ? track.children.length : 0; }

  function goTo(i) {
    if (!track) return;
    const n = slidesCount();
    tIndex = (i + n) % n;
    track.style.transform = `translateX(-${tIndex * 100}%)`;
    if (dotsBox) {
      Array.from(dotsBox.children).forEach((d, di) => d.classList.toggle('active', di === tIndex));
    }
  }

  function autoPlay() {
    stopAuto();
    if (reduceMotion) return;
    tTimer = setInterval(() => goTo(tIndex + 1), 5000);
  }
  function stopAuto() { if (tTimer) clearInterval(tTimer); tTimer = null; }

  document.addEventListener('DOMContentLoaded', () => {
    if (!track || !dotsBox) return;
    Array.from(track.children).forEach((_, i) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 't-dot' + (i === 0 ? ' active' : '');
      d.setAttribute('aria-label', 'Review ' + (i + 1));
      d.addEventListener('click', () => { goTo(i); autoPlay(); });
      dotsBox.appendChild(d);
    });
    goTo(0);
    autoPlay();

    const wrap = track.closest('.t-wrap');
    if (wrap) {
      wrap.addEventListener('mouseenter', stopAuto);
      wrap.addEventListener('mouseleave', autoPlay);
    }
  });

  const tPrev = document.getElementById('tPrev');
  const tNext = document.getElementById('tNext');
  if (tPrev) tPrev.addEventListener('click', () => { goTo(tIndex - 1); autoPlay(); });
  if (tNext) tNext.addEventListener('click', () => { goTo(tIndex + 1); autoPlay(); });

  /* ---------- Scroll-to-top button ---------- */
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  function toggleScrollTop(y) {
    if (!scrollTopBtn) return;
    const afterHero = y > window.innerHeight * 0.75;
    scrollTopBtn.classList.toggle('show', afterHero);
  }
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
  }

  /* ---------- Avatar fallback (hide broken images) ---------- */
  document.querySelectorAll('img.avatar-img').forEach(img => {
    img.addEventListener('error', () => img.classList.add('hidden'));
  });

  /* ---------- Toast utility ---------- */
  window.showToast = function (msg, type) {
    const box = document.getElementById('toastBox');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' error' : '');
    const icon = type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check';
    el.innerHTML = `<i class="fa-solid ${icon}"></i><span></span>`;
    el.querySelector('span').textContent = msg;
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 400);
    }, 4200);
  };

  /* ---------- Footer year (bilingual digits) ---------- */
  function updateYear() {
    const y = new Date().getFullYear();
    const el = document.getElementById('year');
    if (!el) return;
    const num = I18N.digitize(String(y));
    el.textContent = I18N.lang === 'bn'
      ? `© ${num} বাড়িখোঁজ — সর্বস্বত্ব সংরক্ষিত।`
      : `© ${num} BariKhoj. All rights reserved.`;
  }
  document.addEventListener('DOMContentLoaded', updateYear);
  document.addEventListener('langchange', updateYear);
})();
