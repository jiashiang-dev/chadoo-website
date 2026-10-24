# CHADOO Hero scroll performance audit

22 October 2026. Local work on `codex/chadoo-p0-visibility`. No commit, push, merge, deployment or publication.

## Finding

The measurable issue was excessive seek restarts during high-frequency scrolling. The controller permitted a new `currentTime` request after only 8ms of video-time change, although both supplied films are 24fps (41.67ms per source frame). Several requests could therefore resolve to the same image. Requests also arrived faster than decoded frames could be presented.

The initial traced desktop continuous-scroll test recorded 541 requests and 149 presented-frame callbacks. Tracing recorded 2,315 decoder calls and 543 browser seek operations. This traced run was diagnostic; its timings are not used as the final before/after benchmark because tracing adds overhead.

The browser used hardware `D3D11VideoDecoder`, not a software decoder. In the untraced baseline runs, typical per-frame processing was about 1–3ms. Layout consumed about 0–0.2ms per complete normal test, with zero long tasks. Geometry was already cached and the passive scroll listener already shared one rAF. Other section controllers were inactive while outside the viewport. These were not the main bottleneck.

A temporary navigation-blur diagnostic produced no meaningful improvement against the comparable untraced baseline. Navigation styling is preserved.

## Controller change

Only `src/hero.js` changed for this audit:

- Skip another seek when the requested time resolves to the same 24fps source frame.
- Limit same-direction seek restarts to approximately one 60Hz presentation interval (16ms). If that budget has not elapsed, a single pending rAF reads the **latest** scroll position again. There is no timer, interpolation, target queue or continuous idle loop.
- Bypass the budget on direction changes so reverse scrolling can retarget immediately.
- Allow an already decoded frame to become visible while a newer target is pending, including after source switching.
- Reset scheduling references when changing media sources.

The scroll-to-time mapping, `video.duration` handling, passive events and cached measurements are preserved. The controller does not wait for an old seek to finish. The original five-viewport scroll travel and six-viewport total Hero height remain.

## Before/after measurements

Three alternating before/after runs per scenario, using local Edge/Chromium at 1440×900 and 390×900. Media was cached before each run to isolate steady-state scrubbing from network loading. Diagnostic traces were disabled for these measurements.

Normal continuous input traversed the full Hero in 4.8 seconds per direction. Rapid input traversed it in 0.7 seconds per direction. Each run included forward and reverse travel. Mouse-wheel tests used 14 × 120px inputs per direction at 75ms intervals.

Displayed-frame mismatch compares the visible `requestVideoFrameCallback.mediaTime` with the time required by the current scroll position. **Values below are milliseconds on the video timeline, not wall-clock input latency.** They include the film's inherent 24fps frame granularity. Table values are means across the three runs.

| Layout / input | Seek requests before → after | Mean mismatch before → after | p95 mismatch before → after | p95 reduction |
| --- | --- | --- | --- | --- |
| Desktop / normal continuous | 893 → 381 | 27.5 → 23.0ms | 68.5 → 50.3ms | 26.5% |
| Mobile / normal continuous | 875 → 288 | 25.2 → 20.8ms | 60.8 → 39.8ms | 34.6% |
| Desktop / rapid | 129 → 64 | 117.2 → 125.0ms | 390.8 → 304.0ms | 22.2% |
| Mobile / rapid | 127 → 63 | 98.8 → 96.5ms | 320.7 → 224.8ms | 29.9% |
| Desktop / wheel | 28 → 28 | 35.6 → 35.4ms | 209.7 → 208.3ms | Essentially unchanged |
| Mobile / wheel | 28 → 28 | 32.4 → 32.6ms | 152.9 → 153.9ms | Essentially unchanged |

The principal improvement is fewer worst-case frame stalls and less redundant seeking. It is not a universal latency reduction: the rapid desktop mean increased by about 8ms of video time while its p95 improved by 87ms. Normal-scroll script time fell about 9–10%; total main-thread task time was broadly similar. Do not interpret the results as a general CPU or decoding speedup.

Normal-scroll p95 rAF intervals improved from 23.4 to 15.8ms on desktop and 23.5 to 8.4ms on the emulated mobile viewport. The post-change rapid tests reached a matching final frame within at most about 16ms after stopping, using a one-source-frame visual tolerance. No playback continued while stopped.

Experiments rejected: source-frame filtering alone was insufficient for rapid scrolling; waiting for seek completion reduced requests but increased visible lag. Neither was shipped as a standalone solution.

## Regression verification

Passed local browser checks at 320×568, 390×844, 430×932, 768×1024, 1024×768, 1440×900 and 1920×1080:

- Complete timeline and key composition samples at 0%, 25%, 40%, 50%, 65%, 90% and 100%, then in reverse. The three-drink composition and final fruit composition remain intact.
- Fast wheel reversals and native synthetic touch gestures; paused video and stable frame after scrolling stops.
- Portrait/landscape source switching on resize and rotation, including the existing P0 portrait-tablet fix.
- Dynamic reduced-motion switching, correct final posters and failed-video poster fallback.
- Original Hero dimensions and scroll distance, no horizontal document overflow, no console errors/warnings or broken asset requests.
- `npm run build`, `npm run check:pages` and JavaScript syntax checks pass. All 37 generated asset references resolve and all 21 public files are preserved byte-for-byte.

The original media durations are **8.041667s desktop** and **6.041667s portrait/mobile**. The request described the approximately eight-second film; neither source file was altered or shortened during this audit. Both remain 24fps, at their original resolution and encoding.

Limits: this is local Edge with desktop hardware decoding and mobile viewport/touch emulation, not physical Android/iOS profiling. Extremely rapid travel necessarily skips source frames; the complete timeline and reveal moments remain available at their original scroll positions.

## Evidence and review

- `.qa/hero-performance-summary.json`: final aggregated measurements.
- `.qa/hero-profile-final-before.json` / `.qa/hero-profile-final-after.json`: three-run results and decoder properties.
- `.qa/hero-profile-final-*.json`: per-run frame/seek samples.
- `.qa/hero-profile-before-*.trace.json`: initial diagnostic browser traces.
- `.qa/hero-performance-regression.json`: layout, media and interaction regression results.
- `.qa/hero-audit-final-*.png`: key-frame screenshots.

`.qa/` and regenerated `dist/` are ignored development outputs. No profiling instrumentation or new dependencies are shipped.

This audit adds this report and updates `src/hero.js`. Earlier uncommitted P0 changes are preserved. P1 design work has not started.
