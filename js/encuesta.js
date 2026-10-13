/* ═══════════════════════════════════════════════════════
   ENCUESTA.JS — Lógica de la encuesta de reseñas
   Envía a resena.php (sin modificar ese backend)
═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Config: ajusta si resena.php no vive en la raíz ──
  const ENDPOINT = 'resena.php';

  const form        = document.getElementById('resenaForm');
  const card         = document.querySelector('.survey-card');
  const submitBtn    = document.getElementById('submitBtn');
  const btnLabel     = submitBtn.querySelector('.btn-label');
  const btnLoading   = submitBtn.querySelector('.btn-loading');
  const errorBox     = document.getElementById('formError');
  const starFeedback = document.getElementById('starFeedback');

  // ── Textos de retroalimentación por estrella ──
  const STAR_MESSAGES = {
    5: 'Nos alegra muchísimo leer esto ✨',
    4: 'Qué bueno que te haya gustado',
    3: 'Gracias por contarnos',
    2: 'Gracias por tu honestidad',
    1: 'Gracias por decirlo — nos ayuda a mejorar'
  };

  document.querySelectorAll('input[name="estrellas"]').forEach(input => {
    input.addEventListener('change', () => {
      starFeedback.textContent = STAR_MESSAGES[input.value] || '';
    });
  });

  // ── Theme toggle (persistente, independiente del sitio) ──
  const themeToggle = document.getElementById('themeToggle');
  const THEME_KEY = 'obscura-theme';

  function applyTheme(theme) {
    document.body.classList.toggle('theme-light', theme === 'light');
    document.body.classList.toggle('theme-dark', theme !== 'light');
    themeToggle.setAttribute(
      'aria-label',
      theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'
    );
  }

  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* noop */ }
    if (saved) {
      applyTheme(saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      applyTheme('light');
    }
  })();

  themeToggle.addEventListener('click', () => {
    const isLight = document.body.classList.contains('theme-light');
    const next = isLight ? 'dark' : 'light';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* noop */ }
  });

  // ── Helpers ──
  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add('visible');
  }
  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.remove('visible');
  }
  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    btnLabel.hidden = isLoading;
    btnLoading.hidden = !isLoading;
  }

  // ── Envío ──
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const nombre     = form.nombre.value.trim();
    const comentario = form.comentario.value.trim();
    const estrellasEl = form.querySelector('input[name="estrellas"]:checked');
    const estrellas   = estrellasEl ? parseInt(estrellasEl.value, 10) : 0;
    const servicio    = form.servicio.value;
    const autoriza    = form.autoriza.checked;
    const website     = form.website.value; // honeypot

    if (!nombre) {
      showError('Cuéntanos tu nombre (o escribe "Anónimo", ¡va perfecto!).');
      form.nombre.focus();
      return;
    }
    if (!estrellas) {
      showError('Selecciona una calificación antes de enviar.');
      return;
    }
    if (!comentario) {
      showError('Un comentario corto nos ayuda muchísimo — no tiene que ser largo.');
      form.comentario.focus();
      return;
    }

    setLoading(true);

    const payload = {
      nombre,
      estrellas,
      servicio,
      comentario,
      autoriza,
      website // el backend lo usa como honeypot anti-bots
    };

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data = null;
      try { data = await res.json(); } catch (parseErr) { /* respuesta no-JSON */ }

      if (res.ok && (!data || data.success !== false)) {
        card.setAttribute('data-state', 'success');
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (res.status === 429) {
        showError('Ya recibimos varias respuestas desde aquí. Intenta más tarde — ¡gracias por tu paciencia!');
      } else {
        showError((data && data.error) || 'No pudimos enviar tu respuesta. Intenta de nuevo en un momento.');
      }
    } catch (err) {
      showError('Hubo un problema de conexión. Revisa tu internet e intenta otra vez.');
    } finally {
      setLoading(false);
    }
  });

})();