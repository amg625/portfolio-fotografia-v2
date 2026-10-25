/* ═══════════════════════════════════════════════════════════
   galeria.js — sección "Trabajo"
   · "Todo": mesa de copias impresas; una foto cambia sola cada 3 s
   · Categoría elegida: carrusel de dos filas (auto-scroll + arrastre)
   · Visor ampliado: botones, teclado y deslizar con el dedo
   Las fotos salen de list-portfolio.php (escanea tus carpetas).
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var SWAP_MS = 3000;   // cada cuánto cambia sola una copia en "Todo"
  var CATS = ['retrato', 'pareja', 'corporativo', 'lifestyle', 'urbana'];
  var CAT_KEY = {
    retrato: 'trabajo.filterRetrato', pareja: 'trabajo.filterPareja', corporativo: 'trabajo.filterCorporativo',
    lifestyle: 'trabajo.filterLifestyle', urbana: 'trabajo.filterUrbana'
  };
  var CAT_ES = { retrato: 'Retrato', pareja: 'Pareja', corporativo: 'Corporativo', lifestyle: 'Lifestyle', urbana: 'Urbana' };

  var $ = function (id) { return document.getElementById(id); };
  var stage = document.querySelector('.trabajo__stage');
  var mesa = $('trabajoMesa'), rowsEl = $('trabajoRows');
  var track1 = $('trabajoTrack1'), track2 = $('trabajoTrack2');
  var filtersEl = $('trabajoFilters'), countEl = $('trabajoCount');
  var pauseBtn = $('trabajoPause'), pauseTxt = $('trabajoPauseTxt'), pauseIcon = $('trabajoPauseIcon'), shuffleBtn = $('trabajoShuffle');
  if (!stage || !mesa || !rowsEl || !track1 || !track2) return;

  var lb = $('lightbox'), lbWrap = $('lbImgWrap'), lbImg = $('lbImg'), lbCount = $('lbCount');
  var lbClose = $('lbClose'), lbPrev = $('lbPrev'), lbNext = $('lbNext');

  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var canHover = !!(window.matchMedia && matchMedia('(hover: hover)').matches);

  var DATA = [];
  var filter = 'all';
  var shown = [];          // copias visibles en la mesa
  var catItems = [];       // fotos de la categoría elegida (orden del carrusel)
  var autoOn = true, inView = false, swapping = false, lastIdx = -1;
  var dataReady = false, loadFailed = false, started = false, visibleOnce = false;
  var swapSeq = 0, renderGen = 0, autoTimer = null, lastN = 0;

  /* ── textos (se leen del idioma activo; con respaldo en español) ── */
  function dict() {
    try { return (typeof i18nCache !== 'undefined' && typeof currentLang !== 'undefined') ? i18nCache[currentLang] : null; }
    catch (e) { return null; }
  }
  function tr(key, fallback, vars) {
    var d = dict(), v = null;
    if (d && key) v = key.split('.').reduce(function (a, k) { return (a && a[k] !== undefined) ? a[k] : null; }, d);
    var s = (v === null || v === undefined) ? fallback : v;
    if (vars) for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }
  function label(cat) { return tr(CAT_KEY[cat], CAT_ES[cat] || cat); }
  function thumb(d) { return d.thumb || d.src; }

  /* ── utilidades ── */
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rnd(min, max) { return min + Math.random() * (max - min); }
  function howMany() { var w = window.innerWidth; return w > 1100 ? 10 : (w > 768 ? 8 : 6); }
  function inCat(c) { return DATA.filter(function (d) { return d.cat === c; }); }

  /* "Todo": reparte parejo entre categorías para no mostrar 10 retratos seguidos */
  function pick() {
    var n = howMany(), quota = Math.ceil(n / CATS.length), out = [], rest = [];
    CATS.forEach(function (c) {
      var s = shuffle(inCat(c));
      out = out.concat(s.slice(0, quota)); rest = rest.concat(s.slice(quota));
    });
    out = shuffle(out);
    if (out.length > n) { rest = rest.concat(out.slice(n)); out = out.slice(0, n); }
    if (out.length < n) out = out.concat(shuffle(rest).slice(0, n - out.length));
    return shuffle(out);
  }

  function updateCount() {
    if (!countEl) return;
    if (!DATA.length) { countEl.textContent = ''; return; }
    countEl.textContent = filter === 'all'
      ? tr('trabajo.countOf', '{n} de {total} fotos', { n: shown.length, total: DATA.length })
      : tr('trabajo.countCat', '{n} fotos', { n: catItems.length });
  }
  function showMessage(key, fallback) {
    mesa.innerHTML = '';
    var p = document.createElement('p');
    p.className = 'trabajo__empty'; p.setAttribute('data-msg', key);
    p.textContent = tr(key, fallback);
    mesa.appendChild(p);
    shown = []; updateCount();
  }

  /* ═════════ MESA DE COPIAS ("Todo") ═════════ */
  function printTilt() {
    var k = window.innerWidth <= 768 ? 0.6 : 1;
    return { r: ((Math.random() < 0.5 ? -1 : 1) * rnd(1.1, 4.0) * k).toFixed(2) + 'deg', dy: rnd(-10, 14).toFixed(0) + 'px' };
  }
  function fillPrint(b, d) {
    var img = b.querySelector('img'), cap = b.querySelector('.trabajo__print-cap');
    img.src = thumb(d);
    if (d.w && d.h) { img.width = d.w; img.height = d.h; } else { img.removeAttribute('width'); img.removeAttribute('height'); }
    cap.textContent = label(d.cat);
    b.setAttribute('aria-label', tr('trabajo.viewPhoto', 'Ver foto ampliada: {cat}', { cat: label(d.cat) }));
    b._d = d;
  }
  function build(items) {
    mesa.innerHTML = '';
    if (!items.length) { showMessage(loadFailed ? 'trabajo.error' : 'trabajo.empty', loadFailed ? 'No se pudo cargar el portafolio.' : 'Todavía no hay fotos.'); return; }
    items.forEach(function (d, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'trabajo__print';
      var t = printTilt();
      b.style.setProperty('--r', t.r); b.style.setProperty('--dy', t.dy); b.style.setProperty('--d', (i * 0.07).toFixed(2) + 's');
      var img = document.createElement('img');
      img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.draggable = false;
      var cap = document.createElement('span'); cap.className = 'trabajo__print-cap';
      b.appendChild(img); b.appendChild(cap);
      fillPrint(b, d);
      b.addEventListener('click', function () { openLb(b._d); });
      mesa.appendChild(b);
    });
    shown = items.slice();
    updateCount();
  }
  function dealIn() {
    var prints = mesa.querySelectorAll('.trabajo__print');
    if (reduce) { prints.forEach(function (p) { p.classList.add('is-in', 'is-settled'); }); return; }
    void mesa.offsetWidth;
    prints.forEach(function (p) { p.classList.add('is-in'); });
    setTimeout(function () { prints.forEach(function (p) { p.classList.add('is-settled'); }); }, 1500);
  }

  /* ── cambio automático: una copia a la vez ── */
  function hoveringPrint() { return canHover && !!mesa.querySelector('.trabajo__print:hover'); }
  function keyboardFocusInMesa() { try { return !!mesa.querySelector(':focus-visible'); } catch (e) { return false; } }
  function canTick() {
    return autoOn && !reduce && filter === 'all' && inView && !swapping && !document.hidden &&
           !lb.classList.contains('open') && !hoveringPrint() && !keyboardFocusInMesa();
  }
  function swapOne() {
    var ps = mesa.querySelectorAll('.trabajo__print'); if (ps.length < 2) return;
    var pool = DATA.filter(function (x) { return shown.indexOf(x) === -1; }); if (!pool.length) return;
    var idx = (lastIdx + 1 + Math.floor(Math.random() * (ps.length - 1))) % ps.length; lastIdx = idx;
    var p = ps[idx], old = p._d, seq = swapSeq;
    // preferimos una foto con proporción parecida para que las demás copias no se muevan
    var ar = old && old.w && old.h ? old.h / old.w : 0;
    var near = ar ? pool.filter(function (x) { return x.w && x.h && Math.abs(x.h / x.w - ar) < 0.18; }) : [];
    var cand = near.length ? near : pool, d = cand[Math.floor(Math.random() * cand.length)];

    swapping = true;
    var pre = new Image(), done = false, guard = setTimeout(function () { finish(false); }, 4000);
    function finish(ok) {
      if (done) return; done = true; clearTimeout(guard);
      if (!ok || seq !== swapSeq || filter !== 'all' || !p.isConnected) { swapping = false; return; }
      p.classList.remove('is-settled'); p.style.transitionDelay = '0s'; p.classList.add('is-out');
      setTimeout(function () {
        if (seq !== swapSeq || !p.isConnected) { swapping = false; return; }
        fillPrint(p, d);
        var t = printTilt();
        p.style.setProperty('--r', t.r); p.style.setProperty('--dy', t.dy); p.style.setProperty('--d', '0s');
        p.classList.remove('is-out', 'is-in'); p.style.transitionDelay = '';
        void p.offsetWidth;
        p.classList.add('is-in');
        shown[idx] = d;
        setTimeout(function () { p.classList.add('is-settled'); swapping = false; }, 1000);
      }, 330);
    }
    pre.onload = function () { finish(true); };
    pre.onerror = function () { finish(false); };
    pre.src = thumb(d);          // se descarga primero; así nunca se ve una copia en blanco
  }
  function startAuto() { stopAuto(); autoTimer = setInterval(function () { if (canTick()) swapOne(); }, SWAP_MS); }
  function stopAuto() { clearInterval(autoTimer); autoTimer = null; }

  /* ═════════ CARRUSEL (categoría elegida) ═════════ */
  function loopList(arr, minItems) {
    if (!arr.length) return [];
    var out = [];
    while (out.length < minItems) out = out.concat(arr);
    return out.concat(out);   // duplicado para el bucle infinito
  }
  function makeItem(d) {
    var div = document.createElement('div');
    div.className = 'trabajo__row-item'; div._d = d;
    var img = document.createElement('img');
    img.src = thumb(d); img.alt = label(d.cat); img.loading = 'lazy'; img.draggable = false;
    if (d.w && d.h) { img.width = d.w; img.height = d.h; }
    var ov = document.createElement('div'); ov.className = 'trabajo__item-overlay';
    var sp = document.createElement('span'); sp.textContent = label(d.cat);
    var z = document.createElement('span'); z.className = 'zoom-btn'; z.setAttribute('aria-hidden', 'true'); z.textContent = '↗';
    ov.appendChild(sp); ov.appendChild(z);
    div.appendChild(img); div.appendChild(ov);
    return div;
  }
  function setupRow(rowEl, trackEl, items, direction, speed, gen) {
    if (rowEl._ac) rowEl._ac.abort();                  // quita los listeners de la versión anterior
    if (trackEl._ro) trackEl._ro.disconnect();
    var ac = new AbortController(); rowEl._ac = ac; var sig = { signal: ac.signal };
    trackEl.innerHTML = ''; trackEl.style.transform = '';
    items.forEach(function (it) { trackEl.appendChild(makeItem(it)); });

    var offset = 0, halfWidth = 0, dragging = false, paused = false;
    var startX = 0, startOffset = 0, dragDistance = 0, downTarget = null, resume;
    function half() { halfWidth = trackEl.scrollWidth / 2; }
    trackEl._ro = new ResizeObserver(half); trackEl._ro.observe(trackEl);
    trackEl.querySelectorAll('img').forEach(function (img) {
      if (img.complete) half(); else img.addEventListener('load', half, { once: true });
    });

    (function tick() {
      if (gen !== renderGen) return;                   // esta fila ya fue reemplazada
      if (!dragging && !paused && autoOn && !reduce && inView && halfWidth > 0) {
        offset += direction * speed;
        if (direction < 0 && offset <= -halfWidth) offset += halfWidth;
        if (direction > 0 && offset >= 0) offset -= halfWidth;
        trackEl.style.transform = 'translateX(' + offset + 'px)';
      }
      requestAnimationFrame(tick);
    })();

    rowEl.addEventListener('pointerdown', function (e) {
      dragging = true; dragDistance = 0; startX = e.clientX; startOffset = offset;
      // la foto tocada se guarda ANTES de capturar el puntero (después, e.target ya es la fila)
      downTarget = e.target.closest('.trabajo__row-item');
      rowEl.classList.add('dragging');
      try { rowEl.setPointerCapture(e.pointerId); } catch (_) {}
      clearTimeout(resume);
    }, sig);
    rowEl.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var delta = e.clientX - startX; dragDistance = Math.abs(delta); offset = startOffset + delta;
      if (halfWidth > 0) { while (offset <= -halfWidth) offset += halfWidth; while (offset >= halfWidth) offset -= halfWidth; }
      trackEl.style.transform = 'translateX(' + offset + 'px)';
    }, sig);
    function endDrag() {
      if (!dragging) return;
      dragging = false; rowEl.classList.remove('dragging');
      if (dragDistance < 6 && downTarget) openLb(downTarget._d);
      downTarget = null;
      resume = setTimeout(function () { paused = false; }, 1200);
    }
    rowEl.addEventListener('pointerup', endDrag, sig);
    rowEl.addEventListener('pointercancel', endDrag, sig);
    rowEl.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') paused = true; }, sig);
    rowEl.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !dragging) paused = false; }, sig);
  }
  function buildRows() {
    renderGen++;
    catItems = shuffle(inCat(filter));
    var r1 = catItems.filter(function (_, i) { return i % 2 === 0; });
    var r2 = catItems.filter(function (_, i) { return i % 2 === 1; });
    setupRow($('trabajoRow1'), track1, loopList(r1.length ? r1 : catItems, 10), -1, 0.55, renderGen);
    setupRow($('trabajoRow2'), track2, loopList(r2.length ? r2 : catItems, 10), 1, 0.4, renderGen);
    shown = [];
    updateCount();
  }
  function stopRows() {                                // detiene los bucles de las filas al volver a "Todo"
    renderGen++;
    [$('trabajoRow1'), $('trabajoRow2')].forEach(function (r) { if (r && r._ac) r._ac.abort(); });
    track1.innerHTML = ''; track2.innerHTML = '';
  }

  /* ═════════ CAMBIO DE FILTRO / BARAJAR ═════════ */
  function setMode(rowsMode) {
    mesa.hidden = rowsMode;
    rowsEl.classList.toggle('is-active', rowsMode);
    if (!rowsMode) rowsEl.classList.remove('on');
  }
  function swap(first) {
    var seq = ++swapSeq;
    var rowsMode = filter !== 'all' && inCat(filter).length > 0;
    var fromRows = rowsEl.classList.contains('is-active');
    var go = function () {
      if (seq !== swapSeq) return;
      stopAuto(); swapping = false;
      setMode(rowsMode);
      if (rowsMode) {
        buildRows();
        requestAnimationFrame(function () { requestAnimationFrame(function () { rowsEl.classList.add('on'); }); });
      } else {
        stopRows();
        if (filter === 'all') { build(pick()); dealIn(); }
        else {                                           // categoría sin fotos (o la lista no cargó)
          catItems = [];
          if (loadFailed) showMessage('trabajo.error', 'No se pudo cargar el portafolio. Intenta de nuevo en un momento.');
          else showMessage('trabajo.empty', 'Todavía no hay fotos en esta categoría.');
        }
        startAuto();
      }
    };
    if (first || reduce) { go(); return; }
    if (fromRows) { rowsEl.classList.remove('on'); setTimeout(go, 420); return; }
    var old = mesa.querySelectorAll('.trabajo__print');
    if (!old.length) { go(); return; }
    old.forEach(function (p, i) { p.classList.remove('is-settled'); p.style.transitionDelay = (i * 0.02) + 's'; p.classList.add('is-out'); });
    setTimeout(go, 340);
  }

  /* la mesa "se reparte" cuando la sección entra en pantalla por primera vez */
  function maybeStart() {
    if (started || !dataReady || !visibleOnce) return;
    started = true; lastN = howMany(); swap(true);
  }

  filtersEl.addEventListener('click', function (e) {
    var c = e.target.closest('.filter-chip'); if (!c) return;
    var f = c.getAttribute('data-filter');
    if (f === filter) return;
    filter = f;
    filtersEl.querySelectorAll('.filter-chip').forEach(function (x) {
      var on = x === c; x.classList.toggle('active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    visibleOnce = true;
    if (!started) { maybeStart(); return; }
    swap(false);
  });
  shuffleBtn.addEventListener('click', function () { if (!started) return; swap(false); });

  function paintPause() {
    var on = autoOn;
    pauseBtn.setAttribute('aria-pressed', on ? 'false' : 'true');
    pauseBtn.setAttribute('aria-label', on ? tr('trabajo.pauseLabel', 'Pausar el cambio automático de fotos') : tr('trabajo.resumeLabel', 'Reanudar el cambio automático de fotos'));
    pauseTxt.textContent = on ? tr('trabajo.pause', 'Pausar') : tr('trabajo.resume', 'Reanudar');
    pauseIcon.innerHTML = on
      ? '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'
      : '<path d="M7 4.5v15l12-7.5z"/>';
  }
  pauseBtn.addEventListener('click', function () { autoOn = !autoOn; paintPause(); });
  if (reduce) pauseBtn.hidden = true;                  // sin movimiento automático no hay nada que pausar

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { inView = e.isIntersecting; if (e.isIntersecting) { visibleOnce = true; maybeStart(); } });
    }, { threshold: 0.08 }).observe(stage);
  } else { inView = true; visibleOnce = true; }

  var rz;
  window.addEventListener('resize', function () {      // solo reparte de nuevo si cambia cuántas copias caben
    clearTimeout(rz);
    rz = setTimeout(function () {
      var n = howMany();
      if (n !== lastN) { lastN = n; if (started && filter === 'all') swap(false); }
    }, 250);
  });

  /* ═════════ VISOR ═════════ */
  var lbList = [], lbIdx = 0, lbBusy = false, lastFocus = null, sw = null, suppressClickUntil = 0;

  function preload(src) { var i = new Image(); i.src = src; }
  function paintLb() {
    var d = lbList[lbIdx]; if (!d) return;
    var full = d.src, small = thumb(d);
    lbImg.alt = label(d.cat);
    lbImg.src = small;                                 // aparece al instante (ya está en caché)…
    if (full !== small) {                              // …y se cambia a la original en cuanto carga
      var f = new Image();
      f.onload = function () { if (lbList[lbIdx] === d) lbImg.src = full; };
      f.src = full;
    }
    lbCount.textContent = (lbIdx + 1) + ' / ' + lbList.length;
    lbPrev.style.opacity = lbIdx === 0 ? '0.3' : '1';
    lbNext.style.opacity = lbIdx === lbList.length - 1 ? '0.3' : '1';
    [-2, -1, 1, 2].forEach(function (o) {
      var n = lbList[lbIdx + o]; if (!n) return;
      preload(thumb(n)); if (Math.abs(o) === 1 && n.src !== thumb(n)) preload(n.src);
    });
  }
  function openLb(d) {
    if (filter === 'all') {                            // primero las copias de la mesa, luego el resto al azar
      var rest = DATA.filter(function (x) { return shown.indexOf(x) === -1; });
      lbList = shown.concat(shuffle(rest));
    } else { lbList = catItems.slice(); }
    lbIdx = Math.max(0, lbList.indexOf(d));
    lastFocus = document.activeElement;
    lbBusy = false; lbWrap.style.transition = ''; lbWrap.style.transform = ''; lbWrap.style.opacity = '';
    suppressClickUntil = Date.now() + 450;            // el "clic fantasma" del mismo toque que abrió el visor no debe cerrarlo
    paintLb();
    lb.classList.add('open');
    document.body.classList.add('lb-open');
    document.body.style.overflow = 'hidden';
    try { lbClose.focus({ preventScroll: true }); } catch (_) {}
  }
  function closeLb() {
    if (!lb.classList.contains('open')) return;
    lb.classList.remove('open');
    document.body.classList.remove('lb-open');
    document.body.style.overflow = '';
    lbBusy = false; sw = null; lbWrap.style.transition = ''; lbWrap.style.transform = ''; lbWrap.style.opacity = '';
    setTimeout(function () { if (!lb.classList.contains('open')) lbImg.removeAttribute('src'); }, 320);
    if (lastFocus && lastFocus.isConnected && lastFocus.focus && lastFocus !== document.body) {
      try { lastFocus.focus({ preventScroll: true }); } catch (_) {}
    }
    lastFocus = null;
  }
  function go(dir) {
    var ni = lbIdx + dir;
    if (lbBusy || ni < 0 || ni >= lbList.length) return;
    if (reduce) { lbIdx = ni; paintLb(); return; }
    lbBusy = true;
    var out = dir > 0 ? -1 : 1, w = Math.min(window.innerWidth * 0.4, 360);
    lbWrap.style.transition = 'transform .16s ease-in, opacity .16s ease-in';
    lbWrap.style.transform = 'translateX(' + (out * w) + 'px)';
    lbWrap.style.opacity = '0';
    setTimeout(function () {
      if (!lb.classList.contains('open')) { lbBusy = false; return; }
      lbIdx = ni; paintLb();
      lbWrap.style.transition = 'none';
      lbWrap.style.transform = 'translateX(' + (-out * w) + 'px)';
      void lbWrap.offsetWidth;
      lbWrap.style.transition = 'transform .24s cubic-bezier(.2,.8,.2,1), opacity .24s ease-out';
      lbWrap.style.transform = ''; lbWrap.style.opacity = '';
      setTimeout(function () { lbBusy = false; }, 240);
    }, 160);
  }
  function snapBack() {
    lbWrap.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1), opacity .22s ease-out';
    lbWrap.style.transform = ''; lbWrap.style.opacity = '';
  }

  lbClose.addEventListener('click', closeLb);
  // (un deslizamiento que empieza sobre una flecha no cuenta como toque en la flecha)
  lbPrev.addEventListener('click', function (e) { e.stopPropagation(); if (Date.now() >= suppressClickUntil) go(-1); });
  lbNext.addEventListener('click', function (e) { e.stopPropagation(); if (Date.now() >= suppressClickUntil) go(1); });
  lb.addEventListener('click', function (e) {
    if (Date.now() < suppressClickUntil) return;       // el final de un deslizamiento no cierra el visor
    if (e.target === lb || e.target.id === 'lbImgWrap') closeLb();
  });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'Tab') {                        // el foco se queda dentro del visor
      var f = [lbClose, lbPrev, lbNext], i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1)].focus();
    }
  });

  /* deslizar con el dedo: la foto sigue al dedo y, al soltar, pasa a la siguiente o anterior */
  lb.addEventListener('pointerdown', function (e) {
    if (!lb.classList.contains('open') || lbBusy) return;
    if (e.pointerType === 'mouse' || !e.isPrimary) return;     // con mouse se usan los botones y el teclado
    if (window.visualViewport && window.visualViewport.scale > 1.02) return;   // con zoom, el dedo mueve la foto
    sw = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, locked: null, t0: performance.now() };
  });
  lb.addEventListener('pointermove', function (e) {
    if (!sw || e.pointerId !== sw.id) return;
    var mx = e.clientX - sw.x, my = e.clientY - sw.y;
    if (!sw.locked) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      sw.locked = Math.abs(mx) > Math.abs(my) ? 'h' : 'v';
      if (sw.locked === 'h') { try { lb.setPointerCapture(sw.id); } catch (_) {} lbWrap.style.transition = 'none'; }
    }
    if (sw.locked !== 'h') return;
    sw.dx = mx;
    var edge = (mx > 0 && lbIdx === 0) || (mx < 0 && lbIdx === lbList.length - 1);
    var shift = edge ? mx * 0.25 : mx;                         // en la primera/última foto "jala" con resistencia
    lbWrap.style.transform = 'translateX(' + shift + 'px)';
    lbWrap.style.opacity = String(1 - Math.min(Math.abs(shift) / (window.innerWidth * 1.4), 0.45));
  });
  function endSwipe(e) {
    if (!sw || e.pointerId !== sw.id) return;
    var s = sw; sw = null;
    try { lb.releasePointerCapture(s.id); } catch (_) {}
    if (s.locked !== 'h') return;
    suppressClickUntil = Date.now() + 350;
    var thr = Math.min(80, window.innerWidth * 0.18);
    var flick = Math.abs(s.dx) > 30 && (performance.now() - s.t0) < 280;
    var ok = e.type === 'pointerup';
    if (ok && s.dx < 0 && (s.dx <= -thr || flick) && lbIdx < lbList.length - 1) go(1);
    else if (ok && s.dx > 0 && (s.dx >= thr || flick) && lbIdx > 0) go(-1);
    else snapBack();
  }
  lb.addEventListener('pointerup', endSwipe);
  lb.addEventListener('pointercancel', endSwipe);

  /* ═════════ TEXTOS AL CAMBIAR DE IDIOMA (lo llama i18n.js) ═════════ */
  window.refreshGalleryLabels = function () {
    // se actualizan en su lugar: no se rebaraja ni se pierde la posición del carrusel
    mesa.querySelectorAll('.trabajo__print').forEach(function (p) { if (p._d) fillPrintLabels(p); });
    rowsEl.querySelectorAll('.trabajo__row-item').forEach(function (it) {
      var d = it._d; if (!d) return;
      it.querySelector('img').alt = label(d.cat);
      it.querySelector('.trabajo__item-overlay span').textContent = label(d.cat);
    });
    var msg = mesa.querySelector('.trabajo__empty');
    if (msg) msg.textContent = tr(msg.getAttribute('data-msg'), msg.textContent);
    filtersEl.setAttribute('aria-label', tr('trabajo.filtersLabel', 'Filtrar por categoría'));
    updateCount(); paintPause();
  };
  function fillPrintLabels(p) {
    var d = p._d;
    p.querySelector('.trabajo__print-cap').textContent = label(d.cat);
    p.setAttribute('aria-label', tr('trabajo.viewPhoto', 'Ver foto ampliada: {cat}', { cat: label(d.cat) }));
  }

  /* ═════════ CARGA DE FOTOS ═════════ */
  paintPause();
  fetch('list-portfolio.php')
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (list) {
      if (!Array.isArray(list)) throw new Error('Respuesta inesperada');
      DATA = list.filter(function (d) { return d && d.src && CAT_KEY[d.cat]; });
    })
    .catch(function (err) { console.error('No se pudo cargar el portafolio:', err); DATA = []; loadFailed = true; })
    .then(function () { dataReady = true; maybeStart(); });
})();
