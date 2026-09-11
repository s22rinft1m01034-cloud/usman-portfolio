// Animates each .stat-value from 0 up to its data-count-to once it scrolls
// into view, rather than just appearing as static text.
export function initCountUp(selector = '.stat-value[data-count-to]') {
  const els = document.querySelectorAll(selector);
  if (!els.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((el) => {
      el.textContent = Number(el.dataset.countTo).toLocaleString('en-US') + (el.dataset.suffix || '');
    });
    return;
  }

  const DURATION = 1100;

  function run(el) {
    const target = parseFloat(el.dataset.countTo);
    const suffix = el.dataset.suffix || '';
    const start = performance.now();

    function tick(now) {
      const p = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      // toLocaleString adds thousand separators (10000 -> "10,000") — matters
      // once stats grew past single/double digits; a no-op for small values.
      el.textContent = Math.round(target * eased).toLocaleString('en-US') + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (!('IntersectionObserver' in window)) {
    els.forEach(run);
    return;
  }

  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        run(entry.target);
      });
    },
    { threshold: 0.4 }
  );
  els.forEach((el) => io.observe(el));
}
