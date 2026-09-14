// Section 03 only: native sticky positioning and one direct transform per frame.
const section = document.querySelector('.signature-drinks');

if (section) {
  const stage = section.querySelector('.signature-drinks__stage');
  const track = section.querySelector('.signature-drinks__track');
  const desktop = matchMedia('(min-width: 1024px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)');
  let frame = 0;
  let visible = false;
  let dirty = true;
  let top = 0;
  let distance = 1;
  let width = 0;
  let lastX = NaN;
  const clamp = value => Math.min(1, Math.max(0, value));
  const ease = value => { const p = clamp(value); return p * p * (3 - 2 * p); };

  function render() {
    frame = 0;
    if (!desktop.matches) return;
    if (dirty) {
      top = section.getBoundingClientRect().top + scrollY;
      distance = section.offsetHeight - stage.offsetHeight;
      width = stage.clientWidth;
      dirty = false;
    }
    const progress = clamp((scrollY - top) / Math.max(1, distance));
    // Spatial holds give each flavour room to settle. There is no timed easing
    // or catch-up loop: identical scroll positions always produce identical x.
    const panel = ease((progress - .12) / .28) + ease((progress - .60) / .28);
    const x = -panel * width;
    if (x !== lastX) track.style.transform = `translate3d(${x}px, 0, 0)`;
    lastX = x;
  }
  function requestRender() { if (!frame) frame = requestAnimationFrame(render); }
  function refresh() { dirty = true; requestRender(); }
  function sync() {
    section.classList.toggle('is-horizontal', desktop.matches);
    window.removeEventListener('scroll', requestRender);
    if (desktop.matches && visible) window.addEventListener('scroll', requestRender, { passive: true });
    if (!desktop.matches) { track.style.removeProperty('transform'); lastX = NaN; }
    refresh();
  }
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(section);
  const sizes = new ResizeObserver(refresh);
  sizes.observe(section);
  sizes.observe(stage);
  desktop.addEventListener('change', sync);
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('pageshow', refresh);
  sync();
}
