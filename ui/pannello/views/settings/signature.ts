// La firma delle e-mail, scritta come la si vede: un campo modificabile sul
// posto con una barra di sei gesti; si può incollare quella di Outlook.
// Quel che entra si pulisce: ogni HTML (incollato, trascinato, letto dal
// documento) passa da `pulisciFirma` prima di entrare nel campo e prima di
// essere salvato, perché dentro il pannello un `<img onerror=…>` girerebbe con
// i permessi del registro. Resta solo la formattazione.
// Il campo non si ricostruisce: nasce una volta e il ridisegno lo rimette al
// suo posto, con il cursore, per non perdere quel che si sta scrivendo.

import { pulsante } from '../../components/base.js'
import { h } from '../../dom.js'
import { testi } from './signature.testi.js'

// ------------------------------------------------------------------ la pulizia

/** Si buttano con tutto quel che hanno dentro: non c'è niente da salvare. */
const DA_BUTTARE = new Set([
  'script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'link', 'meta',
  'base', 'title', 'head', 'xml', 'form', 'input', 'button', 'textarea', 'select', 'option',
  'svg', 'math', 'noscript', 'template', 'audio', 'video', 'source', 'track', 'canvas', 'dialog',
])

/**
 * I tag che una firma può contenere. Gli altri si sciolgono (resta il contenuto),
 * come serve per i tag di Office (`o:p`, `v:shape`).
 */
const AMMESSI = new Set([
  'a', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'span', 'font', 'p', 'div', 'br', 'img',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'col', 'colgroup', 'caption',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'blockquote', 'sup', 'sub',
  'small', 'big', 'center',
])

/** Gli attributi che portano formattazione, e nient'altro: nessun `on…`, nessun `class`. */
const ATTRIBUTI = new Set([
  'style', 'href', 'src', 'alt', 'title', 'width', 'height', 'align', 'valign', 'color', 'face',
  'size', 'colspan', 'rowspan', 'border', 'cellpadding', 'cellspacing', 'bgcolor',
])

