// Lo schema della panoramica con le linee fra i riquadri. Le linee seguono i
// riquadri reali: traduzioni e ridimensionamenti cambiano le misure, quindi si
// prendono a disegno fatto e si rifanno a ogni scorrimento e ridimensionamento.
//
// I riquadri delle risorse si riordinano per l'ultima relazione che li tocca:
// l'ordine è stato del componente (React sposta i nodi per chiave), e lo
// spostamento verticale che li tiene accanto ai loro fili è `transform`, scritto
// sul nodo a misura presa come prima.

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'

import { classi } from '#ui/classNames.js'

export interface CollegamentoOverview {
  da: string
  a: string
  tipo: string
}

/** Un riquadro di risorsa condivisa: uno solo per id, con tutte le porte che lo citano. */
export interface RisorsaOverview {
  id: string
  tipo: string
  etichetta: string
  contenuto: ReactNode
}

interface Filo {
  d: string
  tipo: string
  da: string
  a: string
}

interface Disegno {
  larghezza: number
  altezza: number
  fili: Filo[]
}

/** Il ridisegno in coda dopo uno scorrimento, di modulo perché il telaio possa scordarlo. */
let fotogramma = 0

/** Lasciando la panoramica: niente ridisegni in coda. Il resto lo pulisce il componente. */
export function scordaCollegamentiOverview (): void {
  cancelAnimationFrame(fotogramma)
  fotogramma = 0
}

/**
 * Misura lo schema montato: sposta le risorse accanto ai loro fili e calcola i
 * fili. Se l'ordine delle risorse va cambiato, torna solo quello: le misure si
 * prendono di nuovo a nodi spostati.
 */
function misura (
  telaio: HTMLElement, collegamenti: CollegamentoOverview[],
): { ordine: string[] } | { disegno: Disegno } {
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
      return { ordine: schede.map((s) => s.nodo.dataset.nodo!) }
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
  const fili: Filo[] = []
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
    // testo-fisso: tracciato SVG
    fili.push({ d: `M ${x1} ${y1} H ${corsia} V ${y2} H ${x2}`, tipo: legame.tipo, da: legame.da, a: legame.a })
  }
  return { disegno: { larghezza: telaio.scrollWidth, altezza: telaio.scrollHeight, fili } }
}

/** Il riquadro del nodo sotto l'evento, se c'è. */
function nodoDi (bersaglio: EventTarget | null): string | null {
  return bersaglio instanceof Element
    ? bersaglio.closest<HTMLElement>('[data-nodo]')?.dataset.nodo ?? null
    : null
}

/**
 * Lo schema: l'SVG dei fili in testa, poi le sezioni di `children`, poi le
 * risorse condivise. Passando su un riquadro (o col fuoco) si accendono i suoi fili.
 */
export function SchemaOverview ({ corsoId, collegamenti, risorse, titoloRisorse, children }: {
  corsoId: string
  collegamenti: CollegamentoOverview[]
  risorse: RisorsaOverview[]
  titoloRisorse: string
  children?: ReactNode
}): ReactElement {
  const telaio = useRef<HTMLDivElement | null>(null)
  const [ordine, impostaOrdine] = useState<string[] | null>(null)
  const [disegno, impostaDisegno] = useState<Disegno | null>(null)
  const [acceso, impostaAcceso] = useState<string | null>(null)
  const ultimi = useRef(collegamenti)
  const firma = useRef('')

  // Le misure di adesso: chiamata dopo il disegno e a ogni scorrimento.
  const rifai = useRef<() => void>(() => {})
  useLayoutEffect(() => {
    ultimi.current = collegamenti
    rifai.current = () => {
      const qui = telaio.current
      if (!qui?.isConnected) return
      const esito = misura(qui, ultimi.current)
      if ('ordine' in esito) {
        impostaOrdine(esito.ordine)
        return
      }
      const nuova = JSON.stringify(esito.disegno)
      if (nuova === firma.current) return
      firma.current = nuova
      impostaDisegno(esito.disegno)
    }
  })

  // A disegno fatto, e di nuovo al fotogramma: gli scorrimenti rimessi dopo il
  // disegno spostano il limite in alto delle risorse.
  useLayoutEffect(() => {
    rifai.current()
    cancelAnimationFrame(fotogramma)
    fotogramma = requestAnimationFrame(() => rifai.current())
  }, [collegamenti, ordine])

  useEffect(() => {
    const qui = telaio.current
    if (!qui) return
    const aggiorna = (): void => {
      cancelAnimationFrame(fotogramma)
      fotogramma = requestAnimationFrame(() => rifai.current())
    }
    document.addEventListener('scroll', aggiorna, true)
    window.addEventListener('resize', aggiorna)
    const osservatore = new ResizeObserver(() => rifai.current())
    osservatore.observe(qui)
    for (const nodo of qui.querySelectorAll('[data-nodo]')) osservatore.observe(nodo)
    return () => {
      document.removeEventListener('scroll', aggiorna, true)
      window.removeEventListener('resize', aggiorna)
      osservatore.disconnect()
      cancelAnimationFrame(fotogramma)
    }
  }, [collegamenti])

  const posto = (id: string): number => {
    const n = ordine?.indexOf(id) ?? -1
    return n < 0 ? Number.MAX_SAFE_INTEGER : n
  }
  const ordinate = ordine ? [...risorse].sort((a, b) => posto(a.id) - posto(b.id)) : risorse

  return (
    <div
      ref={telaio}
      className={classi('panoramica__schema', acceso && 'panoramica__schema--selezione')}
      data-schema-progettazione={corsoId}
      style={{ zoom: 1 }}
      onMouseOver={(e) => impostaAcceso(nodoDi(e.target))}
      onFocus={(e) => impostaAcceso(nodoDi(e.target))}
      onMouseLeave={() => impostaAcceso(null)}
      onBlur={(e) => impostaAcceso(nodoDi(e.relatedTarget))}
    >
      <svg
        className="panoramica__collegamenti"
        aria-hidden="true"
        width={disegno ? String(disegno.larghezza) : undefined}
        height={disegno ? String(disegno.altezza) : undefined}
      >
        {disegno?.fili.map((filo, indice) => (
          <path
            // Un filo è il legame e il suo posto: due porte possono legare gli stessi nodi.
            // testo-fisso: chiave del filo
            key={`${filo.da}>${filo.a}#${indice}`}
            d={filo.d}
            className={classi('panoramica__filo', `panoramica__filo--${filo.tipo}`,
              acceso && (filo.da === acceso || filo.a === acceso) && 'panoramica__filo--acceso')}
            data-da={filo.da}
            data-a={filo.a}
          />
        ))}
      </svg>
      {children}
      {ordinate.length
        ? (
            <section className="panoramica__risorse">
              <h3>{titoloRisorse}</h3>
              <div className="panoramica__griglia">
                {ordinate.map((voce) => (
                  <article
                    key={voce.id}
                    className={classi('panoramica__risorsa', `panoramica__nodo--${voce.tipo}`)}
                    data-nodo={voce.id}
                  >
                    <small>{voce.etichetta}</small>
                    {voce.contenuto}
                  </article>
                ))}
              </div>
            </section>
          )
        : null}
    </div>
  )
}
