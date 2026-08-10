/* ═══════════════════════════════════════════
   OBSCURA V3 — main.js
═══════════════════════════════════════════ */

// ── Nav scroll
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── Theme toggle (persist en localStorage)
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;
const savedTheme = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// ── Idioma: la lógica real vive en i18n.js

// ── Menú mobile
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
menuBtn?.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});
mobileMenu?.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// ── Reveal on scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// ── Datos del portafolio (fuente única para las filas)
// La lista de fotos ahora se carga dinámicamente desde list-portfolio.php
// (escanea las carpetas reales, ya no hay nombres fijos que puedan faltar)
let TRABAJO_DATA = [];

// Etiquetas de categoría — se leen del diccionario de idioma activo (i18n.js)
const CAT_KEY_MAP = {
  retrato: 'trabajo.filterRetrato',
  lifestyle: 'trabajo.filterLifestyle',
  pareja: 'trabajo.filterPareja',
  corporativo: 'trabajo.filterCorporativo',
  urbana: 'trabajo.filterUrbana'
};
function getCatLabel(cat) {
  const dict = (typeof i18nCache !== 'undefined' && typeof currentLang !== 'undefined') ? i18nCache[currentLang] : null;
  const path = CAT_KEY_MAP[cat];
  if (!dict || !path) return cat;
  const value = path.split('.').reduce((acc, k) => (acc && acc[k] !== undefined) ? acc[k] : null, dict);
  return value || cat;
}

let currentFilteredData = TRABAJO_DATA.slice();
let currentFilter = 'all';
let renderGen = 0;

function buildLoopList(arr, minItems = 10) {
  if (arr.length === 0) return [];
  let out = [];
  while (out.length < minItems) out = out.concat(arr);
  return out.concat(out); // duplicado para loop infinito
}

function makeRowItem(data) {
  const div = document.createElement('div');
  div.className = 'trabajo__row-item';
  div.dataset.cat = data.cat;
  div.dataset.full = data.src;

  const img = document.createElement('img');
  img.src = data.src;
  img.alt = getCatLabel(data.cat);
  img.loading = 'lazy';
  div.appendChild(img);

  const overlay = document.createElement('div');
  overlay.className = 'trabajo__item-overlay';
  overlay.innerHTML = `<span>${getCatLabel(data.cat)}</span><button class="zoom-btn" aria-label="Ver">↗</button>`;
  div.appendChild(overlay);

  return div;
}

function setupRow(rowEl, trackEl, items, direction, speed, gen) {
  trackEl.innerHTML = '';
  items.forEach(item => trackEl.appendChild(makeRowItem(item)));

  let offset = 0;
  let halfWidth = 0;
  let dragging = false;
  let paused = false;
  let startX = 0;
  let startOffset = 0;
  let dragDistance = 0;
  let downTarget = null;
  let resumeTimeout;

  function computeHalfWidth() {
    halfWidth = trackEl.scrollWidth / 2;
  }
  const ro = new ResizeObserver(computeHalfWidth);
  ro.observe(trackEl);
  trackEl.querySelectorAll('img').forEach(img => {
    if (img.complete) computeHalfWidth();
    else img.addEventListener('load', computeHalfWidth, { once: true });
  });

  function tick() {
    if (gen !== renderGen) return; // esta fila ya fue reemplazada, detener loop
    if (!dragging && !paused && halfWidth > 0) {
      offset += direction * speed;
      if (direction < 0 && offset <= -halfWidth) offset += halfWidth;
      if (direction > 0 && offset >= 0) offset -= halfWidth;
      trackEl.style.transform = `translateX(${offset}px)`;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  rowEl.addEventListener('pointerdown', e => {
    dragging = true;
    dragDistance = 0;
    startX = e.clientX;
    startOffset = offset;
    // Guardamos la foto tocada ANTES de capturar el puntero — después de
    // setPointerCapture, e.target en pointerup siempre apunta a rowEl,
    // no a la foto específica, así que hay que guardarlo aquí.
    downTarget = e.target.closest('.trabajo__row-item');
    rowEl.classList.add('dragging');
    rowEl.setPointerCapture(e.pointerId);
    clearTimeout(resumeTimeout);
  });

  rowEl.addEventListener('pointermove', e => {
    if (!dragging) return;
    const delta = e.clientX - startX;
    dragDistance = Math.abs(delta);
    offset = startOffset + delta;
    if (halfWidth > 0) {
      while (offset <= -halfWidth) offset += halfWidth;
      while (offset >= halfWidth) offset -= halfWidth;
    }
    trackEl.style.transform = `translateX(${offset}px)`;
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    rowEl.classList.remove('dragging');
    if (dragDistance < 6 && downTarget) {
      openLightboxFromItem(downTarget);
    }
    downTarget = null;
    resumeTimeout = setTimeout(() => { paused = false; }, 1200);
  }
  rowEl.addEventListener('pointerup', endDrag);
  rowEl.addEventListener('pointercancel', endDrag);

  rowEl.addEventListener('pointerenter', e => {
    if (e.pointerType === 'mouse') paused = true;
  });
  rowEl.addEventListener('pointerleave', e => {
    if (e.pointerType === 'mouse' && !dragging) paused = false;
  });
}

function renderTrabajoRows(filter) {
  renderGen++;
  const gen = renderGen;

  currentFilteredData = filter === 'all' ? TRABAJO_DATA.slice() : TRABAJO_DATA.filter(d => d.cat === filter);

  const row1Base = currentFilteredData.filter((_, i) => i % 2 === 0);
  const row2Base = currentFilteredData.filter((_, i) => i % 2 === 1);

  const row1 = document.getElementById('trabajoRow1');
  const track1 = document.getElementById('trabajoTrack1');
  const row2 = document.getElementById('trabajoRow2');
  const track2 = document.getElementById('trabajoTrack2');

  setupRow(row1, track1, buildLoopList(row1Base.length ? row1Base : currentFilteredData), -1, 0.55, gen);
  setupRow(row2, track2, buildLoopList(row2Base.length ? row2Base : currentFilteredData), 1, 0.4, gen);
}

// ── Filtros
const filterChips = document.querySelectorAll('.filter-chip');
filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filterChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.dataset.filter;
    renderTrabajoRows(currentFilter);
  });
});

