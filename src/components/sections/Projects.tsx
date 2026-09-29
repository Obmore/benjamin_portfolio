import { useI18n } from '@/context/I18nContext'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { BrowserFrame } from '@/components/visuals/BrowserFrame'
import { ExplodedShot } from '@/components/visuals/ExplodedShot'
import { SECTION_IDS, SECTION_NUMBERS } from '@/lib/constants'
import type { WorkProject } from '@/data/types'

export function Projects() {
  const { content } = useI18n()
  const items = content.projects.items
  const featured = items.find((item) => !item.sample)
  const rest = items.filter((item) => item !== featured && !item.sample)
  const samples = items.filter((item) => item.sample)

  return (
    <SectionWrapper id={SECTION_IDS.projects}>
      <SectionHeading
        number={SECTION_NUMBERS.projects}
        title={content.projects.title}
        label={content.nav.projects}
        subtitle={content.projects.lead}
      />
      <div className="space-y-6">
        {featured ? (
          <WorkCard
            project={featured}
            layout="featured"
            sampleBadge={content.projects.sampleBadge}
            explodeLabels={content.projects.explode}
          />
        ) : null}
        <div className="grid gap-6 md:grid-cols-2">
          {rest.map((project) => (
            <WorkCard
              key={project.id}
              project={project}
              layout="half"
              sampleBadge={content.projects.sampleBadge}
            />
          ))}
        </div>
        {samples.map((project) => (
          <WorkCard
            key={project.id}
            project={project}
            layout="sample"
            sampleBadge={content.projects.sampleBadge}
          />
        ))}
      </div>
    </SectionWrapper>
  )
}

function WorkCard({
  project,
  layout,
  sampleBadge,
  explodeLabels,
}: {
  project: WorkProject
  layout: 'featured' | 'half' | 'sample'
  sampleBadge: string
  explodeLabels?: { structure: string; content: string; finished: string }
}) {
  const hasImage = Boolean(project.image)
  const src = hasImage ? `${import.meta.env.BASE_URL}${project.image}` : ''
  const imageHref = project.site?.href ?? project.links?.[0]?.href
  const domain = project.site?.label ?? ''
  const titleBadge = project.sample ? sampleBadge : undefined
  const workTag = project.sample ? undefined : project.tag
  const explode = Boolean(explodeLabels) && project.id === 'anettesvendi' && hasImage
  const chipClass =
    'rounded-[6px] border border-line/40 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-line'

  const image = hasImage ? (
    <img
      src={src}
      alt={project.alt ?? ''}
      width={project.imageWidth}
      height={project.imageHeight}
      loading="lazy"
      decoding="async"
      className="browser-shot"
    />
  ) : null

  const frame =
    explode && explodeLabels ? (
      <ExplodedShot
        src={src}
        alt={project.alt ?? ''}
        width={project.imageWidth ?? 1280}
        height={project.imageHeight ?? 800}
        href={imageHref}
        labels={explodeLabels}
      />
    ) : hasImage ? (
      <BrowserFrame domain={domain || project.title}>
        {imageHref ? (
          <a href={imageHref} target="_blank" rel="noopener noreferrer" className="block">
            {image}
          </a>
        ) : (
          image
        )}
      </BrowserFrame>
    ) : null

  return (
    <article
      className={`crop-marks rounded-[6px] border border-line/25 bg-surface ${
        explode ? 'overflow-visible' : 'overflow-hidden'
      } ${
        layout === 'featured' && hasImage ? 'grid gap-0 lg:grid-cols-2' : ''
      } ${layout === 'sample' && hasImage ? 'grid gap-4 p-4 md:grid-cols-[14rem_1fr] md:items-center' : ''}`}
    >
      {frame ? <div className={layout === 'sample' ? '' : 'p-3'}>{frame}</div> : null}
      <div className={`min-w-0 ${layout === 'sample' && hasImage ? 'md:py-2' : 'p-4 md:p-5'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-medium tracking-tight text-foreground">{project.title}</h3>
          {titleBadge ? <span className={chipClass}>{titleBadge}</span> : null}
        </div>
        {project.subtitle ? (
          <p className="mt-1 text-base leading-snug text-muted">{project.subtitle}</p>
        ) : null}
        {project.relation ? (
          <p className="mt-1 font-mono text-xs text-line">{project.relation}</p>
        ) : null}
        {project.site ? (
          <p className="mt-2 font-mono text-sm">
            <a
              href={project.site.href}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-line hover:underline"
            >
              {project.site.label}
            </a>
          </p>
        ) : null}
        {project.paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 48)} className="mt-3 text-sm leading-relaxed text-muted">
            {linkify(paragraph, project)}
          </p>
        ))}
        {workTag ? (
          <p className="mt-3">
            <span className={chipClass}>{workTag}</span>
          </p>
        ) : null}
        <p className={`${workTag ? 'mt-2' : 'mt-3'} text-sm leading-relaxed text-muted`}>{project.tech}</p>
      </div>
    </article>
  )
}

function linkify(text: string, project: WorkProject) {
  const links = [...(project.links ?? [])]
  if (project.site) links.unshift({ label: project.site.label, href: project.site.href })

  const hit = links.find((link) => text.includes(link.label))
  if (!hit) return text

  const index = text.indexOf(hit.label)
  const before = text.slice(0, index)
  const after = text.slice(index + hit.label.length)

  return (
    <>
      {before}
      <a
        href={hit.href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-line hover:underline"
      >
        {hit.label}
      </a>
      {after}
    </>
  )
}
