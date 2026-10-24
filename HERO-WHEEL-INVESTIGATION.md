# CHADOO Hero mouse-wheel micro-stutter investigation

22 October 2026. **Investigation only. No website code, design, scroll mapping, animations or media changed.** Existing uncommitted P0 work is preserved on `codex/chadoo-p0-visibility`. No commit, push, merge, deployment or publication.

## Findings

There are two distinct effects:

1. **Ordinary wheel stepping:** in the controlled wheel tests, a 120px notch changed the scroll position in one step. At the existing mapping and a 900px-high viewport, that advances approximately 5–6 desktop source frames or 3–4 portrait frames. The film therefore jumps several images even when the requested image is decoded promptly. This is a repeatable input/frame-granularity effect, not evidence of a decoder stall.
2. **Burst timing stalls:** rapid 5ms-spaced synthetic wheel bursts reproduced longer response tails. The current fixed 16ms seek budget interacts with the approximately 6.94ms display cadence measured on this machine: a same-direction seek commonly has to wait three refreshes, approximately 20.8ms. Under bursts, deferred rAF opportunities plus frame submission/callback cadence can extend the response into the 33–41ms range. Main-thread work remained small and decode time was generally short. This is the stronger next scheduling hypothesis to test, rather than assuming the encoding is at fault.

These findings do not establish that every stutter seen with a particular physical mouse or in-app browser has the same cause. The ordinary wheel tests did not reproduce a response longer than 33ms; the high-frequency stress test did.

## Method and measurements

The current controller was profiled without changing its behavior. Test-only instrumentation recorded wheel/scroll events, `currentTime` requests, in-flight seek restarts, `seeking`/`seeked` events, `requestVideoFrameCallback` metadata, rAF queue/runtime, geometry reads and long tasks. CDP supplied decoder and main-thread/layout metrics.

Ordinary wheel tests: three trials at 1440×900 and 390×900, 24 × 120px notches forward and 24 reverse. Slow input requested 160ms between dispatches; fast input requested 16ms. Including browser input acknowledgement, the measured mean inter-notch intervals were approximately 172ms and 31ms. Media was cached to separate steady scrubbing from network loading.

The table measures **scroll event → video-frame callback in wall-clock milliseconds**. It is not the previous audit's video-timeline mismatch metric, nor a camera measurement of physical display scanout. Browser frame callbacks are a presentation proxy and can arrive after compositor submission.

| Current Hero | Samples | p95 callback latency | Maximum | p95 decode processing |
| --- | ---: | ---: | ---: | ---: |
| Desktop, slow wheel | 144 | 6.5ms | 6.7ms | 2.2ms |
| Desktop, fast wheel | 144 | 6.5ms | 13.1ms | 1.9ms |
| Portrait source, slow wheel | 144 | 6.4ms | 20.3ms | 3.0ms |
| Portrait source, fast wheel | 144 | 12.9ms | 19.7ms | 2.5ms |

Across these **576 wheel events**:

- 576 seeks and 576 frame callbacks; **zero duplicate same-source-frame seeks and zero in-flight restarts**.
- Scroll-to-seek p95 approximately 0.1ms, maximum 0.2ms. The budget did not delay the ordinary notches because their spacing exceeded 16ms.
- Hero callback runtime p95 approximately 0.2ms; maximum 1.2ms.
- **Zero Hero geometry reads during scrolling, zero recorded layout/style recalculations and zero long tasks.**
- Hardware `D3D11VideoDecoder` was active for both sources.
- Slow forward/reverse mean callback latency was virtually identical on desktop, approximately 6.09/6.10ms. No consistent reverse-only penalty emerged.
- No console errors/warnings or asset failures were observed.

A separate visible Edge-window run at 1440×900 returned slow/fast p95 callback latencies of 6.6/6.4ms, with no redundant seeks or main-thread stalls. A temporary browser-native smooth-scrolling flag did not change the stepped event pattern for these CDP-generated inputs; it is not evidence of an effective website smoothing solution.

### Reproduced burst stress case

Two trials per source dispatched 24 wheel inputs approximately 5ms apart per direction. The browser coalesced some inputs. This is a stress test, not a claim about a typical physical wheel's event rate.

| Burst stress | Scroll changes measured | p95 scroll → callback | Maximum | p95 scroll → seek | p95 decode processing |
| --- | ---: | ---: | ---: | ---: | ---: |
| Desktop | 84 | 32.9ms | 40.6ms | 20.4ms | 3.0ms |
| Portrait source | 80 | 40.7ms | 41.1ms | 24.4ms | 3.6ms |

Twelve of 164 responses exceeded 33.34ms. There were no long tasks or layout recalculations. Inferred pending-target rAF calls that issued no seek numbered 54 desktop / 58 portrait, consistent with the rate-budget branch. Same-direction seek intervals averaged 22–23ms, with some gaps around 34ms.

Examples separate the costs:

