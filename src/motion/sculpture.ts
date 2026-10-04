// Flat vector artwork lives on real CSS 3D planes. No external assets or renderer.
function circuit() {
  const paths = [
    'M20 34H66L86 54V73H99', 'M20 57H52L72 77H99',
    'M20 117H55L78 94H99', 'M20 140H68L89 119V105H99',
    'M151 73H177L199 51H230', 'M151 91H188L205 108H230',
    'M151 105H164L197 138H230', 'M113 54V31L99 17',
    'M136 54V32H166L181 17', 'M113 122V143L98 158',
    'M136 122V143H165L180 158',
  ]
  return `<svg viewBox="0 0 250 176" fill="none" aria-hidden="true">${paths.map(d => `<path d="${d}" stroke="currentColor" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`).join('')}${[[20,34],[20,57],[20,117],[20,140],[230,51],[230,108],[230,138],[99,17],[181,17],[98,158],[180,158]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="3" stroke="currentColor" vector-effect="non-scaling-stroke"/>`).join('')}</svg>`
}

export function sculpture() {
  const scene = document.createElement('span')
  scene.className = 'pm-scene'
  scene.setAttribute('aria-hidden', 'true')
  const pins = Array.from({ length: 7 }, (_, i) => `<i style="--pin:${i}"></i>`).join('')
  scene.innerHTML = `<span class="pm-light"></span><span class="pm-object">
    <span class="pm-shadow"></span>
    <span class="pm-plane pm-base">${circuit()}</span>
    <span class="pm-plane pm-middle">${circuit()}</span>
    <span class="pm-plane pm-board">${circuit()}<span class="pm-mount pm-mount-a"></span><span class="pm-mount pm-mount-b"></span><span class="pm-mount pm-mount-c"></span><span class="pm-mount pm-mount-d"></span>
      <span class="pm-chip"><span class="pm-chip-top">OB.</span><span class="pm-chip-side pm-chip-front"></span><span class="pm-chip-side pm-chip-right"></span>
        <span class="pm-pins pm-pins-top">${pins}</span><span class="pm-pins pm-pins-bottom">${pins}</span><span class="pm-pins pm-pins-left">${pins}</span><span class="pm-pins pm-pins-right">${pins}</span>
      </span>
    </span>
  </span>`
  return scene
}
