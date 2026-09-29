import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useI18n } from '@/context/I18nContext'
import { Button } from '@/components/ui/Button'
import { QuoteFormMorph } from '@/components/hero/QuoteFormMorph'
import { SignalSegment } from '@/components/visuals/SignalRail'
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
          yPercent: 110,
          duration: 0.9,
          stagger: 0.08,
          ease: 'expo.out',
        })
      }
      gsap.from([kicker, lead], {
        y: 10,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power2.out',
        delay: 0.12,
      })
      if (hint) {
        gsap.to(hint, {
          y: 6,
          duration: 1.4,
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
    <section id="hero" ref={rootRef} className="relative scroll-mt-16 pt-14 md:pt-20">
      <SignalSegment staticDraw />
      <div data-hero-pin className="hero-pin">
        <div className="mx-auto grid w-full max-w-6xl gap-3 px-5 py-3 md:gap-6 md:px-8 md:py-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <p
              data-hero-kicker
              className="max-w-xl font-mono text-[11px] leading-snug tracking-wide text-line md:text-xs"
            >
              {hero.kicker}
            </p>
            <h1 className="hero-offer-title mt-2 text-[1.35rem] font-semibold leading-[1.18] tracking-tight text-foreground md:mt-3 md:text-4xl md:leading-tight">
              {hero.headlineLines.map((line) => (
                <span key={line} className="hero-line">
                  <span className="hero-line-inner" data-hero-line>
                    {line}
                  </span>
                </span>
              ))}
            </h1>
            <p
              data-hero-lead
              className="hero-offer-lead mt-2 max-w-xl text-[14px] leading-snug text-muted md:mt-3 md:text-[15px] md:leading-relaxed"
            >
              {hero.subheadline}
            </p>
            <div
              data-hero-actions
              className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 md:mt-5"
            >
              <Button
                data-hero-cta="primary"
                className="w-auto"
                href={ASSESS_MAILTO}
              >
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
            <p
              data-scroll-hint
              className="mt-3 font-mono text-[11px] tracking-wide text-line md:mt-4"
            >
              {hero.scrollHint}
            </p>
          </div>
          <div className="lg:col-span-6">
            <QuoteFormMorph />
          </div>
        </div>
      </div>
    </section>
  )
}
