export function HeroK1Poster() {
  return (
    <span
      className="hero-3d-poster-host"
      ref={(node) => {
        if (!node || node.querySelector('.hero-3d-poster')) return
        const tpl = document.getElementById('hero-k1-poster-template')
        if (!(tpl instanceof HTMLTemplateElement)) return
        node.appendChild(tpl.content.cloneNode(true))
      }}
    />
  )
}
