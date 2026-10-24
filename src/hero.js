// Replace these two files to update the campaign. Never crop the desktop
// asset into the mobile version: the breakpoint selects a separate film.
const SOURCES = {
  desktop: '/videos/chadoo-hero-desktop-scrub.mp4',
  mobile: '/videos/chadoo-hero-mobile-scrub.mp4',
};

// The approved films are 24fps; repeat seeks within one source frame add no detail.
const SOURCE_FRAME_RATE = 24;
// Avoid restarting a seek more often than roughly one 60Hz presentation interval.
const MIN_SEEK_INTERVAL_MS = 16;

export function mountHero(hero) {
  const stage = hero.querySelector('.hero__stage');
  const video = hero.querySelector('video');
  const mobile = matchMedia('(max-width: 767px), (max-width: 1023px) and (orientation: portrait)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  let frame = 0;
  let duration = 0;
  let start = 0;
  let distance = 1;
  let measureNeeded = true;
  let selectedSource = '';
  let failed = false;
  let lastTarget = 0;
  let lastSeekAt = -Infinity;
  let seekDirection = 0;

  function measure() {
    start = hero.getBoundingClientRect().top + window.scrollY;
    distance = Math.max(1, hero.offsetHeight - stage.offsetHeight);
    measureNeeded = false;
  }

  function render(now) {
    frame = 0;
    if (measureNeeded) measure();
    // HAVE_METADATA is sufficient for seeking. readyState can drop back to 1
    // during a seek; requiring decoded data here would block fresh targets.
    if (reducedMotion.matches || failed || !duration || video.readyState < 1) return;

    const progress = Math.min(1, Math.max(0, (window.scrollY - start) / distance));
    // Stay inside the last decoded frame instead of seeking past end-of-stream.
    const target = progress * Math.max(0, duration - 0.001);
    // A decoded frame can become visible while another scroll target is pending.
    if (!video.seeking && video.readyState >= 2 && !video.classList.contains('is-ready')) {
      video.classList.add('is-ready');
    }
    const direction = Math.sign(target - lastTarget);
    lastTarget = target;
    if (Math.floor(video.currentTime * SOURCE_FRAME_RATE) === Math.floor(target * SOURCE_FRAME_RATE)) return;

    // Read the latest scroll position on the next display frame if input arrives
    // faster than presentation. Never queue targets or wait for an old seek.
    // Direction changes bypass the budget so reverse scrubbing starts at once.
    const reversing = direction && direction !== seekDirection;
    if (!reversing && now - lastSeekAt < MIN_SEEK_INTERVAL_MS) {
      requestRender();
      return;
    }
    if (direction) seekDirection = direction;
    lastSeekAt = now;
    video.currentTime = target;
  }

  function requestRender() {
    // All scroll, media, and resize events share this single pending rAF.
    // Mutable local references only; no component state and no idle polling.
    if (!frame && !reducedMotion.matches && !failed) frame = requestAnimationFrame(render);
  }

  function refresh() {
    measureNeeded = true;
    requestRender();
  }

  function selectSource() {
    video.pause();
    const source = reducedMotion.matches ? '' : SOURCES[mobile.matches ? 'mobile' : 'desktop'];
    if (source === selectedSource) return refresh();
    selectedSource = source;
    lastTarget = 0;
    lastSeekAt = -Infinity;
    seekDirection = 0;
    duration = 0;
    failed = false;
    video.classList.remove('is-ready');
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (source) video.src = source;
    else video.removeAttribute('src');
    video.load();
    refresh();
  }

  function metadataReady() {
    // Source changes can leave old media events queued. Only use active metadata.
    if (!selectedSource || video.currentSrc !== new URL(selectedSource, location.href).href) return;
    duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    requestRender();
  }

  const on = (target, name, callback, options = {}) =>
    target.addEventListener(name, callback, { ...options, signal: listeners.signal });

  video.muted = true;
  video.defaultMuted = true;
  on(video, 'loadedmetadata', metadataReady);
  on(video, 'durationchange', metadataReady);
  on(video, 'loadeddata', requestRender);
  on(video, 'canplay', requestRender);
  on(video, 'seeked', requestRender);
  // Scroll is the only playback clock, even if native media keys request play.
  on(video, 'play', () => video.pause());
  on(video, 'error', () => {
    failed = true;
    duration = 0;
    video.classList.remove('is-ready');
  });
  on(window, 'scroll', requestRender, { passive: true });
  on(window, 'resize', refresh, { passive: true });
  on(window, 'pageshow', refresh);
  on(document, 'visibilitychange', () => {
    if (document.hidden) video.pause();
    else refresh();
  });
  on(mobile, 'change', selectSource);
  on(reducedMotion, 'change', selectSource);

  // Recalculate only on layout changes, never force a layout on every scroll.
  const observer = new ResizeObserver(refresh);
  observer.observe(hero);
  observer.observe(stage);
  selectSource();

  return () => {
    listeners.abort();
    observer.disconnect();
    cancelAnimationFrame(frame);
    video.pause();
    video.removeAttribute('src');
    video.load();
  };
}

const hero = document.querySelector('[data-hero]');
if (hero) mountHero(hero);
