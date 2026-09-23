// Il riquadro della mappa: tasselli, tragitti, segnaposti, scala.
//
// Sta fra i componenti e non dentro la pagina Mappa perché di mappe ce ne sono
// due: quella grande, che è una pagina, e quella piccola nella scheda di una
// persona — casa, azienda, scuola, e le due righe che le uniscono. Sono la
// stessa cosa disegnata in due misure, e finché il disegno viveva dentro la
// vista la seconda avrebbe voluto dire copiarlo.
//
// Ogni riquadro tiene il **suo** stato — dove guarda, quanto è ingrandito, che
// cartellino è aperto — dentro la chiusura che lo costruisce: due mappe nella
// stessa pagina non si spostano a vicenda. Quel che invece non tiene sono i
// dati: i punti li rilegge a ogni disegno chiamando `segni()`, così un
// salvataggio arrivato nel frattempo si vede senza ricostruire niente.
//
// Il disegno è imperativo, contro l'abitudine del resto del pannello, e per una
// ragione sola: qui si ridisegna a ogni pixel di trascinamento, e rifare
// l'albero della vista a ogni movimento del mouse è la differenza fra una mappa
// che segue la mano e una che arranca.

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
} from '../../domain/map.js'
import { h, svg, type Figlio } from '../dom.js'
import { icona } from './icons.js'

interface OpzioniMappa {
  /** I punti da disegnare, riletti a ogni disegno. */
  segni: () => SegnoMappa[]
  /**
   * Il cartellino che si apre premendo un segnaposto.
   *
   * Lo compone chi usa il riquadro, perché è lì che cambia: nella pagina elenca
   * tutti quelli che stanno a quell'indirizzo e porta alle loro schede; nella
   * scheda di una persona basta dire che posto è. Tornando `null` il
   * segnaposto resta un segnaposto e non si apre niente.
   */
  cartellino?: (segno: SegnoMappa) => Figlio
  /**
   * Se si può trascinare e ingrandire con la rotellina.
   *
   * La mappa piccola di una scheda si lascia muovere: è un riquadro di dieci
   * centimetri, e la prima cosa che si fa è avvicinarsi per vedere la via.
   */
  gesti?: boolean
  /**
   * Quanti pixel di margine lascia l'inquadratura automatica attorno ai punti.
   *
   * Nel riquadro piccolo un margine da pagina intera vorrebbe dire quattro
   * segnaposti stretti in mezzo e tutto il resto vuoto.
   */
  margine?: number
  /** Dove guardare all'apertura, quando lo si sa già da fuori. */
  inquadratura?: Inquadratura | null
  /** Avvisa chi usa il riquadro che l'inquadratura è cambiata: la si ricorda. */
  alloSpostamento?: (inquadratura: Inquadratura) => void
  /** Quale segnaposto nasce già aperto. */
  aperto?: string | null
  /** Avvisa quando si apre o si chiude un cartellino. */
  allApertura?: (id: string | null) => void
}

/** Quel che chi costruisce un riquadro può fargli fare da fuori. */
export interface Riquadro {
  elemento: HTMLElement
  /** Rifà il disegno con i dati di adesso. */
  ridisegna: () => void
  /** Porta la mappa su un punto, ingrandendo almeno fino a `zoomMinimo`. */
  vaiA: (punto: Coordinate, zoomMinimo?: number) => void
  /** Rimette dentro tutti i punti. */
  inquadraTutto: () => void
  /** Apre — o chiude, con `null` — il cartellino di un segnaposto. */
  apri: (id: string | null) => void
  /** Dove sta guardando adesso. */
  dove: () => Inquadratura | null
}

/** Un nodo SVG con i suoi attributi: `h` non va bene, qui il namespace è un altro. */
function nodoSvg<K extends keyof SVGElementTagNameMap> (
  tag: K,
  attributi: Record<string, string> = {},
): SVGElementTagNameMap[K] {
  const nodo = document.createElementNS('http://www.w3.org/2000/svg', tag)
  for (const [nome, valore] of Object.entries(attributi)) nodo.setAttribute(nome, valore)
  return nodo
}

