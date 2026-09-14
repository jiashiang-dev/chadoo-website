# Approved Hero and navigation are locked

The user approved the existing Hero's smooth scroll-scrub and explicitly locked it.

Unless the user subsequently authorizes a Hero change, preserve:

- `src/hero.js` and `src/hero.css` exactly.
- `src/navigation.js`, `src/navigation.css`, and the navigation subtree in `index.html` exactly. The navigation is also finished and locked unless the user explicitly requests a change.
- All files under `public/videos/` and `public/posters/` exactly, including encoding.
- The `[data-hero]` subtree in `index.html`, its composition, dimensions, scroll distance, timing, responsive source selection, and reduced-motion behavior.

Build navigation and future sections in separate files and sibling markup. Never introduce global smooth scrolling, wheel interception, layout offsets, animation, or state updates that alter the Hero's scroll behavior. Check Hero regression and responsiveness tests after adding overlays or surrounding UI.

Navigation is a slim horizontal floating capsule centered near the top on desktop and mobile, with DRINKS, MENU, STORY, STORES, and ORDER NOW anchors prepared for future destinations. ORDER NOW has no inner pill or hover background. Missing anchors remain inactive. Preserve the approved capsule dimensions, position, and glass style. Do not restore the right-side vertical capsule or add branding, destinations, sections, or a menu panel until requested. The capsule must not become a full-width header or alter Hero geometry.

Section 02 is finished and locked. Its typography, layout, spacing, content, and reversible reveal in `src/brand-statement.css` and `src/brand-statement.js` must remain unchanged unless explicitly requested. Over Section 02, the navigation uses a very subtle translucent surface with no visible border, outline, shadow, or individual item background, and equal text weight for all five items. Do not build Section 03 until requested.
