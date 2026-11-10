/* ============================================================
   i18n.js — বাংলা ⇄ English Language Switcher
   Static texts live in data-bn / data-en attributes.
   Dynamic texts re-render via the 'langchange' event.
   ============================================================ */

const I18N = (() => {
  'use strict';

  const STORE_KEY = 'barikhoj_lang';
  const BN_DIGITS = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };

  let lang = 'bn';

  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved === 'bn' || saved === 'en') lang = saved;
  } catch (e) { /* storage unavailable */ }

  /** Convert Latin digits to Bengali digits when language is Bangla. */
  function digitize(value) {
    const s = String(value);
    return lang === 'bn' ? s.replace(/[0-9]/g, d => BN_DIGITS[d]) : s;
  }

  /** Swap every static text node, placeholder and alt text. */
  function applyLanguage(next, dispatch = true) {
    lang = next;
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* noop */ }

    document.documentElement.lang = lang;

    document.querySelectorAll('[data-bn]').forEach(el => {
      const v = el.getAttribute('data-' + lang);
      if (v === null) return;
      // Elements marked data-html may contain safe markup (e.g. <span> gradient text).
      if (el.hasAttribute('data-html')) el.innerHTML = v;
      else el.textContent = v;
    });

    document.querySelectorAll('[data-ph-bn]').forEach(el => {
      const v = el.getAttribute('data-ph-' + lang);
      if (v !== null) el.setAttribute('placeholder', v);
    });

    document.querySelectorAll('[data-alt-bn]').forEach(el => {
      const v = el.getAttribute('data-alt-' + lang);
      if (v !== null) el.setAttribute('alt', v);
    });

    const label = document.getElementById('langLabel');
    if (label) label.textContent = lang === 'bn' ? 'EN' : 'বাংলা';

    if (dispatch) {
      document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
    }
  }

  /** Pick the current-language value from a {bn, en} object. */
  function t(obj) {
    if (!obj) return '';
    return obj[lang] || obj.en || obj.bn || '';
  }

  function init() {
    const toggle = document.getElementById('langToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        applyLanguage(lang === 'bn' ? 'en' : 'bn');
      });
    }
    // Normalise the whole document to the stored language.
    applyLanguage(lang);
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    get lang() { return lang; },
    digitize,
    t
  };
})();
