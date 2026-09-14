// Navigation only: no scroll listeners, timers, or connections to the Hero.
// Real hrefs are ready for future sections. Missing anchors must not jump
// the page or alter the current scroll-scrub position.
const navigation = document.querySelector('[data-navigation]');
if (navigation) {
  for (const link of navigation.querySelectorAll('a[href^="#"]')) {
    const targetId = link.getAttribute('href').slice(1);
    if (document.getElementById(targetId)) link.removeAttribute('aria-disabled');
    link.addEventListener('click', event => {
      if (!document.getElementById(targetId)) event.preventDefault();
    });
  }

  const creamSection = document.querySelector('.brand-statement');
  if (creamSection) {
    let surfaceObserver;
    function observeSurface() {
      const bounds = navigation.getBoundingClientRect();
      const center = Math.round(bounds.top + bounds.height / 2);
      surfaceObserver?.disconnect();
      // Observe a one-pixel strip at capsule height. Only boundary crossings
      // change the class; nothing runs on each Hero scrub frame.
      surfaceObserver = new IntersectionObserver(([entry]) => {
        navigation.classList.toggle('floating-nav--on-cream', entry.isIntersecting);
      }, { rootMargin: `-${center}px 0px -${Math.max(0, innerHeight - center - 1)}px 0px` });
      surfaceObserver.observe(creamSection);
    }
    new ResizeObserver(observeSurface).observe(navigation);
    window.addEventListener('resize', observeSurface, { passive: true });
    observeSurface();
  }
}
