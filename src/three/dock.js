// The character now stays permanently in its small "docked" bubble form —
// bottom-right corner of the viewport — instead of appearing large in the
// hero and shrinking into place on scroll. Per user request: it kept
// colliding with the hero photo, so for now it just always looks like it
// used to look *after* scrolling. Kept as its own module (rather than
// folded inline into main.js) in case the scroll-scrub behavior comes back.
function dockSize() {
  return window.innerWidth < 480 ? 96 : 128;
}

function dockMargin() {
  return window.innerWidth < 480 ? 16 : 32;
}

export function setupCharacterDock({ stage }) {
  if (!stage) return { onScroll() {}, onResize() {} };

  function apply() {
    const size = dockSize();
    const margin = dockMargin();
    const cx = window.innerWidth - margin - size / 2;
    const cy = window.innerHeight - margin - size / 2;

    stage.style.width = `${size}px`;
    stage.style.height = `${size}px`;
    stage.style.left = `${cx - size / 2}px`;
    stage.style.top = `${cy - size / 2}px`;
    stage.classList.add('docked');
  }

  apply();

  return {
    onScroll() {},
    onResize() {
      apply();
    }
  };
}