/** Uno stile che prova a caricare qualcosa o a eseguire qualcosa non è formattazione. */
const STILE_PERICOLOSO = /expression\s*\(|url\s*\(|javascript:|behavior\s*:|-moz-binding|@import/i

/** Dove può portare un collegamento: una pagina, una mail, un telefono. */
const COLLEGAMENTO_AMMESSO = /^\s*(https?:|mailto:|tel:)/i

/**
 * Da dove può venire un'immagine: web o dentro la firma. Un `file:///…`
 * (quel che Outlook mette negli appunti) non arriverebbe a chi riceve.
 */
const IMMAGINE_AMMESSA = /^\s*(https?:|data:image\/(png|jpe?g|gif|webp);base64,)/i

function pulisciNodo (nodo: Node): void {
  for (const figlio of [...nodo.childNodes]) {
    if (figlio.nodeType === Node.TEXT_NODE) continue
    if (figlio.nodeType !== Node.ELEMENT_NODE) {
      // I commenti (anche i `<!--[if gte mso 9]>` di Office) e tutto quel che non è
      // né testo né elemento.
      figlio.parentNode?.removeChild(figlio)
      continue
    }
    const elemento = figlio as Element
    const nome = elemento.localName.toLowerCase()
    if (DA_BUTTARE.has(nome)) {
      elemento.remove()
      continue
    }
    pulisciNodo(elemento)
    if (!AMMESSI.has(nome) || elemento.namespaceURI !== 'http://www.w3.org/1999/xhtml') {
      elemento.replaceWith(...elemento.childNodes)
      continue
    }
    for (const attributo of [...elemento.attributes]) {
      const chiave = attributo.name.toLowerCase()
      const valore = attributo.value
      const via =
        !ATTRIBUTI.has(chiave) ||
        (chiave === 'style' && STILE_PERICOLOSO.test(valore)) ||
        (chiave === 'href' && !COLLEGAMENTO_AMMESSO.test(valore))
      if (via) elemento.removeAttribute(attributo.name)
    }
    if (nome === 'img' && !IMMAGINE_AMMESSA.test(elemento.getAttribute('src') ?? '')) {
      elemento.remove()
    }
  }
}

/**
 * Una firma pulita: la formattazione resta, il resto se ne va. `DOMParser`
 * costruisce un documento inerte (niente script, niente caricamenti). Una
 * firma senza testo né immagini è vuota, cioè «quella di serie».
 */
function pulisciFirma (html: string): string {
  const documento = new DOMParser().parseFromString(html, 'text/html')
  pulisciNodo(documento.body)
  const vuota =
    (documento.body.textContent ?? '').trim() === '' &&
    documento.body.querySelector('img') === null
  return vuota ? '' : documento.body.innerHTML.trim()
}

// ------------------------------------------------------------------ il campo

/** Dov'era il cursore: nodi e posizioni, non un `Range`, che si sposta da sé se il campo esce di pagina. */
interface Selezione {
  inizio: Node
  daInizio: number
  fine: Node
  daFine: number
}

/** Quel che si passa al campo, a ogni ridisegno. */
interface OpzioniFirma {
  /** La firma scritta nel documento, o `''` per quella di serie. */
  firma: string
  /** La firma di serie, com'è adesso: si vede in grigio quando il campo è vuoto. */
  diSerie: HTMLElement
  /** Chiamata quando si lascia il campo con qualcosa di cambiato: l'HTML già pulito. */
  salva: (html: string) => void
  /** Chiede l'indirizzo di un collegamento; `null` se si rinuncia. */
  chiediIndirizzo: (attuale: string) => Promise<string | null>
}

let campo: HTMLDivElement | null = null
let involucro: HTMLElement | null = null
let posto: HTMLElement | null = null
/** La firma che il campo mostra da ultimo: se il documento ne ha un'altra, si ricarica. */
let caricata: string | null = null
let ultimaSelezione: Selezione | null = null
/** Il cursore da rimettere al prossimo fuoco: c'è solo se il ridisegno lo ha portato via. */
let daRimettere: Selezione | null = null
let opzioniAttuali: OpzioniFirma | null = null

function dentroIlCampo (nodo: Node | null): boolean {
  return Boolean(campo && nodo && campo.contains(nodo))
}

document.addEventListener('selectionchange', () => {
  const selezione = document.getSelection()
  if (!selezione || selezione.rangeCount === 0) return
  const intervallo = selezione.getRangeAt(0)
  if (!dentroIlCampo(intervallo.startContainer)) return
  ultimaSelezione = {
    inizio: intervallo.startContainer,
    daInizio: intervallo.startOffset,
    fine: intervallo.endContainer,
    daFine: intervallo.endOffset,
  }
})

/** Rimette il cursore dov'era, se quei nodi sono ancora nel campo. */
function rimetti (selezione: Selezione | null): void {
  if (!selezione || !dentroIlCampo(selezione.inizio) || !dentroIlCampo(selezione.fine)) return
  try {
    const intervallo = document.createRange()
    intervallo.setStart(selezione.inizio, selezione.daInizio)
    intervallo.setEnd(selezione.fine, selezione.daFine)
    const attuale = document.getSelection()
    attuale?.removeAllRanges()
    attuale?.addRange(intervallo)
  } catch {
    // Un nodo accorciato nel frattempo: il cursore resta dove l'ha messo il fuoco.
  }
}

/** Accende o spegne la firma di serie in grigio, secondo quel che c'è nel campo. */
function segnaVuota (): void {
  if (!campo || !involucro) return
  const vuota = (campo.textContent ?? '').trim() === '' && campo.querySelector('img') === null
  involucro.classList.toggle('firma--vuota', vuota)
}

/** Mette HTML pulito dove sta il cursore. */
function inserisci (html: string): void {
  document.execCommand('insertHTML', false, pulisciFirma(html) || '')
}

/** Un gesto della barra: tiene il fuoco nel campo, e con lui la selezione. */
function gesto (
  detto: { testo: string, titolo: string },
  al: () => void,
  classe?: string,
): HTMLButtonElement {
  const bottone = pulsante({
    testo: detto.testo,
    titolo: detto.titolo,
    variante: 'sottile',
    ...(classe ? { classe } : {}),
    al: () => {
      campo?.focus()
      rimetti(ultimaSelezione)
      al()
      segnaVuota()
    },
  })
  // Senza, il pulsante porta via il fuoco e la selezione dal campo.
  bottone.addEventListener('mousedown', (evento) => evento.preventDefault())
  return bottone
}

function comando (nome: string, valore?: string): void {
  document.execCommand(nome, false, valore)
}

/** Quanto è grande il testo: le tre misure che un programma di posta sa rendere. */
const MISURE = [
  { nome: 'piccolo', valore: '2' },
  { nome: 'normale', valore: '3' },
  { nome: 'grande', valore: '5' },
] as const

function barra (): HTMLElement {
  const t = testi()
  const colore = h('input', {
    class: 'firma__colore',
    type: 'color',
    value: '#000000',
    attr: { title: t.coloreTesto, 'aria-label': t.coloreTesto },
  })
  // Il selettore del colore prende il fuoco: la selezione si rimette da quella
  // tenuta da parte.
  colore.addEventListener('change', () => {
    campo?.focus()
    rimetti(ultimaSelezione)
    comando('foreColor', colore.value)
  })

  return h(
    'div',
    { class: 'firma__barra', attr: { role: 'toolbar', 'aria-label': t.barra } },
    gesto(t.grassetto, () => comando('bold'), 'firma__gesto--grassetto'),
    gesto(t.corsivo, () => comando('italic'), 'firma__gesto--corsivo'),
    gesto(t.sottolineato, () => comando('underline'), 'firma__gesto--sottolineato'),
    h('span', { class: 'firma__stacco' }),
    ...MISURE.map((misura) => gesto(t[misura.nome], () => comando('fontSize', misura.valore))),
    h('span', { class: 'firma__stacco' }),
    colore,
    gesto(t.collegamento, () => {
      void chiediCollegamento()
    }),
    gesto(t.rimuovi, () => {
      comando('removeFormat')
      comando('unlink')
    }),
  )
}

/** Chiede l'indirizzo e fa della parte scelta un collegamento. */
async function chiediCollegamento (): Promise<void> {
  if (!opzioniAttuali) return
  // La finestra dell'indirizzo porta via il fuoco: serve la selezione di adesso.
  const selezione = ultimaSelezione
  const esistente = document.getSelection()?.anchorNode?.parentElement?.closest('a')?.getAttribute('href') ?? ''
  const indirizzo = await opzioniAttuali.chiediIndirizzo(esistente)
  campo?.focus()
  rimetti(selezione)
  if (indirizzo === null) return
  const pulito = indirizzo.trim()
  if (pulito === '') {
    comando('unlink')
    return
  }
  // Un indirizzo senza schema è quasi sempre una pagina o una mail.
  const completo = COLLEGAMENTO_AMMESSO.test(pulito)
    ? pulito
    // testo-fisso: gli schemi di un indirizzo, li legge il programma di posta
    : pulito.includes('@') ? `mailto:${pulito}` : `https://${pulito}`
  const vuota = document.getSelection()?.isCollapsed ?? true
  if (vuota) {
    inserisci(`<a href="${completo.replace(/"/g, '&quot;')}">${pulito.replace(/</g, '&lt;')}</a>`)
  } else {
    comando('createLink', completo)
  }
}

/** Salva, se quel che c'è nel campo è diverso da quel che c'è nel documento. */
function consegna (): void {
  if (!campo || !opzioniAttuali) return
  const html = pulisciFirma(campo.innerHTML)
  if (html === (caricata ?? '')) return
  caricata = html
  opzioniAttuali.salva(html)
}

function costruisci (): void {
  campo = h('div', {
    class: 'firma__campo',
    attr: {
      contenteditable: 'true',
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': testi().campo,
      spellcheck: 'true',
      // Il ridisegno rimette il fuoco dov'era guardando questa chiave.
      'data-fuoco': 'intestazione-firma',
    },
  })
  // Stili in linea e non `<b>`/`<font>`: li rendono meglio i programmi di posta.
  document.execCommand('styleWithCSS', false, 'true')

  campo.addEventListener('input', segnaVuota)
  campo.addEventListener('focus', () => {
    if (daRimettere) {
      rimetti(daRimettere)
      daRimettere = null
    }
  })
  campo.addEventListener('blur', () => {
    // Un campo che esce di pagina per il ridisegno perde il fuoco: non si salva.
    if (campo?.isConnected) consegna()
  })
  campo.addEventListener('paste', (evento) => {
    const dati = evento.clipboardData
    if (!dati) return
    evento.preventDefault()
    const html = dati.getData('text/html')
    if (html) inserisci(html)
    else document.execCommand('insertText', false, dati.getData('text/plain'))
    segnaVuota()
  })
  campo.addEventListener('drop', (evento) => {
    const dati = evento.dataTransfer
    if (!dati) return
    evento.preventDefault()
    const html = dati.getData('text/html')
    if (html) inserisci(html)
    else if (dati.getData('text/plain')) document.execCommand('insertText', false, dati.getData('text/plain'))
    segnaVuota()
  })

  posto = h('div', { class: 'firma__serie', attr: { 'aria-hidden': 'true' } })
  involucro = h(
    'div',
    { class: 'firma' },
    barra(),
    h('div', { class: 'firma__foglio' }, campo, posto),
  )
}

/**
 * Il campo della firma: lo stesso elemento a ogni chiamata. Se il documento ha
 * intanto un'altra firma e il campo non ha il fuoco, si ricarica.
 */
export function campoFirma (opzioni: OpzioniFirma): HTMLElement {
  if (!campo || !involucro || !posto) costruisci()
  opzioniAttuali = opzioni
  const attivo = campo as HTMLDivElement
  const conFuoco = document.activeElement === attivo

  if (conFuoco) {
    // Lo spostamento nella vista nuova porta via il cursore: lo si rimette al fuoco.
    daRimettere = ultimaSelezione
  } else if (opzioni.firma !== caricata) {
    attivo.innerHTML = pulisciFirma(opzioni.firma)
    caricata = opzioni.firma
  }

  ;(posto as HTMLElement).replaceChildren(opzioni.diSerie)
  segnaVuota()
  return involucro as HTMLElement
}
