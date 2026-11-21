/* ============================================================
   properties.js — Data fetching, rendering, filtering & modal
   Data source: data/properties.json (free hosting on GitHub
   Pages / Cloudflare Pages). If fetch fails (e.g. opening the
   file directly via file://), the identical bundled fallback
   in js/fallback-data.js is used automatically.
   ============================================================ */

(function () {
  'use strict';

  const grid = document.getElementById('propertyGrid');
  const countEl = document.getElementById('propsCount');
  const emptyEl = document.getElementById('emptyState');
  const modal = document.getElementById('propertyModal');
  const modalBody = document.getElementById('modalBody');

  const state = { status: 'all', city: 'all', type: 'any', price: null };
  let PROPS = [];
  let currentModalId = null;

  const CITY_NAMES = {
    dhaka: { bn: 'ঢাকা', en: 'Dhaka' },
    chattogram: { bn: 'চট্টগ্রাম', en: 'Chattogram' },
    sylhet: { bn: 'সিলেট', en: 'Sylhet' }
  };
  const TYPE_NAMES = {
    apartment: { bn: 'অ্যাপার্টমেন্ট', en: 'Apartment' },
    house: { bn: 'বাড়ি / ডুপ্লেক্স', en: 'House / Duplex' },
    office: { bn: 'অফিস স্পেস', en: 'Office Space' }
  };

  const t = o => I18N.t(o);
  const fmt = n => I18N.digitize(String(n));

  /* ---------- Data loading (async fetch + fallback) ---------- */
  async function loadProperties() {
    try {
      const res = await fetch('data/properties.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      PROPS = json.properties || [];
      console.info('[BariKhoj] properties loaded from data/properties.json');
    } catch (err) {
      PROPS = (window.FALLBACK_PROPERTIES || []).slice();
      console.info('[BariKhoj] using bundled fallback data (fetch unavailable)');
    }
    render();
  }

  /* ---------- Filtering ---------- */
  function filtered() {
    return PROPS.filter(p => {
      if (state.status !== 'all' && p.status !== state.status) return false;
      if (state.city !== 'all' && p.city !== state.city) return false;
      if (state.type !== 'any' && p.type !== state.type) return false;
      if (state.price && (p.status !== 'sale' || p.price.value < state.price.min || p.price.value > state.price.max)) return false;
      return true;
    });
  }

  /* ---------- Templates ---------- */
  function cardHTML(p, i) {
    const bn = I18N.lang === 'bn';
    // Staggered entrance: each card reveals a little later than the previous one.
    const delay = Math.min((i || 0) * 0.07, 0.35).toFixed(2);
    const statusBadge = p.status === 'sale'
      ? `<span class="badge badge-sale">${bn ? 'বিক্রয়' : 'For Sale'}</span>`
      : `<span class="badge badge-rent">${bn ? 'ভাড়া' : 'For Rent'}</span>`;
    const featured = p.featured ? `<span class="badge badge-feature"><i class="fa-solid fa-star"></i> ${bn ? 'ফিচার্ড' : 'Featured'}</span>` : '';
    const meta = [
      p.beds ? `<span><i class="fa-solid fa-bed"></i>${fmt(p.beds)} ${bn ? 'বেড' : 'Beds'}</span>` : '',
      p.baths ? `<span><i class="fa-solid fa-bath"></i>${fmt(p.baths)} ${bn ? 'বাথ' : 'Baths'}</span>` : '',
      `<span><i class="fa-solid fa-ruler-combined"></i>${fmt(p.sqft)} ${bn ? 'বর্গফুট' : 'sqft'}</span>`
    ].join('');

    return `
      <article class="prop-card" data-id="${p.id}" data-reveal="up" data-delay="${delay}">
        <div class="prop-img">
          ${statusBadge}${featured}
          <img src="${p.image}" alt="${t(p.title)}" data-alt-bn="${t(p.title)}" data-alt-en="${t(p.title)}" loading="lazy">
          <span class="prop-type">${t(TYPE_NAMES[p.type])}</span>
        </div>
        <div class="prop-body">
          <h3 class="prop-title">${t(p.title)}</h3>
          <p class="prop-loc"><i class="fa-solid fa-location-dot"></i>${t(p.location)} · ${t(CITY_NAMES[p.city])}</p>
          <div class="prop-meta">${meta}</div>
        </div>
        <div class="prop-foot">
          <span class="price">${t(p.price)}</span>
          <div class="prop-actions">
            <button type="button" class="prop-detail" data-id="${p.id}" data-bn="বিস্তারিত" data-en="Details">বিস্তারিত</button>
            <a class="prop-map-link" target="_blank" rel="noopener" aria-label="Google Maps"
               href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.mapQuery)}">
               <i class="fa-solid fa-map-location-dot"></i></a>
          </div>
        </div>
      </article>`;
  }

  function modalHTML(p) {
    const bn = I18N.lang === 'bn';
    const meta = [
      p.beds ? `<span><i class="fa-solid fa-bed"></i>${fmt(p.beds)} ${bn ? 'বেডরুম' : 'Bedrooms'}</span>` : '',
      p.baths ? `<span><i class="fa-solid fa-bath"></i>${fmt(p.baths)} ${bn ? 'বাথরুম' : 'Bathrooms'}</span>` : '',
      `<span><i class="fa-solid fa-ruler-combined"></i>${fmt(p.sqft)} ${bn ? 'বর্গফুট' : 'Sqft'}</span>`,
      `<span><i class="fa-solid fa-city"></i>${t(CITY_NAMES[p.city])}</span>`
    ].join('');
    // features is stored per-language: {bn: [...], en: [...]}
    const feats = (p.features && (p.features[I18N.lang] || p.features.en || p.features.bn)) || [];
    const chips = feats.map(f => `<span class="chip">${f}</span>`).join('');
    const featureTitle = I18N.lang === 'bn' ? 'সুবিধা ও বৈশিষ্ট্য' : 'Features & Amenities';
    const descTitle = I18N.lang === 'bn' ? 'প্রপার্টি বিবরণ' : 'Property Description';
    const mapTitle = I18N.lang === 'bn' ? 'লোকেশন ম্যাপ (গুগল ম্যাপ)' : 'Location Map (Google Maps)';
    const callText = I18N.lang === 'bn' ? 'এখনই কল করুন' : 'Call Now';
    const mapsText = I18N.lang === 'bn' ? 'গুগল ম্যাপে খুলুন' : 'Open in Google Maps';

    return `
      <div class="m-media">
        <img src="${p.image}" alt="${t(p.title)}">
      </div>
      <div class="m-body">
        <h3 class="m-title">${t(p.title)}</h3>
        <p class="m-loc"><i class="fa-solid fa-location-dot"></i>${t(p.location)} · ${t(CITY_NAMES[p.city])}</p>
        <div class="m-priceline">
          <span class="m-price">${t(p.price)}</span>
          <div class="m-meta">${meta}</div>
        </div>
        <h4 class="m-sec-title">${descTitle}</h4>
        <p class="m-desc">${t(p.desc)}</p>
        <h4 class="m-sec-title">${featureTitle}</h4>
        <div class="feat-chips">${chips}</div>
        <h4 class="m-sec-title">${mapTitle}</h4>
        <div class="m-map">
          <iframe title="Property location map" loading="lazy" allowfullscreen
            referrerpolicy="no-referrer-when-downgrade"
            src="https://maps.google.com/maps?q=${encodeURIComponent(p.mapQuery)}&z=15&output=embed"></iframe>
        </div>
        <div class="m-actions">
          <a class="btn btn-primary" href="tel:+8801700000000"><i class="fa-solid fa-phone"></i>${callText}</a>
          <a class="btn btn-ghost map-open" target="_blank" rel="noopener"
             style="color:#fff;background:var(--clr-dark)"
             href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.mapQuery)}">
             <i class="fa-solid fa-arrow-up-right-from-square"></i>${mapsText}</a>
        </div>
      </div>`;
  }

  /* ---------- Rendering ---------- */
  function render() {
    if (!grid) return;
    const list = filtered();

    grid.innerHTML = list.map((p, i) => cardHTML(p, i)).join('');
    emptyEl.hidden = list.length !== 0;

    // Scroll-reveal animation for the freshly rendered cards (same system as the rest of the site).
    if (typeof window.observeReveals === 'function') {
      window.observeReveals(grid);
    } else {
      // Safety net: never leave cards invisible if the reveal helper is unavailable.
      grid.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('revealed'));
    }

    if (countEl) {
      countEl.innerHTML = I18N.lang === 'bn'
        ? `মোট <b>${fmt(list.length)}</b>টি প্রপার্টি পাওয়া গেছে`
        : `<b>${list.length}</b> properties found`;
    }

    // Bind detail buttons
    grid.querySelectorAll('.prop-detail').forEach(btn => {
      btn.addEventListener('click', () => openModal(btn.dataset.id));
    });

    // If the modal is already open, refresh its language too.
    if (currentModalId && modal.classList.contains('open')) {
      const p = PROPS.find(x => x.id === currentModalId);
      if (p) modalBody.innerHTML = modalHTML(p);
    }
  }

  /* ---------- Modal ---------- */
  function openModal(id) {
    const p = PROPS.find(x => x.id === id);
    if (!p || !modal) return;
    currentModalId = id;
    modalBody.innerHTML = modalHTML(p);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    currentModalId = null;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // Stop the map from loading in the background.
    const iframe = modalBody.querySelector('iframe');
    if (iframe) iframe.src = 'about:blank';
  }

  if (modal) {
    modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
  }

  /* ---------- Filter controls ---------- */
  function bindFilters() {
    document.querySelectorAll('#statusTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        state.status = tab.dataset.status;
        syncControls();
        render();
      });
    });
    const citySel = document.getElementById('cityFilter');
    const typeSel = document.getElementById('typeFilter');
    if (citySel) citySel.addEventListener('change', () => { state.city = citySel.value; render(); });
    if (typeSel) typeSel.addEventListener('change', () => { state.type = typeSel.value; render(); });
  }

  function syncControls() {
    document.querySelectorAll('#statusTabs .tab').forEach(tb => {
      tb.classList.toggle('active', tb.dataset.status === state.status);
    });
    const citySel = document.getElementById('cityFilter');
    const typeSel = document.getElementById('typeFilter');
    if (citySel) citySel.value = state.city;
    if (typeSel) typeSel.value = state.type;
  }

  /* ---------- Hero search → property filters ---------- */
  const PRICE_RANGES = {
    lt1cr: { min: 0, max: 10000000 },
    '1to2cr': { min: 10000000, max: 20000000 },
    gt2cr: { min: 20000000, max: Infinity }
  };

  function bindHeroSearch() {
    const form = document.getElementById('heroSearch');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      state.city = document.getElementById('hsCity').value;
      state.type = document.getElementById('hsType').value;
      const budget = document.getElementById('hsBudget').value;

      if (budget === 'rent') { state.status = 'rent'; state.price = null; }
      else if (budget === 'any') { state.status = 'all'; state.price = null; }
      else { state.status = 'sale'; state.price = PRICE_RANGES[budget] || null; }

      syncControls();
      render();
      document.getElementById('properties').scrollIntoView({ behavior: 'smooth' });
    });
  }

  /* ---------- Location cards → quick city filter ---------- */
  function bindLocationCards() {
    document.querySelectorAll('.loc-card').forEach(card => {
      const btn = card.querySelector('.loc-btn');
      if (!btn) return;
      btn.addEventListener('click', () => {
        state.city = card.dataset.city || 'all';
        syncControls();
        render();
        document.getElementById('properties').scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  /* ---------- Language switch re-render ---------- */
  document.addEventListener('langchange', render);

  document.addEventListener('DOMContentLoaded', () => {
    bindFilters();
    bindHeroSearch();
    bindLocationCards();
    loadProperties();
  });
})();
