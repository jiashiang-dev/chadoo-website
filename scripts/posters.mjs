// Development utility. Uses an existing Playwright installation; not a site dependency.
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge' });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173');
  for (const format of ['desktop', 'mobile']) {
    const frames = await page.evaluate(async (format) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      const loaded = new Promise((resolve, reject) => {
        video.addEventListener('loadeddata', resolve, { once: true });
        video.addEventListener('error', () => reject(new Error('Video load failed')), { once: true });
      });
      video.src = `/videos/chadoo-hero-${format}.mp4`;
      await loaded;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      const capture = () => {
        context.drawImage(video, 0, 0);
        return canvas.toDataURL('image/webp', 0.94).split(',')[1];
      };
      const start = capture();
      const seeked = new Promise(resolve => video.addEventListener('seeked', resolve, { once: true }));
      video.currentTime = video.duration - 0.001;
      await seeked;
      return { start, final: capture(), width: canvas.width, height: canvas.height, duration: video.duration };
    }, format);
    for (const position of ['start', 'final']) {
      await writeFile(new URL(`../public/posters/chadoo-hero-${format}-${position}.webp`, import.meta.url), Buffer.from(frames[position], 'base64'));
    }
    console.log(JSON.stringify({ format, width: frames.width, height: frames.height, duration: frames.duration }));
  }
} finally {
  await browser.close();
}