/** La figura dentro la punta: è lei a dire che posto è. */
function simboloDi (segno: SegnoMappa): 'casa' | 'azienda' | 'classi' {
  if (segno.genere === 'sede') return 'classi'
  return segno.genere === 'lavoro' ? 'azienda' : 'casa'
}

export function riquadroMappa (opzioni: OpzioniMappa): Riquadro {
  let inquadratura: Inquadratura | null = opzioni.inquadratura ?? null
  /** Su che cosa era stata fatta l'inquadratura automatica: se cambia, si rifà. */
  let inquadratoSu = ''
  let apertoId: string | null = opzioni.aperto ?? null

  /**
   * Che collegamento sta sotto il mouse, e quale è stato scelto con un clic.
   *
   * Sono due cose diverse e vivono insieme. Il primo passa e va via: serve a
   * dire «questa riga è una sola, e va da questa casa a quella ditta», che
   * guardando venti tratteggi incrociati non si vede. Il secondo resta, e
   * smorza tutto il resto della carta finché non lo si molla: è la domanda
   * «di questo tragitto, che strada è» fatta a una mappa piena.
   *
   * Accende anche un segnaposto sotto il mouse, con tutte le righe che lo
   * toccano: da una casa la domanda è dove va chi ci abita, e puntare la casa
   * è più facile che trovare il capo giusto di una riga.
   */
  let sottoMano: string | null = null
  let segnoSottoMano: string | null = null
  let sceltoId: string | null = null

  /** I tragitti dell'ultimo disegno: li rileggono il rilievo e la scelta. */
  let collegamenti: Tragitto[] = []

  /** Se la mano ha spostato la carta: il clic che chiude un trascinamento non sceglie. */
  let trascinato = false

  const elemento = h(
    'div',
    { class: 'mappa__tela' },
    h('div', { class: 'mappa__tasselli' }),
    svg('0 0 100 100', '', 'mappa__tragitti'),
    h('div', { class: 'mappa__segni' }),
    h('div', { class: 'mappa__scala' }),
    // OpenStreetMap si può usare così com'è, gratis, e in cambio chiede che si
    // dica di chi sono le carte. Sta scritto sulla mappa e non nella guida
    // perché è lì che vale.
    h('span', { class: 'mappa__credito' }, '© OpenStreetMap'),
  )

  const fondo = elemento.querySelector<HTMLElement>('.mappa__tasselli') as HTMLElement
  const sopra = elemento.querySelector<HTMLElement>('.mappa__segni') as HTMLElement
  const linee = elemento.querySelector<SVGSVGElement>('.mappa__tragitti') as SVGSVGElement
  const scala = elemento.querySelector<HTMLElement>('.mappa__scala') as HTMLElement

  /** Che punti ci sono adesso: la chiave dice se l'inquadratura va rifatta. */
  function chiaveDi (segni: readonly SegnoMappa[]): string {
    return segni.map((segno) => segno.id).join('|')
  }

  function disegna (segni: SegnoMappa[]): void {
    const larghezza = elemento.clientWidth
    const altezza = elemento.clientHeight
    if (!inquadratura || larghezza === 0 || altezza === 0) return

    // ----------------------------------------------------------- i tasselli
    const voluti = tasselliVisibili(inquadratura, larghezza, altezza)
    const gia = new Map<string, HTMLImageElement>()
    for (const immagine of Array.from(fondo.querySelectorAll('img'))) {
      gia.set(immagine.dataset.tassello ?? '', immagine)
    }
    const restano = new Set<string>()
    for (const tassello of voluti) {
      const chiave = `${tassello.z}/${tassello.x}/${tassello.y}`
      restano.add(chiave)
      const immagine =
        gia.get(chiave) ??
        h('img', {
          class: 'mappa__tassello',
          src: `registro://mappa/${chiave}.png`,
          alt: '',
          attr: { loading: 'eager', draggable: 'false' },
          dataset: { tassello: chiave },
        })
      immagine.style.left = `${tassello.sinistra}px`
      immagine.style.top = `${tassello.sopra}px`
      if (!immagine.isConnected) fondo.appendChild(immagine)
    }
    // Quel che è uscito dal riquadro se ne va: trascinando per un minuto si
    // accumulerebbero centinaia di immagini fuori vista.
    for (const [chiave, immagine] of gia) {
      if (!restano.has(chiave)) immagine.remove()
    }

    // ----------------------------------------------------------- i tragitti
    linee.setAttribute('viewBox', `0 0 ${larghezza} ${altezza}`)
    linee.innerHTML = ''
    collegamenti = tragitti(segni)
    // Una riga scelta che non c'è più — gli strati sono cambiati, o
    // l'indirizzo — lascerebbe la carta smorzata attorno al nulla.
    if (sceltoId && !collegamenti.some((via) => via.id === sceltoId)) sceltoId = null
    for (const via of collegamenti) {
      linee.appendChild(
        collegamento(
          via,
          posizioneNelRiquadro(via.da, inquadratura, larghezza, altezza),
          posizioneNelRiquadro(via.a, inquadratura, larghezza, altezza),
        ),
      )
    }

    // --------------------------------------------------------- i segnaposti
    sopra.innerHTML = ''
    // Chi sta più in basso si disegna dopo: così i segnaposti si sovrappongono
    // come li vedrebbe l'occhio, e quello davanti è il più vicino a chi guarda.
    const ordinati = [...segni].sort((a, b) => b.lat - a.lat)
    for (const segno of ordinati) {
      const dove = posizioneNelRiquadro(segno, inquadratura, larghezza, altezza)
      if (dove.x < -60 || dove.y < -60 || dove.x > larghezza + 60 || dove.y > altezza + 60) continue
      sopra.appendChild(segnaposto(segno, dove))
    }

    // ------------------------------------------------------------- la scala
    const misura = barraScala(inquadratura)
    scala.style.width = `${misura.pixel}px`
    scala.textContent = misura.testo

    // Il disegno è nuovo, il rilievo è quello di prima: si rimette addosso a
    // quel che è appena stato costruito.
    applicaRilievo()
  }

  /**
   * Una riga fra una casa e un posto di lavoro, in tre pezzi.
   *
   * Quella che si vede è sottile e tratteggiata, perché su una carta piena ce
   * ne sono venti e devono lasciar leggere le strade sotto. Sopra ci sta una
   * riga larga e trasparente, ed è quella che il mouse incontra davvero: due
   * pixel tratteggiati non si centrano, e una riga che si prende solo per caso
   * è come se non si prendesse. Il nome compare quando la riga è accesa —
   * venti nomi sempre scritti sarebbero un groviglio peggiore delle righe.
   */
  function collegamento (
    via: Tragitto,
    da: { x: number; y: number },
    a: { x: number; y: number },
  ): SVGGElement {
    const capi = { x1: String(da.x), y1: String(da.y), x2: String(a.x), y2: String(a.y) }
    const gruppo = nodoSvg('g', { class: 'mappa__collegamento' })
    gruppo.dataset.tragitto = via.id

    const riga = nodoSvg('line', { ...capi, class: 'mappa__tragitto' })
    if (via.colore) riga.setAttribute('stroke', via.colore)

    const nome = nodoSvg('text', {
      class: 'mappa__tragitto-nome',
      x: String((da.x + a.x) / 2),
      y: String((da.y + a.y) / 2),
      dy: '-6',
      'text-anchor': 'middle',
    })
    nome.textContent = `${via.chi} · ${scriviDistanza(via.km)}`

    const presa = nodoSvg('line', { ...capi, class: 'mappa__tragitto-presa' })
    const spiega = nodoSvg('title')
    spiega.textContent = `${via.chi}: da casa al posto di lavoro, ${scriviDistanza(via.km)}`
    presa.appendChild(spiega)
    presa.addEventListener('pointerenter', () => {
      sottoMano = via.id
      applicaRilievo()
    })
    presa.addEventListener('pointerleave', () => {
      if (sottoMano !== via.id) return
      sottoMano = null
      applicaRilievo()
    })

    gruppo.append(riga, nome, presa)
    return gruppo
  }

  /** Che cosa è acceso adesso: le righe in rilievo, e i punti ai loro capi. */
  function inRilievo (): { righe: Set<string>; capi: Set<string> } {
    const righe = new Set<string>()
    const capi = new Set<string>()
    for (const via of collegamenti) {
      const acceso =
        via.id === sceltoId ||
        via.id === sottoMano ||
        via.daId === segnoSottoMano ||
        via.aId === segnoSottoMano
      if (!acceso) continue
      righe.add(via.id)
      capi.add(via.daId)
      capi.add(via.aId)
    }
    return { righe, capi }
  }

  /**
   * Accende e smorza, senza rifare il disegno.
   *
   * Passare da `ridisegna()` vorrebbe dire rifare tasselli e segnaposti a ogni
   * riga che il mouse sfiora. Qui si toccano le classi di quel che c'è già, e
   * il resto — il tratto pieno, il nome, la carta smorzata — lo dice il
   * foglio di stile.
   */
  function applicaRilievo (): void {
    const { righe, capi } = inRilievo()
    elemento.classList.toggle('mappa__tela--isolata', sceltoId !== null)
    for (const gruppo of Array.from(linee.querySelectorAll<SVGGElement>('[data-tragitto]'))) {
      const id = gruppo.dataset.tragitto ?? ''
      gruppo.classList.toggle('mappa__collegamento--acceso', righe.has(id))
      gruppo.classList.toggle('mappa__collegamento--scelto', id === sceltoId)
    }
    for (const punto of Array.from(sopra.querySelectorAll<HTMLElement>('[data-segno]'))) {
      punto.classList.toggle('mappa__segno--acceso', capi.has(punto.dataset.segno ?? ''))
    }
  }

  /** Sceglie un collegamento — o lo molla, se era già quello scelto. */
  function scegli (id: string | null): void {
    sceltoId = id === sceltoId ? null : id
    applicaRilievo()
  }

  function segnaposto (segno: SegnoMappa, dove: { x: number; y: number }): HTMLElement {
    const aperto = apertoId === segno.id
    const contenuto = aperto ? opzioni.cartellino?.(segno) ?? null : null
    return h(
      'div',
      {
        class: ['mappa__segno', `mappa__segno--${segno.genere}`, aperto && 'mappa__segno--aperto'],
        style: { left: `${dove.x}px`, top: `${dove.y}px` },
        dataset: { segno: segno.id },
      },
      h(
        'button',
        {
          class: 'mappa__punta',
          type: 'button',
          style: segno.colore ? { color: segno.colore } : undefined,
          attr: { title: `${segno.titolo} — ${segno.indirizzo}` },
          onclick: (evento: Event) => {
            evento.stopPropagation()
            apri(aperto ? null : segno.id)
          },
          // Il mouse su un punto accende i tragitti che partono di lì: è il
          // modo di chiedere «chi sta qui, dove va?» senza premere niente.
          onpointerenter: () => {
            segnoSottoMano = segno.id
            applicaRilievo()
          },
          onpointerleave: () => {
            if (segnoSottoMano !== segno.id) return
            segnoSottoMano = null
            applicaRilievo()
          },
        },
        icona(simboloDi(segno)),
      ),
      contenuto,
    )
  }

  function ridisegna (): void {
    disegna(opzioni.segni())
  }

  function apri (id: string | null): void {
    apertoId = id
    opzioni.allApertura?.(id)
    ridisegna()
  }

  function sposta (nuova: Inquadratura): void {
    inquadratura = nuova
    opzioni.alloSpostamento?.(nuova)
    ridisegna()
  }

  function vaiA (punto: Coordinate, zoomMinimo = 15): void {
    sposta({
      centro: { lat: punto.lat, lon: punto.lon },
      zoom: Math.max(inquadratura?.zoom ?? zoomMinimo, zoomMinimo),
    })
  }

  function inquadraTutto (): void {
    const segni = opzioni.segni()
    if (segni.length === 0) return
    inquadratoSu = chiaveDi(segni)
    sposta(
      inquadraturaPer(segni, elemento.clientWidth, elemento.clientHeight, {
        margine: opzioni.margine,
      }),
    )
  }

  // ---------------------------------------------------------------- i gesti

  if (opzioni.gesti !== false) {
    let ultimo: { x: number; y: number } | null = null

    elemento.addEventListener('pointerdown', (evento) => {
      if (evento.button !== 0) return
      // Un clic su un segnaposto o dentro un cartellino non è un trascinamento.
      if ((evento.target as HTMLElement).closest('.mappa__segno')) return
      ultimo = { x: evento.clientX, y: evento.clientY }
      trascinato = false
      elemento.setPointerCapture(evento.pointerId)
      elemento.classList.add('mappa__tela--in-mano')
    })

    elemento.addEventListener('pointermove', (evento) => {
      if (!ultimo || !inquadratura) return
      const dx = evento.clientX - ultimo.x
      const dy = evento.clientY - ultimo.y
      if (Math.abs(dx) + Math.abs(dy) > 0) trascinato = true
      ultimo = { x: evento.clientX, y: evento.clientY }
      sposta(trascina(inquadratura, dx, dy))
    })

    const molla = (evento: PointerEvent) => {
      if (!ultimo) return
      ultimo = null
      if (elemento.hasPointerCapture(evento.pointerId)) {
        elemento.releasePointerCapture(evento.pointerId)
      }
      elemento.classList.remove('mappa__tela--in-mano')
    }
    elemento.addEventListener('pointerup', molla)
    elemento.addEventListener('pointercancel', molla)

    elemento.addEventListener(
      'wheel',
      (evento) => {
        if (!inquadratura) return
        evento.preventDefault()
        const riquadro = elemento.getBoundingClientRect()
        sposta(
          ingrandisci(
            inquadratura,
            evento.deltaY < 0 ? 1 : -1,
            { x: evento.clientX - riquadro.left, y: evento.clientY - riquadro.top },
            elemento.clientWidth,
            elemento.clientHeight,
          ),
        )
      },
      { passive: false },
    )
  }

  /**
   * Il clic: prende un collegamento, o molla quel che era aperto.
   *
   * Sta fuori dai gesti perché scegliere un tragitto è una lettura, non un
   * movimento della carta: vale anche nel riquadro piccolo di una scheda.
   *
   * Il trascinamento finisce con un clic — il browser lo manda lo stesso — e
   * quel clic non è una scelta: chi ha spostato la mappa di venti pixel non ha
   * chiesto niente, e trovarsi la carta smorzata sarebbe una sorpresa.
   */
  elemento.addEventListener('click', (evento) => {
    if (trascinato) return
    const bersaglio = evento.target instanceof Element ? evento.target : null
    const riga = bersaglio?.closest('[data-tragitto]') as SVGGElement | null
    if (riga) {
      scegli(riga.dataset.tragitto ?? null)
      return
    }
    if (bersaglio?.closest('.mappa__segno')) return
    if (sceltoId !== null) scegli(null)
    if (apertoId !== null) apri(null)
  })

  // Il puntatore che esce dal riquadro si porta via il rilievo di passaggio: un
  // ridisegno arrivato mentre il mouse stava sopra una riga toglie di mezzo
  // l'elemento, e il suo `pointerleave` non arriverebbe mai.
  elemento.addEventListener('pointerleave', () => {
    if (sottoMano === null && segnoSottoMano === null) return
    sottoMano = null
    segnoSottoMano = null
    applicaRilievo()
  })

  // Le misure del riquadro si sanno solo dopo che il telaio l'ha messo nella
  // pagina: il primo disegno — e ogni cambio di larghezza, sidebar compresa —
  // passa di qui.
  const osservatore = new ResizeObserver(() => {
    if (!elemento.isConnected) {
      // Il riquadro di un ridisegno precedente: il suo osservatore se ne va con
      // lui, altrimenti resterebbe a disegnare dentro un elemento staccato.
      osservatore.disconnect()
      return
    }
    const attuali = opzioni.segni()
    if (!inquadratura || inquadratoSu !== chiaveDi(attuali)) {
      inquadratoSu = chiaveDi(attuali)
      inquadratura = inquadraturaPer(attuali, elemento.clientWidth, elemento.clientHeight, {
        margine: opzioni.margine,
      })
    }
    disegna(attuali)
  })
  osservatore.observe(elemento)

  return { elemento, ridisegna, vaiA, inquadraTutto, apri, dove: () => inquadratura }
}
