// motion-pack.js — applied motion directions for SHUYI Maison.
// 1) Scroll-linked reveals  2) Route veil between pages
// 3) Ambient blooms drift only while scrolling  4) Subtle card tilt.
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('mp-on');

  // ─── 1 · Scroll-linked reveals ───
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add('mp-inview');
        io.unobserve(en.target);
      }
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });

  function markDone(e) {
    e.target.classList.add('mp-done');
    e.target.removeEventListener('animationend', markDone);
  }
  function scan() {
    var els = document.querySelectorAll(
      '.product-grid .product-card, .cat-list .cat-row, .g-grid .g-card'
    );
    els.forEach(function (el) {
      if (el.__mpSeen) return;
      el.__mpSeen = true;
      el.addEventListener('animationend', markDone);
      io.observe(el);
    });
  }
  function boot() {
    scan();
    var root = document.getElementById('root') || document.body;
    new MutationObserver(scan).observe(root, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // ─── 2 · Route veil ───
  // Hashchange-driven only: never intercepts clicks, cannot get stuck.
  var veil = document.createElement('div');
  veil.className = 'mp-veil';
  function mountVeil() { if (!veil.parentNode) document.body.appendChild(veil); }
  if (document.body) mountVeil();
  else document.addEventListener('DOMContentLoaded', mountVeil);

  var veilTimer = null;
  var veilSafety = null;
  veil.addEventListener('transitionend', function () {
    veil.classList.remove('mp-out');
  });
  window.addEventListener('hashchange', function () {
    // Skip the veil when the tab is hidden — rAF and transitions are
    // throttled there, and nobody sees the sweep anyway.
    if (document.hidden) return;
    mountVeil();
    clearTimeout(veilTimer);
    clearTimeout(veilSafety);
    // Cover instantly via class (no transition) — stays covered while
    // React re-renders the new route, however long that blocks.
    veil.classList.remove('mp-in', 'mp-out');
    veil.classList.add('mp-cover');
    // Start the sweep after the new route paints. Double-rAF is the
    // precise path; the 300ms timeout races it in case rAF is starved.
    var swept = false;
    function sweep() {
      if (swept) return;
      swept = true;
      veilTimer = setTimeout(function () {
        veil.classList.remove('mp-cover');
        veil.classList.add('mp-out');
      }, 60);
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(sweep);
    });
    setTimeout(sweep, 300);
    // Hard safety: whatever happens, the veil must never stay covering.
    veilSafety = setTimeout(function () {
      veil.classList.remove('mp-cover', 'mp-out');
    }, 1500);
  });

  // ─── 3 · Ambience drifts continuously ───
  // (It used to start/stop with scroll, which forced the blurred bloom layers
  //  to re-rasterize on the first scroll frame — a visible stutter at the top of
  //  every swipe. A transform-only animation left running costs nothing.)

  // ─── 4 · Card tilt (fine pointers only) ───
  if (!window.matchMedia('(pointer: fine)').matches) return;
  var curCard = null;
  function resetCard(card) {
    if (card) card.style.transform = '';
  }
  document.addEventListener('pointermove', function (e) {
    var card = e.target.closest('.g-grid .g-card, .product-grid .product-card');
    if (card !== curCard) { resetCard(curCard); curCard = card; }
    if (!card || !card.classList.contains('mp-done')) return;
    var r = card.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width - 0.5;
    var py = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform =
      'perspective(760px) rotateY(' + (px * 4.5).toFixed(2) + 'deg) rotateX(' + (py * -4.5).toFixed(2) + 'deg)';
  }, { passive: true });
  document.addEventListener('pointerout', function (e) {
    if (curCard && !curCard.contains(e.relatedTarget)) {
      resetCard(curCard);
      curCard = null;
    }
  }, { passive: true });
})();
