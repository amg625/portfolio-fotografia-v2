/* ═══════════════════════════════════════════
   i18n.js — Sistema de idiomas ES / EN
   Carga JSON según idioma guardado y aplica
   los textos a todos los elementos [data-i18n]
═══════════════════════════════════════════ */

let currentLang = localStorage.getItem('lang') || 'es';
let i18nCache = {};

function getNested(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined) ? acc[key] : null, obj);
}

async function loadLang(lang) {
  try {
    // Usa caché si ya se cargó antes en esta sesión
    if (!i18nCache[lang]) {
      const res = await fetch(`lang/${lang}.json`);
      if (!res.ok) throw new Error('No se pudo cargar el idioma');
      i18nCache[lang] = await res.json();
    }
    applyTexts(i18nCache[lang]);
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.setAttribute('lang', lang);
    updateLangToggle();

    // Si la galería ya está montada (main.js cargado), refresca sus etiquetas
    if (typeof refreshGalleryLabels === 'function') refreshGalleryLabels();
  } catch (err) {
    console.error('i18n error:', err);
  } finally {
    // Muestra el body aunque falle la carga, para no dejar la página en blanco
    document.body.classList.add('i18n-ready');
  }
}

function applyTexts(dict) {
  // Textos normales (incluye <strong> embebido en el manifiesto)
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const value = getNested(dict, el.dataset.i18n);
    if (value !== null) el.innerHTML = value;
  });

  // Placeholders de inputs/textareas
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const value = getNested(dict, el.dataset.i18nPlaceholder);
    if (value !== null) el.setAttribute('placeholder', value);
  });
}

function updateLangToggle() {
  document.querySelectorAll('#langToggle button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
}

// Botones de idioma
document.getElementById('langToggle')?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-lang]');
  if (!btn) return;
  const lang = btn.dataset.lang;
  if (lang !== currentLang) loadLang(lang);
});

// Carga inicial
loadLang(currentLang);
