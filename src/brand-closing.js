// Local, reversible scroll motion. No wheel handling or changes to other sections.
const closing = document.querySelector('.brand-closing');
if (closing) {
  const headline = closing.querySelector('.brand-closing__headline');
  const support = closing.querySelector('.brand-closing__support');
  const footer = closing.querySelector('.brand-closing__footer');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  let frame = 0;
  let top = 0;
  let dirty = true;
  let visible = false;
  let lastProgress = -1;
  function render() {
    frame = 0;
    if (dirty) { top = closing.getBoundingClientRect().top + scrollY; dirty = false; }
    const progress = reduced.matches ? 1 : clamp((scrollY + innerHeight * .9 - top) / (innerHeight * .9));
    if (progress === lastProgress) return;
    lastProgress = progress;
    const reveal = ease(progress / .65);
    headline.style.opacity = String(reveal);
    headline.style.transform = `translateY(${(1 - reveal) * 40}px) scale(${1 + ease((progress - .35) / .65) * .025})`;
    support.style.opacity = String(ease((progress - .25) / .5));
    const ending = ease((progress - .65) / .35);
    footer.style.opacity = String(ending);
    footer.style.transform = `translateY(${(1 - ending) * 12}px)`;
    const tint = ease((progress - .3) / .7);
    closing.style.backgroundColor = `rgb(${247 - 16 * tint}, ${244 - 4 * tint}, ${235 - 17 * tint})`;
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(render); }
  function refresh() { dirty = true; schedule(); }
  function sync() {
    window.removeEventListener('scroll', schedule);
    if (visible && !reduced.matches) window.addEventListener('scroll', schedule, { passive: true });
    refresh();
  }
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(closing);
  new ResizeObserver(refresh).observe(closing);
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('pageshow', refresh);
  reduced.addEventListener('change', sync);
  // Keyboard navigation never lands on an invisible footer.
  footer.addEventListener('focusin', () => footer.style.opacity = '1');
  schedule();
}
