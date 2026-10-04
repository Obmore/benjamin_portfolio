# Cinematic scroll preview

Follow-up request: reload at hero, more spatial elements, motion on capable mobile devices, and an Apple-inspired pinned scroll sequence. This supersedes the previous desktop-only motion preference. Production merge/deployment still requires owner approval.

Acceptance before implementation:
- Reload from any scroll position, including a section hash, starts at hero; a fresh external deep link still lands correctly.
- A native sticky stage stays under the header through three clearly distinct, reversible poses. Wheel, touch, keyboard and navigation retain native behavior; no scroll interception.
- Existing Hungarian/English portfolio copy supplies the story captions. Original section order and catalog content are retained. New short navigation labels are preview copy.
- 360/390/1024/1440 layouts fit without document overflow, clipped captions or unstable anchors. Stage space is reserved before lazy assets load (CLS 0).
- Capable mobile/coarse-pointer devices receive the same scene with fewer decorative elements. Save-data, <=2 GB reported memory and reduced motion keep a static fallback. Dynamic reduced motion pauses without collapsing page geometry. Slow sustained rendering reduces decorative detail without moving content.
- Stable geometry for pointer effects, direct scroll-to-pose mapping, no endless RAF loop, pagehide/hidden pause, pageshow resume.
- No new dependencies, critical JS <=73,511 B gzip-9, main CSS <=9,420 B. Report lazy assets separately. Build/check, full regression suite, targeted mobile/reload/sticky tests and mobile/desktop Lighthouse.

Sources: https://www.apple.com/airpods-pro/ ; https://developer.mozilla.org/en-US/docs/Web/CSS/position ; https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming/type . Native sticky positioning is used instead of capturing wheel/touch events. Native CSS 3D transforms are used, not the rejected PR #21 GLB renderer.
