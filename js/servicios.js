/* ═══════════════════════════════════════════════
   SERVICIOS.JS
   1) Índice editorial: acordeón + foto que cambia
   2) "Cotizar mi sesión" preselecciona el servicio
      en el formulario de contacto.
   Independiente de main.js (no lo modifica).
═══════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── 1) Acordeón + escenario ── */
  var root = document.getElementById('svc');
  if (root) {
    var items = Array.prototype.slice.call(root.querySelectorAll('.svc__item'));
    var figs  = Array.prototype.slice.call(root.querySelectorAll('.svc__fig'));
    var active = 0;
    var shown  = -1;                 // foto actualmente visible

    // Si una foto no existe en el servidor, se oculta y queda el degradado
    root.querySelectorAll('img').forEach(function (img) {
      img.addEventListener('error', function () { img.style.visibility = 'hidden'; });
    });

    function showFig(i) {
      if (i === shown || !figs[i]) return;
      figs.forEach(function (f) { f.classList.remove('is-prev'); });
      if (shown > -1) {
        figs[shown].classList.remove('is-active');
        figs[shown].classList.add('is-prev');
      }
      figs[i].classList.add('is-active');
      shown = i;
    }

    function open(i) {
      items.forEach(function (it, idx) {
        var isOpen = idx === i;
        it.classList.toggle('is-open', isOpen);
        var btn  = it.querySelector('.svc__trigger');
        var body = it.querySelector('.svc__body');
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (isOpen) { body.removeAttribute('inert'); } else { body.setAttribute('inert', ''); }
      });
      active = i;
      showFig(i);
    }

    items.forEach(function (it, idx) {
      it.querySelector('.svc__trigger').addEventListener('click', function () { open(idx); });
    });

    // Vista previa al pasar el mouse (solo con puntero real)
    if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
      items.forEach(function (it, idx) {
        it.querySelector('.svc__trigger').addEventListener('mouseenter', function () { showFig(idx); });
      });
      root.querySelector('.svc__list-wrap').addEventListener('mouseleave', function () { showFig(active); });
    }

    root.classList.add('is-ready');
    open(0);
  }

  /* ── 2) Preselección del servicio en el formulario ── */
  var select = document.getElementById('ctServicio');
  if (select) {
    document.querySelectorAll('[data-servicio]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var value = btn.getAttribute('data-servicio');
        var exists = Array.prototype.some.call(select.options, function (o) {
          return o.value === value;
        });
        if (exists) {
          select.value = value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });
  }
})();