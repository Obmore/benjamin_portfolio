# Rollin and order-page review, 2026-10-05

Baseline: main at `0a74559a5fb9288667f741a5fafbded5673cb85f`.

## Corrected findings

- The original scooter was a flat SVG across separate CSS dock planes. Rebuilt
  it in one Zdog scene with complete station housings, solid wheels, controlled
  surface ordering, and a scooter aligned perpendicular to one dock.
- Return controls could become available while departure was still animating.
  Controls now remain busy through the complete departure. Animation stops
  when idle, off screen, hidden, or when reduced motion is requested.
- Renderer initialization previously hid the text fallback too early. Failure
  now leaves the project description and other project controls usable.
- Explicit project navigation could land 24 pixels away because it measured a
  reveal transform. It now measures the stationary target. The English project
  sheet label is translated.
- The order catalog forced unequal descriptions and terms into common-height
  rows. Each card now follows its own content, with no stretched internal gaps.
  The six service descriptions, amounts, and scope statements are unchanged.
- The order illustration previously scrolled away during its own animation.
  A short native sticky track keeps all phases visible. Phase buttons remain
  usable without scroll instructions; small landscape viewports and reduced
  motion use a compact layout. Removed the homepage scroll hint as well.

## Verification

- `npm run check`: lint, TypeScript, production build, asset budgets, motion,
  CV size, approved catalog and static-page checks pass. Three existing lint
  warnings remain in the locale provider and Trendo demo; no new warnings.
- Playwright 1.63.0, Windows Chromium: 134 tests pass. Includes 18 manually
  inspected visual baselines across three angles and three rental states at
  390 and 1440 pixels, plus actual SVG path bounds at 360, 1024 and 1440.
- Installed Microsoft Edge: 34 tests covering rental controls, order layout,
  visible scroll phases, local drafts, clipboard fallback and navigation pass.
- Four-times CPU slowdown, three fresh 390-pixel contexts: zero long tasks
  during a full rental cycle and camera changes. Idle rendering is also tested.
- Axe: no violations on the tested homepage and order flows.
- npm production dependency audit: zero reported vulnerabilities.
- Final asset sizes, gzip level 9: initial homepage JavaScript 73,398 bytes;
  initial CSS 9,328 bytes; all homepage JavaScript 91,724 bytes. Zdog is in the
  optional project bundle, outside initial homepage loading.

Lighthouse 13.5.0 local measurements: homepage performance 100 desktop / 97
mobile, order page 100 / 100; accessibility 100; CLS zero on all four runs.
Four interleaved desktop pairs averaged 545 ms baseline LCP versus 562 ms
candidate LCP (3.1 percent change, below the 10 percent gate). These timings
precede the final optional dock-indicator refinement; the final renderer has
separate CPU and visual checks. Order SEO score 66 is expected from the retained
intentional noindex policy, not an accidental indexing regression.

Evidence is retained locally under `tmp/rollin-review-evidence/`; image
baselines are committed under `e2e/rollin-visual.spec.ts-snapshots/`.

## Limits and next useful improvements

Firefox and WebKit distributions could not launch on this Windows host due to
runtime dependency failures. No passing result is claimed for those engines.
Responsive emulation and CPU slowdown do not replace a real phone test.
An iPhone/Safari check is the next useful compatibility check.

For a later product-accurate scene, obtain an approved station photo or GLB
model and consider model-viewer. The present scene deliberately remains an
illustration. A real interface screenshot with a short explanation of Benjamin's
contribution would add more useful project evidence than further decorative
animation. No conversion statistics or business results have been invented.

Deployment is verified separately by the merged revision, successful Pages
workflow, public asset hashes and live visitor-path checks.
