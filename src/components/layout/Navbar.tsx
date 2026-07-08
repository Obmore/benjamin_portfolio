import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '@/context/I18nContext'
import { SECTION_IDS } from '@/lib/constants'
import { scrollToSection, useActiveSection } from '@/hooks/useActiveSection'
import { LangToggle } from '@/components/ui/LangToggle'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const navItems = [
  { id: SECTION_IDS.about, key: 'about' as const },
  { id: SECTION_IDS.experience, key: 'experience' as const },
  { id: SECTION_IDS.skills, key: 'skills' as const },
  { id: SECTION_IDS.projects, key: 'projects' as const },
  { id: SECTION_IDS.cv, key: 'cv' as const },
  { id: SECTION_IDS.contact, key: 'contact' as const },
]

export function Navbar() {
  const { content } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const activeId = useActiveSection(navItems.map((item) => item.id))

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

  const handleNavClick = (id: string) => {
    scrollToSection(id)
    setMenuOpen(false)
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-border/60 bg-background/80 backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
        <button
          type="button"
          onClick={() => scrollToSection('hero')}
          className="font-mono text-sm font-semibold tracking-wide text-foreground"
        >
          OB<span className="text-accent">.</span>
        </button>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                activeId === item.id
                  ? 'text-accent'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {content.nav[item.key]}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
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

      <AnimatePresence>
        {menuOpen ? (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-border/60 bg-background/95 backdrop-blur-xl lg:hidden"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`rounded-lg px-3 py-2 text-left text-sm ${
                    activeId === item.id ? 'text-accent' : 'text-muted'
                  }`}
                >
                  {content.nav[item.key]}
                </button>
              ))}
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
