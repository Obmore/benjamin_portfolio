# Interactive portfolio experience

## Content and visual sources

The Rollin Technologies reference describes team work. Public product behaviour
is based on [Rollin for hotels](https://rollindocking.com/hotel), checked on
2026-10-05: reception-controlled unlocking, automatic locking and rental ending
on return, and charging. Personal responsibilities remain based on the existing
portfolio. No business performance figures or private implementation details
were added.

The station illustration is an original SVG schematic rendered with Zdog 1.1.3.
The station and scooter share one 3D coordinate system, with complete solids
and a limited camera orbit. It is not a product CAD model or a connection to a real
station. The visible note identifies it as an illustrative scene.

The three mobile previews were captured from the public landing pages on
2026-10-05 at 390 × 760 pixels. They are static screenshots, loaded on first
interaction, not embedded live sites:

- `public/work/anettesvendi-mobile.jpg`: <https://anettesvendi.hu/>
- `public/work/lelkiter-mobile.jpg`: <https://lelkiter.hu/>
- `public/work/lelek-es-nyelv-mobile.jpg`: <https://obmore.github.io/lelek-es-nyelv-portfolio/>

## Interaction and accessibility

The homepage loads the scene and device-preview enhancements in a separate bundle
when the work section approaches the viewport. Their space is reserved before loading.
The Rollin controls use native buttons and a native range input. Its finite
state sequence keeps keyboard focus, prevents overlapping actions, settles when
the page is hidden, and switches immediately when reduced motion is requested.
Language changes preserve the scene state.

The order illustration follows a short native sticky track, so all three phases
remain visible below the header. Selecting a phase manually pauses scroll
following for that visit to the scene; leaving the scene resets automatic
following. There is no scroll-instruction button. Reduced motion and short
landscape screens use a compact illustration with native phase buttons.
No continuous animation loop runs when idle or off screen.

The service cards use their own content height. Desktop uses two CSS columns,
read down the first column and then the second; mobile keeps the same DOM and
keyboard order in one column. Prices and service descriptions are unchanged.

Section heights are laid out normally rather than approximated through
`content-visibility`. This prevents incorrect scroll restoration on language
changes as the longer project descriptions enter the viewport.
The fixed-height Rollin host has its own layout and paint containment, so its
off-screen setup does not force layout of the animated chapter above it.

## Verification

Run `npm ci`, `npm run check` and `npm run test:e2e`. The experience regression
suite covers the rental cycle, language preservation, clean navigation,
keyboard access, reduced motion, page lifecycle, on-demand images, and manual
override of the scroll illustration. The wider suite checks section positioning,
order content, no horizontal overflow, links and accessibility.

Responsive browser emulation is not a physical-device test. Production release
verification also compares the deployed assets with the tested build and runs
the main visitor paths on the live domain.

## Renderer and review tools

- [Zdog](https://zzz.dog/): small, dependency-free, MIT-licensed pseudo-3D SVG
  renderer. It avoids CSS plane flattening and GPU context requirements for
  this deliberately simple artwork. The scene loads only near the work section.
  It uses painter ordering, not a depth buffer; ground and solid objects are
  separate render groups, and the supported camera angles have visual baselines.
- [model-viewer](https://modelviewer.dev/): suitable for a later accurate GLB
  product model. It was evaluated but is not installed. A manufacturer-approved
  asset would be needed before representing an actual station shape.
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots):
  18 reviewed reference images cover mobile and desktop, three camera angles,
  and docked/ride/charging states. Bounds tests include actual SVG path stroke
  widths. Functional tests also cover failed initialization, rapid clicks,
  idle rendering, off-screen settling, keyboard access and reduced motion.
- Axe checks accessibility; Lighthouse measures loading performance and CLS.
  These automated tools complement visual inspection, not replace it.

The committed image baselines use Windows and the Chromium pinned by
`package-lock.json`. Run `npm ci`, `npx playwright install chromium`,
`npm run check`, then `npm run test:e2e`. Review the image diffs before any
intentional `--update-snapshots`. Other operating systems or browser engines
need separately reviewed baselines, as described in the Playwright documentation.

Zdog attribution is shipped in `public/third-party-notices.txt`.
