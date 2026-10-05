// Il riquadro della mappa in React (ADR-56): tasselli, tragitti, segnaposti,
// scala. Serve alla pagina Mappa e alla mappa piccola nella scheda di una
// persona. Nella pagina Mappa inquadratura e cartellino aperto sopravvivono al
// cambio di pagina, come quando il riquadro lo teneva in vita la vista: stanno
// in una memoria di modulo per `chiave`. La mappa piccola riparte ogni volta
// dall'inquadratura di serie (`ricorda: false`), come ha sempre fatto.

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as EventoPuntatore,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'

import {
  barraScala,
  ingrandisci,
  inquadraturaPer,
  posizioneNelRiquadro,
  scriviDistanza,
  tasselliVisibili,
  tragitti,
  trascina,
  type Coordinate,
  type Inquadratura,
  type SegnoMappa,
  type Tragitto,
} from '#core/dominio/map.js'
import { classi } from '#ui/classNames.js'
import { testi } from '#ui/components/map.testi.js'
import { Icona } from './icons.js'

/** Quel che chi mette il riquadro può fargli fare da fuori (`comandi`). */
export interface ComandiMappa {
  /** Porta la mappa su un punto, ingrandendo almeno fino a `zoomMinimo`. */
  vaiA: (punto: Coordinate, zoomMinimo?: number) => void
  /** Rimette dentro tutti i punti. */
  inquadraTutto: () => void
  /** Apre — o chiude, con `null` — il cartellino di un segnaposto. */
  apri: (id: string | null) => void
  /** Dove sta guardando adesso. */
  dove: () => Inquadratura | null
  /** Il segnaposto col cartellino aperto, o `null`. */
  aperto: () => string | null
}

interface OpzioniMappa {
  /**
   * Che cosa guarda il riquadro (`mappa:pagina`, `mappa:allievo:<id>`): con
   * questa chiave si ritrovano inquadratura e cartellino tornando sulla pagina.
   */
  chiave: string
  /**
   * Se inquadratura e cartellino si ritrovano tornando (vero, di serie). Falso
   * per la mappa piccola della scheda personale: riparte inquadrando i punti.
   */
  ricorda?: boolean
  /** I punti da disegnare. */
  segni: readonly SegnoMappa[]
  /**
   * Il cartellino che si apre premendo un segnaposto, composto da chi usa il
   * riquadro; `null` lo lascia chiuso.
   */
  cartellino?: (segno: SegnoMappa) => ReactNode
  /** Se si può trascinare e ingrandire con la rotellina (anche nella mappa piccola). */
  gesti?: boolean
  /** Quanti pixel di margine lascia l'inquadratura automatica attorno ai punti. */
  margine?: number
  /** Dove guardare all'apertura, quando lo si sa già da fuori. */
  inquadratura?: Inquadratura | null
  /** Avvisa chi usa il riquadro che l'inquadratura è cambiata: la si ricorda. */
  alloSpostamento?: (inquadratura: Inquadratura) => void
  /**
   * Quale segnaposto è aperto. Si legge all'apertura e ogni volta che cambia:
   * una scheda cambiata chiude il cartellino da fuori.
   */
  aperto?: string | null
  /** Avvisa quando si apre o si chiude un cartellino. */
  allApertura?: (id: string | null) => void
  comandi?: Ref<ComandiMappa>
}

/** Quel che il riquadro ricorda di sé fra una visita e l'altra. */
interface Memoria {
  inquadratura: Inquadratura | null
  /**
   * Su che cosa era stata fatta l'inquadratura automatica: se cambia, si rifà.
   * Un'inquadratura data da fuori vale per i punti di adesso: non si rifà.
   */
  inquadratoSu: string
  apertoId: string | null
}

const memorie = new Map<string, Memoria>()

/** Che punti ci sono: la chiave dice se l'inquadratura va rifatta. */
function chiaveDi (segni: readonly SegnoMappa[]): string {
  return segni.map((segno) => segno.id).join('|')
}

/** La figura dentro la punta: è lei a dire che posto è. */
function simboloDi (segno: SegnoMappa): 'casa' | 'azienda' | 'classi' {
  if (segno.genere === 'sede') return 'classi'
  return segno.genere === 'lavoro' ? 'azienda' : 'casa'
}

