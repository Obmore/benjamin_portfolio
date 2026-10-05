# Privacy and Rollin hardening, 2026-10-05

Base: `111c223ea5f13606473a1b23d15188c5592a13d9` (PR #29).

## Corrections

- Reproduced a Rollin painter-order defect during movement: an adjacent dock
  obscured the steering column. Keep the station and scooter in coherent layers
  within the existing limited camera range. Review twelve intermediate-frame
  baselines and assert the column paints after the dock housings.
- Keep the return action busy through an explicit lock-closing phase before
  charging. Hidden/off-screen and reduced-motion paths settle safely.
- Recover failed English imports on an explicit retry with a fresh document.
  Browsers cache a failed dynamic import within the old document. Failed stored
  English preference now falls back to Hungarian with the correct document lang.
- Cancel late mounting of interactive sections after React cleanup, cancel a
  pending section snap before returning to the top, resume order scroll-following
  after reduced motion is disabled unless the visitor chose a phase manually,
  and ignore stale clipboard completions after the draft changes.
- Publish a static, script-free Hungarian privacy notice linked from both
  homepage languages and the order page. It describes the browser-local mail
  draft, mailto and clipboard flow, GitHub Pages/Fastly hosting, Gmail, local
  language preference, purpose-specific retention and visitor rights.

The notice is a corrected revision of the supplied v5B, not a byte-for-byte copy.
Original supplied SHA-256:
`8e55fc87a78c89958261a980244514860606063ba2a46b362a428fd6ed3cdd3f`.
The canonical published article fingerprint is in `docs/privacy-content.sha256`.
`npm run check:privacy` compares the source article, built article and fingerprint;
it does not certify legal compliance or the mailbox operator's actual practices.
The stated 12-month deletion of inquiries without orders remains an operational
mailbox task; this website does not automatically delete Gmail messages.

## Validation before PR

- `npm run check`: passed (three pre-existing lint warnings, no errors).
- Windows Chromium: all 147 browser tests passed, including existing responsive,
  keyboard, reduced-motion, accessibility, catalog, navigation and loading checks.
- All twelve new Rollin intermediate screenshots inspected visually. Existing
  eighteen endpoint baselines retained. Mobile emulation is not a physical-device
  test; the new intermediate screenshot references are desktop Chromium.
- `npm audit`: zero known vulnerabilities, including development dependencies.
- Privacy page verified without JavaScript at 360, 390, 1024 and 1440 pixels;
  exact text, canonical URL, no horizontal overflow, links and Axe checks pass.
- No dependency additions and no raised bundle budgets. No analytics, error
  reporting SDK, form backend or external submission endpoint added.

The PR introduces Windows/Chromium and Ubuntu/Firefox/WebKit CI with failure
traces and screenshots. Their run results and the subsequent production asset
and visitor-path checks must be verified before claiming the release complete.

## Primary implementation references

- [Zdog: z-fighting and grouping](https://zzz.dog/extras#z-fighting).
- [Playwright: reviewed, platform-specific visual references](https://playwright.dev/docs/test-snapshots)
  and [controlled animation time](https://playwright.dev/docs/clock).
- [React: effect cleanup](https://react.dev/reference/react/useEffect).
- [Vite: loading failures after deployments](https://vite.dev/guide/build.html#load-error-handling).
- [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
  and [dynamic import caching](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import).
- [GitHub Pages security logging](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages),
  [GitHub privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement),
  [Fastly privacy statement](https://www.fastly.com/privacy) and
  [processing terms](https://www.fastly.com/data-processing),
  [Google privacy policy](https://policies.google.com/privacy?hl=hu) and
  [transfer safeguards](https://policies.google.com/privacy/frameworks?hl=hu).
