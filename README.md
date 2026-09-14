# 茶嘟 CHADOO — Hero only

Run `node scripts/serve.mjs` (or `npm run dev` with npm installed), then open http://127.0.0.1:5173. No installation or build step is required. The server supports video byte ranges and serves only the page, source, and public assets.

The project folder was empty. This implementation uses plain HTML/CSS/JavaScript, without framework, GSAP, runtime dependencies, headlines, navigation, CTAs, or additional sections.

The original final videos are retained unchanged as `public/videos/chadoo-hero-desktop.mp4` and `public/videos/chadoo-hero-mobile.mp4`. The Hero uses separate `chadoo-hero-desktop-scrub.mp4` and `chadoo-hero-mobile-scrub.mp4` copies. FFmpeg inspection found only one keyframe, at time zero, in each original; late seeks could require decoding nearly the whole clip. The optimized copies use H.264, yuv420p, CRF 17, no B-frames, faststart metadata, and a keyframe every six frames (0.25 seconds). Native dimensions, 24 fps, frame counts, timestamps, and durations are preserved. Desktop is 11.85 MB and mobile is 10.99 MB. This is a high-quality re-encode, not a lossless copy. The Downloads originals, layout, and posters are untouched.

The sticky stage fills the viewport. Five viewport lengths of scroll map to the active video's full duration, read from `loadedmetadata` and refreshed on `durationchange`, with the endpoint just inside its final frame. No playback duration is hardcoded. All passive scroll, media, and resize signals share one pending `requestAnimationFrame` callback. Only that callback writes `currentTime`, mapping the latest scroll position directly to the active duration. There is no easing, lerp, GSAP, smooth-scroll library, debounce, seek wait queue, or React state. An outdated seek never blocks a new target. The controller sleeps while idle and caches layout measurements until resize. No `play()` or autoplay is used. Widths through 767px load the separate portrait mobile film; larger widths load the landscape desktop film. The supplied files report 1080×1916 and 6.041667 seconds for mobile, and 1916×1080 and 8.041667 seconds for desktop (slightly off exact 9:16/16:9). These are observed asset properties, not configured playback durations. Mobile browser toolbar resizing uses dynamic viewport height; source changes seek to the current scroll position after metadata/data load.

Reduced motion uses the matching final-frame poster with no video download or extra scroll travel. First-frame posters cover video loading, decoding failures, disabled JavaScript, and browsers that restrict video preload. Current Safari/iOS media attributes are present; physical Safari/iPhone testing remains outstanding. The supplied video resolution is preserved, so sharpness on very large screens is limited by the original assets.

## Replace the campaign

Replace the two original video files in `public/videos/`, then run `node scripts/optimize-videos.mjs` to regenerate the two `-scrub.mp4` assets used by `SOURCES` in `src/hero.js`. Replace the four matching posters as well. Adjust `--scrub-distance` in `src/hero.css` to change the amount of scroll; this is a scroll distance, not an independent playback timer. Desktop framing uses `object-position: 72% center`; mobile uses center. `cover` fills differing viewport proportions without bars.

Asset preparation requires FFmpeg on PATH or the `FFMPEG_PATH` environment variable pointing to its executable. `scripts/optimize-videos.mjs` inspects input keyframes, derives the 0.25-second GOP from actual FPS, encodes separate copies, verifies dimensions/FPS/frame count/timestamps, and verifies that the MP4 `moov` atom precedes `mdat` for faststart. It writes `.qa/encoding-report.json`. FFmpeg is a development tool only; the website has no new runtime dependency.

## Validation

`node --check src/hero.js` and `node --check scripts/serve.mjs` validate syntax. `scripts/test-hero.mjs` runs browser regressions using a separately available Playwright installation and Microsoft Edge by default. Set `BROWSER_CHANNEL=chrome` to run against an installed Chrome. The site itself does not depend on Playwright. `scripts/posters.mjs` regenerates first/final posters from the real videos using that same development prerequisite and the running server.

Browser checks cover six desktop/mobile/breakpoint sizes, 0/25/50/75/100% forward and reverse seeking, pause-on-stop, muted/inline/no-autoplay attributes, correct aspect ratios, absence of wrong-source downloads, viewport coverage, no overflow, console errors, rotation, live reduced-motion changes, reduced-motion initial loads, video failure, range requests, delayed metadata, and continuous forward/reverse scroll. Screenshots and measurements are saved to `.qa/` (ignored by Git). Testing on this machine uses Chromium-based Edge, including mobile emulation, not physical Android/iOS devices.

`node scripts/test-scroll-response.mjs` exercises mouse-wheel input (100px steps at 90ms intervals) trackpad-style input (18px steps at 16ms intervals), and rapid wheel reversals (180px steps at 16ms intervals, four alternating legs without pausing), at desktop and mobile widths. It measures requested times separately from frames actually presented through `requestVideoFrameCallback`, verifies the video settles and stays paused, and checks frame coverage to catch decoder starvation. These are automated input patterns, not physical-device testing. The exact-target controller adds no smoothing delay; visible-frame response still includes browser decoding and display latency, and the underlying videos have 24 distinct frames per second. Results distinguish media-timeline error from real elapsed stop latency; they do not claim zero-latency or physical-device validation.

## Original implementation files

The initial implementation added the following files to the empty project folder.

- `.gitignore`
- `README.md`
- `index.html`
- `package.json`
- `src/hero.css`
- `src/hero.js`
- `scripts/serve.mjs`
- `scripts/posters.mjs`
- `scripts/test-hero.mjs`
- `public/videos/chadoo-hero-desktop.mp4`
- `public/videos/chadoo-hero-mobile.mp4`
- `public/posters/chadoo-hero-desktop-start.webp`
- `public/posters/chadoo-hero-desktop-final.webp`
- `public/posters/chadoo-hero-mobile-start.webp`
- `public/posters/chadoo-hero-mobile-final.webp`

Generated QA files:

- `.qa/results.json`
- `.qa/desktop-final.png`
- `.qa/desktop-wide-final.png`
- `.qa/mobile-final.png`
- `.qa/small-mobile-final.png`
- `.qa/breakpoint-mobile-final.png`
- `.qa/breakpoint-desktop-final.png`


