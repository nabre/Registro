// La guida: che cosa fa ogni pagina del registro, e come si usa.
// Qui c'è solo il disegno: il contenuto sta in `help/` (regole in testa a
// `help/types.ts`), gli schemi in `help/drawing.ts`, la ricerca in
// `help/search.ts`. `F1` apre la guida sulla sezione della pagina corrente;
// la ricerca capisce sinonimi, plurali e refusi; l'indice segue lo
// scorrimento; le figure si ingrandiscono e i bollini accendono la legenda.

import {
  Fragment,
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as EventoTastiera,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createRoot } from 'react-dom/client'

import { pezzi } from '#ui/assistant/format.js'
import { Pastiglia, Pulsante, StatoVuoto, TestataVista } from '#ui/components/base.js'
import { Icona, type NomeIcona } from '#ui/components/icons.js'
import { classi } from '#ui/classNames.js'
import { andaturaScorrimento, dentroUnCampo } from '#ui/focus.js'
import { Input } from '#ui/fields.js'
import { Isola } from '#ui/island.js'
import { ridisegnaIsola } from '#ui/islands.js'
import { postoDaVista } from '#ui/place.js'
import { riprendi, seguiScorrimento } from '#ui/bookmark.js'
import { iscriviti, stato, vai, type Vista } from '#ui/state.js'
import { Svg } from '#ui/svg.js'
import { telaioVista } from '#ui/viewFrame.js'
import { lingua } from '#core/i18n/index.js'
import { parole } from '#core/dominio/words.testi.js'
import { testi } from './help.testi.js'
import {
  GUIDA,
  PARTI,
  cerca,
  migliori,
  piano,
  rispondeA,
  type FiguraGuida,
  type NotaGuida,
  type ParteGuida,
  type Risultato,
  type SezioneGuida,
  type VoceGuida,
} from './help/index.js'

// ------------------------------------------------------------------- lo stato
//
// Comodità della pagina, fuori dallo stato del registro: sopravvivono ai
// ridisegni e si perdono chiudendo il registro.

let cercato = ''

/** Il filtro per macro-argomento selezionato: null mostra tutte le parti. */
let parteAttiva: ParteGuida | null = null

/** La pagina da cui si è arrivati alla guida: la si propone in cima. */
let provenienza: Vista | null = null

/** La sezione su cui portarsi appena la pagina è disegnata. */
let destinazione: { sezione: string, voce?: number } | null = null

/** La sezione che si sta leggendo: l'indice la accende. */
let sezioneQui: string | null = null

/** Chi ridisegna l'indice quando cambia `sezioneQui`. */
const ascoltaQui = new Set<() => void>()

function iscriviQui (avvisa: () => void): () => void {
  ascoltaQui.add(avvisa)
  return () => { ascoltaQui.delete(avvisa) }
}

/**
 * La guida è un'isola (ADR-48): la rifanno la ricerca, i filtri e i salti,
 * senza passare dal resto del registro.
 */
const ISOLA_GUIDA = 'guida'

// La provenienza si ricorda osservando lo stato cambiare, da qualunque parte si
// apra la guida. `vistaDiPrima` è la vista all'ultimo cambio visto.
let vistaDiPrima: Vista = stato.vista

/**
 * Se al prossimo disegno si riprende dal punto di lettura: arrivando nella
 * guida (anche all'avvio del registro), non dopo, né quando si arriva su una
 * sezione chiesta.
 */
let daRiprendere = true

/** Il punto di lettura della guida, nei segnalibri dello stato. */
const SEGNALIBRO = 'guida'

iscriviti(() => {
  if (stato.vista !== vistaDiPrima) {
    if (stato.vista === 'guida' && vistaDiPrima !== 'guida') {
      provenienza = vistaDiPrima
      daRiprendere = true
    }
    vistaDiPrima = stato.vista
  }
  // Gli effetti dopo il disegno, mai dal disegno. Il microtask mette il
  // fotogramma dietro quello del ridisegno, che gli iscritti fanno partire
  // nello stesso giro.
  if (stato.vista === 'guida') queueMicrotask(() => requestAnimationFrame(dopoIlDisegno))
})

/** Rifà la guida lei sola, e dopo va dove deve. */
function rifaiGuida (): void {
  ridisegnaIsola(ISOLA_GUIDA)
  requestAnimationFrame(dopoIlDisegno)
}

/** L'ultima ricerca fatta: la stessa domanda non si rifà a ogni disegno. */
let ultimaRicerca: { chiave: string, risultato: Risultato } | null = null

/** Il risultato della ricerca di adesso, lo stesso oggetto finché non cambia. */
function risultatoAdesso (): Risultato {
  // testo-fisso: una chiave, non un testo
  const chiave = `${lingua()}|${cercato}`
  if (ultimaRicerca?.chiave !== chiave) ultimaRicerca = { chiave, risultato: cerca(GUIDA, cercato) }
  return ultimaRicerca.risultato
}

/** La sezione che racconta una pagina. La scheda di una persona sta sotto «scheda». */
function sezioneDellaVista (vista: Vista | null): SezioneGuida | undefined {
  if (!vista || vista === 'guida') return undefined
  if (vista === 'allievo') return GUIDA.find((sezione) => sezione.id === 'scheda')
  return GUIDA.find((sezione) => sezione.vista === vista)
}

