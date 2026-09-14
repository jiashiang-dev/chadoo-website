import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge' });
const results = [];
const screenshot = (page, name) => page.screenshot({ path: fileURLToPath(new URL(`../.qa/capsule-${name}.png`, import.meta.url)) });
try {
  for (const width of [1440, 768, 767, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('http://127.0.0.1:5173');
    assert.equal(await page.locator('header, .floating-menu').count(), 0);
    assert.equal(await page.locator('.floating-nav').isVisible(), true);
    assert.deepEqual(await page.locator('.floating-nav__label').allTextContents(), ['DRINKS', 'MENU', 'STORY', 'STORES', 'ORDER NOW']);
    const contentFits = await page.locator('.floating-nav__item').evaluateAll(items => items.every(item => {
      const label = item.querySelector('.floating-nav__label').getBoundingClientRect();
      const bounds = item.getBoundingClientRect();
      return label.left >= bounds.left - 1 && label.right <= bounds.right + 1;
    }));
    assert.ok(contentFits, 'All five labels fit their balanced navigation cells');
    const geometry = await page.evaluate(() => {
      const hero = document.querySelector('[data-hero]').getBoundingClientRect();
      const nav = document.querySelector('.floating-nav').getBoundingClientRect();
      const items = [...document.querySelectorAll('.floating-nav__item')].map(el => {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, top: rect.top, right: rect.right };
      });
      return { heroTop: hero.top, heroHeight: hero.height, overflow: document.documentElement.scrollWidth > innerWidth, left: nav.left, right: nav.right, top: nav.top, width: nav.width, height: nav.height, items };
    });
    assert.equal(geometry.heroTop, 0);
    assert.equal(geometry.heroHeight, 844 * 6);
    assert.equal(geometry.overflow, false);
    assert.ok(Math.abs((geometry.left + geometry.right) / 2 - width / 2) < 1);
    assert.ok(geometry.left >= (width >= 768 ? 48 : 24));
    assert.equal(geometry.height, width >= 768 ? 56 : 52);
    assert.equal(geometry.top, width >= 768 ? 28 : 20);
    for (let i = 1; i < geometry.items.length; i++) {
      assert.equal(geometry.items[i].top, geometry.items[0].top);
      assert.ok(geometry.items[i].left >= geometry.items[i - 1].right - 1);
    }
    if ([1440, 390].includes(width)) await screenshot(page, `horizontal-${width}`);
    await page.locator('.floating-nav__item').first().hover();
    assert.equal((await page.locator('.floating-nav').boundingBox()).width, geometry.width);
    await page.mouse.move(10, 10);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.floating-nav__item').first().evaluate(el => el === document.activeElement), true);
    await page.evaluate(() => scrollTo(0, 600));
    const urlBefore = page.url();
    await page.keyboard.press('Enter');
    assert.equal(page.url(), urlBefore);
    assert.equal(await page.evaluate(() => scrollY), 600);
    assert.equal((await page.locator('.floating-nav').boundingBox()).y, geometry.top);
    assert.equal(await page.locator('[role="dialog"], [role="menu"]').count(), 0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.floating-nav__item').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    assert.deepEqual(errors, []);
    results.push({ width, geometry, errors });
    await page.close();
  }
  const locks = JSON.parse((await readFile(new URL('../.qa/hero-navigation-lock.json', import.meta.url), 'utf8')).replace(/^\uFEFF/, ''));
  for (const lock of locks) assert.equal(createHash('sha256').update(await readFile(lock.Path)).digest('hex').toUpperCase(), lock.Hash, `Locked Hero changed: ${lock.Path}`);
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const originalMain = (await readFile(new URL('../.qa/locked-hero-markup.html', import.meta.url), 'utf8')).replace(/^\uFEFF/, '').trim();
  const heroPattern = /<section class="hero"[\s\S]*?<\/section>/;
  assert.equal(html.match(heroPattern)[0], originalMain.match(heroPattern)[0], 'Hero markup unchanged');
  await writeFile(new URL('../.qa/navigation-results.json', import.meta.url), JSON.stringify({ layouts: results, unchangedHeroFiles: locks.length, heroMarkupUnchanged: true }, null, 2));
  console.log(`PASS: ${results.length} desktop/mobile layouts, centered horizontal capsule, keyboard focus, inactive anchors, no mobile panel, no console errors. ${locks.length} Hero files and Hero markup unchanged.`);
} finally { await browser.close(); }

