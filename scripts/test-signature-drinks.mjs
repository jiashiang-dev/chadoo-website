import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ channel: 'msedge' });
const results = [];
try {
  for (const width of [1440, 1024, 768, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://127.0.0.1:5173');
    const section = page.locator('.signature-drinks');
    await section.scrollIntoViewIfNeeded();
    const geometry = await page.evaluate(() => {
      const s = document.querySelector('.signature-drinks');
      return { top: s.getBoundingClientRect().top + scrollY, distance: s.offsetHeight - document.querySelector('.signature-drinks__stage').offsetHeight, horizontal: s.classList.contains('is-horizontal'), overflow: document.documentElement.scrollWidth > innerWidth, gap: s.getBoundingClientRect().top - document.querySelector('.brand-statement').getBoundingClientRect().bottom };
    });
    assert.equal(geometry.overflow, false);
    assert.equal(geometry.gap, 0);
    assert.equal(geometry.horizontal, width >= 1024);
    const positions = [];
    if (geometry.horizontal) {
      for (const progress of [0, .26, .5, .74, 1, .74, .5, .26, 0]) {
        await page.evaluate(y => scrollTo(0, y), geometry.top + progress * geometry.distance);
        await page.waitForTimeout(100);
        const x = await page.locator('.signature-drinks__track').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m41);
        positions.push(x);
        assert.ok(Math.abs(x + progress * 2 * width) < width * .04, `Panel position at ${progress}: ${x}`);
        assert.ok(Math.abs(await page.locator('.signature-drinks__stage').evaluate(el => el.getBoundingClientRect().top)) < 2);
      }
      for (let i = 0; i < 4; i++) assert.ok(Math.abs(positions[i] - positions[8-i]) < 1, 'Reversible position');
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(150);
      const forward = await page.locator('.signature-drinks__track').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m41);
      await page.mouse.wheel(0, -800);
      await page.waitForTimeout(150);
      const reverse = await page.locator('.signature-drinks__track').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m41);
      assert.ok(reverse > forward);
    } else {
      const panels = await page.locator('.signature-drinks__panel').evaluateAll(els => els.map(el => { const r=el.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}; }));
      panels.forEach((p,i) => { assert.equal(p.left,0); assert.equal(p.right,width); if(i) assert.equal(p.top,panels[i-1].bottom); });
    }
    await page.evaluate(y => scrollTo(0,y),geometry.top);
    await page.waitForTimeout(100);
    await page.screenshot({ path: `.qa/signature-drinks-${width}.png` });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(100);
    assert.equal(await section.evaluate(el => el.classList.contains('is-horizontal')),false);
    assert.equal(await page.locator('.signature-drinks__track').evaluate(el => getComputedStyle(el).transform),'none');
    assert.deepEqual(errors,[]);
    results.push({width,geometry,positions,errors});
    await page.close();
  }
  const noJs=await browser.newPage({javaScriptEnabled:false});
  await noJs.goto('http://127.0.0.1:5173');
  assert.equal(await noJs.locator('.signature-drinks__panel').count(),3);
  assert.equal(await noJs.locator('.signature-drinks__stage').evaluate(el=>getComputedStyle(el).position),'static');
  await noJs.close();
  const locks=JSON.parse((await readFile('.qa/section03-lock.json','utf8')).replace(/^\uFEFF/,''));
  for(const lock of locks) assert.equal(createHash('sha256').update(await readFile(lock.Path)).digest('hex').toUpperCase(),lock.Hash,lock.Path);
  const html=await readFile('index.html','utf8');
  for(const [name,pattern] of [['nav',/<nav[\s\S]*?<\/nav>/],['hero',/<section class="hero"[\s\S]*?<\/section>/],['statement',/<section class="brand-statement"[\s\S]*?<\/section>/]]) {
    assert.equal(html.match(pattern)[0],(await readFile(`.qa/section03-${name}-lock.html`,'utf8')).replace(/^\uFEFF/,'').trim());
  }
  await writeFile('.qa/signature-drinks-results.json',JSON.stringify(results,null,2));
  console.log('PASS: five layouts, desktop pinning, forward/reverse wheel scroll, mobile stack, reduced motion, no-JS, zero console errors; all 14 locked files and three locked subtrees unchanged.');
} finally { await browser.close(); }
