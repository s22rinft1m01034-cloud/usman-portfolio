import Lenis from 'lenis';

import { renderAll } from './render.js';
import { person } from './content.js';
import { initCharacter } from './three/character.js';
import { setupCharacterDock } from './three/dock.js';
import { initChat } from './chat/chatWidget.js';
import { initCursor } from './cursor.js';
import { initMagnetic } from './magnetic.js';
import { initTypewriter } from './typewriter.js';
import { initCountUp } from './countup.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 1. Content first — everything below assumes the DOM is populated.
renderAll();
initCursor();
initMagnetic();
initTypewriter(document.getElementById('hero-typewriter'), ['This is', 'Usman Sabir']);
initCountUp();

// 2. Smooth scroll (skipped entirely if the visitor prefers reduced motion).
let lenis = null;
if (!prefersReducedMotion) {
  lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

// 3. #hero-title no longer needs its own reveal animation — it's driven by
// the typewriter now (see the initTypewriter() call above), which is its
// own reveal. SplitType/GSAP stagger used to live here for a per-character
// fade-up on load; removed since the typewriter replaces the element's
// content wholesale (would fight a per-char span setup anyway).

// 4. Scroll-triggered reveals for every [data-reveal] element.
const revealTargets = document.querySelectorAll('[data-reveal]');
if (prefersReducedMotion) {
  revealTargets.forEach((el) => el.classList.add('in-view'));
} else if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealTargets.forEach((el) => io.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add('in-view'));
}

// 5. The 3D character (permanently docked small, bottom-right — see
// three/dock.js) + its chat widget.
const characterStage = document.getElementById('character-stage');
const characterCanvas = document.getElementById('character-canvas');
let character = null;
if (characterCanvas && characterStage) {
  character = initCharacter({ canvas: characterCanvas, stage: characterStage });
  const dock = setupCharacterDock({ stage: characterStage });
  window.addEventListener('resize', () => dock.onResize());
}

initChat({ character, dockTrigger: characterStage });

// 7. Header: scroll progress bar + mobile nav toggle.
const progressBar = document.getElementById('progress-bar');
function updateProgress() {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - doc.clientHeight;
  const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  if (progressBar) progressBar.style.width = `${pct}%`;
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

const navToggle = document.getElementById('nav-toggle');
const siteNav = document.getElementById('site-nav');
navToggle?.addEventListener('click', () => siteNav.classList.toggle('open'));
siteNav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => siteNav.classList.remove('open')));

// 8. Contact form → opens the visitor's email client (no backend needed).
const contactForm = document.getElementById('contact-form');
contactForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(contactForm);
  const name = data.get('name');
  const email = data.get('email');
  const message = data.get('message');
  const subject = encodeURIComponent(`Portfolio inquiry from ${name}`);
  const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
  window.location.href = `mailto:${person.email}?subject=${subject}&body=${body}`;
});
