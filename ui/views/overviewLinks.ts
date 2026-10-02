// Le linee seguono i riquadri reali: traduzioni e ridimensionamenti cambiano le misure.
let osservatore: ResizeObserver | null = null
let fotogramma = 0
let scordaScorrimento: (() => void) | null = null

export function scordaCollegamentiOverview (): void {
  osservatore?.disconnect()
  osservatore = null
  scordaScorrimento?.()
  scordaScorrimento = null
  cancelAnimationFrame(fotogramma)
}

export interface CollegamentoOverview {
  da: string
  a: string
  tipo: string
}

export function posaCollegamentiOverview (collegamenti: CollegamentoOverview[]): void {
  scordaCollegamentiOverview()
  fotogramma = requestAnimationFrame(() => {
    // Idiomorph può aver mantenuto il telaio precedente: si cerca quello montato.
    const telaio = document.querySelector<HTMLElement>('[data-schema-progettazione]')
    const svg = telaio?.querySelector('svg')
    if (!telaio || !svg) return
    telaio.style.zoom = '1'
    const disegna = (): void => {
      const origine = telaio.getBoundingClientRect()
      const scala = origine.width / telaio.offsetWidth
      const nodi = new Map([...telaio.querySelectorAll<HTMLElement>('[data-nodo]')]
        .map((nodo) => [nodo.dataset.nodo, nodo]))
      const risorse = telaio.querySelector<HTMLElement>('.panoramica__risorse')
      if (risorse) {
        const contenuto = telaio.closest<HTMLElement>('.contenuto')
        const limite = contenuto?.getBoundingClientRect().top ?? 0
        risorse.style.transform = ''
        const ultimaRelazione = (id: string, visitati = new Set<string>()): number => {
          if (visitati.has(id)) return 0
          visitati.add(id)
          return Math.max(0, ...collegamenti.filter((c) => c.a === id).map((c) => {
            const sorgente = nodi.get(c.da)
            if (!sorgente) return 0
            if (sorgente.closest('.panoramica__risorse')) {
              return ultimaRelazione(c.da, new Set(visitati))
            }
            return (sorgente.getBoundingClientRect().bottom - origine.top) / scala
          }))
        }
        const schede = [...risorse.querySelectorAll<HTMLElement>('.panoramica__risorsa')]
          .map((nodo) => ({ nodo, fine: ultimaRelazione(nodo.dataset.nodo!) }))
          .sort((a, b) => a.fine - b.fine)
        const griglia = risorse.querySelector('.panoramica__griglia')!
        if (schede.some((s, i) => griglia.children[i] !== s.nodo)) {
          griglia.append(...schede.map((s) => s.nodo))
        }
        const posizioni = schede.map(({ nodo, fine }) => {
          nodo.style.transform = ''
          const rettangolo = nodo.getBoundingClientRect()
          const inizio = (rettangolo.top - origine.top) / scala
          const altezza = rettangolo.height / scala
          return { nodo, inizio, altezza, fine: Math.max(inizio, fine - altezza) }
        })
        // Le risorse con la stessa ultima relazione restano separate.
        for (let i = posizioni.length - 2; i >= 0; i--) {
          posizioni[i].fine = Math.max(posizioni[i].inizio,
            Math.min(posizioni[i].fine, posizioni[i + 1].fine - posizioni[i].altezza - 16))
        }
        let precedente = 0
        for (const p of posizioni) {
          const posizione = Math.min(p.fine,
            Math.max(p.inizio, (limite + 12 - origine.top) / scala, precedente))
          // testo-fisso: trasformazione CSS del riquadro
          p.nodo.style.transform = `translateY(${posizione - p.inizio}px)`
          precedente = posizione + p.altezza + 16
        }
      }
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
