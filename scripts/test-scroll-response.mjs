// Development-only wheel/trackpad responsiveness benchmark against real video frames.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)('playwright');
const label = process.env.SCROLL_TEST_LABEL || 'current';
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge' });
const results = [];
await mkdir(new URL('../.qa/', import.meta.url), { recursive: true });
try {
  for (const width of [1440, 390]) {
    for (const profile of [
      { name: 'mouse-wheel', delta: 100, interval: 90, count: 12 },
      { name: 'trackpad', delta: 18, interval: 16, count: 65 },
      { name: 'rapid-wheel', delta: 180, interval: 16, count: 10, rapid: true },
    ]) {
      if (process.env.SCROLL_TEST_PROFILES && !process.env.SCROLL_TEST_PROFILES.split(',').includes(profile.name)) continue;
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      if (process.env.SCROLL_TEST_SOURCE) {
        const source = await readFile(process.env.SCROLL_TEST_SOURCE, 'utf8');
        await page.route('**/src/hero.js', route => route.fulfill({ contentType: 'text/javascript', body: source }));
      }
      await page.goto('http://127.0.0.1:5173');
      await page.waitForFunction(() => document.querySelector('video').classList.contains('is-ready'));
      await page.evaluate(() => {
        const video = document.querySelector('video');
        const hero = document.querySelector('[data-hero]');
        const distance = hero.offsetHeight - document.querySelector('.hero__stage').offsetHeight;
        const timeline = { samples: [], presented: [], seeks: [], phase: 'forward', distance, lastPresented: 0, lastScrollAt: performance.now(), stopLatencies: [] };
        window.scrollBenchmark = timeline;
        addEventListener('scroll', () => { timeline.lastScrollAt = performance.now(); }, { passive: true });
        const target = () => Math.min(1, Math.max(0, scrollY / distance)) * (video.duration - 0.001);
        const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
        Object.defineProperty(video, 'currentTime', {
          get: () => descriptor.get.call(video),
          set: value => {
            timeline.seeks.push({ at: performance.now(), value, phase: timeline.phase });
            descriptor.set.call(video, value);
          },
        });
        function sample() {
          timeline.samples.push({ at: performance.now(), target: target(), time: video.currentTime, displayedTime: timeline.lastPresented, phase: timeline.phase });
          timeline.raf = requestAnimationFrame(sample);
        }
        function presented(now, metadata) {
          timeline.lastPresented = metadata.mediaTime;
          if (timeline.phase === 'stopped' && Math.abs(metadata.mediaTime - target()) < 0.05) timeline.stopLatencies.push(now - timeline.lastScrollAt);
          timeline.presented.push({ at: now, time: metadata.mediaTime, target: target(), phase: timeline.phase });
          timeline.vfc = video.requestVideoFrameCallback(presented);
        }
        timeline.raf = requestAnimationFrame(sample);
        timeline.vfc = video.requestVideoFrameCallback(presented);
      });
      const directions = profile.rapid ? [1, -1, 1, -1] : [1, -1];
      for (const [leg, direction] of directions.entries()) {
        await page.evaluate(direction => { window.scrollBenchmark.phase = direction === 1 ? 'forward' : 'reverse'; }, direction);
        for (let tick = 0; tick < profile.count; tick++) {
          await page.mouse.wheel(0, profile.delta * direction);
          await page.waitForTimeout(profile.interval);
        }
        if (profile.rapid && leg < directions.length - 1) continue;
        await page.evaluate(() => { window.scrollBenchmark.phase = 'stopped'; });
        await page.waitForTimeout(500);
        await page.waitForFunction(() => {
          const video = document.querySelector('video');
          const target = scrollY / window.scrollBenchmark.distance * (video.duration - 0.001);
          return !video.seeking && Math.abs(video.currentTime - target) < 0.025;
        });
        const stopped = await page.locator('video').evaluate(video => video.currentTime);
        await page.waitForTimeout(150);
        assert.equal(await page.locator('video').evaluate(video => video.currentTime), stopped);
      }
      const raw = await page.evaluate(() => {
        const timeline = window.scrollBenchmark;
        cancelAnimationFrame(timeline.raf);
        document.querySelector('video').cancelVideoFrameCallback(timeline.vfc);
        return { samples: timeline.samples, presented: timeline.presented, seeks: timeline.seeks, stopLatencies: timeline.stopLatencies };
      });
      const stats = list => {
        const values = list.map(n => Math.abs(n.target - n.time) * 1000).sort((a, b) => a - b);
        return { meanVideoErrorMs: Math.round(values.reduce((sum, n) => sum + n, 0) / values.length), p95VideoErrorMs: Math.round(values[Math.floor(values.length * 0.95)] || 0) };
      };
      const moving = raw.samples.filter(sample => sample.phase !== 'stopped');
      const displayed = raw.presented.filter(sample => sample.phase !== 'stopped');
      const forwardFrames = displayed.filter(sample => sample.phase === 'forward');
      const forwardTargets = moving.filter(sample => sample.phase === 'forward');
      const movingFrameCoverage = Math.max(...forwardFrames.map(sample => sample.time)) / Math.max(...forwardTargets.map(sample => sample.target));
      const result = { width, profile: profile.name, seekRequests: raw.seeks.length, displayedFrames: displayed.length, movingFrameCoverage, requested: stats(moving), displayed: stats(displayed), visibleAcrossAllFrames: stats(moving.map(sample => ({ ...sample, time: sample.displayedTime }))), stopLatenciesMs: raw.stopLatencies.map(n => Math.round(n)), errors };
      console.log(JSON.stringify(result));
      await writeFile(new URL(`../.qa/scroll-${label}-${width}-${profile.name}.json`, import.meta.url), JSON.stringify({ result, ...raw }, null, 2));
      assert.deepEqual(errors, []);
      assert.ok(displayed.some(sample => sample.phase === 'forward'));
      assert.ok(displayed.some(sample => sample.phase === 'reverse'));
      if (!process.env.SCROLL_TEST_BASELINE) assert.ok(movingFrameCoverage > 0.8, 'Frames must keep advancing throughout scrolling, not just after it stops');
      results.push(result);
      await writeFile(new URL(`../.qa/scroll-${label}-${width}-${profile.name}.json`, import.meta.url), JSON.stringify({ result, ...raw }, null, 2));
      await page.close();
    }
  }
  await writeFile(new URL(`../.qa/scroll-${label}.json`, import.meta.url), JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