// Carga la lista real de fotos desde el servidor y arranca el render.
// Si agregas o quitas fotos en las carpetas, aquí se reflejan solas.
async function loadTrabajoData() {
  try {
    const res = await fetch('list-portfolio.php');
    TRABAJO_DATA = await res.json();
  } catch (err) {
    console.error('No se pudo cargar el portafolio:', err);
    TRABAJO_DATA = [];
  }
  renderTrabajoRows('all');
}
loadTrabajoData();

// Vuelve a pintar las etiquetas de categoría cuando cambia el idioma
// (llamada desde i18n.js después de cargar el nuevo diccionario)
function refreshGalleryLabels() {
  if (TRABAJO_DATA.length === 0) return; // aún no ha cargado la primera vez
  renderTrabajoRows(currentFilter);
}

// ── Lightbox (data-driven)
const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lbImg');
const lbClose = document.getElementById('lbClose');
const lbPrev = document.getElementById('lbPrev');
const lbNext = document.getElementById('lbNext');

let currentIdx = 0;

function openLightboxFromItem(item) {
  const src = item.dataset.full;
  const idx = currentFilteredData.findIndex(d => d.src === src);
  currentIdx = idx >= 0 ? idx : 0;
  showLbImage(currentIdx);
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
  lbImg.src = '';
}
function showLbImage(idx) {
  const data = currentFilteredData[idx];
  if (!data) return;
  lbImg.src = data.src;
  lbPrev.style.opacity = idx === 0 ? '0.3' : '1';
  lbNext.style.opacity = idx === currentFilteredData.length - 1 ? '0.3' : '1';
}

lbClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => {
  if (e.target === lightbox || e.target.id === 'lbImgWrap') closeLightbox();
});
lbPrev.addEventListener('click', e => {
  e.stopPropagation();
  if (currentIdx > 0) { currentIdx--; showLbImage(currentIdx); }
});
lbNext.addEventListener('click', e => {
  e.stopPropagation();
  if (currentIdx < currentFilteredData.length - 1) { currentIdx++; showLbImage(currentIdx); }
});
document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft' && currentIdx > 0) { currentIdx--; showLbImage(currentIdx); }
  if (e.key === 'ArrowRight' && currentIdx < currentFilteredData.length - 1) { currentIdx++; showLbImage(currentIdx); }
});

// ── Protección básica
document.addEventListener('contextmenu', e => e.preventDefault());

// ── Carrusel de testimonios
const testTrack = document.getElementById('testTrack');
const testDotsWrap = document.getElementById('testDots');
const testimonios = testTrack ? testTrack.querySelectorAll('.testimonio') : [];
let testIdx = 0;
let testTimer;

