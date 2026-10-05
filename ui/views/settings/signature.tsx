// La firma delle e-mail, scritta come la si vede: un campo modificabile sul
// posto con una barra di sei gesti; si può incollare quella di Outlook.
// Quel che entra si pulisce: ogni HTML (incollato, trascinato, letto dal
// documento) passa da `pulisciFirma` prima di entrare nel campo e prima di
// essere salvato, perché dentro il pannello un `<img onerror=…>` girerebbe con
// i permessi del registro. Resta solo la formattazione.
// Il campo non è controllato: React non ne tocca il contenuto, che si scrive
// solo da qui (sempre pulito, mai `dangerouslySetInnerHTML`), e il disegno lo
// lascia com'è, con il cursore, per non perdere quel che si sta scrivendo.

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'

import { classi } from '#ui/classNames.js'
import { Pulsante } from '#ui/components/base.js'
import { Input } from '#ui/fields.js'
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

/** Quel che si passa al campo, a ogni disegno. */
interface OpzioniFirma {
  /** La firma scritta nel documento, o `''` per quella di serie. */
  firma: string
  /** La firma di serie, com'è adesso: si vede in grigio quando il campo è vuoto. */
  diSerie: ReactNode
  /** Chiamata quando si lascia il campo con qualcosa di cambiato: l'HTML già pulito. */
  salva: (html: string) => void
  /** Chiede l'indirizzo di un collegamento; `null` se si rinuncia. */
  chiediIndirizzo: (attuale: string) => Promise<string | null>
}

/**
 * La firma che il campo mostra da ultimo: se il documento ne ha un'altra, si
 * ricarica. Con quel che c'era scritto lasciando la pagina: fuori dal
 * componente, come prima il campo stesso, così tornando lo si ritrova.
 */
let caricata: string | null = null
let bozza: string | null = null

