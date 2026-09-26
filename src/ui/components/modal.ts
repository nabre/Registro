// Finestre modali, dove si crea e si modifica ogni cosa del registro. Vivono
// fuori dal ridisegno: un aggiornamento dello stato non tocca quel che si sta
// scrivendo. Il modulo è un vero `<form>`: Invio salva, Escape annulla, e gli
// errori tornano in cima al corpo.

import { fuocoIniziale, h, rifocalizza, rimpiazza, type Figlio } from '../dom.js'
import { avviso, pulsante, valoriModulo } from './base.js'
import { suggerimento } from './hint.js'
import { icona } from './icons.js'
import { parole } from '../../domain/words.testi.js'
import { testi } from './modal.testi.js'

export interface ContestoModale {
  /** Il contenitore del modulo: da qui si leggono i valori. */
  corpo: HTMLElement
  chiudi: () => void
  mostraErrori: (errori: string[]) => void
  /** Blocca i pulsanti mentre un salvataggio è in corso. */
  occupato: (attivo: boolean) => void
  /**
   * Un numero diverso per ogni modale aperta, per rendere unici gli id dei
   * campi (`campo()` lo fa già da sé).
   */
  scope: string
}

interface OpzioniModale {
  titolo: string
  sottotitolo?: string
  /**
   * Che cosa si fa in questa finestra, dietro la «i» accanto al titolo: accanto
   * e non dentro l'`h3`, che è il nome della finestra (`aria-labelledby`).
   */
  aiuto?: Figlio
  /**
   * Quanto larga, secondo il contenuto: `stretta` per una domanda sola, `media`
   * (il riferimento) per i moduli, `larga` per un modulo con un elenco accanto.
   */
  larghezza?: 'stretta' | 'media' | 'larga'
  corpo: (contesto: ContestoModale) => Figlio
  /** Se c'è, compaiono Annulla e Salva e Invio salva. */
  alSalva?: (
    valori: Record<string, string | number | boolean>,
    contesto: ContestoModale,
  ) => void | Promise<void>
  testoSalva?: string
  /** Comandi aggiuntivi in basso a sinistra: eliminazioni, duplicazioni. */
  azioniSecondarie?: (contesto: ContestoModale) => Figlio
  /**
   * Il nome del tasto che non fa niente: senza `alSalva` è «Chiudi», ma a una
   * domanda si risponde «Annulla» (lo passa `conferma()`).
   */
  testoRinuncia?: string
  allaChiusura?: () => void
}

let contatoreModali = 0

/**
 * L'evento lanciato sul `document` prima di aprire una modale: la palette lo
 * ascolta e si chiude. È un evento e non una chiamata perché la palette importa
 * i comandi, che importano questo file.
 */
export const EVENTO_MODALE_APERTA = 'registro:modale-aperta'

/**
 * Le modali aperte, dalla prima all'ultima: un solo ascoltatore globale manda
 * Escape e Tab a quella in cima.
 */
const pila: Array<{ modulo: HTMLFormElement, chiudi: () => void, rinuncia: () => void }> = []

/**
 * Chiude tutte le modali aperte, dall'ultima, senza domande: serve quando
 * cambia il documento, perché un modulo dell'anno di prima non scriva nel nuovo.
 */
export function chiudiTutte (): void {
  for (const voce of [...pila].reverse()) voce.chiudi()
}

function elementoAttivabile (radice: HTMLElement): HTMLElement[] {
  return [...radice.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), ' +
      'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((el) => el.offsetParent !== null || el === document.activeElement)
}

document.addEventListener('keydown', (evento) => {
  const cima = pila[pila.length - 1]
  if (!cima) return

  if (evento.key === 'Escape') {
    evento.stopPropagation()
    evento.preventDefault()
    cima.rinuncia()
    return
  }

  if (evento.key === 'Tab') {
    // Il fuoco resta dentro la modale in cima.
    const attivabili = elementoAttivabile(cima.modulo)
    if (attivabili.length === 0) return
    const primo = attivabili[0]
    const ultimo = attivabili[attivabili.length - 1]
    const dentro = cima.modulo.contains(document.activeElement)
    if (evento.shiftKey && (!dentro || document.activeElement === primo)) {
      evento.preventDefault()
      ultimo.focus()
    } else if (!evento.shiftKey && (!dentro || document.activeElement === ultimo)) {
      evento.preventDefault()
      primo.focus()
    }
  }
})

