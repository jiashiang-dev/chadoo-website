import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge' });
const results = [];
try {
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('http://127.0.0.1:5173');
    const geometry = await page.evaluate(() => {
      const hero = document.querySelector('[data-hero]').getBoundingClientRect();
      const section = document.querySelector('.brand-statement').getBoundingClientRect();
      return { gap: section.top - hero.bottom, height: section.height, sections: document.querySelectorAll('main > section').length, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.equal(geometry.gap, 0);
    assert.equal(geometry.sections, 3);
    assert.equal(geometry.overflow, false);
    assert.ok(geometry.height >= 844 && geometry.height <= 930);
    const samples = [];
    for (const progress of [0, 0.12, 0.4, 0.75, 1, 0.75, 0.4, 0.12, 0]) {
      await page.evaluate(progress => {
        const top = document.querySelector('.brand-statement').getBoundingClientRect().top + scrollY;
        scrollTo(0, top - innerHeight * 0.88 + progress * innerHeight * 0.68);
      }, progress);
      await page.waitForFunction(() => {
        const section = document.querySelector('.brand-statement');
        const progress = Math.min(1, Math.max(0, (innerHeight * 0.88 - section.getBoundingClientRect().top) / (innerHeight * 0.68)));
        const ranges = [[0, 0.28], [0.12, 0.58], [0.2, 0.72], [0.5, 1]];
        return [...section.querySelectorAll('[data-statement-reveal]')].every((el, i) => {
          const p = Math.min(1, Math.max(0, (progress - ranges[i][0]) / (ranges[i][1] - ranges[i][0])));
          return Math.abs(Number(getComputedStyle(el).opacity) - p * p * (3 - 2 * p)) < 0.015;
        });
      });
      const opacity = await page.locator('[data-statement-reveal]').evaluateAll(elements => elements.map(el => Number(getComputedStyle(el).opacity)));
      assert.ok(opacity[0] >= opacity[1] && opacity[1] >= opacity[2] && opacity[2] >= opacity[3]);
      samples.push({ progress, opacity });
    }
    for (let i = 0; i < 4; i++) assert.deepEqual(samples[i].opacity, samples[8 - i].opacity, 'Reveal reverses deterministically');
    await page.locator('.brand-statement').evaluate(section => scrollTo(0, section.getBoundingClientRect().top + scrollY));
    await page.waitForFunction(() => [...document.querySelectorAll('[data-statement-reveal]')].every(el => Number(getComputedStyle(el).opacity) === 1));
    await page.screenshot({ path: fileURLToPath(new URL(`../.qa/brand-statement-${width}.png`, import.meta.url)) });
    // Returning from Section 02 must resume reverse Hero seeking.
    await page.evaluate(() => {
      const hero = document.querySelector('[data-hero]');
      scrollTo(0, (hero.offsetHeight - document.querySelector('.hero__stage').offsetHeight) * 0.75);
    });
    await page.waitForFunction(() => {
      const video = document.querySelector('video');
      return !video.seeking && video.paused && Math.abs(video.currentTime - (video.duration - 0.001) * 0.75) < 0.025;
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.ok(await page.locator('[data-statement-reveal]').evaluateAll(elements => elements.every(el => getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none')));
    assert.deepEqual(errors, []);
    results.push({ width, geometry, samples, errors });
    await page.close();
  }
  const noJs = await browser.newPage({ javaScriptEnabled: false });
  await noJs.goto('http://127.0.0.1:5173');
  assert.ok(await noJs.locator('[data-statement-reveal]').evaluateAll(elements => elements.every(el => getComputedStyle(el).opacity === '1')));
  await noJs.close();
  const locks = JSON.parse((await readFile(new URL('../.qa/section03-lock.json', import.meta.url), 'utf8')).replace(/^\uFEFF/, ''));
  for (const lock of locks) assert.equal(createHash('sha256').update(await readFile(lock.Path)).digest('hex').toUpperCase(), lock.Hash, lock.Path);
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const [name, pattern] of [['nav', /<nav[\s\S]*?<\/nav>/], ['hero', /<section class="hero"[\s\S]*?<\/section>/]]) {
    const original = (await readFile(new URL(`../.qa/section02-${name}-lock.html`, import.meta.url), 'utf8')).replace(/^\uFEFF/, '').trim();
    assert.equal(html.match(pattern)[0], original);
  }
  await writeFile(new URL('../.qa/brand-statement-results.json', import.meta.url), JSON.stringify({ layouts: results, lockedFiles: locks.length, lockedMarkupUnchanged: true, noJsFallback: true }, null, 2));
  console.log(`PASS: ${results.length} Section 02 layouts, sequential/reversible motion, reduced motion, no-JS fallback, return-to-Hero reverse scrub, no console errors. All ${locks.length} locked files and Hero/navigation markup unchanged.`);
} finally { await browser.close(); }
