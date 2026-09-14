// Section 02 only. The Hero and navigation are never queried or modified.
const section = document.querySelector('.brand-statement');

if (section) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const ranges = [[0, 0.28], [0.12, 0.58], [0.2, 0.72], [0.5, 1]];
  const elements = [...section.querySelectorAll('[data-statement-reveal]')];
  let frame = 0;
  let visible = false;
  let sectionTop = 0;
  let viewportHeight = innerHeight;
  let measureNeeded = true;
  let lastProgress = -1;

  function render() {
    frame = 0;
    if (measureNeeded) {
      sectionTop = section.getBoundingClientRect().top + scrollY;
      viewportHeight = innerHeight;
      measureNeeded = false;
    }
    const progress = reducedMotion.matches ? 1 : Math.min(1, Math.max(0,
      (scrollY + viewportHeight * 0.88 - sectionTop) / (viewportHeight * 0.68)));
    if (progress === lastProgress) return;
    lastProgress = progress;
    elements.forEach((element, index) => {
      const [start, end] = ranges[index];
      const raw = Math.min(1, Math.max(0, (progress - start) / (end - start)));
      // Ease the spatial reveal, with no time-based catch-up or one-shot trigger.
      const reveal = raw * raw * (3 - 2 * raw);
      element.style.opacity = String(reveal);
      element.style.transform = `translateY(${(1 - reveal) * 26}px)`;
    });
  }

  function requestRender() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function syncScrollListener() {
    window.removeEventListener('scroll', requestRender);
    if (visible && !reducedMotion.matches) window.addEventListener('scroll', requestRender, { passive: true });
    requestRender();
  }

  function refresh() {
    measureNeeded = true;
    requestRender();
  }

  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    measureNeeded = true;
    syncScrollListener();
  });
  observer.observe(section);
  const resizeObserver = new ResizeObserver(refresh);
  resizeObserver.observe(section);
  reducedMotion.addEventListener('change', syncScrollListener);
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('pageshow', refresh);
  requestRender();
}