/** Apre la guida su una sezione, se data, altrimenti dove si era: il gesto di `F1` e dei collegamenti. */
function apriGuida (sezioneId?: string): void {
  if (sezioneId) {
    cercato = ''
    parteAttiva = null
    destinazione = { sezione: sezioneId }
  }
  if (stato.vista === 'guida') {
    if (!sezioneId) casellaCerca()?.focus()
    rifaiGuida()
    return
  }
  vai({ pagina: 'pagina.guida' })
}

// `F1` ovunque: la guida di quella pagina. `/` dentro la guida: la ricerca.
// Qui e non fra i comandi, che ascoltano solo combinazioni con Ctrl.
document.addEventListener('keydown', (evento: KeyboardEvent) => {
  if (document.querySelector('.modale')) return
  if (evento.key === 'F1' && !evento.ctrlKey && !evento.altKey && !evento.metaKey) {
    evento.preventDefault()
    apriGuida(sezioneDellaVista(stato.vista === 'guida' ? provenienza : stato.vista)?.id)
    return
  }
  if (evento.key === '/' && stato.vista === 'guida' && !dentroUnCampo(evento.target)) {
    evento.preventDefault()
    casellaCerca()?.focus()
  }
})

function casellaCerca (): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>('[data-fuoco="guida-cerca"]')
}

// ------------------------------------------------------------------ il testo

/**
 * Il testo con i suoi due segni — `**grassetto**` e `` `codice` `` — e, se si
 * sta cercando, le parole trovate evidenziate.
 */
function testoRicco (testo: string, forme: readonly string[] = []): ReactNode {
  // Lista fissa del testo: l'indice basta.
  return pezzi(testo).map((pezzo, indice) =>
    pezzo.codice
      ? <code key={indice} className="guida__codice">{evidenzia(pezzo.testo, forme)}</code>
      : pezzo.forte
        ? <strong key={indice}>{evidenzia(pezzo.testo, forme)}</strong>
        : <Fragment key={indice}>{evidenzia(pezzo.testo, forme)}</Fragment>,
  )
}

/**
 * Le parole che cominciano con una forma cercata, dentro un `<mark>`. Si
 * confronta la parola piana (senza accenti, minuscola) con le radici.
 */
function evidenzia (testo: string, forme: readonly string[]): ReactNode {
  const semplici = forme.filter((forma) => forma.length >= 2 && !forma.includes(' '))
  if (semplici.length === 0) return testo
  return testo.split(/([\p{L}\p{N}]+)/u).map((pezzo, indice) => {
    if (indice % 2 === 0 || pezzo.length === 0) return pezzo
    const parola = piano(pezzo)
    return semplici.some((forma) => rispondeA(parola, forma))
      ? <mark key={indice} className="guida__segno">{pezzo}</mark>
      : pezzo
  })
}