export function RiquadroMappa (opzioni: OpzioniMappa): ReactElement {
  const { chiave, segni } = opzioni
  const ricorda = opzioni.ricorda !== false
  const tela = useRef<HTMLDivElement | null>(null)

  const [iniziale] = useState<Memoria>(() => {
    const ricordata = ricorda ? memorie.get(chiave) : undefined
    const inquadratura = ricordata?.inquadratura ?? opzioni.inquadratura ?? null
    return {
      inquadratura,
      inquadratoSu: ricordata?.inquadratoSu ?? (inquadratura ? chiaveDi(segni) : ''),
      apertoId: opzioni.aperto !== undefined ? opzioni.aperto : ricordata?.apertoId ?? null,
    }
  })
  const [inquadratura, impostaInquadratura] = useState(iniziale.inquadratura)
  const [apertoId, impostaApertoId] = useState(iniziale.apertoId)
  const inquadratoSu = useRef(iniziale.inquadratoSu)
  const [misura, impostaMisura] = useState({ larghezza: 0, altezza: 0 })

  // Il segnaposto aperto deciso da fuori, quando cambia.
  const [apertoDaFuori, impostaApertoDaFuori] = useState(opzioni.aperto)
  if (opzioni.aperto !== apertoDaFuori) {
    impostaApertoDaFuori(opzioni.aperto)
    if (opzioni.aperto !== undefined) impostaApertoId(opzioni.aperto)
  }

  /**
   * Il collegamento sotto il mouse (passa e va) e quello scelto con un clic
   * (resta, e smorza il resto della carta). Anche un segnaposto sotto il mouse
   * accende tutte le righe che lo toccano.
   */
  const [sottoMano, impostaSottoMano] = useState<string | null>(null)
  const [segnoSottoMano, impostaSegnoSottoMano] = useState<string | null>(null)
  const [sceltoId, impostaSceltoId] = useState<string | null>(null)
  const [inMano, impostaInMano] = useState(false)

  /** Se la mano ha spostato la carta: il clic che chiude un trascinamento non sceglie. */
  const trascinato = useRef(false)
  const ultimo = useRef<{ x: number, y: number } | null>(null)

  // Le letture dei gesti e dei comandi, sempre quelle dell'ultimo disegno.
  const ora = useRef({ inquadratura, apertoId, segni, opzioni })
  useLayoutEffect(() => {
    ora.current = { inquadratura, apertoId, segni, opzioni }
    if (ricorda) memorie.set(chiave, { inquadratura, inquadratoSu: inquadratoSu.current, apertoId })
  })

  const sposta = useCallback((nuova: Inquadratura) => {
    ora.current.inquadratura = nuova
    impostaInquadratura(nuova)
    ora.current.opzioni.alloSpostamento?.(nuova)
  }, [])

  const apri = useCallback((id: string | null) => {
    ora.current.apertoId = id
    impostaApertoId(id)
    ora.current.opzioni.allApertura?.(id)
  }, [])

  useImperativeHandle(opzioni.comandi, () => ({
    vaiA: (punto, zoomMinimo = 15) => {
      // Scelta da chi guarda, anche a riquadro non ancora misurato: la prima
      // misura non la rimpiazza con l'inquadratura automatica.
      inquadratoSu.current = chiaveDi(ora.current.segni)
      sposta({
        centro: { lat: punto.lat, lon: punto.lon },
        zoom: Math.max(ora.current.inquadratura?.zoom ?? zoomMinimo, zoomMinimo),
      })
    },
    inquadraTutto: () => {
      const attuali = ora.current.segni
      const elemento = tela.current
      if (attuali.length === 0 || !elemento) return
      inquadratoSu.current = chiaveDi(attuali)
      sposta(inquadraturaPer(attuali, elemento.clientWidth, elemento.clientHeight, {
        margine: ora.current.opzioni.margine,
      }))
    },
    apri,
    dove: () => ora.current.inquadratura,
    aperto: () => ora.current.apertoId,
  }))

  // Le misure si sanno solo a riquadro messo nella pagina: il primo disegno e
  // ogni cambio di larghezza passano di qui.
  useLayoutEffect(() => {
    const elemento = tela.current
    if (!elemento) return
    const misura = () => impostaMisura((prima) =>
      prima.larghezza === elemento.clientWidth && prima.altezza === elemento.clientHeight
        ? prima
        : { larghezza: elemento.clientWidth, altezza: elemento.clientHeight })
    misura()
    const osservatore = new ResizeObserver(misura)
    osservatore.observe(elemento)
    return () => osservatore.disconnect()
  }, [])

  // Sui punti di adesso: se sono cambiati (un'altra scheda, un indirizzo
  // trovato) si rifà l'inquadratura, altrimenti resta quella di chi guarda.
  const punti = chiaveDi(segni)
  useLayoutEffect(() => {
    if (misura.larghezza === 0 || misura.altezza === 0) return
    if (inquadratura && inquadratoSu.current === punti) return
    inquadratoSu.current = punti
    impostaInquadratura(inquadraturaPer(ora.current.segni, misura.larghezza, misura.altezza, {
      margine: ora.current.opzioni.margine,
    }))
  }, [misura, punti, inquadratura])

  // La rotellina ingrandisce: un ascoltatore non passivo, che React non sa mettere.
  const gesti = opzioni.gesti !== false
  useEffect(() => {
    const elemento = tela.current
    if (!elemento || !gesti) return
    const allaRotella = (evento: WheelEvent) => {
      const adesso = ora.current.inquadratura
      if (!adesso) return
      evento.preventDefault()
      const riquadro = elemento.getBoundingClientRect()
      sposta(ingrandisci(
        adesso,
        evento.deltaY < 0 ? 1 : -1,
        { x: evento.clientX - riquadro.left, y: evento.clientY - riquadro.top },
        elemento.clientWidth,
        elemento.clientHeight,
      ))
    }
    elemento.addEventListener('wheel', allaRotella, { passive: false })
    return () => elemento.removeEventListener('wheel', allaRotella)
  }, [gesti, sposta])

  const { larghezza, altezza } = misura
  const pronta = inquadratura !== null && larghezza > 0 && altezza > 0
  const collegamenti: Tragitto[] = pronta ? tragitti(segni) : []
  // Una riga scelta che non c'è più lascerebbe la carta smorzata attorno al nulla.
  const scelto = sceltoId !== null && collegamenti.some((via) => via.id === sceltoId) ? sceltoId : null

  /** Che cosa è acceso adesso: le righe in rilievo, e i punti ai loro capi. */
  const righe = new Set<string>()
  const capi = new Set<string>()
  for (const via of collegamenti) {
    const acceso =
      via.id === scelto ||
      via.id === sottoMano ||
      via.daId === segnoSottoMano ||
      via.aId === segnoSottoMano
    if (!acceso) continue
    righe.add(via.id)
    capi.add(via.daId)
    capi.add(via.aId)
  }

  const molla = (evento: EventoPuntatore<HTMLDivElement>) => {
    if (!ultimo.current) return
    ultimo.current = null
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
      evento.currentTarget.releasePointerCapture(evento.pointerId)
    }
    impostaInMano(false)
  }

  return (
    <div
      ref={tela}
      className={classi('mappa__tela', scelto !== null && 'mappa__tela--isolata', inMano && 'mappa__tela--in-mano')}
      onPointerDown={gesti
        ? (evento) => {
            if (evento.button !== 0) return
            // Un clic su un segnaposto o dentro un cartellino non è un trascinamento.
            if ((evento.target as HTMLElement).closest('.mappa__segno')) return
            ultimo.current = { x: evento.clientX, y: evento.clientY }
            trascinato.current = false
            evento.currentTarget.setPointerCapture(evento.pointerId)
            impostaInMano(true)
          }
        : undefined}
      onPointerMove={gesti
        ? (evento) => {
            const da = ultimo.current
            const adesso = ora.current.inquadratura
            if (!da || !adesso) return
            const dx = evento.clientX - da.x
            const dy = evento.clientY - da.y
            if (Math.abs(dx) + Math.abs(dy) > 0) trascinato.current = true
            ultimo.current = { x: evento.clientX, y: evento.clientY }
            sposta(trascina(adesso, dx, dy))
          }
        : undefined}
      onPointerUp={gesti ? molla : undefined}
      onPointerCancel={gesti ? molla : undefined}
      // Il clic prende un collegamento o molla quel che era aperto. Fuori dai gesti,
      // perché scegliere è una lettura e vale anche nel riquadro piccolo. Il clic che
      // chiude un trascinamento non sceglie.
      onClick={(evento) => {
        if (trascinato.current) return
        const bersaglio = evento.target instanceof Element ? evento.target : null
        const riga = bersaglio?.closest<SVGGElement>('[data-tragitto]')
        if (riga) {
          const id = riga.dataset.tragitto ?? null
          impostaSceltoId(id === scelto ? null : id)
          return
        }
        if (bersaglio?.closest('.mappa__segno')) return
        if (scelto !== null) impostaSceltoId(null)
        if (ora.current.apertoId !== null) apri(null)
      }}
      // Uscendo dal riquadro si toglie il rilievo di passaggio: se un ridisegno ha
      // rimosso l'elemento sotto il mouse, il suo `pointerleave` non arriva.
      onPointerLeave={() => {
        impostaSottoMano(null)
        impostaSegnoSottoMano(null)
      }}
    >
      <div className="mappa__tasselli">
        {pronta
          ? tasselliVisibili(inquadratura, larghezza, altezza).map((tassello) => {
              const nome = `${tassello.z}/${tassello.x}/${tassello.y}`
              return (
                <img
                  key={nome}
                  className="mappa__tassello"
                  src={`registro://mappa/${nome}.png`}
                  alt=""
                  loading="eager"
                  draggable="false"
                  data-tassello={nome}
                  style={{ left: `${tassello.sinistra}px`, top: `${tassello.sopra}px` }} // testo-fisso: misura CSS
                />
              )
            })
          : null}
      </div>
      <svg
        className="mappa__tragitti"
        viewBox={pronta ? `0 0 ${larghezza} ${altezza}` : '0 0 100 100'}
        aria-hidden="true"
        focusable="false"
      >
        {pronta
          ? collegamenti.map((via) => (
              <Collegamento
                key={via.id}
                via={via}
                da={posizioneNelRiquadro(via.da, inquadratura, larghezza, altezza)}
                a={posizioneNelRiquadro(via.a, inquadratura, larghezza, altezza)}
                acceso={righe.has(via.id)}
                scelto={via.id === scelto}
                entra={() => impostaSottoMano(via.id)}
                esce={() => impostaSottoMano((prima) => prima === via.id ? null : prima)}
              />
            ))
          : null}
      </svg>
      <div className="mappa__segni">
        {pronta
          // Chi sta più in basso si disegna dopo: davanti c'è il più vicino all'occhio.
          ? [...segni].sort((a, b) => b.lat - a.lat).map((segno) => {
              const dove = posizioneNelRiquadro(segno, inquadratura, larghezza, altezza)
              if (dove.x < -60 || dove.y < -60 || dove.x > larghezza + 60 || dove.y > altezza + 60) return null
              const aperto = apertoId === segno.id
              return (
                <div
                  key={segno.id}
                  className={classi(
                    'mappa__segno',
                    `mappa__segno--${segno.genere}`, // testo-fisso: classe CSS
                    aperto && 'mappa__segno--aperto',
                    capi.has(segno.id) && 'mappa__segno--acceso',
                  )}
                  style={{ left: `${dove.x}px`, top: `${dove.y}px` }} // testo-fisso: misura CSS
                  data-segno={segno.id}
                >
                  <button
                    className="mappa__punta"
                    type="button"
                    style={segno.colore ? { color: segno.colore } : undefined}
                    title={`${segno.titolo} — ${segno.indirizzo}`}
                    onClick={(evento) => {
                      evento.stopPropagation()
                      apri(aperto ? null : segno.id)
                    }}
                    // Il mouse su un punto accende i tragitti che partono di lì.
                    onPointerEnter={() => impostaSegnoSottoMano(segno.id)}
                    onPointerLeave={() => impostaSegnoSottoMano((prima) => prima === segno.id ? null : prima)}
                  >
                    <Icona nome={simboloDi(segno)} />
                  </button>
                  {aperto ? opzioni.cartellino?.(segno) ?? null : null}
                </div>
              )
            })
          : null}
      </div>
      <Scala inquadratura={pronta ? inquadratura : null} />
      {/* OpenStreetMap chiede che si dica di chi sono le carte, sulla mappa stessa. */}
      <span className="mappa__credito">© OpenStreetMap</span>
    </div>
  )
}

