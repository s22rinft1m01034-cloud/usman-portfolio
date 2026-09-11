// Custom cursor: a small dot that tracks exactly + a ring that trails with a
// lerp, both growing on hoverable elements. Desktop-with-a-mouse only — a
// real cursor stays on touch/coarse-pointer devices.
export function initCursor() {
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!isFinePointer || prefersReducedMotion) return;

  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  document.documentElement.classList.add('has-custom-cursor');

  const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const ringPos = { ...target };

  window.addEventListener('pointermove', (e) => {
    target.x = e.clientX;
    target.y = e.clientY;
    dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
  });

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('a, button, .project-card, .skill-card, .chip')) {
      ring.classList.add('hover');
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('a, button, .project-card, .skill-card, .chip')) {
      ring.classList.remove('hover');
    }
  });

  function tick() {
    ringPos.x += (target.x - ringPos.x) * 0.18;
    ringPos.y += (target.y - ringPos.y) * 0.18;
    ring.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px) translate(-50%, -50%)`;
    requestAnimationFrame(tick);
  }
  tick();
}