/** Rimette il cursore dov'era, se quei nodi sono ancora nel campo. */
function rimetti (campo: HTMLElement | null, selezione: Selezione | null): void {
  if (!campo || !selezione || !campo.contains(selezione.inizio) || !campo.contains(selezione.fine)) return
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

/** Se nel campo non c'è niente: allora si vede la firma di serie, in grigio. */
function èVuoto (campo: HTMLElement | null): boolean {
  if (!campo) return true
  return (campo.textContent ?? '').trim() === '' && campo.querySelector('img') === null
}

/** Mette HTML pulito dove sta il cursore. */
function inserisci (html: string): void {
  document.execCommand('insertHTML', false, pulisciFirma(html) || '')
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

/** Un gesto della barra: tiene il fuoco nel campo, e con lui la selezione. */
function Gesto ({ detto, al, classe, prima, dopo }: {
  detto: { testo: string, titolo: string }
  al: () => void
  classe?: string
  /** Riporta il fuoco nel campo con la selezione di prima. */
  prima: () => void
  /** Rifà il segno «vuota» secondo quel che c'è adesso. */
  dopo: () => void
}): ReactElement {
  return (
    <Pulsante
      testo={detto.testo}
      titolo={detto.titolo}
      variante="sottile"
      classe={classe}
      // Senza, il pulsante porta via il fuoco e la selezione dal campo.
      onMouseDown={(evento) => evento.preventDefault()}
      al={() => {
        prima()
        al()
        dopo()
      }}
    />
  )
}

/**
 * Il campo della firma. Se il documento ha intanto un'altra firma e il campo
 * non ha il fuoco, si ricarica.
 */
function CampoFirma (opzioni: OpzioniFirma): ReactElement {
  const t = testi()
  const campo = useRef<HTMLDivElement | null>(null)
  const ultimaSelezione = useRef<Selezione | null>(null)
  const ultime = useRef(opzioni)
  const [vuota, impostaVuota] = useState(() => opzioni.firma.trim() === '')

  const segnaVuota = (): void => impostaVuota(èVuoto(campo.current))
  const riprendi = (): void => {
    campo.current?.focus()
    rimetti(campo.current, ultimaSelezione.current)
  }

  // Le opzioni dell'ultimo disegno, per i gestori e lo smontaggio.
  useLayoutEffect(() => { ultime.current = opzioni })

  // Il contenuto entra solo da qui, pulito: al primo disegno quel che si era
  // lasciato scritto o la firma del documento; poi la firma del documento quando
  // ne arriva un'altra e il campo non ha il fuoco (col fuoco vince quel che si
  // sta scrivendo, che uscendo si salva).
  const montato = useRef(false)
  useLayoutEffect(() => {
    const nodo = campo.current
    if (!nodo) return
    const primo = !montato.current
    montato.current = true
    if (primo && bozza !== null && opzioni.firma === caricata) {
      nodo.innerHTML = pulisciFirma(bozza)
    } else if (primo || (document.activeElement !== nodo && opzioni.firma !== caricata)) {
      nodo.innerHTML = pulisciFirma(opzioni.firma)
      caricata = opzioni.firma
    } else {
      return
    }
    bozza = null
    impostaVuota(èVuoto(nodo))
  }, [opzioni.firma])

  useEffect(() => {
    // Stili in linea e non `<b>`/`<font>`: li rendono meglio i programmi di posta.
    document.execCommand('styleWithCSS', false, 'true')
    const segui = (): void => {
      const selezione = document.getSelection()
      if (!selezione || selezione.rangeCount === 0) return
      const intervallo = selezione.getRangeAt(0)
      if (!campo.current?.contains(intervallo.startContainer)) return
      ultimaSelezione.current = {
        inizio: intervallo.startContainer,
        daInizio: intervallo.startOffset,
        fine: intervallo.endContainer,
        daFine: intervallo.endOffset,
      }
    }
    document.addEventListener('selectionchange', segui)
    const nodo = campo.current
    return () => {
      document.removeEventListener('selectionchange', segui)
      // Lasciando la pagina quel che non si è ancora salvato resta da parte.
      if (nodo && pulisciFirma(nodo.innerHTML) !== (caricata ?? '')) bozza = nodo.innerHTML
    }
  }, [])

  /** Salva, se quel che c'è nel campo è diverso da quel che c'è nel documento. */
  const consegna = (): void => {
    if (!campo.current) return
    const html = pulisciFirma(campo.current.innerHTML)
    if (html === (caricata ?? '')) return
    caricata = html
    ultime.current.salva(html)
  }

  /** Chiede l'indirizzo e fa della parte scelta un collegamento. */
  const chiediCollegamento = async (): Promise<void> => {
    // La finestra dell'indirizzo porta via il fuoco: serve la selezione di adesso.
    const selezione = ultimaSelezione.current
    const esistente = document.getSelection()?.anchorNode?.parentElement?.closest('a')?.getAttribute('href') ?? ''
    const indirizzo = await ultime.current.chiediIndirizzo(esistente)
    campo.current?.focus()
    rimetti(campo.current, selezione)
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
    const senzaScelta = document.getSelection()?.isCollapsed ?? true
    if (senzaScelta) {
      inserisci(`<a href="${completo.replace(/"/g, '&quot;')}">${pulito.replace(/</g, '&lt;')}</a>`)
    } else {
      comando('createLink', completo)
    }
    segnaVuota()
  }

  const gesto = (detto: { testo: string, titolo: string }, al: () => void, classe?: string): ReactElement => (
    <Gesto detto={detto} al={al} classe={classe} prima={riprendi} dopo={segnaVuota} />
  )

  return (
    <div className={classi('firma', vuota && 'firma--vuota')}>
      <div className="firma__barra" role="toolbar" aria-label={t.barra}>
        {gesto(t.grassetto, () => comando('bold'), 'firma__gesto--grassetto')}
        {gesto(t.corsivo, () => comando('italic'), 'firma__gesto--corsivo')}
        {gesto(t.sottolineato, () => comando('underline'), 'firma__gesto--sottolineato')}
        <span className="firma__stacco" />
        {MISURE.map((misura) => (
          <Gesto
            key={misura.nome}
            detto={t[misura.nome]}
            al={() => comando('fontSize', misura.valore)}
            prima={riprendi}
            dopo={segnaVuota}
          />
        ))}
        <span className="firma__stacco" />
        {/* Il selettore del colore prende il fuoco: la selezione si rimette da quella
            tenuta da parte. */}
        <Input
          className="firma__colore"
          type="color"
          valore="#000000"
          title={t.coloreTesto}
          aria-label={t.coloreTesto}
          onCambio={(evento) => {
            riprendi()
            comando('foreColor', (evento.target as HTMLInputElement).value)
          }}
        />
        {gesto(t.collegamento, () => {
          void chiediCollegamento()
        })}
        {gesto(t.rimuovi, () => {
          comando('removeFormat')
          comando('unlink')
        })}
      </div>
      <div className="firma__foglio">
        <div
          ref={campo}
          className="firma__campo"
          contentEditable="true"
          role="textbox"
          aria-multiline="true"
          aria-label={t.campo}
          spellCheck="true"
          // Il disegno rimette il fuoco dov'era guardando questa chiave.
          data-fuoco="intestazione-firma"
          onInput={segnaVuota}
          onBlur={(evento) => {
            // Un campo che esce di pagina perde il fuoco: non si salva.
            if (evento.currentTarget.isConnected) consegna()
          }}
          onPaste={(evento) => {
            const dati = evento.clipboardData
            evento.preventDefault()
            const html = dati.getData('text/html')
            if (html) inserisci(html)
            else document.execCommand('insertText', false, dati.getData('text/plain'))
            segnaVuota()
          }}
          onDrop={(evento) => {
            const dati = evento.dataTransfer
            evento.preventDefault()
            const html = dati.getData('text/html')
            if (html) inserisci(html)
            else if (dati.getData('text/plain')) document.execCommand('insertText', false, dati.getData('text/plain'))
            segnaVuota()
          }}
        />
        <div className="firma__serie" aria-hidden="true">{opzioni.diSerie}</div>
      </div>
    </div>
  )
}

/** Il campo della firma, con le opzioni di adesso. */
export function campoFirma (opzioni: OpzioniFirma): ReactElement {
  return <CampoFirma {...opzioni} />
}
