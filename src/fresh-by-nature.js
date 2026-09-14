// Isolated Section 04 animation. No wheel interception or timed catch-up.
const section = document.querySelector('.fresh-nature');
if (section) {
  const stage = section.querySelector('.fresh-nature__stage');
  const items = [...section.querySelectorAll('.fresh-nature__ingredient')];
  const visuals = items.map(item => item.querySelector('.fresh-nature__visual'));
  const copies = items.map(item => item.querySelector('.fresh-nature__copy'));
  const desktop = matchMedia('(min-width: 1024px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)');
  const tones = [[245,246,237], [249,243,237], [249,246,232], [241,245,237]];
  let frame = 0, visible = false, dirty = true, top = 0, distance = 1, last = -1;
  let lastPosition = -1;
  const clamp = p => Math.max(0, Math.min(1, p));
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
    // Four resting ranges separated by short, reversible crossfades.
    let position = 0;
    for (const start of [.16, .44, .72]) {
      const t = clamp((p - start) / .12);
      position += t * t * (3 - 2 * t);
    }
    // Resting ranges have identical visuals; avoid repainting them on every scroll.
    if (position === lastPosition) return;
    lastPosition = position;
    const from = Math.floor(position), to = Math.min(3, from + 1), blend = position - from;
    stage.style.backgroundColor = `rgb(${tones[from].map((v, i) => Math.round(v + (tones[to][i] - v) * blend)).join(',')})`;
    items.forEach((item, i) => {
      const offset = i - position;
      const opacity = Math.max(0, 1 - Math.abs(offset));
      visuals[i].style.opacity = String(opacity);
      visuals[i].style.transform = `translateY(${offset * 16}px) scale(${1 - Math.min(1, Math.abs(offset)) * .015})`;
      copies[i].style.opacity = String(opacity);
      copies[i].style.transform = `translateY(${offset * 12}px)`;
      const hidden = String(i !== Math.round(position));
      if (item.getAttribute('aria-hidden') !== hidden) item.setAttribute('aria-hidden', hidden);
    });
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(render); }
  function refresh() { dirty = true; last = -1; lastPosition = -1; schedule(); }
  function sync() {
    section.classList.toggle('is-sticky', desktop.matches);
    window.removeEventListener('scroll', schedule);
    if (visible && desktop.matches) window.addEventListener('scroll', schedule, { passive: true });
    if (!desktop.matches) {
      [...visuals, ...copies].forEach(el => { el.style.removeProperty('opacity'); el.style.removeProperty('transform'); });
      items.forEach(el => el.removeAttribute('aria-hidden'));
      stage.style.removeProperty('background-color');
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
