# CHADOO Hero seek-scheduler A/B results

23 October 2026. Local investigation on `codex/chadoo-p0-visibility`.

## Decision

**Retain the current scheduler. Do not apply either experimental scheduler.** Refresh-aligned scheduling reduced some request delays, but did not consistently improve frame presentation. In all six paired burst comparisons, its p95 scroll-to-frame-callback latency was worse. The existing controller, scroll mapping, reverse behavior, imagery, video files and all sections remain unchanged from the start of this experiment. P1 was not started. Nothing was committed, pushed, merged or deployed.

## What was compared

The current implementation already coalesces scroll/media events into a single pending `requestAnimationFrame`. This experiment compared the additional seek budget, rather than moving an ordinary scroll handler into rAF for the first time.

- **A — current:** latest direct scroll target, 24fps source-frame deduplication, fixed 16ms same-direction seek budget, direction-change bypass.
- **B — uncapped rAF diagnostic:** same latest target and deduplication, but no additional time budget. At most one seek per display frame. Rejected after the exploratory comparison below.
- **C — bounded refresh-aligned candidate:** same target, deduplication and reverse bypass as A; a short refresh probe selects a whole-number-of-display-frames budget near 60 seeks/second. At the approximately 144Hz test cadence this permits approximately two refreshes between same-direction seeks, versus approximately three refreshes for A's 16ms gate.

There was no interpolation, smoothing tail, wheel interception, queued historical target, decoder-completion lock or encoding change. Candidates were supplied through test-browser response interception; neither was written over `src/hero.js`.

## Controlled method

Confirmation: **48 runs**, three paired trials × two viewports × four input profiles × two variants (A/C). Variants ran sequentially in the same Edge session, with A/B order reversed in the middle trial. Both used the same website, assets, warmed video cache, 900px viewport height, start scroll position and dispatch schedule.

- Desktop: 1440×900, original active desktop scrub derivative.
- Mobile emulation: 390×900 with touch/mobile context, original active portrait derivative. This uses the desktop machine's GPU, not a physical phone.
- Slow: 24 × 120px wheel inputs per direction, requested 160ms spacing; observed approximately 172ms between events.
- Fast: the same sequence, requested 16ms spacing; observed approximately 31ms including browser acknowledgement.
- Burst: the same sequence, dispatch attempts every 5ms without waiting for each acknowledgement. Browser-delivered events averaged approximately 9–10ms and were sometimes coalesced.
- Rapid reversal: four alternating eight-input burst legs, with no intentional pause at direction changes.

Instrumentation recorded `currentTime` requests, in-flight seek restarts, frame callbacks/decoder metadata, rAF timing, target-versus-presented source frames, geometry reads, layout metrics, long tasks and console errors. Every run also checked that playback remained paused, stopped drifting after input, and settled within one source frame of the final direct target.

The diagnostic's “in-flight restart” count means a new `currentTime` assignment while `video.seeking` is true. It does not directly observe an internal decoder cancellation.

Percentiles below pool the observations from all three trials. Multiple coalesced scroll targets can reach the same frame callback; these are not independent displayed frames. A changed target superseded before the next reversal is recorded separately, rather than treated as a failed final seek.

## Confirmation results

### Burst stress: request speed versus presentation

All latency and pacing values are wall-clock milliseconds; lower is better. These are **current versus tested candidate**, not a deployed before/after change.

| Metric | Desktop A | Desktop C | Portrait A | Portrait C |
| --- | ---: | ---: | ---: | ---: |
| Mean scroll → seek request | 7.3 | 4.1 | 6.5 | 3.9 |
| p95 scroll → seek request | 21.2 | 15.9 | 18.0 | 18.5 |
| p95 scroll → frame callback | **33.4** | 39.4 | **33.3** | 38.4 |
| p95 request → frame callback | **22.5** | 30.8 | **30.2** | 33.4 |
| p95 gap between frame callbacks during input | **39.8** | 46.9 | 41.6 | 41.7 |
| p95 pending-target frame hold | **31.4** | 38.9 | **27.9** | 34.7 |
| Pending-target holds longer than 33.34ms | **1** | 7 | **0** | 5 |
| Seek requests / presented-frame callbacks | 62 / 60 | 90 / 70 | 68 / 63 | 87 / 64 |
| Requests made while a prior seek was in flight | **3** | 34 | **9** | 29 |

A pending-target hold is a sampled interval during which the shown source frame stays unchanged while the scroll target requests another frame. Intentional idle time and slow-wheel pauses are not counted as stutters. Sampling at display cadence makes short holds imprecise; these are browser presentation proxies, not camera measurements of the physical screen.

The tail regression repeated in every paired burst trial:

| Trial | Desktop A → C, p95 scroll → callback | Portrait A → C |
| --- | ---: | ---: |
| 1 | 32.8 → 38.5 | 33.6 → 39.6 |
| 2, reversed variant order | 26.6 → 38.0 | 32.5 → 40.1 |
| 3 | 38.3 → 39.4 | 31.4 → 37.8 |

