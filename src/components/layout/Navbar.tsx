import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/context/I18nContext'
import { ASSESS_MAILTO, SECTION_IDS } from '@/lib/constants'
import { bindInPageAnchors, scrollToSection, useActiveSection } from '@/hooks/useActiveSection'
import { LangToggle } from '@/components/ui/LangToggle'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { getLenis } from '@/lib/motionEngine'

const menuItems = [
  { id: SECTION_IDS.solution, key: 'howItWorks' as const },
  { id: SECTION_IDS.projects, key: 'projects' as const },
  { id: SECTION_IDS.about, key: 'about' as const },
  { id: SECTION_IDS.contact, key: 'contact' as const },
]

const NAV_IDS = [
  SECTION_IDS.solution,
  SECTION_IDS.projects,
  SECTION_IDS.about,
  SECTION_IDS.contact,
  SECTION_IDS.services,
]

export function Navbar() {
  const { content } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const lastY = useRef(0)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)
  const activeId = useActiveSection(NAV_IDS)

  useEffect(() => {
    const onScroll = (y: number) => {
      setScrolled(y > 20)
      if (menuOpen) {
        setHidden(false)
        lastY.current = y
        return
      }
      if (y > 300 && y > lastY.current + 4) setHidden(true)
      else if (y < lastY.current - 4) setHidden(false)
      lastY.current = y
    }

    const fromWindow = () => onScroll(window.scrollY)
    fromWindow()
    window.addEventListener('scroll', fromWindow, { passive: true })
    const lenis = getLenis()
    const fromLenis = (instance: { scroll: number }) => onScroll(instance.scroll)
    lenis?.on('scroll', fromLenis)
    return () => {
      window.removeEventListener('scroll', fromWindow)
      lenis?.off('scroll', fromLenis)
    }
  }, [menuOpen])

  useEffect(() => {
    const onHash = () => {
      const id = window.location.hash.replace(/^#/, '')
      if (id) {
        window.requestAnimationFrame(() => scrollToSection(id))
      }
    }
    const timer = window.setTimeout(onHash, 50)
    window.addEventListener('hashchange', onHash)
    const unbindAnchors = bindInPageAnchors()
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('hashchange', onHash)
      unbindAnchors()
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    window.setTimeout(() => firstItemRef.current?.focus(), 40)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const handleNavClick = (id: string) => {
    const go = () => {
      const hash = `#${id}`
      if (window.location.hash !== hash) {
        history.replaceState(null, '', hash)
      }
      scrollToSection(id)
    }

    if (menuOpen) {
      document.body.style.overflow = ''
      setMenuOpen(false)
      window.setTimeout(() => {
        go()
        menuButtonRef.current?.focus()
      }, 50)
      return
    }

    go()
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      } ${scrolled ? 'border-b border-line/20 bg-background' : 'bg-background/95'}`}
      style={{
        transitionProperty: 'transform',
        transitionDuration: 'var(--motion-short)',
        transitionTimingFunction: 'var(--motion-ease)',
      }}
    >
      <a href="#main" className="skip-link">
        {content.common.skipToContent}
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 md:px-8">
        <button
          type="button"
          onClick={() => scrollToSection('hero')}
          className="shrink-0 font-mono text-sm font-semibold tracking-wide text-foreground"
        >
          OB<span className="text-line">.</span>
        </button>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label={content.common.mainNav}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              data-nav-link={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`whitespace-nowrap rounded-[6px] px-2 py-2 text-sm ${
                activeId === item.id ? 'text-line' : 'text-muted hover:text-foreground'
              }`}
            >
              {content.nav[item.key]}
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            data-nav="prices"
            onClick={() => handleNavClick(SECTION_IDS.prices)}
            className="whitespace-nowrap rounded-[6px] px-2 py-2 text-sm font-medium text-foreground hover:text-line"
          >
            {content.nav.prices}
          </button>
          <Button
            data-nav="assess"
            data-cta="nav-assess"
            href={ASSESS_MAILTO}
            className="min-h-9 px-2.5 py-1.5 text-[11px] sm:min-h-12 sm:px-5 sm:text-sm"
          >
            {content.hero.ctaAssess}
          </Button>
          <LangToggle />
          <ThemeToggle />
          <button
            ref={menuButtonRef}
            type="button"
            className="rounded-[6px] border border-line/30 p-2 text-muted lg:hidden"
            aria-label={menuOpen ? content.common.closeMenu : content.common.mobileMenu}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {menuOpen ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={`grid overflow-hidden border-b border-line/20 bg-background lg:hidden ${
          menuOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
        style={{
          transitionProperty: 'grid-template-rows',
          transitionDuration: 'var(--motion-short)',
          transitionTimingFunction: 'var(--motion-ease)',
        }}
        aria-label={content.common.mobileMenu}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-1 px-5 py-3">
            {menuItems.map((item, index) => (
              <button
                key={item.id}
                ref={index === 0 ? firstItemRef : undefined}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`min-h-11 rounded-[6px] px-3 py-2 text-left text-sm ${
                  activeId === item.id ? 'text-line' : 'text-muted'
                }`}
              >
                {content.nav[item.key]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
