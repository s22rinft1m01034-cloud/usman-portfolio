// Magnetic buttons: primary/ghost buttons nudge slightly toward the cursor
// while hovered. Desktop-with-a-mouse only, and skipped for reduced motion.
export function initMagnetic() {
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!isFinePointer || prefersReducedMotion) return;

  const STRENGTH = 0.35;
  const MAX_OFFSET = 10;

  document.querySelectorAll('.btn').forEach((btn) => {
    btn.style.transition = 'transform 0.2s ease, box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease';

    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const x = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, dx * STRENGTH));
      const y = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, dy * STRENGTH));
      btn.style.transform = `translate(${x}px, ${y}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}
