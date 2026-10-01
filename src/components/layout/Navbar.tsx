import { useEffect, useState } from 'react'
import { useI18n } from '@/context/I18nContext'
import { SECTION_IDS } from '@/lib/constants'
import { scrollToSection, useActiveSection } from '@/hooks/useActiveSection'
import { navigateTo } from '@/lib/anchors'
import { LangToggle } from '@/components/ui/LangToggle'
import { OrderLink } from '@/components/ui/OrderLink'

const navItems = [
  { id: SECTION_IDS.projects, key: 'projects' as const },
  { id: SECTION_IDS.about, key: 'about' as const },
  { id: SECTION_IDS.experience, key: 'experience' as const },
  { id: SECTION_IDS.skills, key: 'skills' as const },
  { id: SECTION_IDS.cv, key: 'cv' as const },
  { id: SECTION_IDS.contact, key: 'contact' as const },
]

function useHeaderScrolled() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const sentinel = document.createElement('div')
    sentinel.setAttribute('data-scroll-sentinel', '')
    sentinel.setAttribute('aria-hidden', 'true')
    sentinel.style.cssText =
      'position:absolute;top:0;left:0;width:1px;height:20px;pointer-events:none;'
    document.body.prepend(sentinel)

    const observer = new IntersectionObserver(([entry]) => {
      setScrolled(!entry.isIntersecting)
    })
    observer.observe(sentinel)

    return () => {
      observer.disconnect()
      sentinel.remove()
    }
  }, [])

  return scrolled
}

export function Navbar() {
  const { content } = useI18n()
  const scrolled = useHeaderScrolled()
  const [menuOpen, setMenuOpen] = useState(false)
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null)
  const activeId = useActiveSection(navItems.map((item) => item.id))

  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  useEffect(() => {
    if (menuOpen || pendingScrollId === null) return

    const id = pendingScrollId
    const frame = window.requestAnimationFrame(() => {
      scrollToSection(id)
      setPendingScrollId(null)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [menuOpen, pendingScrollId])

  const handleNavClick = (id: string) => {
    if (menuOpen) {
      document.body.style.overflow = ''
      setMenuOpen(false)
      history.replaceState(null, '', `#${id}`)
      setPendingScrollId(id)
      return
    }

    navigateTo(id)
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 h-16 transition-colors duration-300 ${
        scrolled
          ? 'border-b border-border/60 bg-background/80 backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl flex-nowrap items-center justify-between gap-3 px-5 md:px-8">
        <button
          type="button"
          onClick={() => scrollToSection('hero')}
          className="font-mono text-sm font-semibold tracking-wide text-foreground"
        >
          OB<span className="text-accent">.</span>
        </button>

        <nav
          className="hidden flex-nowrap items-center gap-0.5 whitespace-nowrap lg:flex xl:gap-1"
          aria-label={content.common.navMain}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`shrink-0 rounded-lg px-2.5 py-2 text-sm transition-colors xl:px-3 ${
                activeId === item.id
                  ? 'text-accent'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {content.nav[item.key]}
            </button>
          ))}
          <OrderLink className="nav-order-link shrink-0" />
        </nav>

        <div className="flex items-center gap-2">
          <LangToggle />
          <button
            type="button"
            className="rounded-lg border border-border/70 p-2 text-muted lg:hidden"
            aria-label={content.common.menuToggle}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <nav
        className={`mobile-nav border-b border-border/60 bg-background/95 backdrop-blur-xl lg:hidden ${menuOpen ? 'is-open' : ''}`}
        aria-label={content.common.navMobile}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <div className="flex flex-col gap-1 px-5 py-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => handleNavClick(item.id)}
              className={`rounded-lg px-3 py-2 text-left text-sm ${
                activeId === item.id ? 'text-accent' : 'text-muted'
              }`}
            >
              {content.nav[item.key]}
            </button>
          ))}
          <OrderLink
            className="nav-order-link nav-order-link-mobile"
            tabIndex={menuOpen ? 0 : -1}
          />
        </div>
      </nav>
    </header>
  )
}
