import { useLayoutEffect, useRef, type MouseEvent } from 'react'
import { useI18n } from '@/context/I18nContext'
import { Icon } from '@/components/ui/Icon'
import { SECTION_IDS, SECTION_SHEETS } from '@/lib/constants'
import { useRevealOnce } from '@/hooks/useRevealOnce'
import { useWorkIndex } from '@/hooks/useWorkIndex'
import { onResolvedHashClick } from '@/lib/anchors'
import type { WorkProject } from '@/data/types'

function padSheet(index: number) {
  return String(index + 1).padStart(2, '0')
}

export function Projects() {
  const { content } = useI18n()
  const items = content.projects.items
  const activeId = useWorkIndex(items.map((item) => item.id))
  const indexRef = useRef<HTMLOListElement>(null)

  useLayoutEffect(() => {
    const list = indexRef.current
    if (!list) return
    const update = () => {
      const current = list.querySelector<HTMLElement>(`[data-work-id="${activeId}"]`)
      if (!current) return
      list.style.setProperty('--active-y', `${current.offsetTop}px`)
      list.style.setProperty('--active-h', `${current.offsetHeight}px`)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(list)
    return () => observer.disconnect()
  }, [activeId, items])

  return (
    <section
      id={SECTION_IDS.projects}
      className="munkaim-section scroll-mt-16"
      aria-labelledby="munkaim-title"
    >
      <span id="projektek" className="anchor-alias" aria-hidden="true" />
      <div className="munkaim-container">
        <header className="munkaim-head">
          <p className="munkaim-sheet">
            {SECTION_SHEETS.projects} · {content.nav.projects}
          </p>
          <h2 id="munkaim-title" className="munkaim-title">
            {content.projects.title}
          </h2>
          <svg
            className="munkaim-dimension"
            viewBox="0 0 100 24"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <line
              className="munkaim-dimension-line"
              x1="0"
              y1="12"
              x2="100"
              y2="12"
              pathLength="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </header>

        <div className="munkaim-layout">
          <nav className="work-index" aria-label={content.projects.indexLabel}>
            <ol ref={indexRef} className="work-index-list">
              {items.map((item, index) => {
                const badge = item.sample ? ` [${content.projects.sampleBadge}]` : ''
                return (
                  <li
                    key={item.id}
                    data-work-id={item.id}
                    data-active={item.id === activeId ? 'true' : undefined}
                  >
                    <a
                      href={`/#munka-${item.id}`}
                      className="work-index-link"
                      aria-current={item.id === activeId ? 'location' : undefined}
                      onClick={(event: MouseEvent<HTMLAnchorElement>) =>
                        onResolvedHashClick(event, `munka-${item.id}`)
                      }
                    >
                      <span className="work-index-num">{padSheet(index)}</span>
                      <span className="work-index-label">
                        {item.title}
                        {badge}
                      </span>
                    </a>
                  </li>
                )
              })}
            </ol>
          </nav>

          <ol className="work-pages">
            {items.map((item, index) => (
              <li key={item.id}>
                <WorkCard
                  project={item}
                  index={index}
                  sampleBadge={content.projects.sampleBadge}
                />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function WorkCard({
  project,
  index,
  sampleBadge,
}: {
  project: WorkProject
  index: number
  sampleBadge: string
}) {
  const { content, locale } = useI18n()
  const ref = useRevealOnce<HTMLElement>()
  const badge = project.sample ? sampleBadge : project.tag
  const src = project.image ? `${import.meta.env.BASE_URL}${project.image}` : ''

  return (
    <article
      ref={ref}
      id={`munka-${project.id}`}
      className="work-card scroll-mt-16"
      data-reveal
    >
      <span className="work-card-shadow" aria-hidden="true" />
      <CornerMarks />
      <div className="work-card-inner">
        <div className="work-card-kicker">
          <span>MUNKA {padSheet(index)}</span>
          {badge ? <span className="work-card-tag">{badge}</span> : null}
        </div>

        {project.image ? (
          <div className="work-shot">
            <div className="work-shot-chrome">
              <span className="work-shot-domain">{project.site?.label ?? ''}</span>
            </div>
            <div className="work-shot-frame">
              {project.site ? (
                <a
                  href={project.site.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="work-shot-link"
                >
                  <WorkImage project={project} src={src} />
                </a>
              ) : (
                <WorkImage project={project} src={src} />
              )}
            </div>
          </div>
        ) : null}

        <h3 className="work-card-title">{project.title}</h3>
        {project.subtitle ? <p className="work-card-sub">{project.subtitle}</p> : null}
        {project.id === 'hotel-rental' ? <div className="rollin-demo" data-rollin-demo>
          <p>{locale === 'hu' ? 'A kattintástól a mozdulatig. A rendszer működéséről az alábbi projektleírásban olvashat.' : 'From a click to motion. Read how the system works in the project description below.'}</p>
        </div> : null}
        {project.site ? (
          <p className="work-card-link">
            <a
              href={project.site.href}
              target="_blank"
              rel="noopener noreferrer"
              className="work-live-link"
            >
              {project.site.label}
              <Icon name="arrow-ne" className="work-link-icon" />
            </a>
          </p>
        ) : null}
        {project.paragraphs.map((paragraph, i) => (
          <p key={paragraph.slice(0, 48)} className="work-card-body">
            <strong className="work-detail-label">{content.projects.detailLabels[i]}</strong>
            {paragraph}
          </p>
        ))}
        <p className="work-card-tech">{project.tech}</p>
      </div>
    </article>
  )
}

function WorkImage({ project, src }: { project: WorkProject; src: string }) {
  return (
    <img
      src={src}
      alt={project.alt ?? ''}
      width={project.imageWidth ?? 1280}
      height={project.imageHeight ?? 800}
      loading="lazy"
      decoding="async"
      sizes="(min-width:1440px) 744px, (min-width:1024px) 62vw, calc(100vw - 80px)"
    />
  )
}

function CornerMarks() {
  return (
    <span className="work-corners" aria-hidden="true">
      <span className="work-corner work-corner-tl" />
      <span className="work-corner work-corner-tr" />
      <span className="work-corner work-corner-bl" />
      <span className="work-corner work-corner-br" />
    </span>
  )
}
