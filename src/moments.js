// Section 05 only. Native sticky framing with reversible, scroll-derived values.
const section = document.querySelector('.moments');
if (section) {
  const stage = section.querySelector('.moments__stage');
  const scene = section.querySelector('.moments__scene');
  const image = section.querySelector('.moments__image');
  const copy = section.querySelector('.moments__copy');
  const labels = [...section.querySelectorAll('.moments__label')];
  const desktop = matchMedia('(min-width: 1024px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)');
  let frame = 0, visible = false, dirty = true, top = 0, distance = 1, last = -1;
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => { const p = clamp(value); return p * p * (3 - 2 * p); };
  function render() {
    frame = 0;
    if (!desktop.matches) return;
    if (dirty) {
      top = section.getBoundingClientRect().top + scrollY;
      distance = Math.max(1, section.offsetHeight - stage.offsetHeight);
      dirty = false;
    }
    const p = clamp((scrollY - top) / distance);
    if (p === last) return;
    last = p;
    const expansion = ease(p);
    scene.style.width = `${86 + 14 * expansion}%`;
    scene.style.height = `${72 + 16 * expansion}svh`;
    scene.style.borderRadius = `${8 * (1 - expansion)}px`;
    image.style.transform = `scale(${1.025 - .025 * expansion})`;
    const reveal = ease((p + .10) / .30);
    copy.style.opacity = String(reveal);
    copy.style.transform = `translateY(${24 * (1 - reveal)}px)`;
    const moment = ease((p - .25) / .16) + ease((p - .65) / .16);
    labels.forEach((label, i) => {
      const active = Math.max(0, 1 - Math.abs(i - moment));
      label.style.opacity = String(.42 + .58 * active);
      if (i === Math.round(moment)) {
        if (!label.hasAttribute('aria-current')) label.setAttribute('aria-current', 'step');
      } else if (label.hasAttribute('aria-current')) label.removeAttribute('aria-current');
    });
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(render); }
  function refresh() { dirty = true; last = -1; schedule(); }
  function sync() {
    section.classList.toggle('is-animated', desktop.matches);
    window.removeEventListener('scroll', schedule);
    if (visible && desktop.matches) window.addEventListener('scroll', schedule, { passive: true });
    if (!desktop.matches) {
      [scene, image, copy, ...labels].forEach(el => el.removeAttribute('style'));
      labels.forEach(el => el.removeAttribute('aria-current'));
    }
    refresh();
  }
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(section);
  const size = new ResizeObserver(refresh);
  size.observe(section);
  size.observe(stage);
  desktop.addEventListener('change', sync);
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('pageshow', refresh);
  sync();
}
