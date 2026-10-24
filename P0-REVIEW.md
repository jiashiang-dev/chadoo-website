# CHADOO P0 review — 22 October 2026

Status: local implementation complete; awaiting owner review before P1. Nothing committed, pushed, merged, deployed or published during this pass.

## Checkpoint and scope

- Original checkpoint: `3c23401` (`Migrate CHADOO to GitHub Pages`) on `main`.
- Separate local working branch: `codex/chadoo-p0-visibility`.
- Direction: Cinematic + Premium Minimalism, as specified in the approved implementation brief.
- Original image/video files and approved section copy are preserved. No replacement imagery, new sections, new libraries or scroll-pacing changes.

## P0 changes

1. Removed dead MENU/ORDER NOW navigation entries, footer MENU/INSTAGRAM entries, and Section 06 VIEW STORES/ORDER NOW actions with their misleading coming-soon handlers. The surviving Stores links are now SPACES, still targeting `#find-your-chadoo`. The navigation capsule styling is unchanged.
2. All three complete product cups are visible before interaction, including rim, branding and base. The fixed product windows and flavour labels retain their layout and size. Space above the labels prevents them covering the cups. Optional enlargement is 4% with a small lift; the existing transition duration/easing remains. Hover previews it, click/tap/keyboard toggles it, and moving to another product resets the previous selection.
3. Ingredient photographs retain their original crossfade and scroll mapping. Captions now fade fully out before the next caption enters, with a short clear interval and identical reverse behavior.
4. Visual QA found the landscape Hero cropped the Lime cup on portrait tablets. The existing portrait film and matching start/final posters now also serve portrait tablets below 1024px. Desktop framing and the entire Hero scrub controller are unchanged apart from that responsive selection query. No media files, timing, distances or encoding changed.
5. Narrow-screen headings wrap without horizontal overflow. No unrelated responsive typography or layout adjustments were necessary.

## Files changed

| File | Change |
| --- | --- |
| `index.html` | Valid navigation/footer links, remove dead actions, match portrait-tablet poster queries |
| `src/drink-reveal.css` | Fully visible default cups, label clearance, modest optional enlargement |
| `src/drink-reveal.js` | Keep hover preview; support click/tap/keyboard toggling and exclusive selection |
| `src/fresh-by-nature.js` | Non-overlapping, scroll-derived caption fades |
| `src/find-chadoo.js` | Remove placeholder action/status handlers; preserve city switching |
| `src/hero.js` | Extend existing portrait-film selection to portrait tablets below 1024px |
| `src/hero.css` | Match image positioning to the selected portrait/landscape film |
| `P0-REVIEW.md` | This review record |

Ignored `dist/` was regenerated for local GitHub Pages verification. Ignored `.qa/` contains test scripts, JSON results and before/after screenshots; these are not part of the deployment.

## Verification

Local Edge/Chromium browser checks at:

- 320×568, 375×812, 390×844, 430×932
- 768×1024, 1024×768
- 1280×720, 1363×936, 1440×900

Passed:

- All three cup defaults, intermediate animation states and enlarged states remain inside their windows and clear of labels. Tests use the PNGs' visible alpha bounds, not just their transparent canvas rectangles.
- Click/tap, hover, keyboard Enter/Escape, exclusive expansion and collapse on leaving a panel. Cup window, flavour label and left-side text geometry remains fixed through enlargement.
- Signature horizontal scroll reverses to identical positions; mobile remains vertically stacked.
- All three ingredient transitions sampled at 31 positions each, with at most one nonzero caption opacity at every sample. Reverse samples match the forward state.
- Three city image states and keyboard tab selection work. Every remaining link has a real internal destination; navigation retains the GitHub Pages repository prefix.
- Images decode, video metadata loads and seeks follow scroll in both directions. Reduced-motion content and posters work; complete product imagery is also available without JavaScript.
- No page-wide horizontal overflow, console errors/warnings, or failed asset requests in the tested states.
- Additional Hero checks at 820×1180 and 1023×1366, portrait/landscape tablet rotation, normal/reduced motion and forward/reverse seeks passed after the crop fix.
- `npm run build`, `npm run check:pages`, JavaScript syntax checks and `git diff --check` passed. The generated site resolves all 37 asset references, and all 21 public assets remain byte-identical.

Evidence: `.qa/p0-results.json`, `.qa/p0-hero-responsive.json`, `.qa/p0-before-audit.json`, `.qa/p0-after-audit.json` and `.qa/p0-*.png`.

Limits: browser viewport/touch emulation, not physical-device Safari testing. No live GitHub Pages deployment was performed.

## Deferred pending approval

**P1:** Hero/Signature/Fresh/Moments scroll pacing; Moments label removal; CHADOO Spaces concept wording; dark-green Closing with one real CTA and matching navigation contrast. The proposed Spaces support copy, “Three imagined spaces for a brighter pause.”, still needs the owner's final visual review. Current Section 06 heading/support are intentionally unchanged in P0.

**P2:** Per-photo crop refinements, duplicate flavour-label choice, typography, spacing and small reveal-timing details. These are not part of this pass.

## Local review

Run `npm run build` and `npm run preview:pages`, then open `http://127.0.0.1:4173/chadoo-website/`. The original development server remains available with `npm run dev`.

Do not push or trigger deployment before explicit owner approval. P1 has not started.
