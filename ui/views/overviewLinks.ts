// Le linee seguono i riquadri reali: traduzioni e ridimensionamenti cambiano le misure.
let osservatore: ResizeObserver | null = null
let fotogramma = 0
let ridisegna: (() => void) | null = null
let scordaScorrimento: (() => void) | null = null

export function scordaCollegamentiOverview (): void {
  osservatore?.disconnect()
  osservatore = null
  scordaScorrimento?.()
  scordaScorrimento = null
  cancelAnimationFrame(fotogramma)
  ridisegna = null
}

export interface CollegamentoOverview {
  da: string
  a: string
  tipo: string
}

export function impostaScalaOverview (scala: number): void {
  const telaio = document.querySelector<HTMLElement>('[data-schema-progettazione]')
  if (!telaio) return
  telaio.style.zoom = String(scala)
  const valore = document.querySelector('.panoramica__zoom-valore')
  if (valore) valore.textContent = `${Math.round(scala * 100)}%`
  const controllo = document.querySelector<HTMLInputElement>('.panoramica__zoom input')
  if (controllo) controllo.value = String(Math.round(scala * 100))
  ridisegna?.()
}

export function posaCollegamentiOverview (
  collegamenti: CollegamentoOverview[], adatta = false,
): void {
  scordaCollegamentiOverview()
  fotogramma = requestAnimationFrame(() => {
    // Idiomorph può aver mantenuto il telaio precedente: si cerca quello montato.
    const telaio = document.querySelector<HTMLElement>('[data-schema-progettazione]')
    const svg = telaio?.querySelector('svg')
    if (!telaio || !svg) return
    if (adatta) {
      telaio.style.zoom = '1'
      const spazio = telaio.closest<HTMLElement>('.panoramica__tavolo')!
      const altezza = Math.max(200, window.innerHeight - spazio.getBoundingClientRect().top - 48)
      impostaScalaOverview(Math.max(0.15,
        Math.min(1, spazio.clientWidth / telaio.offsetWidth, altezza / telaio.offsetHeight)))
    }
    const disegna = (): void => {
      const origine = telaio.getBoundingClientRect()
      const scala = origine.width / telaio.offsetWidth
      const risorse = telaio.querySelector<HTMLElement>('.panoramica__risorse')
      if (risorse) {
        const contenuto = telaio.closest<HTMLElement>('.contenuto')
        const limite = contenuto?.getBoundingClientRect().top ?? 0
        // La colonna segue la lettura, ma si ferma alla fine dello schema.
        const spostamento = Math.max(0, Math.min(
          (limite + 12 - origine.top) / scala - risorse.offsetTop,
          telaio.offsetHeight - risorse.offsetTop - risorse.offsetHeight - 16))
        // testo-fisso: trasformazione CSS della colonna
        risorse.style.transform = `translateY(${spostamento}px)`
      }
      const nodi = new Map([...telaio.querySelectorAll<HTMLElement>('[data-nodo]')]
        .map((nodo) => [nodo.dataset.nodo, nodo]))
      svg.setAttribute('width', String(telaio.scrollWidth))
      svg.setAttribute('height', String(telaio.scrollHeight))
      svg.replaceChildren()
      for (const [indice, legame] of collegamenti.entries()) {
        const da = nodi.get(legame.da)?.getBoundingClientRect()
        const a = nodi.get(legame.a)?.getBoundingClientRect()
        if (!da || !a) continue
        const colonna = nodi.get(legame.da)?.closest('.panoramica__colonna')
          ?.getBoundingClientRect()
        const versoDestra = a.left >= da.right
        const x1 = ((versoDestra ? da.right : da.left) - origine.left) / scala
        const x2 = ((versoDestra ? a.left : a.right) - origine.left) / scala
        const y1 = (da.top + da.height / 2 - origine.top) / scala
        const y2 = (a.top + a.height / 2 - origine.top) / scala
        const corsia = colonna
          ? ((versoDestra ? colonna.right : colonna.left) - origine.left) / scala +
            (versoDestra ? 1 : -1) * (8 + indice % 5 * 3)
          : (x1 + x2) / 2
        const linea = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        linea.setAttribute('d',
          `M ${x1} ${y1} H ${corsia} V ${y2} H ${x2}`)
        linea.setAttribute('class', `panoramica__filo panoramica__filo--${legame.tipo}`)
        linea.dataset.da = legame.da
        linea.dataset.a = legame.a
        svg.append(linea)
      }
    }
    ridisegna = disegna
    disegna()
    const aggiorna = (): void => {
      cancelAnimationFrame(fotogramma)
      fotogramma = requestAnimationFrame(disegna)
    }
    document.addEventListener('scroll', aggiorna, true)
    window.addEventListener('resize', aggiorna)
    scordaScorrimento = () => {
      document.removeEventListener('scroll', aggiorna, true)
      window.removeEventListener('resize', aggiorna)
    }
    osservatore = new ResizeObserver(disegna)
    osservatore.observe(telaio)
    for (const nodo of telaio.querySelectorAll('[data-nodo]')) osservatore.observe(nodo)
  })
}
