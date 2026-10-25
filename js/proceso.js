/* ═══════════════════════════════════════════════
   PROCESO.JS — Tira de negativos interactiva
   · Clic / teclado (← → Inicio Fin) para cambiar de paso
   · Avanza sola mientras la sección está a la vista;
     se detiene al interactuar o con "reducir movimiento".
   Independiente de main.js.
═══════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.getElementById('flow');
  if (!root) return;

  var tabs   = Array.prototype.slice.call(root.querySelectorAll('.flow__frame'));
  var panels = Array.prototype.slice.call(root.querySelectorAll('.flow__step'));
  var strip  = root.querySelector('.flow__strip');
  var current = 0;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function select(i, userInitiated) {
    current = (i + tabs.length) % tabs.length;
    tabs.forEach(function (tab, idx) {
      var on = idx === current;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      panels[idx].classList.toggle('is-active', on);
    });
    // reinicia la animación de la barra del paso activo
    var bar = tabs[current].querySelector('.flow__frame-bar i');
    if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
    if (userInitiated) stop();
  }

  function stop() { root.classList.add('is-stopped'); }

  // Avance automático al terminar la barra
  strip.addEventListener('animationend', function (e) {
    if (e.animationName !== 'flowfill' || root.classList.contains('is-stopped')) return;
    select(current + 1, false);
  });

  tabs.forEach(function (tab, idx) {
    tab.addEventListener('click', function () { select(idx, true); });
    tab.addEventListener('keydown', function (e) {
      var k = e.key, n = null;
      if (k === 'ArrowRight' || k === 'ArrowDown') n = current + 1;
      else if (k === 'ArrowLeft' || k === 'ArrowUp') n = current - 1;
      else if (k === 'Home') n = 0;
      else if (k === 'End') n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); select(n, true); tabs[current].focus(); }
    });
  });

  // Pausa: mouse/foco encima o sección fuera de pantalla
  var hovering = false, visible = false;
  function syncPause() { root.classList.toggle('is-paused', hovering || !visible); }
  ['mouseenter', 'focusin'].forEach(function (ev) {
    root.addEventListener(ev, function () { hovering = true; syncPause(); });
  });
  ['mouseleave', 'focusout'].forEach(function (ev) {
    root.addEventListener(ev, function () { hovering = false; syncPause(); });
  });

  if (reduce) { root.classList.add('is-stopped'); }
  select(0, false);
  root.classList.add('is-ready');
  syncPause();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible = en.isIntersecting; syncPause(); });
    }, { threshold: 0.5 }).observe(root);
  } else {
    visible = true; syncPause();
  }
})();