export function apriModale (opzioni: OpzioniModale): ContestoModale {
  contatoreModali += 1
  const scope = String(contatoreModali)
  const titoloId = `modale-titolo-${scope}` // testo-fisso: id dell’elemento, non si legge

  // Prima di segnarsi chi ha il fuoco: la palette, chiudendosi, lo ridà a chi
  // l'aveva prima, ed è a quello che la modale lo restituirà.
  document.dispatchEvent(new Event(EVENTO_MODALE_APERTA))

  const strato = h('div', { class: 'strato-modale' })
  const erroriId = `modale-errori-${scope}` // testo-fisso: id dell'elemento, non si legge
  const zonaErrori = h('div', {
    class: 'modale__errori',
    id: erroriId,
    attr: { role: 'alert', 'aria-live': 'assertive', 'aria-atomic': 'true', tabindex: '-1' },
  })
  const corpo = h('div', { class: 'modale__corpo' })

  // Chi aveva il fuoco lo riavrà alla chiusura; `rifocalizza` ritrova il
  // sostituto se la vista si è ridisegnata.
  const apertaDa = document.activeElement as HTMLElement | null

  let chiusa = false
  const chiudi = () => {
    if (chiusa) return
    chiusa = true
    const indice = pila.findIndex((voce) => voce.chiudi === chiudi)
    if (indice >= 0) pila.splice(indice, 1)
    strato.remove()
    if (pila.length === 0) document.body.classList.remove('con-modale')
    opzioni.allaChiusura?.()
    rifocalizza(apertaDa)
  }

  // Se nel modulo si è scritto qualcosa, Esc, «×» e clic fuori (gesti che
  // partono anche per sbaglio) chiedono prima di buttarlo. «Annulla» no: dice
  // già che cosa fa. Senza `alSalva` non c'è niente da perdere.
  let sporco = false
  let chiedendo = false
  /**
   * Un salvataggio partito e non tornato: `requestSubmit()` spedisce anche col
   * Salva disabilitato, quindi finché è in volo (o `occupato`) il modulo non
   * rispedisce e Esc non chiude.
   */
  let inVolo = false
  const impegnata = () => inVolo || modulo.classList.contains('modale--occupata')
  const rinuncia = () => {
    if (chiusa || chiedendo || impegnata()) return
    if (!sporco || !opzioni.alSalva) {
      chiudi()
      return
    }
    chiedendo = true
    void conferma({
      titolo: testi().lasciareTitolo,
      testo: testi().lasciareTesto,
      testoConferma: testi().lascia,
      pericolo: true,
    }).then((lascia) => {
      chiedendo = false
      if (lascia) chiudi()
    })
  }
  corpo.addEventListener('input', () => { sporco = true })
  corpo.addEventListener('change', () => { sporco = true })

  const mostraErrori = (errori: string[]) => {
    const riepilogo = errori.length > 0
      ? avviso(
          h('ul', { class: 'elenco-errori' }, errori.map((e) => h('li', null, e))),
          'negativo',
        )
      : null
    // `zonaErrori` è l'unica regione viva: niente `status` annidato nell'`alert`.
    riepilogo?.removeAttribute('role')
    rimpiazza(zonaErrori, riepilogo)
    if (errori.length > 0) {
      zonaErrori.scrollIntoView({ block: 'nearest' })
      zonaErrori.focus()
    }
  }

  const contesto: ContestoModale = { corpo, chiudi, mostraErrori, occupato: () => undefined, scope }

  const modulo = h('form', {
    class: ['modale', `modale--${opzioni.larghezza ?? 'media'}`], // testo-fisso: classe CSS
    attr: {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': titoloId,
      'aria-describedby': erroriId,
    },
    onsubmit: (evento: Event) => {
      evento.preventDefault()
      if (!opzioni.alSalva || impegnata()) return
      // Chiamato subito: chi salva e chiude nello stesso gesto non aspetta la coda.
      inVolo = true
      let esito: void | Promise<void>
      try {
        esito = opzioni.alSalva(valoriModulo(corpo), contesto)
      } catch (errore) {
        inVolo = false
        throw errore
      }
      void Promise.resolve(esito).finally(() => { inVolo = false })
    },
    onkeydown: (evento: KeyboardEvent) => {
      // Ctrl+Invio (Cmd su Mac) salva anche da una textarea, dove Invio va a capo.
      if (
        evento.key === 'Enter' &&
        (evento.ctrlKey || evento.metaKey) &&
        (evento.target as HTMLElement).tagName === 'TEXTAREA'
      ) {
        evento.preventDefault()
        modulo.requestSubmit()
      }
    },
    onclick: (evento: MouseEvent) => evento.stopPropagation(),
  })

  const pulsanteSalva = opzioni.alSalva
    ? pulsante({
        testo: opzioni.testoSalva ?? parole().salva,
        variante: 'primario',
        tipo: 'submit',
      })
    : null

  contesto.occupato = (attivo: boolean) => {
    modulo.classList.toggle('modale--occupata', attivo)
    if (pulsanteSalva) pulsanteSalva.disabled = attivo
  }

  corpo.appendChild(h('div', null, opzioni.corpo(contesto) as Node))

  // Id e chiavi di fuoco unici per modale: con due modali impilate label e
  // ripristino del fuoco salterebbero su quella sbagliata.
  for (const campo of corpo.querySelectorAll<HTMLElement>('[id^="campo-"]')) {
    campo.id = `${campo.id}--m${scope}`
  }
  for (const etichetta of corpo.querySelectorAll<HTMLLabelElement>('label[for^="campo-"]')) {
    etichetta.htmlFor = `${etichetta.htmlFor}--m${scope}`
  }
  for (const elemento of corpo.querySelectorAll<HTMLElement>('[data-fuoco]')) {
    elemento.dataset.fuoco = `${elemento.dataset.fuoco}--m${scope}`
  }

  modulo.append(
    h(
      'header',
      { class: 'modale__testata' },
      h(
        'div',
        null,
        h(
          'div',
          { class: 'modale__titoli' },
          h('h3', { class: 'modale__titolo', id: titoloId }, opzioni.titolo),
          opzioni.aiuto ? suggerimento(opzioni.aiuto, { etichetta: opzioni.titolo }) : null,
        ),
        opzioni.sottotitolo ? h('p', { class: 'modale__sottotitolo' }, opzioni.sottotitolo) : null,
      ),
      h(
        'button',
        {
          class: 'modale__chiudi',
          type: 'button',
          attr: { 'aria-label': parole().chiudi },
          onclick: rinuncia,
        },
        icona('chiudi'),
      ),
    ),
    zonaErrori,
    corpo,
    h(
      'footer',
      { class: 'modale__piede' },
      h('div', { class: 'modale__piede-sinistra' }, opzioni.azioniSecondarie?.(contesto) ?? null),
      h(
        'div',
        { class: 'modale__piede-destra' },
        pulsante({
          testo: opzioni.testoRinuncia ?? (opzioni.alSalva ? parole().annulla : parole().chiudi),
          al: chiudi,
        }),
        pulsanteSalva,
      ),
    ),
  )

  // Il clic fuori chiude, ma solo se pressione e rilascio sono sullo strato: chi
  // seleziona testo e rilascia fuori non vuole chiudere.
  let giuSulloStrato = false
  strato.addEventListener('pointerdown', (evento) => {
    giuSulloStrato = evento.target === strato
  })
  strato.addEventListener('click', (evento) => {
    if (giuSulloStrato && evento.target === strato) rinuncia()
  })

  strato.appendChild(modulo)
  document.body.appendChild(strato)
  document.body.classList.add('con-modale')
  pila.push({ modulo, chiudi, rinuncia })

  // Un corpo senza campi: il fuoco va sul modulo, che risponde a Escape e Tab.
  if (!fuocoIniziale(corpo)) {
    modulo.tabIndex = -1
    modulo.focus()
  }

  return contesto
}

/** Domanda a due risposte, da scrivere come `if (await conferma(...))`. */
export function conferma (opzioni: {
  titolo: string
  testo: string
  testoConferma?: string
  pericolo?: boolean
}): Promise<boolean> {
  return new Promise((risolvi) => {
    let risposto = false
    const rispondi = (valore: boolean, chiudi: () => void) => {
      risposto = true
      chiudi()
      risolvi(valore)
    }

    apriModale({
      titolo: opzioni.titolo,
      larghezza: 'stretta',
      corpo: () => h('p', { class: 'modale__domanda' }, opzioni.testo),
      allaChiusura: () => {
        if (!risposto) risolvi(false)
      },
      testoRinuncia: parole().annulla,
      azioniSecondarie: (contesto) => {
        const tasto = pulsante({
          testo: opzioni.testoConferma ?? parole().conferma,
          variante: opzioni.pericolo ? 'pericolo' : 'primario',
          al: () => rispondi(true, contesto.chiudi),
        })
        // Il fuoco sul pulsante di conferma: senza `alSalva` il `submit` non fa niente
        // e Invio sarebbe morto.
        queueMicrotask(() => tasto.focus())
        return tasto
      },
    })
  })
}
