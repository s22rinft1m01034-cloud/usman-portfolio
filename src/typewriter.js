// A small looping typewriter effect: types a phrase, holds, erases it,
// types the next, forever. The blinking cursor lives beside it in CSS
// (.typewriter-cursor) — this just fills in the text.
export function initTypewriter(el, phrases, opts = {}) {
  if (!el || !phrases.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = phrases[phrases.length - 1];
    return;
  }

  const typeSpeed = opts.typeSpeed ?? 85;
  const eraseSpeed = opts.eraseSpeed ?? 45;
  const holdTime = opts.holdTime ?? 1400;
  const pauseTime = opts.pauseTime ?? 500;

  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;

  function tick() {
    const phrase = phrases[phraseIndex];
    if (!deleting) {
      charIndex++;
      el.textContent = phrase.slice(0, charIndex);
      if (charIndex >= phrase.length) {
        deleting = true;
        setTimeout(tick, holdTime);
        return;
      }
      setTimeout(tick, typeSpeed);
    } else {
      charIndex--;
      el.textContent = phrase.slice(0, charIndex);
      if (charIndex <= 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        setTimeout(tick, pauseTime);
        return;
      }
      setTimeout(tick, eraseSpeed);
    }
  }
  tick();
}