C produced more desktop frames overall, but its longest presentation gaps grew. On portrait it produced only one additional frame despite 19 additional requests. Faster request issuance is therefore not a reliable improvement in visible pacing.

### Ordinary wheel and rapid reversal

| Input profile | Desktop A → C, p95 scroll → callback | Portrait A → C |
| --- | ---: | ---: |
| Slow wheel | 7.6 → 7.5ms | 7.5 → 7.5ms |
| Fast wheel | 7.3 → 7.6ms | 12.8 → 7.6ms |
| Rapid alternating bursts | 27.0 → 30.0ms | 38.5 → 39.1ms |

The portrait fast-wheel pooled p95 improved, but the result varied by trial: C's individual p95 values were 6.7, 7.5 and 14.3ms, versus A's 12.8, 15.1 and 7.7ms. C also had a higher maximum in that profile, 23.0 versus 15.3ms. It was not a consistent improvement across the ordinary and stress conditions.

Across the ordinary slow/fast tests, each variant handled 576 inputs with 576 seeks and 576 frame callbacks, no duplicate same-source-frame requests, no in-flight restarts and no response over 33.34ms. Neither candidate adds a reverse smoothing tail. A and C preserve the direction-budget bypass. In the paused-leg reverse checks, the first request followed the reverse scroll event within 0.1ms.

For the no-pause zigzag test, commanded phase labels can precede the browser's actual direction change, and returning to an already-requested source frame legitimately needs no new seek. First-event-in-phase delay is therefore not a valid independent reversal-latency measurement. Zigzag frame presentation and final-target checks are reported instead. They show no advantage supporting adoption of C.

**Direct mapping check:** all 801 recorded A requests and all 879 C requests matched the latest recorded scroll target, with no interpolated or stale queued time. All 48 stop/paused/final-target assertions passed, including rapid reversal.

## Uncapped rAF diagnostic

In the exploratory burst trial, removing the budget entirely reduced request p95 to approximately 0.2–0.3ms, but increased in-flight restarts from 1 to 29 on desktop and 2 to 19 on portrait. Scroll-to-callback p95 worsened from 34.2 to 40.2ms on desktop and 33.6 to 47.2ms on portrait. The p95 callback gap grew from approximately 42ms to 56ms. This candidate was rejected before confirmation because its additional seeks worked against presentation stability.

## Interpretation and trade-offs

The earlier investigation correctly identified that the fixed budget can defer requests during bursts. This A/B test shows that simply reducing that delay is not the better end-to-end choice on this machine. More frequent retargeting coincides with substantially more in-flight seek restarts and worse presentation tails. The data supports keeping the current budget as useful back-pressure for the seek/presentation pipeline.

This does not isolate every delay inside the browser decoder/compositor, or prove a single cause for every physical mouse stutter. Some isolated decode-processing spikes remain. Across confirmation runs there were **zero long tasks, zero Hero geometry reads during input, zero layout recalculations, zero duplicate same-frame seeks and zero console errors/warnings**. Hero callback runtime never exceeded 0.5ms. The recurring regression is not explained by expensive Hero JavaScript or layout work in these tests.

Ordinary 120px wheel input still advances several source frames in a step at the unchanged mapping; scheduling alone cannot supply the intermediate scroll positions. No temporal smoothing was added because it would introduce a different input-lag trade-off.

Controlled dispatch schedules were identical, but OS/browser scheduling and input coalescing were not bit-identical: desktop burst scroll events numbered 132/134 and portrait 123/120 for A/C. One portrait A wheel event was coalesced or delivered outside the labelled active interval. One long idle-between-input pause occurred in a C portrait slow run; no pending-target hold or response over 33ms accompanied it. Three trials, one machine and emulated mobile limit generalization. No physical-screen recording, physical mouse trace, thermal-controlled device comparison or cold-network benchmark was captured.

## Changes and evidence

Only this report was added outside ignored `.qa/` diagnostics during this investigation. SHA-256 comparisons against the start-of-test snapshot confirm **all 42 captured HTML/source/image/video/poster files are unchanged**, including the current Hero controller. Earlier uncommitted P0 work was preserved.

Local diagnostic evidence:

- `.qa/raf-ab-audit.cjs` — controlled browser runner and assertions.
- `.qa/hero-raf-ab-before.js`, `hero-raf-ab-direct.js`, `hero-raf-ab-aligned.js` — isolated A/B/C controller snapshots.
- `.qa/raf-ab-confirm.json` and per-run A/C files — 48 confirmation results and raw measurements.
- `.qa/raf-ab-confirm-summary.json` — pooled measurements and source-hash verification.
- `.qa/summarize-raf-ab.cjs` — repeatable pooling/check script.
- `.qa/raf-ab-explore.json` — rejected uncapped candidate diagnostic.

No production scheduler was changed. The current approximately 8.04-second desktop film, existing portrait film, all three drink reveals, full scroll distance and responsive selection remain intact.