/** Un testo senza segni, tagliato a 140 lettere sulla parola: per le anteprime. */
function assaggio (testo: string): string {
  const quanto = 140
  const pulito = testo.replace(/\*\*|`/g, '')
  if (pulito.length <= quanto) return pulito
  const ultimoSpazio = pulito.lastIndexOf(' ', quanto)
  return `${pulito.slice(0, ultimoSpazio > 0 ? ultimoSpazio : quanto)}…`
}

/** «Ctrl+Alt+T / F11» → tasti disegnati, le combinazioni separate da un punto. */
function tastiera (tasti: string): ReactElement {
  const combinazioni = tasti.split(' / ')
  return (
    <span className="guida__tasti">
      {combinazioni.map((combinazione, indice) => (
        <Fragment key={indice}>
          {indice > 0 ? <span className="guida__tasti-o">·</span> : null}
          <span className="guida__combinazione">
            {/* `Ctrl+,` e `Ctrl+-`: il più che separa è quello seguito da qualcosa. */}
            {combinazione.split(/\+(?=.)/).map((tasto, quale) => <kbd key={quale}>{tasto}</kbd>)}
          </span>
        </Fragment>
      ))}
    </span>
  )
}

// ---------------------------------------------------------------- lo scorrere

function idVoce (sezione: string, voce: number): string {
  // testo-fisso: l'id di un elemento della pagina, non si legge
  return `guida-${sezione}-${voce}`
}

/**
 * Porta a una sezione o a una sua voce e la fa lampeggiare. `subito` salta
 * senza scorrere: arrivando da un'altra pagina il primo ridisegno
 * interromperebbe uno scorrimento morbido.
 */
function vaiA (sezione: string, voce?: number, subito = false): void {
  const bersaglioSezione = GUIDA.find((s) => s.id === sezione)
  if (bersaglioSezione && parteAttiva !== null && bersaglioSezione.parte !== parteAttiva) {
    parteAttiva = null
    destinazione = { sezione, voce }
    rifaiGuida()
    return
  }
  const bersaglio = document.getElementById(voce === undefined ? `guida-${sezione}` : idVoce(sezione, voce))
  if (!bersaglio) return
  bersaglio.scrollIntoView({
    behavior: subito ? 'auto' : andaturaScorrimento(),
    block: voce === undefined ? 'start' : 'center',
  })
  // Il lampo è un'animazione da far ripartire, non uno stato: la classe la
  // mette il gesto, e React non la tocca perché non cambia la sua `className`.
  bersaglio.classList.remove('guida--lampo')
  // Rileggere la misura fa ripartire l'animazione anche sulla stessa voce.
  void bersaglio.offsetWidth
  bersaglio.classList.add('guida--lampo')
  accendiIndice(sezione)
}

function accendiIndice (sezione: string): void {
  sezioneQui = sezione
  for (const avvisa of [...ascoltaQui]) avvisa()
}

/**
 * Porta la voce accesa nella parte visibile dell'indice, scorrendo solo
 * l'indice: `scrollIntoView` scorrerebbe anche la pagina. Si muove solo se la
 * voce è fuori, con un margine; se l'indice non scorre non fa niente.
 */
function tenereInVista (voce: HTMLElement): void {
  const indice = voce.closest<HTMLElement>('.guida__indice')
  if (!indice || indice.scrollHeight <= indice.clientHeight) return
  const margine = voce.offsetHeight * 2
  const cornice = indice.getBoundingClientRect()
  const riga = voce.getBoundingClientRect()
  const sopra = riga.top - cornice.top - margine
  const sotto = riga.bottom - cornice.bottom + margine
  if (sopra < 0) indice.scrollBy({ top: sopra, behavior: andaturaScorrimento() })
  else if (sotto > 0) indice.scrollBy({ top: sotto, behavior: andaturaScorrimento() })
}

/** Le ancore delle sezioni in pagina, nell'ordine. */
function ancoreInPagina (): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('.colonne--guida .guida__ancora')]
}

/**
 * Dopo ogni disegno: va dove si doveva andare, o riprende dal punto di
 * lettura arrivando nella guida. L'indice lo segue l'osservatore di `Colonne`.
 */
function dopoIlDisegno (): void {
  const ancore = ancoreInPagina()
  if (ancore.length === 0) return
  const riprendere = daRiprendere
  daRiprendere = false
  if (destinazione) {
    const { sezione, voce } = destinazione
    destinazione = null
    vaiA(sezione, voce, true)
  } else if (riprendere && !cercato && riprendi(ancore, stato.segnalibri[SEGNALIBRO])) {
    accendiIndice(stato.segnalibri[SEGNALIBRO].sezione)
  }
}

// Il punto di lettura segue lo scorrimento della guida intera, non dei risultati
// di una ricerca.
seguiScorrimento(
  () => stato.vista === 'guida' && !cercato ? SEGNALIBRO : null,
  ancoreInPagina,
)

// ------------------------------------------------------------------ le figure

/** Il numero di ogni figura, contando in tutta la guida: «Figura 12». */
const FIGURE: { figura: FiguraGuida, sezione: SezioneGuida }[] = GUIDA.flatMap((sezione) =>
  (sezione.figure ?? []).map((figura) => ({ figura, sezione })),
)
const NUMERO_FIGURA = new Map(FIGURE.map(({ figura }, indice) => [figura, indice + 1]))

/**
 * Il bollino acceso di una figura, con la sua riga di legenda: i gruppi del
 * disegno stanno nel tracciato in stringa, e la classe la mettono a mano.
 */
function useBollino (): {
  acceso: string | null
  accendi: (numero: string | null) => void
  disegno: { current: HTMLDivElement | null }
} {
  const [acceso, accendi] = useState<string | null>(null)
  const disegno = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    for (const gruppo of disegno.current?.querySelectorAll('g[data-bollino]') ?? []) {
      gruppo.classList.toggle('gd-bollino-gruppo--acceso', gruppo.getAttribute('data-bollino') === acceso)
    }
  })
  return { acceso, accendi, disegno }
}

/** Il gruppo del bollino sotto il puntatore, o `null`. */
function bollinoSotto (bersaglio: EventTarget): string | null {
  return bersaglio instanceof Element ? bersaglio.closest('[data-bollino]')?.getAttribute('data-bollino') ?? null : null
}

/** La legenda: una riga per bollino, che si accende insieme a lui. */
function Legenda ({ figura, forme, acceso, accendi }: {
  figura: FiguraGuida
  forme: readonly string[]
  acceso: string | null
  accendi: (numero: string | null) => void
}): ReactElement | null {
  if (!figura.legenda?.length) return null
  return (
    <ol className="guida__legenda">
      {figura.legenda.map((riga, indice) => {
        const numero = String(indice + 1)
        return (
          <li
            key={numero}
            className={classi(acceso === numero && 'guida__legenda-voce--accesa')}
            data-bollino={numero}
            tabIndex={0}
            onMouseEnter={() => accendi(numero)}
            onMouseLeave={() => accendi(null)}
            onFocus={() => accendi(numero)}
            onBlur={() => accendi(null)}
          >
            <span className="guida__legenda-numero">{numero}</span>
            <span>{testoRicco(riga, forme)}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** La didascalia: il numero della figura in evidenza, poi che cosa si guarda. */
function didascalia (figura: FiguraGuida, forme: readonly string[]): ReactElement {
  return (
    <figcaption className="guida__didascalia">
      <span className="guida__didascalia-numero">{testi().figura(String(NUMERO_FIGURA.get(figura) ?? ''))}</span>
      <span className="guida__didascalia-testo">{testoRicco(figura.didascalia, forme)}</span>
    </figcaption>
  )
}

/**
 * Uno schema con didascalia e legenda dei bollini, sotto e non dentro il
 * disegno perché vada a capo. Un clic lo ingrandisce.
 */
function Figura ({ figura, forme }: { figura: FiguraGuida, forme: readonly string[] }): ReactElement {
  const T = testi()
  const { acceso, accendi, disegno } = useBollino()
  return (
    <figure className="guida__figura">
      <button
        className="guida__figura-lente"
        type="button"
        title={T.ingrandisci}
        aria-label={T.ingrandisciLa(String(NUMERO_FIGURA.get(figura) ?? ''))}
        onClick={() => apriLente(figura)}
      >
        <Icona nome="lente" />
      </button>
      <div
        ref={disegno}
        className="guida__figura-corpo"
        onClick={() => apriLente(figura)}
        onMouseOver={(evento) => accendi(bollinoSotto(evento.target))}
        onMouseLeave={() => accendi(null)}
      >
        <Svg vista={figura.vista} contenuto={figura.disegno} classe="guida__disegno" />
      </div>
      {didascalia(figura, forme)}
      <Legenda figura={figura} forme={forme} acceso={acceso} accendi={accendi} />
    </figure>
  )
}

/** La lente aperta: si chiude da sé quando se ne apre un'altra. */
let chiudiLente: (() => void) | null = null

/**
 * La figura in grande, sopra la pagina; le frecce passano alla figura dopo,
 * anche di un'altra sezione. Un `<dialog>` con una radice sua appesa al
 * `body`: i ridisegni non lo toccano e `Esc` lo chiude.
 */
function apriLente (figura: FiguraGuida): void {
  chiudiLente?.()
  const indice = FIGURE.findIndex((voce) => voce.figura === figura)
  if (indice < 0) return
  const scatola = document.createElement('div')
  scatola.style.display = 'contents'
  const radice = createRoot(scatola)
  const chiudi = (): void => {
    if (chiudiLente !== chiudi) return
    chiudiLente = null
    // Dopo il giro in corso: si chiude anche da dentro un gestore di React.
    queueMicrotask(() => {
      radice.unmount()
      scatola.remove()
    })
  }
  chiudiLente = chiudi
  document.body.appendChild(scatola)
  radice.render(<Lente iniziale={indice} chiusa={chiudi} />)
}

function Lente ({ iniziale, chiusa }: { iniziale: number, chiusa: () => void }): ReactElement {
  const T = testi()
  const [indice, impostaIndice] = useState(iniziale)
  const finestra = useRef<HTMLDialogElement | null>(null)
  const corpo = useRef<HTMLDivElement | null>(null)
  const { acceso, accendi, disegno } = useBollino()
  const { figura, sezione } = FIGURE[indice]

  useLayoutEffect(() => {
    const qui = finestra.current
    if (!qui) return
    qui.addEventListener('close', chiusa)
    qui.showModal()
    // Il fuoco sul disegno e non sul primo pulsante: le frecce sfogliano subito.
    corpo.current?.focus()
    return () => qui.removeEventListener('close', chiusa)
  }, [chiusa])

  const sposta = (passo: number): void => {
    impostaIndice((prima) => (prima + passo + FIGURE.length) % FIGURE.length)
    accendi(null)
  }
  const chiudi = (): void => { finestra.current?.close() }

  return (
    <dialog
      ref={finestra}
      className="guida__lente"
      aria-label={T.figuraIngrandita}
      onKeyDown={(evento) => {
        if (evento.key === 'ArrowRight') { evento.preventDefault(); sposta(1) }
        if (evento.key === 'ArrowLeft') { evento.preventDefault(); sposta(-1) }
      }}
      // Un clic sul velo chiude: solo lì il bersaglio è il `<dialog>` stesso.
      onClick={(evento) => { if (evento.target === evento.currentTarget) chiudi() }}
    >
      <div className="guida__lente-testata">
        <button
          className="guida__lente-sezione"
          type="button"
          title={T.vaiAllaSezione}
          onClick={() => {
            chiudi()
            vaiA(sezione.id)
          }}
        >
          <Icona nome={sezione.simbolo} />
          {sezione.titolo}
        </button>
        <span className="guida__lente-conto">{T.diQuante(indice + 1, FIGURE.length)}</span>
        <Pulsante simbolo="sinistra" variante="sottile" titolo={T.precedente} al={() => sposta(-1)} />
        <Pulsante simbolo="destra" variante="sottile" titolo={T.successiva} al={() => sposta(1)} />
        <Pulsante simbolo="chiudi" variante="sottile" titolo={T.chiudi} al={chiudi} />
      </div>
      <div
        ref={(nodo) => { corpo.current = nodo; disegno.current = nodo }}
        className="guida__lente-corpo"
        tabIndex={-1}
        onMouseOver={(evento) => accendi(bollinoSotto(evento.target))}
        onMouseLeave={() => accendi(null)}
      >
        {/* Chiave: la figura nuova è un disegno nuovo, non il tracciato di prima riscritto. */}
        <Svg key={indice} vista={figura.vista} contenuto={figura.disegno} classe="guida__disegno" />
      </div>
      {didascalia(figura, [])}
      <Legenda key={indice} figura={figura} forme={[]} acceso={acceso} accendi={accendi} />
    </dialog>
  )
}

// -------------------------------------------------------------- le sezioni

/** Una voce: il gesto in grassetto, la spiegazione di seguito. */
function voceGuida (
  sezione: SezioneGuida,
  voce: VoceGuida,
  forme: readonly string[],
): ReactElement {
  const indice = sezione.voci.indexOf(voce)
  const numero = sezione.passi ? indice + 1 : undefined
  return (
    <li
      key={indice}
      className={classi('guida__voce', numero !== undefined && 'guida__voce--passo')}
      id={idVoce(sezione.id, indice)}
    >
      <div className="guida__capo">
        {numero !== undefined ? <span className="guida__numero">{String(numero)}</span> : null}
        <strong className="guida__termine">{testoRicco(voce.termine, forme)}</strong>
        {voce.tasti ? tastiera(voce.tasti) : null}
      </div>
      <span className="guida__testo">{testoRicco(voce.testo, forme)}</span>
    </li>
  )
}

function note (): Record<NotaGuida['tipo'], { titolo: string, simbolo: NomeIcona }> {
  const T = testi()
  return {
    meccanismo: { titolo: T.note.meccanismo, simbolo: 'informazione' },
    consiglio: { titolo: T.note.consiglio, simbolo: 'stella' },
    attenzione: { titolo: parole().attenzione, simbolo: 'avviso' },
  }
}

/** Un riquadro a margine: il perché, la scorciatoia, o quel che non si disfa. */
function notaGuida (nota: NotaGuida, forme: readonly string[], indice: number): ReactElement {
  const { titolo, simbolo } = note()[nota.tipo]
  return (
    // Lista fissa della sezione: l'indice basta.
    <aside key={indice} className={classi('guida__nota', `guida__nota--${nota.tipo}`)}>
      <Icona nome={simbolo} />
      <div>
        <strong className="guida__nota-titolo">{titolo}</strong>
        <span>{testoRicco(nota.testo, forme)}</span>
      </div>
    </aside>
  )
}

function bottoneSezione (altra: SezioneGuida, prima?: string): ReactElement {
  return (
    <button key={altra.id} className="guida__vedi-voce" type="button" onClick={() => vaiA(altra.id)}>
      {prima ? <span className="guida__vedi-prima">{prima}</span> : null}
      <Icona nome={altra.simbolo} />
      {altra.titolo}
    </button>
  )
}

/**
 * In fondo alla sezione: «Vedi anche» con le sezioni vicine, e la sezione dopo
 * nell'ordine della guida. Gli `id` che non esistono si saltano.
 */
function piede (sezione: SezioneGuida, inRicerca: boolean): ReactElement | null {
  const T = testi()
  const vicine = (sezione.vedi ?? [])
    .map((id) => GUIDA.find((altra) => altra.id === id))
    .filter((altra): altra is SezioneGuida => altra !== undefined)
  const dopo = inRicerca ? undefined : GUIDA[GUIDA.indexOf(sezione) + 1]
  if (vicine.length === 0 && !dopo) return null
  return (
    <div className="guida__vedi">
      {vicine.length > 0 ? <span className="guida__vedi-titolo">{T.vediAnche}</span> : null}
      {vicine.map((altra) => bottoneSezione(altra))}
      {dopo ? <span className="guida__vedi-dopo">{bottoneSezione(dopo, T.poi)}</span> : null}
    </div>
  )
}

function sezioneGuida (
  sezione: SezioneGuida,
  voci: VoceGuida[],
  forme: readonly string[],
  inRicerca: boolean,
): ReactElement {
  const T = testi()
  // La testata di `scheda` con l'icona e il titolo della voce dell'indice.
  return (
    <section className={classi('scheda', 'guida__sezione', sezione.passi && 'guida__sezione--passi')}>
      <header className="scheda__testata">
        <span className="guida__sezione-simbolo"><Icona nome={sezione.simbolo} /></span>
        <div className="scheda__titoli">
          <h3 className="scheda__titolo">{sezione.titolo}</h3>
          <p className="scheda__sottotitolo">{sezione.sommario}</p>
        </div>
        <div className="scheda__azioni guida__sezione-azioni">
          {inRicerca ? <Pastiglia testo={T.parti[sezione.parte]} tono="quiete" /> : null}
          {sezione.vista
            ? (
                <Pulsante
                  testo={T.apriLaPagina}
                  simbolo="destra"
                  variante="sottile"
                  titolo={T.apriLaPaginaDi(sezione.titolo)}
                  al={() => { if (sezione.vista) vai(postoDaVista(sezione.vista)) }}
                />
              )
            : null}
        </div>
      </header>
      <div className="scheda__corpo guida__corpo">
        {sezione.figure?.length
          ? (
              <div className="guida__figure">
                {/* Lista fissa della sezione: l'indice basta. */}
                {sezione.figure.map((figura, indice) => <Figura key={indice} figura={figura} forme={forme} />)}
              </div>
            )
          : null}
        {sezione.passi
          ? <ol className="guida__voci">{voci.map((voce) => voceGuida(sezione, voce, forme))}</ol>
          : <ul className="guida__voci">{voci.map((voce) => voceGuida(sezione, voce, forme))}</ul>}
        {sezione.note?.length
          ? <div className="guida__note">{sezione.note.map((nota, indice) => notaGuida(nota, forme, indice))}</div>
          : null}
        {piede(sezione, inRicerca)}
      </div>
    </section>
  )
}

function ancora (sezione: SezioneGuida, contenuto: ReactElement): ReactElement {
  return (
    <div key={sezione.id} className="guida__ancora" id={`guida-${sezione.id}`} data-sezione={sezione.id}>
      {contenuto}
    </div>
  )
}

// ------------------------------------------------------------------ l'indice

/** Una voce dell'indice: accesa quando la sua sezione è quella che si legge. */
function VoceIndice ({ sezione, conto, qui }: {
  sezione: SezioneGuida
  /** Quante voci trovate, in ricerca; `null` fuori dalla ricerca. */
  conto: number | null
  qui: boolean
}): ReactElement {
  const T = testi()
  const bottone = useRef<HTMLButtonElement | null>(null)
  useLayoutEffect(() => {
    if (qui && bottone.current) tenereInVista(bottone.current)
  }, [qui])
  const figure = sezione.figure?.length ?? 0
  return (
    <li>
      <button
        ref={bottone}
        className={classi('guida__indice-voce', qui && 'guida__indice-voce--qui')}
        type="button"
        data-sezione={sezione.id}
        aria-current={qui ? 'location' : undefined}
        onClick={() => vaiA(sezione.id)}
      >
        <Icona nome={sezione.simbolo} />
        <span className="guida__indice-nome">{sezione.titolo}</span>
        {conto !== null
          ? <span className="guida__indice-conto">{String(conto)}</span>
          : figure > 0
            ? (
                <span className="guida__indice-figure" title={T.figureDellaSezione(figure)}>
                  <Icona nome="immagine" />
                </span>
              )
            : null}
      </button>
    </li>
  )
}

/**
 * L'indice: porta alla sezione scorrendo e segue lo scorrimento. È diviso come
 * la barra laterale.
 */
function Indice ({ trovate, inRicerca }: { trovate: Map<string, number>, inRicerca: boolean }): ReactElement {
  const T = testi()
  const qui = useSyncExternalStore(iscriviQui, () => sezioneQui)
  return (
    <nav
      className="colonna guida__indice"
      aria-label={T.indice}
      // Scorre per conto suo (la voce accesa la tiene dentro `tenereInVista`); la
      // marca evita che un ridisegno lo riporti in cima.
      data-scorrimento="guida-indice"
    >
      <div className="guida__indice-testa">
        <Icona nome="libro" />
        <span className="guida__indice-titolo-testa">{inRicerca ? T.doveSiTrova : T.argomenti}</span>
        <span className="guida__indice-conto-totale">{String(GUIDA.length)}</span>
      </div>
      {PARTI.map((parte) => {
        const sezioni = GUIDA.filter((sezione) => sezione.parte === parte && trovate.has(sezione.id))
        if (sezioni.length === 0) return null
        const parteAttivaOra = parteAttiva === parte && !inRicerca
        return (
          <div key={parte} className={classi('guida__indice-parte', parteAttivaOra && 'guida__indice-parte--attiva')}>
            <h4 className="guida__indice-titolo">{T.parti[parte]}</h4>
            <ul className="guida__indice-voci">
              {sezioni.map((sezione) => (
                <VoceIndice
                  key={sezione.id}
                  sezione={sezione}
                  conto={inRicerca ? trovate.get(sezione.id) ?? 0 : null}
                  qui={sezione.id === qui}
                />
              ))}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

// ------------------------------------------------------------------ la testa

function cercaAncora (testo: string): void {
  cercato = testo
  parteAttiva = null
  // Anche nella casella di adesso: un campo col fuoco non riprende il valore
  // dallo stato, e con Esc resterebbe scritto quel che c'era.
  const scritta = casellaCerca()
  if (scritta) scritta.value = testo
  rifaiGuida()
  // Il cursore resta nella casella, in fondo: si può continuare a scrivere.
  requestAnimationFrame(() => {
    const casella = casellaCerca()
    casella?.focus()
    casella?.setSelectionRange(testo.length, testo.length)
  })
}

/** In cima alla pagina: torna alla prima riga dello scorrimento. */
function tornaSu (): void {
  document.querySelector('main.contenuto')?.scrollTo({ top: 0, behavior: andaturaScorrimento() })
}

/**
 * La casella della ricerca, con `data-fuoco`. A ogni lettera si rifà la guida,
 * e la casella resta lo stesso nodo col suo fuoco. Il risultato si legge
 * all'Invio, dalla ricerca di quel momento.
 */
function campoCerca (): ReactElement {
  const T = testi()
  return (
    <div className="guida__cerca">
      <Icona nome="lente" />
      <Input
        className="campo__controllo"
        type="search"
        valore={cercato}
        placeholder={T.segnaposto}
        data-fuoco="guida-cerca"
        aria-label={T.cercaNellaGuida}
        autoComplete="off"
        spellCheck={false}
        onInput={(evento) => {
          cercato = evento.currentTarget.value
          parteAttiva = null
          rifaiGuida()
        }}
        onKeyDown={(evento) => {
          if (evento.key === 'Escape' && cercato) {
            evento.preventDefault()
            cercaAncora('')
          } else if (evento.key === 'ArrowDown') {
            evento.preventDefault()
            document.querySelector<HTMLElement>('.guida__risposta')?.focus()
          } else if (evento.key === 'Enter') {
            // Invio: la risposta migliore, senza doverla cercare con gli occhi.
            const prima = migliori(risultatoAdesso(), 1)[0]
            if (!prima) return
            evento.preventDefault()
            vaiA(prima.sezione.id, prima.sezione.voci.indexOf(prima.voce))
          }
        }}
      />
      {cercato
        ? (
            <button className="guida__cerca-pulisci" type="button" title={T.mostraTutta} onClick={() => cercaAncora('')}>
              <Icona nome="chiudi" />
            </button>
          )
        : null}
      <span className="guida__cerca-tasto" aria-hidden="true">{cercato ? T.tastoInvio : '/'}</span>
    </div>
  )
}

/** La barra delle pillole per filtrare velocemente per macro-argomento. */
function filtriGuida (): ReactElement {
  const T = testi()
  const scegli = (parte: ParteGuida | null): void => {
    parteAttiva = parte
    if (cercato) cercato = ''
    rifaiGuida()
    tornaSu()
  }
  const pillola = (chiave: string, testo: string, conto: number, attivo: boolean, alClick: () => void): ReactElement => (
    <button
      key={chiave}
      className={classi('guida__filtro-pillola', attivo && 'guida__filtro-pillola--attivo')}
      type="button"
      aria-pressed={attivo}
      onClick={alClick}
    >
      <span>{testo}</span>
      <span className="guida__filtro-conto">{String(conto)}</span>
    </button>
  )

  return (
    <div className="guida__filtri" aria-label={T.filtraPerParte}>
      {pillola('', parole().tutte, GUIDA.length, parteAttiva === null && !cercato, () => scegli(null))}
      {PARTI.map((parte) => pillola(
        parte,
        T.parti[parte],
        GUIDA.filter((s) => s.parte === parte).length,
        parteAttiva === parte && !cercato,
        () => scegli(parteAttiva === parte ? null : parte),
      ))}
    </div>
  )
}

/** «Stavi guardando…»: in cima, la sezione della pagina da cui si è arrivati. */
function daDoveVieni (): ReactElement | null {
  const T = testi()
  const sezione = sezioneDellaVista(provenienza)
  if (!sezione) return null
  return (
    <div className="guida__provenienza">
      <Icona nome={sezione.simbolo} />
      <span className="guida__provenienza-testo">
        {T.staviGuardando}
        <strong>{sezione.titolo}</strong>
        {'. '}
        <span className="guida__provenienza-sommario">{sezione.sommario}</span>
      </span>
      <Pulsante testo={T.leggiCome} simbolo="destra" variante="sottile" al={() => vaiA(sezione.id)} />
    </div>
  )
}

/** In cima: che cos'è questa pagina, da dove si viene, e le parole da provare. */
function benvenuto (): ReactElement {
  const T = testi()
  const scorciatoia = (testo: string, simbolo: NomeIcona, id: string): ReactElement =>
    <Pulsante testo={testo} simbolo={simbolo} variante="sottile" al={() => vaiA(id)} />

  return (
    <section className="guida__benvenuto">
      <div className="guida__benvenuto-testo">
        <h3 className="guida__benvenuto-titolo">{T.benvenutoTitolo}</h3>
        <p>{testoRicco(T.benvenutoTesto)}</p>
      </div>
      <div className="guida__benvenuto-scorciatoie">
        {cercato
          ? null
          : (
              <>
                <div className="guida__benvenuto-lanci">
                  {scorciatoia(T.primiPassi, 'stella', 'primi-passi')}
                  {scorciatoia(T.scorciatoie, 'stellaPiena', 'scorciatoie')}
                  {scorciatoia(T.guai, 'avviso', 'guai')}
                </div>
                <div className="guida__benvenuto-suggerimenti">
                  <span className="guida__prova">{T.prova}</span>
                  {T.daProvare.map((parola) => (
                    <button key={parola} className="guida__suggerimento" type="button" onClick={() => cercaAncora(parola)}>
                      {parola}
                    </button>
                  ))}
                </div>
              </>
            )}
      </div>
      {cercato ? null : daDoveVieni()}
    </section>
  )
}

/** Le frecce fra le risposte: su dalla prima si torna alla casella. */
function spostaFuoco (evento: EventoTastiera<HTMLButtonElement>): void {
  const elenco = evento.currentTarget.closest('.guida__risposte-elenco')
  const tutte = elenco ? [...elenco.querySelectorAll<HTMLElement>('.guida__risposta')] : []
  const qui = tutte.indexOf(evento.currentTarget)
  if (evento.key === 'ArrowDown') {
    evento.preventDefault()
    tutte[Math.min(qui + 1, tutte.length - 1)]?.focus()
  } else if (evento.key === 'ArrowUp') {
    evento.preventDefault()
    if (qui <= 0) casellaCerca()?.focus()
    else tutte[qui - 1]?.focus()
  }
}

/**
 * Le risposte migliori, in cima ai risultati: la voce, dove sta, e le prime
 * parole della spiegazione. Si scorrono con le frecce, e Invio ci porta.
 */
function risposteMigliori (risultato: Risultato): ReactElement | null {
  const T = testi()
  const prime = migliori(risultato, 5)
  if (prime.length === 0) return null
  const forme = risultato.forme
  return (
    <section key="risposte" className="guida__risposte" aria-label={T.risposteMigliori}>
      <h3 className="guida__risposte-titolo">{T.risposteMigliori}</h3>
      <ol className="guida__risposte-elenco">
        {prime.map(({ sezione, voce }) => {
          const indice = sezione.voci.indexOf(voce)
          return (
            <li key={idVoce(sezione.id, indice)}>
              <button
                className="guida__risposta"
                type="button"
                onClick={() => vaiA(sezione.id, indice)}
                onKeyDown={spostaFuoco}
              >
                <span className="guida__risposta-simbolo"><Icona nome={sezione.simbolo} /></span>
                <span className="guida__risposta-corpo">
                  <span className="guida__risposta-capo">
                    <strong>{testoRicco(voce.termine, forme)}</strong>
                    <span className="guida__risposta-dove">{`${T.parti[sezione.parte]} › ${sezione.titolo}`}</span>
                  </span>
                  <span className="guida__risposta-testo">{evidenzia(assaggio(voce.testo), forme)}</span>
                </span>
                <Icona nome="destra" />
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// ------------------------------------------------------------------ la pagina

function VistaGuida (): ReactElement {
  return (
    <Isola
      chiave={ISOLA_GUIDA}
      disegna={disegnoGuida}
      className="vista vista--guida"
      data-telaio={telaioVista()}
    />
  )
}

export function vistaGuida (): ReactElement {
  return <VistaGuida />
}

function disegnoGuida (): ReactNode {
  const risultato = risultatoAdesso()
  return (
    <>
      {testata(risultato)}
      {benvenuto()}
      {/* La ricerca e i filtri stanno in una fascia appiccicata in cima. */}
      <div className="guida__barra-cerca">
        {campoCerca()}
        {filtriGuida()}
      </div>
      <Colonne chiave={`${lingua()}|${parteAttiva ?? ''}|${cercato}`} risultato={risultato} />
    </>
  )
}

/** Le sezioni da mostrare: tutte in ricerca, altrimenti quelle della parte scelta. */
function sezioniFiltrate (risultato: Risultato, inRicerca: boolean): Risultato['sezioni'] {
  return risultato.sezioni.filter(({ sezione }) =>
    inRicerca || parteAttiva === null || sezione.parte === parteAttiva,
  )
}

function testata (risultato: Risultato): ReactElement {
  const T = testi()
  const inRicerca = cercato.trim().length > 0
  const vociInTutto = GUIDA.reduce((somma, sezione) => somma + sezione.voci.length, 0)
  const vociTrovateInTutto = risultato.sezioni.reduce((somma, { voci }) => somma + voci.length, 0)

  return (
    <TestataVista
      titolo={T.titolo}
      sottotitolo={T.sottotitolo}
      contorno={inRicerca
        ? (
            <Pastiglia
              testo={T.vociTrovate(vociTrovateInTutto)}
              tono={vociTrovateInTutto > 0 ? 'informativo' : 'attenzione'}
              simbolo="lente"
            />
          )
        : parteAttiva !== null
          ? (
              <Pastiglia
                testo={`${T.parti[parteAttiva]} (${sezioniFiltrate(risultato, inRicerca).length})`}
                tono="informativo"
                simbolo="segnalibro"
              />
            )
          : <Pastiglia testo={T.conto(GUIDA.length, vociInTutto, FIGURE.length)} tono="quiete" simbolo="informazione" />}
    />
  )
}

/**
 * Il testo e l'indice: la parte pesante (le sezioni, le figure in SVG). Dipende
 * solo da ricerca, filtro e lingua, che stanno tutti nella `chiave`: un
 * ridisegno del registro che non li cambia (un tocco dell'host, l'OCR che
 * avanza) non la rifà.
 *
 * L'osservatore guarda la fascia alta della pagina: la sezione che ci passa è
 * quella che si sta leggendo, e l'indice la accende. Si rifà quando le ancore
 * cambiano, cioè con la chiave.
 */
const Colonne = memo(function Colonne ({ chiave, risultato }: {
  chiave: string
  risultato: Risultato
}): ReactElement {
  const T = testi()
  const colonne = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const qui = colonne.current
    const ancore = qui ? [...qui.querySelectorAll<HTMLElement>('.guida__ancora')] : []
    if (!qui || ancore.length === 0) return
    const osservatore = new IntersectionObserver((voci) => {
      const visibili = voci
        .filter((voce) => voce.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      const prima = visibili[0]?.target as HTMLElement | undefined
      if (prima?.dataset.sezione) accendiIndice(prima.dataset.sezione)
    }, { root: qui.closest('main.contenuto'), rootMargin: '0px 0px -65% 0px' })
    for (const ancora of ancore) osservatore.observe(ancora)
    return () => osservatore.disconnect()
  }, [chiave])

  const inRicerca = cercato.trim().length > 0
  const filtrate = sezioniFiltrate(risultato, inRicerca)
  const forme = risultato.forme
  const trovate = new Map(risultato.sezioni.map(({ sezione, voci }) => [sezione.id, voci.length]))
  const sezioni = filtrate.map(({ sezione, voci }) =>
    ancora(sezione, sezioneGuida(sezione, voci.map(({ voce }) => voce), forme, inRicerca)),
  )
  const partiDaMostrare = inRicerca
    ? PARTI
    : parteAttiva !== null
      ? [parteAttiva]
      : PARTI

  // Il testo a sinistra e l'indice a destra: a sinistra c'è già la barra laterale.
  return (
    <div ref={colonne} className="colonne colonne--guida">
      <div className="colonna">
        {risultato.sezioni.length === 0
          ? (
              <StatoVuoto
                simbolo="lente"
                titolo={T.nienteTitolo}
                testo={T.nienteTesto}
                azione={(
                  <div className="guida__vuoto-azioni">
                    {risultato.forse
                      ? (
                          <Pulsante
                            testo={T.forseCercavi(risultato.forse)}
                            simbolo="lente"
                            variante="primario"
                            al={() => cercaAncora(risultato.forse ?? '')}
                          />
                        )
                      : null}
                    <Pulsante testo={T.mostraTutta} simbolo="chiudi" al={() => cercaAncora('')} />
                  </div>
                )}
              />
            )
          : inRicerca
            ? [risposteMigliori(risultato), ...sezioni]
            : partiDaMostrare.map((parte) => {
                const diQuesta = sezioni.filter((_, indice) => filtrate[indice].sezione.parte === parte)
                if (diQuesta.length === 0) return null
                return (
                  <div key={parte} className="guida__parte">
                    <h3 className="guida__parte-titolo">{T.parti[parte]}</h3>
                    {diQuesta}
                  </div>
                )
              })}
        <div className="guida__fondo-navigazione">
          <Pulsante
            testo={T.tornaInCima}
            simbolo="su"
            variante="sottile"
            al={() => {
              tornaSu()
              casellaCerca()?.focus()
            }}
          />
        </div>
      </div>
      <Indice trovate={trovate} inRicerca={inRicerca} />
    </div>
  )
})
