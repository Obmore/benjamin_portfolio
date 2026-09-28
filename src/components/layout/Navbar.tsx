import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/context/I18nContext'
import { SECTION_IDS } from '@/lib/constants'
import { scrollToSection, useActiveSection } from '@/hooks/useActiveSection'
import { LangToggle } from '@/components/ui/LangToggle'

const navItems = [
  { id: SECTION_IDS.services, key: 'services' as const },
  { id: SECTION_IDS.projects, key: 'projects' as const },
  { id: SECTION_IDS.about, key: 'about' as const },
  { id: SECTION_IDS.experience, key: 'experience' as const },
  { id: SECTION_IDS.skills, key: 'skills' as const },
  { id: SECTION_IDS.cv, key: 'cv' as const },
  { id: SECTION_IDS.contact, key: 'contact' as const },
]

const NAV_IDS = navItems.map((item) => item.id)

export function Navbar() {
  const { content } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)
  const activeId = useActiveSection(NAV_IDS)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onHash = () => {
      const id = window.location.hash.replace(/^#/, '')
      if (id) {
        window.requestAnimationFrame(() => scrollToSection(id))
      }
    }
    const timer = window.setTimeout(onHash, 50)
    window.addEventListener('hashchange', onHash)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('hashchange', onHash)
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
        scrolled ? 'border-b border-line/20 bg-background' : 'bg-background/95'
      }`}
    >
      <a href="#main" className="skip-link">
        {content.common.skipToContent}
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-2.5 md:px-8">
        <button
          type="button"
          onClick={() => scrollToSection('hero')}
          className="font-mono text-sm font-semibold tracking-wide text-foreground"
        >
          OB<span className="text-line">.</span>
        </button>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label={content.common.mainNav}>
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`whitespace-nowrap rounded-[6px] px-2 py-2 text-sm ${
                activeId === item.id ? 'text-line' : 'text-muted hover:text-foreground'
              }`}
            >
              {content.nav[item.key]}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LangToggle />
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
            {navItems.map((item, index) => (
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