if (testimonios.length > 0) {
  testimonios.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'test-dot';
    if (i === 0) dot.classList.add('active');
    dot.setAttribute('aria-label', `Testimonio ${i + 1}`);
    dot.addEventListener('click', () => goToTest(i));
    testDotsWrap.appendChild(dot);
  });

  function goToTest(idx) {
    testIdx = idx;
    testTrack.style.transform = `translateX(-${idx * 100}%)`;
    testDotsWrap.querySelectorAll('.test-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    resetTestTimer();
  }
  function nextTest() { goToTest((testIdx + 1) % testimonios.length); }
  function resetTestTimer() { clearInterval(testTimer); testTimer = setInterval(nextTest, 6000); }

  document.getElementById('testPrev')?.addEventListener('click', () => goToTest((testIdx - 1 + testimonios.length) % testimonios.length));
  document.getElementById('testNext')?.addEventListener('click', () => goToTest((testIdx + 1) % testimonios.length));

  testTimer = setInterval(nextTest, 6000);
}

// ── Formulario de colaboración
const colaboraForm = document.getElementById('colaboraForm');
const colSubmitBtn = document.getElementById('colSubmitBtn');
const colFormMsg = document.getElementById('colFormMsg');

colaboraForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = colaboraForm.nombre.value.trim();
  const instagram = colaboraForm.instagram.value.trim();
  const tipo = colaboraForm.tipo.value;
  const idea = colaboraForm.idea.value.trim();

  if (!nombre || !instagram || !tipo || !idea) {
    showColMsg('Por favor completa los campos requeridos (*)', 'error');
    return;
  }

  const btnText = colSubmitBtn.querySelector('.btn-text');
  const btnLoading = colSubmitBtn.querySelector('.btn-loading');
  btnText.hidden = true;
  btnLoading.hidden = false;
  colSubmitBtn.disabled = true;

  const data = {
    nombre,
    instagram,
    ciudad: colaboraForm.ciudad.value.trim(),
    tipo,
    idea,
    disponibilidad: colaboraForm.disponibilidad.value.trim(),
    porque: colaboraForm.porque.value.trim(),
    website: colaboraForm.website.value // honeypot
  };

  try {
    const res = await fetch('colabora.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      showColMsg('¡Postulación enviada! Reviso todo con calma y te respondo en 5–7 días.', 'success');
      colaboraForm.reset();
    } else {
      throw new Error('Server error');
    }
  } catch {
    showColMsg('Hubo un error. Intenta de nuevo o escríbeme por WhatsApp.', 'error');
  } finally {
    btnText.hidden = false;
    btnLoading.hidden = true;
    colSubmitBtn.disabled = false;
  }
});

function showColMsg(text, type) {
  colFormMsg.textContent = text;
  colFormMsg.className = `form-msg ${type}`;
  colFormMsg.hidden = false;
  setTimeout(() => { colFormMsg.hidden = true; }, 6000);
}

// ── Año dinámico en footer
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ── Formulario de contacto
const contactForm = document.getElementById('contactForm');
const ctSubmitBtn = document.getElementById('ctSubmitBtn');
const ctFormMsg = document.getElementById('ctFormMsg');

contactForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = contactForm.nombre.value.trim();
  const email = contactForm.email.value.trim();
  const mensaje = contactForm.mensaje.value.trim();

  if (!nombre || !email || !mensaje) {
    showCtMsg('Por favor completa los campos requeridos (*)', 'error');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showCtMsg('El email no es válido', 'error');
    return;
  }

  const btnText = ctSubmitBtn.querySelector('.btn-text');
  const btnLoading = ctSubmitBtn.querySelector('.btn-loading');
  btnText.hidden = true;
  btnLoading.hidden = false;
  ctSubmitBtn.disabled = true;

  const data = {
    nombre,
    email,
    telefono: contactForm.telefono.value.trim(),
    servicio: contactForm.servicio.value,
    mensaje,
    website: contactForm.website.value // honeypot
  };

  try {
    const res = await fetch('mail.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      showCtMsg('¡Mensaje enviado! Te respondo pronto 📸', 'success');
      contactForm.reset();
    } else {
      throw new Error('Server error');
    }
  } catch {
    showCtMsg('Hubo un error. Escríbeme directo por WhatsApp.', 'error');
  } finally {
    btnText.hidden = false;
    btnLoading.hidden = true;
    ctSubmitBtn.disabled = false;
  }
});

function showCtMsg(text, type) {
  ctFormMsg.textContent = text;
  ctFormMsg.className = `form-msg ${type}`;
  ctFormMsg.hidden = false;
  setTimeout(() => { ctFormMsg.hidden = true; }, 6000);
}
