/* ============================================================
   form.js — Contact form + newsletter
   Free storage strategy:
   1. If js/firebase-config.js holds a REAL config → the SDK is
      loaded on demand from the Firebase CDN and the message is
      saved to the free Firestore "contact_messages" collection.
   2. Otherwise (demo mode) → saved to localStorage so the site
      works everywhere (GitHub Pages / Cloudflare Pages / offline).
   ============================================================ */

(function () {
  'use strict';

  const form = document.getElementById('contactForm');
  const statusEl = document.getElementById('connStatus');
  const CFG = window.BARIKHOJ_FIREBASE_CONFIG || {};

  const isConfigured = Boolean(
    CFG.apiKey &&
    !/^PASTE_/i.test(CFG.apiKey) &&
    CFG.projectId &&
    !/^your-/.test(CFG.projectId)
  );

  let firebaseReady = false;
  let firebaseLoading = false;

  /* ---------- Firestore SDK (loaded only when needed) ---------- */
  function loadFirebaseSDK() {
    return new Promise((resolve, reject) => {
      if (firebaseReady) return resolve();
      if (firebaseLoading) return;
      firebaseLoading = true;
      const base = 'https://www.gstatic.com/firebasejs/10.12.2';
      const app = document.createElement('script');
      app.src = base + '/firebase-app-compat.js';
      app.onload = () => {
        const fs = document.createElement('script');
        fs.src = base + '/firebase-firestore-compat.js';
        fs.onload = () => {
          firebase.initializeApp(CFG);
          firebaseReady = true;
          resolve();
        };
        fs.onerror = reject;
        document.head.appendChild(fs);
      };
      app.onerror = reject;
      document.head.appendChild(app);
    });
  }

  /* ---------- Local (demo) storage ---------- */
  function saveLocal(payload) {
    try {
      const key = 'barikhoj_messages';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.push(payload);
      localStorage.setItem(key, JSON.stringify(list));
      return true;
    } catch (e) { return false; }
  }

  /* ---------- Validation helpers ---------- */
  const MSG = {
    name: { bn: 'অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন (কমপক্ষে ৩ অক্ষর)।', en: 'Please enter your full name (at least 3 characters).' },
    phone: { bn: 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX)।', en: 'Enter a valid Bangladeshi mobile number (e.g. 01XXXXXXXXX).' },
    email: { bn: 'সঠিক ইমেইল ঠিকানা দিন অথবা ফাঁকা রাখুন।', en: 'Enter a valid email or leave it empty.' },
    message: { bn: 'বার্তা কমপক্ষে ১০ অক্ষরের হতে হবে।', en: 'Message must be at least 10 characters long.' }
  };
  const t = o => I18N.t(o);
  const BD_PHONE = /^(?:\+?880|0)1[3-9]\d{8}$/;

  function setError(inputId, errId, msgObj) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(errId);
    const group = input ? input.closest('.f-group') : null;
    if (err) err.textContent = msgObj ? t(msgObj) : '';
    if (group) group.classList.toggle('invalid', Boolean(msgObj));
    if (input && msgObj) input.focus();
    return !msgObj;
  }

  function validate(name, phone, email, message) {
    let ok = true;
    ok = setError('cfName', 'errName', name.trim().length >= 3 ? null : MSG.name) && ok;
    ok = setError('cfPhone', 'errPhone', BD_PHONE.test(phone.replace(/[\s-]/g, '')) ? null : MSG.phone) && ok;
    ok = setError('cfEmail', 'errEmail', (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ? null : MSG.email) && ok;
    ok = setError('cfMessage', 'errMsg', message.trim().length >= 10 ? null : MSG.message) && ok;
    return ok;
  }

  /* ---------- Status line ---------- */
  function renderStatus() {
    if (!statusEl) return;
    statusEl.innerHTML = isConfigured
      ? (I18N.lang === 'bn'
        ? '<i class="fa-solid fa-fire"></i>সংযোগ: Firebase Firestore (ফ্রি প্ল্যান) — বার্তা ক্লাউডে সেভ হবে'
        : '<i class="fa-solid fa-fire"></i>Connected: Firebase Firestore (free plan) — messages are stored in the cloud')
      : (I18N.lang === 'bn'
        ? '<i class="fa-solid fa-database"></i>ডেমো মোড: বার্তা এই ব্রাউজারে (localStorage) সেভ হচ্ছে — Firebase চালু করতে README দেখুন'
        : '<i class="fa-solid fa-database"></i>Demo mode: messages are stored locally — see README to enable Firebase');
  }
  document.addEventListener('DOMContentLoaded', renderStatus);
  document.addEventListener('langchange', renderStatus);

  /* ---------- Submit ---------- */
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();

      const name = document.getElementById('cfName').value.trim();
      const phone = document.getElementById('cfPhone').value.trim();
      const email = document.getElementById('cfEmail').value.trim();
      const interest = document.getElementById('cfInterest').value;
      const message = document.getElementById('cfMessage').value.trim();

      if (!validate(name, phone, email, message)) return;

      const payload = {
        name, phone, email, interest, message,
        lang: I18N.lang,
        source: 'barikhoj-website',
        createdAt: new Date().toISOString()
      };

      const btn = document.getElementById('cfSubmit');
      const btnLabel = btn.querySelector('span');
      const original = btnLabel.textContent;
      btn.disabled = true;
      btnLabel.textContent = I18N.lang === 'bn' ? 'পাঠানো হচ্ছে...' : 'Sending...';

      const successMsg = I18N.lang === 'bn'
        ? 'ধন্যবাদ! আমাদের টিম ২৪ ঘণ্টার মধ্যে আপনার সাথে যোগাযোগ করবে।'
        : 'Thank you! Our team will contact you within 24 hours.';

      if (isConfigured) {
        try {
          await loadFirebaseSDK();
          await firebase.firestore().collection('contact_messages').add(payload);
          window.showToast(successMsg);
          form.reset();
        } catch (err) {
          console.warn('[BariKhoj] Firestore failed, saved locally instead:', err);
          saveLocal(payload);
          window.showToast(successMsg);
          form.reset();
        }
      } else {
        saveLocal(payload);
        window.showToast(successMsg);
        form.reset();
      }

      btn.disabled = false;
      btnLabel.textContent = original;
    });
  }

  /* ---------- Newsletter (footer) ---------- */
  const newsForm = document.getElementById('newsForm');
  if (newsForm) {
    newsForm.addEventListener('submit', e => {
      e.preventDefault();
      const input = document.getElementById('nfEmail');
      const email = input.value.trim();
      const invalidMsg = I18N.lang === 'bn' ? 'সঠিক ইমেইল ঠিকানা দিন।' : 'Please enter a valid email address.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        window.showToast(invalidMsg, 'error');
        return;
      }
      try {
        const key = 'barikhoj_newsletter';
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        if (!list.includes(email)) list.push(email);
        localStorage.setItem(key, JSON.stringify(list));
      } catch (err) { /* noop */ }
      const okMsg = I18N.lang === 'bn'
        ? 'সাবস্ক্রাইব সফল! নতুন লিস্টিংয়ের আপডেট পাবেন।'
        : 'Subscribed! You will now receive new listing updates.';
      window.showToast(okMsg);
      input.value = '';
    });
  }
})();
