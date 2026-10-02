import poster from './hero-k1-poster.svg?raw'

export function HeroK1Poster() {
  return <span className="hero-3d-poster-host" dangerouslySetInnerHTML={{ __html: poster }} />
}
