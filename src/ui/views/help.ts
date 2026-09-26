// La guida: che cosa fa ogni pagina del registro, e come si usa.
// Qui c'è solo il disegno: il contenuto sta in `help/` (regole in testa a
// `help/types.ts`), gli schemi in `help/drawing.ts`, la ricerca in
// `help/search.ts`. `F1` apre la guida sulla sezione della pagina corrente;
// la ricerca capisce sinonimi, plurali e refusi; l'indice segue lo
// scorrimento; le figure si ingrandiscono e i bollini accendono la legenda.

import { pezzi } from '../assistant/format.js'
import { pastiglia, pulsante, statoVuoto, testataVista } from '../components/base.js'
import { icona, type NomeIcona } from '../components/icons.js'
import { andaturaScorrimento, dentroUnCampo, h, svg, type Figlio } from '../dom.js'
import { aggiorna, iscriviti, stato, type Vista } from '../state.js'
import { parole } from '../../domain/words.testi.js'
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
  type Risultato,
  type SezioneGuida,
  type VoceGuida,
} from './help/index.js'

const T = testi()

// ------------------------------------------------------------------- lo stato
//
// Comodità della pagina, fuori dallo stato del registro: sopravvivono ai
// ridisegni e si perdono chiudendo il registro.

let cercato = ''

/** La pagina da cui si è arrivati alla guida: la si propone in cima. */
let provenienza: Vista | null = null

/** La sezione su cui portarsi appena la pagina è disegnata. */
let destinazione: { sezione: string, voce?: number } | null = null

/** La sezione che si sta leggendo: l'indice la accende. */
let sezioneQui: string | null = null

let osservatore: IntersectionObserver | null = null

// La provenienza si ricorda osservando lo stato cambiare, da qualunque parte si
// apra la guida. `vistaDiPrima` è la vista all'ultimo cambio visto.
let vistaDiPrima: Vista = stato.vista
iscriviti(() => {
  if (stato.vista === vistaDiPrima) return
  if (stato.vista === 'guida' && vistaDiPrima !== 'guida') provenienza = vistaDiPrima
  vistaDiPrima = stato.vista
})

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
    destinazione = { sezione: sezioneId }
  }
  if (stato.vista === 'guida') {
    if (!sezioneId) casellaCerca()?.focus()
    aggiorna({})
    return
  }
  aggiorna({ vista: 'guida' })
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
function testoRicco (testo: string, forme: readonly string[] = []): Figlio[] {
  return pezzi(testo).map((pezzo) =>
    pezzo.codice
      ? h('code', { class: 'guida__codice' }, ...evidenzia(pezzo.testo, forme))
      : pezzo.forte
        ? h('strong', null, ...evidenzia(pezzo.testo, forme))
        : evidenzia(pezzo.testo, forme),
  )
}

/**
 * Le parole che cominciano con una forma cercata, dentro un `<mark>`. Si
 * confronta la parola piana (senza accenti, minuscola) con le radici.
 */
