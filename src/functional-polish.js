// User-initiated anchor navigation only; native scrolling/scrubbing is untouched.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('a[href^="#"]').forEach(link => {
  const target = document.getElementById(link.getAttribute('href').slice(1));
  if (!target) return; // Unsupplied destinations retain their existing placeholder behavior.
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const nav = document.querySelector('[data-navigation]');
    const clearance = nav ? nav.getBoundingClientRect().bottom + 16 : 0;
    const heading = target.querySelector('h1, h2');
    const headingInset = heading ? heading.getBoundingClientRect().top - target.getBoundingClientRect().top : 0;
    const offset = Math.max(0, clearance - headingInset);
    const y = target.getBoundingClientRect().top + scrollY - offset;
    // Move keyboard focus without a second scroll or a permanent tab stop.
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    history.pushState(null, '', link.getAttribute('href'));
    window.scrollTo({ top: y, behavior: reduceMotion.matches ? 'instant' : 'smooth' });
  });
});
