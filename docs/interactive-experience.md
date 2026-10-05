# Interactive portfolio experience

## Content and visual sources

The Rollin Technologies reference describes team work. Public product behaviour
is based on [Rollin for hotels](https://rollindocking.com/hotel), checked on
2026-10-05: reception-controlled unlocking, automatic locking and rental ending
on return, and charging. Personal responsibilities remain based on the existing
portfolio. No business performance figures or private implementation details
were added.

The station illustration is an original schematic built from CSS 3D planes and
an inline scooter SVG. It is not a product CAD model or a connection to a real
station. The visible note identifies it as an illustrative scene.

The three mobile previews were captured from the public landing pages on
2026-10-05 at 390 × 760 pixels. They are static screenshots, loaded on first
interaction, not embedded live sites:

- `public/work/anettesvendi-mobile.jpg`: <https://anettesvendi.hu/>
- `public/work/lelkiter-mobile.jpg`: <https://lelkiter.hu/>
- `public/work/lelek-es-nyelv-mobile.jpg`: <https://obmore.github.io/lelek-es-nyelv-portfolio/>

## Interaction and accessibility

The homepage loads the scene and device-preview enhancements after the page
load event in a separate bundle. Their space is reserved before loading.
The Rollin controls use native buttons and a native range input. Its finite
state sequence keeps keyboard focus, prevents overlapping actions, settles when
the page is hidden, and switches immediately when reduced motion is requested.
Language changes preserve the scene state.

The order illustration follows scroll position while visible. Selecting a
phase manually pauses scroll following until the visitor enables it again.
Reduced motion disables scroll following while keeping the phase buttons usable.
No continuous animation loop runs when idle or off screen.

Section heights are laid out normally rather than approximated through
`content-visibility`. This prevents incorrect scroll restoration on language
changes as the longer project descriptions enter the viewport.

## Verification

Run `npm ci`, `npm run check` and `npm run test:e2e`. The experience regression
suite covers the rental cycle, language preservation, clean navigation,
keyboard access, reduced motion, page lifecycle, on-demand images, and manual
override of the scroll illustration. The wider suite checks section positioning,
order content, no horizontal overflow, links and accessibility.

Responsive browser emulation is not a physical-device test. Production release
verification also compares the deployed assets with the tested build and runs
the main visitor paths on the live domain.
