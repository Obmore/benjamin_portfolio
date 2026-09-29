import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useI18n } from '@/context/I18nContext'
import { Button } from '@/components/ui/Button'
import { QuoteFormMorph } from '@/components/hero/QuoteFormMorph'
import { ASSESS_MAILTO, SECTION_IDS } from '@/lib/constants'
import { scrollToSection } from '@/hooks/useActiveSection'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

export function Hero() {
  const { content } = useI18n()
  const hero = content.hero
  const reduced = usePrefersReducedMotion()
  const rootRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || reduced) return

    const lines = root.querySelectorAll<HTMLElement>('[data-hero-line]')
    const kicker = root.querySelector<HTMLElement>('[data-hero-kicker]')
    const lead = root.querySelector<HTMLElement>('[data-hero-lead]')
    const hint = root.querySelector<HTMLElement>('[data-scroll-hint]')

    const ctx = gsap.context(() => {
      if (lines.length) {
        gsap.from(lines, {
          yPercent: 112,
          duration: 1.05,
          stagger: 0.09,
          ease: 'expo.out',
        })
      }
      gsap.from([kicker, lead], {
        y: 14,
        duration: 0.75,
        stagger: 0.08,
        ease: 'power2.out',
        delay: 0.1,
      })
      if (hint) {
        gsap.to(hint, {
          y: 7,
          duration: 1.35,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 1,
        })
      }
    }, root)

    return () => ctx.revert()
  }, [reduced, hero.headline])

  return (
    <section id="hero" ref={rootRef} className="relative scroll-mt-16">
      <div data-hero-pin className="hero-pin">
        <div className="hero-frame">
          <p data-hero-kicker className="hero-kicker">
            {hero.kicker}
          </p>
          <h1 className="hero-offer-title">
            {hero.headlineLines.map((line) => (
              <span key={line} className="hero-line">
                <span className="hero-line-inner" data-hero-line>
                  {line}
                </span>
              </span>
            ))}
          </h1>
          <div className="hero-shell">
            <div className="hero-copy">
              <p data-hero-lead className="hero-offer-lead">
                {hero.subheadline}
              </p>
              <div data-hero-actions className="hero-actions">
                <Button data-hero-cta="primary" className="w-auto" href={ASSESS_MAILTO}>
                  {hero.ctaAssess}
                </Button>
                <button
                  type="button"
                  data-hero-cta="secondary"
                  className="inline-flex min-h-12 items-center text-sm font-medium text-line underline-offset-4 hover:underline"
                  onClick={() => scrollToSection(SECTION_IDS.problem)}
                >
                  {hero.ctaHow}
                </button>
              </div>
              <p data-scroll-hint className="hero-scroll-hint">
                {hero.scrollHint}
              </p>
            </div>
            <QuoteFormMorph />
          </div>
        </div>
      </div>
    </section>
  )
}
