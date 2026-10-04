# Spatial motion preview

Requested after the first portfolio handoff was completed. This is a new visual direction inspired by the pacing and depth of https://www.apple.com/airpods-pro/, not a retry or approval of PR #21's rejected GLB renderer. It adds native CSS 3D planes, without WebGL or external assets. The original #22/#23/#24 release candidates remain unchanged.

Acceptance fixed before implementation:

- Desktop, fine pointer, 1024px or wider: layered circuit illustration changes depth and orientation with ordinary scrolling, and responds gently to pointer movement.
- Project screenshots gain modest perspective; About icons gain a small spatial hover gesture. Text, links, section order and anchor positions remain intact.
- Mobile, coarse pointer, save-data and reduced-motion users receive the existing static view. A live switch to reduced motion cancels work and restores it.
- No continuous animation loop. No requestAnimationFrame callbacks at rest, in a hidden document, or after pagehide. Restore safely on pageshow.
- Zero console errors, zero layout shift, no overflow at 360/390/1024/1440; keyboard, hash, language and order-page regressions pass.
- Existing critical budget: JS <=73,511 B gzip-9, CSS <=9,420 B; total JS <=160 KiB. New optional CSS is lazy-loaded and its size reported separately. No new dependencies.
- Measure production desktop/mobile Lighthouse; compare four fresh desktop runs with the existing 103ed32 preview. No deployment or merge without owner approval.

The old B1/B8 pixel-match gates apply to the closed GLB candidate, not to this newly requested design. This preview must not be described as a working GLB/WebGL model.
