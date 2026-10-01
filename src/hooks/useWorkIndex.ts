import { useEffect, useState } from 'react'

export function useWorkIndex(ids: string[]) {
  const [activeId, setActiveId] = useState(ids[0] ?? '')
  const idsKey = ids.join(',')

  useEffect(() => {
    const idList = idsKey.split(',').filter(Boolean)
    const elements = idList
      .map((id) => document.getElementById(`munka-${id}`))
      .filter((element): element is HTMLElement => element !== null)

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const raw = visible[0]?.target.id
        if (!raw) return
        setActiveId(raw.replace(/^munka-/, ''))
      },
      {
        rootMargin: '-45% 0px -45% 0px',
        threshold: [0, 0.15, 0.35, 0.6],
      },
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [idsKey])

  return activeId
}
