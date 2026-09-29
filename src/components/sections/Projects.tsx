import { useI18n } from '@/context/I18nContext'
import { Card } from '@/components/ui/Card'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionWrapper } from '@/components/ui/SectionWrapper'
import { SECTION_IDS } from '@/lib/constants'
import type { WorkProject } from '@/data/types'

export function Projects() {
  const { content } = useI18n()

  return (
    <SectionWrapper id={SECTION_IDS.projects}>
      <SectionHeading title={content.projects.title} label={content.nav.projects} />
      <div className="space-y-10">
        {content.projects.items.map((project, index) => (
          <WorkCard key={project.id} project={project} delay={index * 0.06} />
        ))}
      </div>
    </SectionWrapper>
  )
}

function WorkCard({ project, delay }: { project: WorkProject; delay: number }) {
  const src = `${import.meta.env.BASE_URL}${project.image}`
  const imageHref = project.site?.href ?? project.links?.[0]?.href

  const image = (
    <img
      src={src}
      alt={project.alt}
      width={project.imageWidth}
      height={project.imageHeight}
      loading="lazy"
      decoding="async"
      className="aspect-[16/10] h-auto w-full object-cover object-top lg:h-full lg:min-h-full lg:aspect-auto"
    />
  )

  return (
    <Card delay={delay} padded={false} className="overflow-hidden">
      <article className="grid min-w-0 gap-0 lg:grid-cols-2">
        <div className="min-w-0 self-stretch bg-surface">
          {imageHref ? (
            <a href={imageHref} target="_blank" rel="noopener noreferrer" className="block h-full">
              {image}
            </a>
          ) : (
            image
          )}
        </div>
        <div className="min-w-0 p-6 md:p-8">
          <h3 className="text-xl font-medium tracking-tight text-foreground">{project.title}</h3>
          {project.subtitle ? (
            <p className="mt-1 text-base leading-snug text-muted">{project.subtitle}</p>
          ) : null}
          {project.site ? (
            <p className="mt-2 font-mono text-sm">
              <a
                href={project.site.href}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-accent hover:underline"
              >
                {project.site.label}
              </a>
            </p>
          ) : null}
          {project.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="mt-4 text-sm leading-relaxed text-muted">
              {linkify(paragraph, project)}
            </p>
          ))}
          <p className="mt-4 text-sm leading-relaxed text-muted">{project.tech}</p>
        </div>
      </article>
    </Card>
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
        className="break-all text-accent hover:underline"
      >
        {hit.label}
      </a>
      {after}
    </>
  )
}