/** La barra della scala, vuota finché il riquadro non è misurato. */
function Scala ({ inquadratura }: { inquadratura: Inquadratura | null }): ReactElement {
  if (!inquadratura) return <div className="mappa__scala" />
  const misura = barraScala(inquadratura)
  return <div className="mappa__scala" style={{ width: `${misura.pixel}px` }}>{misura.testo}</div> // testo-fisso: misura CSS
}

/**
 * Una riga fra una casa e un posto di lavoro, in tre pezzi: quella visibile,
 * sottile e tratteggiata; una presa larga e trasparente che il mouse trova; il
 * nome, che compare solo a riga accesa.
 */
function Collegamento ({ via, da, a, acceso, scelto, entra, esce }: {
  via: Tragitto
  da: { x: number, y: number }
  a: { x: number, y: number }
  acceso: boolean
  scelto: boolean
  entra: () => void
  esce: () => void
}): ReactElement {
  const capi = { x1: da.x, y1: da.y, x2: a.x, y2: a.y }
  return (
    <g
      className={classi(
        'mappa__collegamento',
        acceso && 'mappa__collegamento--acceso',
        scelto && 'mappa__collegamento--scelto',
      )}
      data-tragitto={via.id}
    >
      <line {...capi} className="mappa__tragitto" stroke={via.colore || undefined} />
      <text
        className="mappa__tragitto-nome"
        x={(da.x + a.x) / 2}
        y={(da.y + a.y) / 2}
        dy="-6"
        textAnchor="middle"
      >
        {`${via.chi} · ${scriviDistanza(via.km)}`}
      </text>
      <line {...capi} className="mappa__tragitto-presa" onPointerEnter={entra} onPointerLeave={esce}>
        <title>{testi().tragitto(via.chi, scriviDistanza(via.km))}</title>
      </line>
    </g>
  )
}
