/* ═══════════════════════════════════════════════
   TESTIMONIOS.JS — Carrusel de testimonios
   · Cada testimonio dura según su largo (los largos
     tardan más, para que se alcancen a leer)
   · Pausa al pasar el mouse, enfocar o tocar
   · Pausa si la sección no está a la vista
   · Flechas, puntos, teclado y deslizar con el dedo
   · Con "reducir movimiento" no avanza solo
   Independiente de main.js (usa ids propios: #testi…).
═══════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.getElementById('testi');
  var track = document.getElementById('testiTrack');
  var dotsWrap = document.getElementById('testiDots');
  if (!root || !track || !dotsWrap) return;

  var slides = Array.prototype.slice.call(track.children);
  if (!slides.length) return;

  var idx = 0, hovering = false, visible = false, touching = false;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) root.classList.add('is-static');

  /* Tiempo en pantalla: base + ~140 ms por palabra (mín 6 s, máx 16 s) */
  function dwell(slide) {
    var q = slide.querySelector('.testimonio__quote');
    var words = q ? q.textContent.trim().split(/\s+/).length : 20;
    return Math.min(16000, Math.max(6000, 3500 + words * 140));
  }

  /* Puntos */
  var dots = slides.map(function (_, i) {
    var d = document.createElement('button');
    d.type = 'button';
    d.className = 'test-dot';
    d.appendChild(document.createElement('i'));
    d.addEventListener('click', function () { go(i); });
    dotsWrap.appendChild(d);
    return d;
  });
  function labelDots() {
    var isEn = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
    dots.forEach(function (d, i) {
      d.setAttribute('aria-label', (isEn ? 'Testimonial ' : 'Testimonio ') + (i + 1));
    });
  }
  labelDots();

  /* La altura del contenedor sigue al testimonio activo */
  function setHeight() {
    root.style.height = slides[idx].offsetHeight + 'px';
  }

  function go(i) {
    idx = (i + slides.length) % slides.length;
    track.style.transform = 'translateX(-' + (idx * 100) + '%)';
    dots.forEach(function (d, k) {
      var on = k === idx;
      d.classList.toggle('active', on);
      d.setAttribute('aria-current', on ? 'true' : 'false');
      if (on) {
        d.style.setProperty('--dur', dwell(slides[k]) + 'ms');
        var bar = d.firstChild;           // reinicia la animación del relleno
        bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
      }
    });
    slides.forEach(function (s, k) { s.setAttribute('aria-hidden', k === idx ? 'false' : 'true'); });
    setHeight();
  }

  /* Avance automático: termina el relleno del punto activo */
  dotsWrap.addEventListener('animationend', function (e) {
    if (e.animationName === 'testfill' && !reduce) go(idx + 1);
  });

  /* Pausas */
  function syncPause() {
    root.classList.toggle('is-paused', hovering || touching || !visible || document.hidden);
  }
  root.addEventListener('mouseenter', function () { hovering = true; syncPause(); });
  root.addEventListener('mouseleave', function () { hovering = false; syncPause(); });
  root.addEventListener('focusin', function () { hovering = true; syncPause(); });
  root.addEventListener('focusout', function () { hovering = false; syncPause(); });
  document.addEventListener('visibilitychange', syncPause);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en_) { visible = en_.isIntersecting; syncPause(); });
    }, { threshold: 0.3 }).observe(root);
  } else { visible = true; }

  /* Flechas y teclado */
  var prev = document.getElementById('testiPrev');
  var next = document.getElementById('testiNext');
  if (prev) prev.addEventListener('click', function () { go(idx - 1); });
  if (next) next.addEventListener('click', function () { go(idx + 1); });
  root.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { go(idx - 1); }
    else if (e.key === 'ArrowRight') { go(idx + 1); }
  });

  /* Deslizar con el dedo */
  var x0 = null;
  root.addEventListener('touchstart', function (e) {
    x0 = e.touches[0].clientX; touching = true; syncPause();
  }, { passive: true });
  root.addEventListener('touchend', function (e) {
    if (x0 !== null) {
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) go(idx + (dx < 0 ? 1 : -1));
    }
    x0 = null; touching = false; syncPause();
  }, { passive: true });

  /* Reajusta altura si cambia el texto (idioma, fuentes, tamaño de pantalla) */
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function () { setHeight(); });
    slides.forEach(function (s) { ro.observe(s); });
  }
  window.addEventListener('resize', setHeight);
  window.addEventListener('load', setHeight);

  go(0);
  syncPause();
})();