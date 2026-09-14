// Browser regression checks; Playwright is a development-only prerequisite.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge' });
const results = [];
const output = new URL('../.qa/', import.meta.url);
await mkdir(output, { recursive: true });

async function ready(page) {
  await page.waitForFunction(() => document.querySelector('video').classList.contains('is-ready'));
}

async function seek(page, progress) {
  await page.evaluate(progress => {
    const hero = document.querySelector('[data-hero]');
    const stage = document.querySelector('.hero__stage');
    window.scrollTo(0, hero.getBoundingClientRect().top + scrollY + progress * (hero.offsetHeight - stage.offsetHeight));
  }, progress);
  await page.waitForFunction(progress => {
    const video = document.querySelector('video');
    return !video.seeking && Math.abs(video.currentTime - progress * (video.duration - 0.001)) < 0.025;
  }, progress);
  return page.locator('video').evaluate(video => ({ time: video.currentTime, paused: video.paused }));
}

try {
  for (const config of [
    { name: 'desktop', width: 1440, height: 900, source: 'desktop' },
    { name: 'desktop-wide', width: 1920, height: 1080, source: 'desktop' },
    { name: 'mobile', width: 390, height: 844, source: 'mobile', mobile: true },
    { name: 'small-mobile', width: 360, height: 640, source: 'mobile', mobile: true },
    { name: 'breakpoint-mobile', width: 767, height: 1024, source: 'mobile' },
    { name: 'breakpoint-desktop', width: 768, height: 1024, source: 'desktop' },
  ]) {
    const context = await browser.newContext({ viewport: { width: config.width, height: config.height }, isMobile: !!config.mobile, hasTouch: !!config.mobile });
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => { if (request.url().endsWith('.mp4')) requests.push(request.url()); });
    await page.goto('http://127.0.0.1:5173');
    await ready(page);
    const initial = await page.locator('video').evaluate(video => ({ src: video.currentSrc, width: video.videoWidth, height: video.videoHeight, duration: video.duration, time: video.currentTime, paused: video.paused, muted: video.muted, inline: video.playsInline, autoplay: video.autoplay }));
    assert.ok(initial.src.endsWith(`chadoo-hero-${config.source}-scrub.mp4`));
    assert.ok(requests.every(url => url.endsWith(`chadoo-hero-${config.source}-scrub.mp4`)), 'Only matching video downloaded');
    // Final supplied films are 1916×1080 / 1080×1916, slightly off exact 16:9 / 9:16.
    assert.ok(Math.abs(initial.width / initial.height - (config.source === 'mobile' ? 9 / 16 : 16 / 9)) < 0.005);
    assert.equal(initial.width, config.source === 'mobile' ? 1080 : 1916);
    assert.equal(initial.height, config.source === 'mobile' ? 1916 : 1080);
    assert.ok(initial.paused && initial.muted && initial.inline && !initial.autoplay);
    const geometry = await page.evaluate(() => {
      const stage = document.querySelector('.hero__stage').getBoundingClientRect();
      return { width: stage.width, height: stage.height, viewportWidth: innerWidth, viewportHeight: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.equal(geometry.width, geometry.viewportWidth);
    assert.equal(geometry.height, geometry.viewportHeight);
    assert.equal(geometry.overflow, false);
    const samples = [];
    for (const progress of [0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25, 0]) {
      const sample = await seek(page, progress);
      assert.ok(sample.paused);
      samples.push({ progress, ...sample });
    }
    await seek(page, 0.5);
    const stopped = await page.locator('video').evaluate(video => video.currentTime);
    await page.waitForTimeout(400);
    assert.equal(await page.locator('video').evaluate(video => video.currentTime), stopped, 'No independent playback');
    await seek(page, 1);
    await page.screenshot({ path: new URL(`${config.name}-final.png`, output).pathname.replace(/^\/([A-Za-z]:)/, '$1') });
    assert.deepEqual(errors, []);
    results.push({ name: config.name, initial, geometry, samples, errors });
    await context.close();
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173');
  await ready(page);
  await seek(page, 0.5);
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    const expected = viewport.width <= 767 ? 'mobile' : 'desktop';
    await page.waitForFunction(expected => {
      const video = document.querySelector('video');
      const hero = document.querySelector('[data-hero]');
      const stage = document.querySelector('.hero__stage');
      const progress = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight - stage.offsetHeight)));
      return video.currentSrc.endsWith(`chadoo-hero-${expected}-scrub.mp4`) && video.classList.contains('is-ready') && !video.seeking && Math.abs(video.currentTime - progress * (video.duration - 0.001)) < 0.025;
    }, expected);
    await seek(page, 0.5);
  }
  results.push({ name: 'resize-and-rotation', passed: true });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => !document.querySelector('video').getAttribute('src'));
  assert.equal(await page.locator('[data-hero]').evaluate(hero => hero.offsetHeight), 900);
  assert.ok((await page.locator('picture img').evaluate(image => image.currentSrc)).endsWith('desktop-final.webp'));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page);
  await seek(page, 0.75);
  results.push({ name: 'live-reduced-motion-toggle', passed: true });
  await page.close();

  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const videos = [];
    page.on('request', request => { if (request.url().endsWith('.mp4')) videos.push(request.url()); });
    await page.goto('http://127.0.0.1:5173');
    await page.locator('picture img').evaluate(image => image.decode());
    assert.deepEqual(videos, []);
    assert.ok((await page.locator('picture img').evaluate(image => image.currentSrc)).endsWith(`${width <= 767 ? 'mobile' : 'desktop'}-final.webp`));
    results.push({ name: `reduced-motion-${width}`, videoRequests: videos, passed: true });
    await context.close();
  }

  const fallback = await browser.newPage();
  await fallback.route('**/*.mp4', route => route.abort());
  await fallback.goto('http://127.0.0.1:5173');
  await fallback.locator('picture img').evaluate(image => image.decode());
  assert.equal(await fallback.locator('video').evaluate(video => getComputedStyle(video).visibility), 'hidden');
  results.push({ name: 'video-failure-poster', passed: true });
  await fallback.close();

  const range = await fetch('http://127.0.0.1:5173/videos/chadoo-hero-mobile-scrub.mp4', { headers: { Range: 'bytes=100-199' } });
  assert.equal(range.status, 206);
  assert.equal((await range.arrayBuffer()).byteLength, 100);
  results.push({ name: 'video-byte-range', passed: true });

  const delayed = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const delayedErrors = [];
  delayed.on('pageerror', error => delayedErrors.push(error.message));
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await delayed.route('**/*.mp4', async route => { await gate; await route.continue(); });
  await delayed.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await delayed.evaluate(() => {
    const hero = document.querySelector('[data-hero]');
    const stage = document.querySelector('.hero__stage');
    scrollTo(0, hero.getBoundingClientRect().top + scrollY + (hero.offsetHeight - stage.offsetHeight) / 2);
  });
  assert.equal(await delayed.locator('video').evaluate(video => video.currentTime), 0);
  release();
  await ready(delayed);
  await delayed.waitForFunction(() => {
    const video = document.querySelector('video');
    return !video.seeking && Math.abs(video.currentTime - (video.duration - 0.001) / 2) < 0.025;
  });
  assert.deepEqual(delayedErrors, []);
  results.push({ name: 'scroll-before-metadata', passed: true });

  await seek(delayed, 0);
  const stress = await delayed.evaluate(async () => {
    const video = document.querySelector('video');
    const hero = document.querySelector('[data-hero]');
    const distance = hero.offsetHeight - document.querySelector('.hero__stage').offsetHeight;
    const latencies = [];
    let started = 0;
    const seeking = () => { started = performance.now(); };
    const seeked = () => latencies.push(performance.now() - started);
    video.addEventListener('seeking', seeking);
    video.addEventListener('seeked', seeked);
    for (let tick = 0; tick <= 120; tick++) {
      const progress = tick <= 60 ? tick / 60 : (120 - tick) / 60;
      scrollTo(0, distance * progress);
      await new Promise(resolve => setTimeout(resolve, 16));
    }
    video.removeEventListener('seeking', seeking);
    video.removeEventListener('seeked', seeked);
    return { completedSeeks: latencies.length, meanSeekMs: latencies.reduce((sum, n) => sum + n, 0) / latencies.length };
  });
  await seek(delayed, 0);
  assert.ok(stress.completedSeeks > 10, 'Decoder makes progress during continuous scroll');
  results.push({ name: 'continuous-forward-reverse-scroll', ...stress, passed: true });
  await delayed.close();
  await writeFile(new URL('results.json', output), JSON.stringify(results, null, 2));
  console.log(`PASS: ${results.length} browser/server scenarios. Screenshots and measurements: .qa/`);
} finally {
  await browser.close();
}

