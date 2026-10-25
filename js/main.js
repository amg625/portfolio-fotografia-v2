/* ═══════════════════════════════════════════
   main.js — nav, tema, menú, reveal, testimonios y formularios
   (la galería de Trabajo está en galeria.js)
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

// ── Galería de "Trabajo" (mesa, carrusel y visor): vive en galeria.js

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