- One desktop response took 33.7ms: 27.9ms elapsed before the request, then approximately 5.8ms to the callback; final-frame decode processing was 2.6ms.
- One portrait response took 40.6ms: 36.1ms elapsed before the request, then 4.5ms to the callback; decode processing was 0.5ms.
- Other responses spent approximately 27ms between request and callback despite sub-4ms decode processing, indicating presentation/callback cadence also matters.

Thus redundant seeking is no longer the ordinary-wheel issue. Under extreme bursts, the fixed cadence and browser presentation pipeline are a more useful next investigation than adding more decode work or a smoothing tail.

## Encoding inspection

MP4 sample tables and H.264 SPS/slice headers were parsed directly. All four files' Git blob hashes match HEAD. FFmpeg/ffprobe were not available on PATH; no tool was installed and no file was transcoded.

| File | Codec | Resolution | Frame rate | Duration | Video bitrate | Keyframes |
| --- | --- | --- | --- | --- | --- | --- |
| `chadoo-hero-desktop-scrub.mp4` — active | H.264 High, Level 5.0 | 1916×1080 | Constant 24fps | 8.041667s | 11.784Mbps | Every 6 frames / 0.25s |
| `chadoo-hero-mobile-scrub.mp4` — active | H.264 High, Level 5.0 | 1080×1916 | Constant 24fps | 6.041667s | 14.554Mbps | Every 6 frames / 0.25s |
| `chadoo-hero-desktop.mp4` — original | H.264 Main, Level 5.0 | 1916×1080 | Constant 24fps | 8.041667s | 13.897Mbps | One initial keyframe |
| `chadoo-hero-mobile.mp4` — original | H.264 Main, Level 5.0 | 1080×1916 | Constant 24fps | 6.041667s | 18.049Mbps | One initial keyframe |

Active files use 8-bit yuv420p, faststart and I/P frames with no B-slices. A random seek can still require decoding up to five dependent P-frames, but the GOP is already short.

There was no convincing relationship between presentation latency and distance from the preceding keyframe: ordinary-wheel Pearson correlations were approximately +0.02/−0.05 desktop and +0.01/−0.10 portrait for slow/fast input. This does not establish a keyframe bottleneck.

Rare decode spikes did occur: one portrait frame had 15.4ms processing time and a 20.3ms callback response. Other long responses had approximately 1ms processing. Encoding is therefore a possible contributor to isolated spikes, but not a demonstrated primary cause of the repeated wheel effect.

The desktop cinematic narrative remains 8.04 seconds. The existing portrait film is 6.04 seconds; neither duration, source file, reveal sequence nor scroll mapping changed.

## Smoothing and next step for approval

**Recommended next experiment:** A/B the current fixed 16ms budget against a refresh-aligned direct-target scheduler under the same wheel bursts. Preserve frame deduplication, immediate reverse retargeting, the latest-scroll-position target and the entire existing mapping. Measure pending-target deferrals, p95 response, frame coverage and stop behavior before choosing any implementation. No candidate scheduler was implemented during this investigation.

Adding an exponential lerp is not presently recommended. Even a 15ms time constant needs about 45ms to reach 95% of a step; 25ms needs about 75ms. These are mathematical settling times, not new browser measurements, and would introduce a sustained chase behind already prompt ordinary input. A bounded one-frame blend is a separate visual tradeoff, not a proven lag-free fix; it needs approval and perceptual review.

**Encoding recommendation:** Keep the masters and active derivatives. Re-encoding is not justified as the first fix by these measurements. If scheduling tests leave confirmed decode spikes on the target device, approve a separate all-I/GOP-1 H.264 derivative A/B test: same dimensions, 24fps, duration and imagery; yuv420p, no B-frames, faststart and a quality setting validated against the master. Write a new filename and preserve every existing file. Compare seek tails, visual quality, size and loading cost before using it. No derivative was created or substituted.

Approval is required before either proposed experiment changes website behavior or assets.

## Evidence and limitations

- `.qa/video-encoding-inspection.json`: exact encoding/sample-table inspection.
- `.qa/wheel-micro-current.json` and per-run files: three-trial ordinary wheel measurements.
- `.qa/wheel-micro-summary.json`: pooled latency, forward/reverse, keyframe correlations and worst-frame records.
- `.qa/wheel-micro-headed.json`: visible-window verification.
- `.qa/wheel-micro-browser-smooth-diagnostic.json`: browser-flag diagnostic.
- `.qa/wheel-micro-burst-stress.json` / `.qa/wheel-micro-burst-summary.json`: burst reproduction and scheduling correlation.

Only this report was added outside ignored `.qa/` diagnostics. The Hero controller remains byte-identical to the version at the start of this investigation. No mobile-device GPU, physical input trace or actual-display scanout recording was captured. Viewport/touch emulation uses this machine's decoder; the findings should not be represented as a physical iPhone/Android benchmark.