function evidenzia (testo: string, forme: readonly string[]): Figlio[] {
  const semplici = forme.filter((forma) => forma.length >= 2 && !forma.includes(' '))
  if (semplici.length === 0) return [testo]
  return testo.split(/([\p{L}\p{N}]+)/u).map((pezzo, indice) => {
    if (indice % 2 === 0 || pezzo.length === 0) return pezzo
    const parola = piano(pezzo)
    return semplici.some((forma) => rispondeA(parola, forma))
      ? h('mark', { class: 'guida__segno' }, pezzo)
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
function tastiera (tasti: string): HTMLElement {
  const combinazioni = tasti.split(' / ')
  return h(
    'span',
    { class: 'guida__tasti' },
    ...combinazioni.flatMap((combinazione, indice) => [
      indice > 0 ? h('span', { class: 'guida__tasti-o' }, '·') : null,
      h(
        'span',
        { class: 'guida__combinazione' },
        // `Ctrl+,` e `Ctrl+-`: il più che separa è quello seguito da qualcosa.
        ...combinazione.split(/\+(?=.)/).map((tasto) => h('kbd', null, tasto)),
      ),
    ]),
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
  const bersaglio = document.getElementById(voce === undefined ? `guida-${sezione}` : idVoce(sezione, voce))
  if (!bersaglio) return
  bersaglio.scrollIntoView({
    behavior: subito ? 'auto' : andaturaScorrimento(),
    block: voce === undefined ? 'start' : 'center',
  })
  bersaglio.classList.remove('guida--lampo')
  // Rileggere la misura fa ripartire l'animazione anche sulla stessa voce.
  void bersaglio.offsetWidth
  bersaglio.classList.add('guida--lampo')
  accendiIndice(sezione)
}

function accendiIndice (sezione: string): void {
  sezioneQui = sezione
  for (const voce of document.querySelectorAll<HTMLElement>('.guida__indice-voce')) {
    const qui = voce.dataset.sezione === sezione
    voce.classList.toggle('guida__indice-voce--qui', qui)
    if (qui) {
      voce.setAttribute('aria-current', 'location')
      tenereInVista(voce)
    } else voce.removeAttribute('aria-current')
  }
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

/**
 * Dopo ogni disegno: va dove si doveva andare e rimette in ascolto l'indice.
 * L'osservatore guarda la fascia alta della pagina: la sezione che ci passa è
 * quella che si sta leggendo.
 */
function dopoIlDisegno (): void {
  osservatore?.disconnect()
  const contenitore = document.querySelector('main.contenuto')
  const ancore = [...document.querySelectorAll<HTMLElement>('.guida__ancora')]
  if (ancore.length === 0) return
  osservatore = new IntersectionObserver((voci) => {
    const visibili = voci
      .filter((voce) => voce.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
    const prima = visibili[0]?.target as HTMLElement | undefined
    if (prima?.dataset.sezione) accendiIndice(prima.dataset.sezione)
  }, { root: contenitore, rootMargin: '0px 0px -65% 0px' })
  for (const ancora of ancore) osservatore.observe(ancora)

  if (destinazione) {
    const { sezione, voce } = destinazione
    destinazione = null
    vaiA(sezione, voce, true)
  }
}

// ------------------------------------------------------------------ le figure

/** Il numero di ogni figura, contando in tutta la guida: «Figura 12». */
const FIGURE: { figura: FiguraGuida, sezione: SezioneGuida }[] = GUIDA.flatMap((sezione) =>
  (sezione.figure ?? []).map((figura) => ({ figura, sezione })),
)
const NUMERO_FIGURA = new Map(FIGURE.map(({ figura }, indice) => [figura, indice + 1]))

/**
 * Accende il bollino `numero` e la sua riga di legenda, dentro `dove`;
 * `null` spegne tutto.
 */
function accendiBollino (dove: HTMLElement, numero: string | null): void {
  for (const gruppo of dove.querySelectorAll('g[data-bollino]')) {
    gruppo.classList.toggle('gd-bollino-gruppo--acceso', gruppo.getAttribute('data-bollino') === numero)
  }
  for (const riga of dove.querySelectorAll<HTMLElement>('.guida__legenda li')) {
    riga.classList.toggle('guida__legenda-voce--accesa', riga.dataset.bollino === numero)
  }
}

/** Il disegno con i bollini che rispondono al passaggio del puntatore. */
function disegnoVivo (figura: FiguraGuida, dove: () => HTMLElement): SVGSVGElement {
  const disegno = svg(figura.vista, figura.disegno, 'guida__disegno')
  disegno.addEventListener('mouseover', (evento) => {
    const gruppo = (evento.target as Element).closest('[data-bollino]')
    accendiBollino(dove(), gruppo?.getAttribute('data-bollino') ?? null)
  })
  disegno.addEventListener('mouseleave', () => accendiBollino(dove(), null))
  return disegno
}

/** La legenda: una riga per bollino, che si accende insieme a lui. */
function legenda (
  figura: FiguraGuida,
  dove: () => HTMLElement,
  forme: readonly string[],
): HTMLElement | null {
  if (!figura.legenda?.length) return null
  return h(
    'ol',
    { class: 'guida__legenda' },
    ...figura.legenda.map((riga, indice) => {
      const numero = String(indice + 1)
      return h(
        'li',
        {
          dataset: { bollino: numero },
          attr: { tabindex: 0 },
          onmouseenter: () => accendiBollino(dove(), numero),
          onmouseleave: () => accendiBollino(dove(), null),
          onfocus: () => accendiBollino(dove(), numero),
          onblur: () => accendiBollino(dove(), null),
        },
        h('span', { class: 'guida__legenda-numero' }, numero),
        h('span', null, ...testoRicco(riga, forme)),
      )
    }),
  )
}

/** La didascalia: il numero della figura in evidenza, poi che cosa si guarda. */
function didascalia (figura: FiguraGuida, forme: readonly string[]): HTMLElement {
  return h(
    'figcaption',
    { class: 'guida__didascalia' },
    h('span', { class: 'guida__didascalia-numero' }, T.figura(String(NUMERO_FIGURA.get(figura) ?? ''))),
    h('span', { class: 'guida__didascalia-testo' }, ...testoRicco(figura.didascalia, forme)),
  )
}

/**
 * Uno schema con didascalia e legenda dei bollini, sotto e non dentro il
 * disegno perché vada a capo. Un clic lo ingrandisce.
 */
function figuraGuida (figura: FiguraGuida, forme: readonly string[]): HTMLElement {
  let elemento: HTMLElement | null = null
  const dove = (): HTMLElement => elemento as HTMLElement
  const disegno = disegnoVivo(figura, dove)
  elemento = h(
    'figure',
    { class: 'guida__figura' },
    h(
      'button',
      {
        class: 'guida__figura-lente',
        type: 'button',
        title: T.ingrandisci,
        attr: { 'aria-label': T.ingrandisciLa(String(NUMERO_FIGURA.get(figura) ?? '')) },
        onclick: () => apriLente(figura),
      },
      icona('lente'),
    ),
    h(
      'div',
      { class: 'guida__figura-corpo', onclick: () => apriLente(figura) },
      disegno,
    ),
    didascalia(figura, forme),
    legenda(figura, dove, forme),
  )
  return elemento
}

/**
 * La figura in grande, sopra la pagina; le frecce passano alla figura dopo,
 * anche di un'altra sezione. Un `<dialog>` appeso al `body`: i ridisegni non
 * lo toccano e `Esc` lo chiude.
 */
function apriLente (figura: FiguraGuida): void {
  document.querySelector('dialog.guida__lente')?.remove()
  let indice = FIGURE.findIndex((voce) => voce.figura === figura)
  if (indice < 0) return
  const finestra = h('dialog', { class: 'guida__lente', attr: { 'aria-label': T.figuraIngrandita } })

  const mostra = (): void => {
    const { figura: questa, sezione } = FIGURE[indice]
    const dove = (): HTMLElement => finestra
    finestra.replaceChildren(
      h(
        'div',
        { class: 'guida__lente-testata' },
        h(
          'button',
          {
            class: 'guida__lente-sezione',
            type: 'button',
            title: T.vaiAllaSezione,
            onclick: () => {
              finestra.close()
              vaiA(sezione.id)
            },
          },
          icona(sezione.simbolo),
          sezione.titolo,
        ),
        h('span', { class: 'guida__lente-conto' }, T.diQuante(indice + 1, FIGURE.length)),
        pulsante({ simbolo: 'sinistra', variante: 'sottile', titolo: T.precedente, al: () => sposta(-1) }),
        pulsante({ simbolo: 'destra', variante: 'sottile', titolo: T.successiva, al: () => sposta(1) }),
        pulsante({ simbolo: 'chiudi', variante: 'sottile', titolo: T.chiudi, al: () => finestra.close() }),
      ),
      h('div', { class: 'guida__lente-corpo', attr: { tabindex: -1 } }, disegnoVivo(questa, dove)),
      didascalia(questa, []),
      legenda(questa, dove, []) ?? '',
    )
  }
  const sposta = (passo: number): void => {
    indice = (indice + passo + FIGURE.length) % FIGURE.length
    mostra()
  }

  finestra.addEventListener('keydown', (evento: KeyboardEvent) => {
    if (evento.key === 'ArrowRight') { evento.preventDefault(); sposta(1) }
    if (evento.key === 'ArrowLeft') { evento.preventDefault(); sposta(-1) }
  })
  // Un clic sul velo chiude: solo lì il bersaglio è il `<dialog>` stesso.
  finestra.addEventListener('click', (evento) => {
    if (evento.target === finestra) finestra.close()
  })
  finestra.addEventListener('close', () => finestra.remove())
  mostra()
  document.body.appendChild(finestra)
  finestra.showModal()
  // Il fuoco sul disegno e non sul primo pulsante: le frecce sfogliano subito.
  finestra.querySelector<HTMLElement>('.guida__lente-corpo')?.focus()
}

// -------------------------------------------------------------- le sezioni

/** Una voce: il gesto in grassetto, la spiegazione di seguito. */
function voceGuida (
  sezione: SezioneGuida,
  voce: VoceGuida,
  forme: readonly string[],
): HTMLElement {
  const indice = sezione.voci.indexOf(voce)
  const numero = sezione.passi ? indice + 1 : undefined
  return h(
    'li',
    {
      class: ['guida__voce', numero !== undefined && 'guida__voce--passo'],
      attr: { id: idVoce(sezione.id, indice) },
    },
    h(
      'div',
      { class: 'guida__capo' },
      numero !== undefined ? h('span', { class: 'guida__numero' }, String(numero)) : null,
      h('strong', { class: 'guida__termine' }, ...testoRicco(voce.termine, forme)),
      voce.tasti ? tastiera(voce.tasti) : null,
    ),
    h('span', { class: 'guida__testo' }, ...testoRicco(voce.testo, forme)),
  )
}

const NOTE: Record<NotaGuida['tipo'], { titolo: string, simbolo: NomeIcona }> = {
  meccanismo: { titolo: T.note.meccanismo, simbolo: 'informazione' },
  consiglio: { titolo: T.note.consiglio, simbolo: 'stella' },
  attenzione: { titolo: parole().attenzione, simbolo: 'avviso' },
}

/** Un riquadro a margine: il perché, la scorciatoia, o quel che non si disfa. */
function notaGuida (nota: NotaGuida, forme: readonly string[]): HTMLElement {
  const { titolo, simbolo } = NOTE[nota.tipo]
  return h(
    'aside',
    { class: ['guida__nota', `guida__nota--${nota.tipo}`] },
    icona(simbolo),
    h(
      'div',
      null,
      h('strong', { class: 'guida__nota-titolo' }, titolo),
      h('span', null, ...testoRicco(nota.testo, forme)),
    ),
  )
}

function bottoneSezione (altra: SezioneGuida, prima?: string): HTMLElement {
  return h(
    'button',
    { class: 'guida__vedi-voce', type: 'button', onclick: () => vaiA(altra.id) },
    prima ? h('span', { class: 'guida__vedi-prima' }, prima) : null,
    icona(altra.simbolo),
    altra.titolo,
  )
}

/**
 * In fondo alla sezione: «Vedi anche» con le sezioni vicine, e la sezione dopo
 * nell'ordine della guida. Gli `id` che non esistono si saltano.
 */
function piede (sezione: SezioneGuida, inRicerca: boolean): HTMLElement | null {
  const vicine = (sezione.vedi ?? [])
    .map((id) => GUIDA.find((altra) => altra.id === id))
    .filter((altra): altra is SezioneGuida => altra !== undefined)
  const dopo = inRicerca ? undefined : GUIDA[GUIDA.indexOf(sezione) + 1]
  if (vicine.length === 0 && !dopo) return null
  return h(
    'div',
    { class: 'guida__vedi' },
    vicine.length > 0 ? h('span', { class: 'guida__vedi-titolo' }, T.vediAnche) : null,
    ...vicine.map((altra) => bottoneSezione(altra)),
    dopo
      ? h('span', { class: 'guida__vedi-dopo' }, bottoneSezione(dopo, T.poi))
      : null,
  )
}

function sezioneGuida (
  sezione: SezioneGuida,
  voci: VoceGuida[],
  forme: readonly string[],
  inRicerca: boolean,
): HTMLElement {
  // La testata di `scheda` con l'icona e il titolo della voce dell'indice.
  return h(
    'section',
    { class: ['scheda', 'guida__sezione', sezione.passi && 'guida__sezione--passi'] },
    h(
      'header',
      { class: 'scheda__testata' },
      h('span', { class: 'guida__sezione-simbolo' }, icona(sezione.simbolo)),
      h(
        'div',
        { class: 'scheda__titoli' },
        h('h3', { class: 'scheda__titolo' }, sezione.titolo),
        h('p', { class: 'scheda__sottotitolo' }, sezione.sommario),
      ),
      h(
        'div',
        { class: 'scheda__azioni guida__sezione-azioni' },
        inRicerca ? pastiglia(T.parti[sezione.parte], 'quiete') : null,
        sezione.vista
          ? pulsante({
              testo: T.apriLaPagina,
              simbolo: 'destra',
              variante: 'sottile',
              titolo: T.apriLaPaginaDi(sezione.titolo),
              al: () => aggiorna({ vista: sezione.vista }),
            })
          : null,
      ),
    ),
    h(
      'div',
      { class: 'scheda__corpo guida__corpo' },
      sezione.figure?.length
        ? h('div', { class: 'guida__figure' }, ...sezione.figure.map((figura) => figuraGuida(figura, forme)))
        : null,
      h(
        sezione.passi ? 'ol' : 'ul',
        { class: 'guida__voci' },
        ...voci.map((voce) => voceGuida(sezione, voce, forme)),
      ),
      sezione.note?.length
        ? h('div', { class: 'guida__note' }, ...sezione.note.map((nota) => notaGuida(nota, forme)))
        : null,
      piede(sezione, inRicerca),
    ),
  )
}

function ancora (sezione: SezioneGuida, contenuto: HTMLElement): HTMLElement {
  return h(
    'div',
    { class: 'guida__ancora', attr: { id: `guida-${sezione.id}` }, dataset: { sezione: sezione.id } },
    contenuto,
  )
}

// ------------------------------------------------------------------ l'indice

/**
 * L'indice: porta alla sezione scorrendo e segue lo scorrimento. È diviso come
 * la barra laterale.
 */
function indiceGuida (trovate: Map<string, number>, inRicerca: boolean): HTMLElement {
  return h(
    'nav',
    {
      class: 'colonna guida__indice',
      // Scorre per conto suo (la voce accesa la tiene dentro `tenereInVista`); la
      // marca evita che un ridisegno lo riporti in cima.
      attr: { 'aria-label': T.indice, 'data-scorrimento': 'guida-indice' },
    },
    h(
      'div',
      { class: 'guida__indice-testa' },
      icona('libro'),
      h('span', null, inRicerca ? T.doveSiTrova : T.argomenti),
    ),
    ...PARTI.map((parte) => {
      const sezioni = GUIDA.filter((sezione) => sezione.parte === parte && trovate.has(sezione.id))
      if (sezioni.length === 0) return null
      return h(
        'div',
        { class: 'guida__indice-parte' },
        h('h4', { class: 'guida__indice-titolo' }, T.parti[parte]),
        h(
          'ul',
          { class: 'guida__indice-voci' },
          ...sezioni.map((sezione) =>
            h(
              'li',
              null,
              h(
                'button',
                {
                  class: ['guida__indice-voce', sezione.id === sezioneQui && 'guida__indice-voce--qui'],
                  type: 'button',
                  dataset: { sezione: sezione.id },
                  onclick: () => vaiA(sezione.id),
                },
                icona(sezione.simbolo),
                h('span', { class: 'guida__indice-nome' }, sezione.titolo),
                inRicerca
                  ? h('span', { class: 'guida__indice-conto' }, String(trovate.get(sezione.id)))
                  : (sezione.figure?.length ?? 0) > 0
                      ? h(
                          'span',
                          {
                            class: 'guida__indice-figure',
                            title: T.figureDellaSezione(sezione.figure?.length ?? 0),
                          },
                          icona('immagine'),
                        )
                      : null,
              ),
            ),
          ),
        ),
      )
    }),
  )
}

// ------------------------------------------------------------------ la testa

function cercaAncora (testo: string): void {
  cercato = testo
  aggiorna({})
  // Il cursore resta nella casella, in fondo: si può continuare a scrivere.
  requestAnimationFrame(() => {
    const casella = casellaCerca()
    casella?.focus()
    casella?.setSelectionRange(testo.length, testo.length)
  })
}

/**
 * La casella della ricerca, con `data-fuoco`. A ogni lettera `alCambio`
 * ridisegna solo le parti che la ricerca cambia, lasciando la casella dov'è.
 * Il risultato si legge all'Invio, perché la casella sopravvive a molte ricerche.
 */
function campoCerca (risultato: () => Risultato, alCambio: () => void): HTMLElement {
  const tasto = h('span', { class: 'guida__cerca-tasto', attr: { 'aria-hidden': 'true' } }, cercato ? T.tastoInvio : '/')
  return h(
    'div',
    { class: 'guida__cerca' },
    icona('lente'),
    h('input', {
      class: 'campo__controllo',
      type: 'search',
      value: cercato,
      placeholder: T.segnaposto,
      dataset: { fuoco: 'guida-cerca' },
      attr: { 'aria-label': T.cercaNellaGuida, autocomplete: 'off', spellcheck: 'false' },
      oninput: (evento: Event) => {
        cercato = (evento.target as HTMLInputElement).value
        tasto.textContent = cercato ? T.tastoInvio : '/'
        alCambio()
      },
      onkeydown: (evento: KeyboardEvent) => {
        if (evento.key === 'Escape' && cercato) {
          evento.preventDefault()
          cercaAncora('')
        } else if (evento.key === 'ArrowDown') {
          evento.preventDefault()
          document.querySelector<HTMLElement>('.guida__risposta')?.focus()
        } else if (evento.key === 'Enter') {
          // Invio: la risposta migliore, senza doverla cercare con gli occhi.
          const prima = migliori(risultato(), 1)[0]
          if (!prima) return
          evento.preventDefault()
          vaiA(prima.sezione.id, prima.sezione.voci.indexOf(prima.voce))
        }
      },
    }),
    tasto,
  )
}

/** «Stavi guardando…»: in cima, la sezione della pagina da cui si è arrivati. */
function daDoveVieni (): HTMLElement | null {
  const sezione = sezioneDellaVista(provenienza)
  if (!sezione) return null
  return h(
    'div',
    { class: 'guida__provenienza' },
    icona(sezione.simbolo),
    h(
      'span',
      { class: 'guida__provenienza-testo' },
      T.staviGuardando,
      h('strong', null, sezione.titolo),
      '. ',
      h('span', { class: 'guida__provenienza-sommario' }, sezione.sommario),
    ),
    pulsante({ testo: T.leggiCome, simbolo: 'destra', variante: 'sottile', al: () => vaiA(sezione.id) }),
  )
}

/** In cima: che cos'è questa pagina, da dove si viene, e le parole da provare. */
function benvenuto (): HTMLElement {
  const scorciatoia = (testo: string, simbolo: NomeIcona, id: string): HTMLButtonElement =>
    pulsante({ testo, simbolo, variante: 'sottile', al: () => vaiA(id) })

  return h(
    'section',
    { class: 'guida__benvenuto' },
    h(
      'div',
      { class: 'guida__benvenuto-testo' },
      h('h3', { class: 'guida__benvenuto-titolo' }, T.benvenutoTitolo),
      h(
        'p',
        null,
        ...testoRicco(T.benvenutoTesto),
      ),
    ),
    h(
      'div',
      { class: 'guida__benvenuto-scorciatoie' },
      cercato
        ? null
        : [
            scorciatoia(T.primiPassi, 'stella', 'primi-passi'),
            scorciatoia(T.scorciatoie, 'stellaPiena', 'scorciatoie'),
            scorciatoia(T.guai, 'avviso', 'guai'),
            h('span', { class: 'guida__prova' }, T.prova),
            ...T.daProvare.map((parola) =>
              h('button', { class: 'guida__suggerimento', type: 'button', onclick: () => cercaAncora(parola) }, parola),
            ),
          ],
    ),
    cercato ? null : daDoveVieni(),
  )
}

/**
 * Le risposte migliori, in cima ai risultati: la voce, dove sta, e le prime
 * parole della spiegazione. Si scorrono con le frecce, e Invio ci porta.
 */
function risposteMigliori (risultato: Risultato): HTMLElement | null {
  const prime = migliori(risultato, 5)
  if (prime.length === 0) return null
  const forme = risultato.forme
  const spostaFuoco = (evento: KeyboardEvent): void => {
    const tutte = [...document.querySelectorAll<HTMLElement>('.guida__risposta')]
    const qui = tutte.indexOf(evento.currentTarget as HTMLElement)
    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      tutte[Math.min(qui + 1, tutte.length - 1)]?.focus()
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      if (qui <= 0) casellaCerca()?.focus()
      else tutte[qui - 1]?.focus()
    }
  }
  return h(
    'section',
    { class: 'guida__risposte', attr: { 'aria-label': T.risposteMigliori } },
    h('h3', { class: 'guida__risposte-titolo' }, T.risposteMigliori),
    h(
      'ol',
      { class: 'guida__risposte-elenco' },
      ...prime.map(({ sezione, voce }) =>
        h(
          'li',
          null,
          h(
            'button',
            {
              class: 'guida__risposta',
              type: 'button',
              onclick: () => vaiA(sezione.id, sezione.voci.indexOf(voce)),
              onkeydown: spostaFuoco,
            },
            h('span', { class: 'guida__risposta-simbolo' }, icona(sezione.simbolo)),
            h(
              'span',
              { class: 'guida__risposta-corpo' },
              h(
                'span',
                { class: 'guida__risposta-capo' },
                h('strong', null, ...testoRicco(voce.termine, forme)),
                h('span', { class: 'guida__risposta-dove' }, `${T.parti[sezione.parte]} › ${sezione.titolo}`),
              ),
              h('span', { class: 'guida__risposta-testo' }, ...evidenzia(assaggio(voce.testo), forme)),
            ),
            icona('destra'),
          ),
        ),
      ),
    ),
  )
}

// ------------------------------------------------------------------ la pagina

export function vistaGuida (): Figlio {
  let risultato = cerca(GUIDA, cercato)
  let parti = partiDellaGuida(risultato)

  // Dopo il disegno: gli elementi devono essere in pagina per l'osservatore e lo scorrimento.
  requestAnimationFrame(dopoIlDisegno)

  // Una lettera in più rifà le tre parti che dipendono dalla ricerca e lascia la
  // fascia della casella, così il fuoco resta.
  const ricerca = (): void => {
    risultato = cerca(GUIDA, cercato)
    const nuove = partiDellaGuida(risultato)
    parti.testata.replaceWith(nuove.testata)
    parti.benvenuto.replaceWith(nuove.benvenuto)
    parti.colonne.replaceWith(nuove.colonne)
    parti = nuove
    requestAnimationFrame(dopoIlDisegno)
  }

  return h(
    'div',
    { class: 'vista vista--guida' },
    parti.testata,
    parti.benvenuto,
    // La ricerca sta in una fascia sua, appiccicata in cima: dentro il benvenuto
    // `sticky` non uscirebbe dal genitore, che scorre via.
    h('div', { class: 'guida__barra-cerca' }, campoCerca(() => risultato, ricerca)),
    parti.colonne,
  )
}

/** Le parti della pagina che cambiano con la ricerca: tutto tranne la casella. */
function partiDellaGuida (risultato: Risultato): {
  testata: HTMLElement
  benvenuto: HTMLElement
  colonne: HTMLElement
} {
  const inRicerca = cercato.trim().length > 0
  const forme = risultato.forme
  const trovate = new Map(risultato.sezioni.map(({ sezione, voci }) => [sezione.id, voci.length]))
  const vociInTutto = GUIDA.reduce((somma, sezione) => somma + sezione.voci.length, 0)
  const vociTrovateInTutto = risultato.sezioni.reduce((somma, { voci }) => somma + voci.length, 0)

  const sezioni = risultato.sezioni.map(({ sezione, voci }) =>
    ancora(sezione, sezioneGuida(sezione, voci.map(({ voce }) => voce), forme, inRicerca)),
  )

  const testata = testataVista({
    titolo: T.titolo,
    sottotitolo: T.sottotitolo,
    contorno: inRicerca
      ? pastiglia(
          T.vociTrovate(vociTrovateInTutto),
          vociTrovateInTutto > 0 ? 'informativo' : 'attenzione',
          'lente',
        )
      : pastiglia(
          T.conto(GUIDA.length, vociInTutto, FIGURE.length),
          'quiete',
          'informazione',
        ),
  })

  // Il testo a sinistra e l'indice a destra: a sinistra c'è già la barra laterale.
  const colonne = h(
    'div',
    { class: 'colonne colonne--guida' },
    h(
      'div',
      { class: 'colonna' },
      risultato.sezioni.length === 0
        ? statoVuoto({
            simbolo: 'lente',
            titolo: T.nienteTitolo,
            testo: T.nienteTesto,
            azione: h(
              'div',
              { class: 'guida__vuoto-azioni' },
              risultato.forse
                ? pulsante({
                    testo: T.forseCercavi(risultato.forse),
                    simbolo: 'lente',
                    variante: 'primario',
                    al: () => cercaAncora(risultato.forse ?? ''),
                  })
                : null,
              pulsante({ testo: T.mostraTutta, simbolo: 'chiudi', al: () => cercaAncora('') }),
            ),
          })
        : inRicerca
          ? [risposteMigliori(risultato), ...sezioni]
          : PARTI.map((parte) => {
              const diQuesta = sezioni.filter((_, indice) =>
                risultato.sezioni[indice].sezione.parte === parte)
              if (diQuesta.length === 0) return null
              return h(
                'div',
                { class: 'guida__parte' },
                h('h3', { class: 'guida__parte-titolo' }, T.parti[parte]),
                ...diQuesta,
              )
            }),
    ),
    indiceGuida(trovate, inRicerca),
  )

  return { testata, benvenuto: benvenuto(), colonne }
}
