// Finestre modali: è qui che si crea e si modifica ogni cosa del registro.
//
// La modale vive fuori dal ciclo di ridisegno della vista: nasce, resta finché
// non la si chiude, e quel che c'è dentro non viene toccato da un aggiornamento
// dello stato. È la ragione per cui si può scrivere in un modulo mentre l'host
// spinge nuovi dati senza perdere una parola.
//
// Il modulo è un vero `<form>`: Invio salva, Escape annulla, e gli errori
// tornano indietro in cima al corpo invece che in un avviso di sistema.

import { fuocoIniziale, h, rimpiazza, type Figlio } from '../dom.js'
import { avviso, pulsante, valoriModulo } from './base.js'
import { icona } from './icons.js'

export interface ContestoModale {
  /** Il contenitore del modulo: da qui si leggono i valori. */
  corpo: HTMLElement
  chiudi: () => void
  mostraErrori: (errori: string[]) => void
  /** Blocca i pulsanti mentre un salvataggio è in corso. */
  occupato: (attivo: boolean) => void
  /**
   * Un numero diverso per ogni modale aperta, usato per rendere unici gli id
   * dei suoi campi. Serve a chi costruisce un corpo che vuole scoprire da solo
   * un `id` — di norma non serve: `campo()` lo fa già da sé.
   */
  scope: string
}

interface OpzioniModale {
  titolo: string
  sottotitolo?: string
  /**
   * Quanto larga: la misura dice che cosa c'è dentro, non quanto è importante.
   *
   * `stretta` è per una domanda sola — conferme, «in quale anno la duplico»,
   * elenchi da cui si sceglie e basta. `media` è la misura dei moduli: ogni
   * finestra in cui si scrivono le informazioni di qualcosa sta qui, dalla
   * materia al recapito, e ci sta perché i campi a metà e a un quarto tornano
   * in riga invece di incolonnarsi. `larga` è per i moduli che hanno un elenco
   * accanto al modulo, `piena` per chi lavora su una pagina intera.
   *
   * Il valore di riferimento è `media`: due moduli che chiedono le stesse cose
   * devono aprirsi della stessa misura, e la differenza di larghezza fra due
   * finestre si legge come una differenza di contenuto.
   */
  larghezza?: 'stretta' | 'media' | 'larga' | 'piena'
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
   * Come si chiama il tasto che non fa niente.
   *
   * Senza `alSalva` il piede scriveva «Chiudi», che va bene per una finestra
   * che mostra e basta e dice la cosa sbagliata davanti a una domanda: a
   * «Buttare via ventitré pagine?» non si risponde «Chiudi», si risponde
   * «Annulla». Lo passa `conferma()`.
   */
  testoRinuncia?: string
  allaChiusura?: () => void
}

let contatoreModali = 0

/**
 * Le modali aperte, dalla prima all'ultima. Serve a un solo ascoltatore
 * globale — Escape e Tab hanno senso soltanto per quella in cima, e cercarla
 * ogni volta guardando il fuoco era il motivo per cui una `conferma()` aperta
 * da dentro un modulo restava orfana: Escape chiudeva il modulo sotto.
 */
const pila: Array<{ modulo: HTMLFormElement, chiudi: () => void }> = []

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
    cima.chiudi()
    return
  }

  if (evento.key === 'Tab') {
    // Il fuoco resta dentro la modale in cima: uscirne con Tab porterebbe
    // sotto, su una pagina che non si vede e non dovrebbe rispondere.
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
  const titoloId = `modale-titolo-${scope}`

  const strato = h('div', { class: 'strato-modale' })
  const zonaErrori = h('div', { class: 'modale__errori' })
  const corpo = h('div', { class: 'modale__corpo' })

  // Chi aveva il fuoco prima di aprire torna ad averlo alla chiusura: senza,
  // dopo un «+» che apre e richiude una modale il fuoco restava dove capitava.
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
    apertaDa?.focus?.()
  }

  const mostraErrori = (errori: string[]) => {
    rimpiazza(zonaErrori, errori.length > 0 ? avviso(
      h('ul', { class: 'elenco-errori' }, errori.map((e) => h('li', null, e))),
      'negativo',
    ) : null)
    if (errori.length > 0) zonaErrori.scrollIntoView({ block: 'nearest' })
  }

  const contesto: ContestoModale = { corpo, chiudi, mostraErrori, occupato: () => undefined, scope }

  const modulo = h('form', {
    class: ['modale', `modale--${opzioni.larghezza ?? 'media'}`],
    attr: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titoloId },
    onsubmit: (evento: Event) => {
      evento.preventDefault()
      void opzioni.alSalva?.(valoriModulo(corpo), contesto)
    },
    onkeydown: (evento: KeyboardEvent) => {
      // Ctrl+Invio (Cmd su Mac) salva anche da dentro una textarea, dove
      // Invio da solo va a capo invece di confermare.
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
    ? pulsante({ testo: opzioni.testoSalva ?? 'Salva', variante: 'primario', tipo: 'submit' })
    : null

  contesto.occupato = (attivo: boolean) => {
    modulo.classList.toggle('modale--occupata', attivo)
    if (pulsanteSalva) pulsanteSalva.disabled = attivo
  }

  corpo.appendChild(h('div', null, opzioni.corpo(contesto) as Node))

  // Rende unici gli identificativi dei campi: senza, una seconda modale aperta
  // sopra la prima condivide gli stessi `id` e le stesse chiavi di fuoco, e sia
  // la `label` sia il ripristino del fuoco dopo un ridisegno finiscono per
  // saltare sulla modale sbagliata.
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
        h('h3', { class: 'modale__titolo', id: titoloId }, opzioni.titolo),
        opzioni.sottotitolo ? h('p', { class: 'modale__sottotitolo' }, opzioni.sottotitolo) : null,
      ),
      h(
        'button',
        { class: 'modale__chiudi', type: 'button', attr: { 'aria-label': 'Chiudi' }, onclick: chiudi },
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
        pulsante({ testo: opzioni.testoRinuncia ?? (opzioni.alSalva ? 'Annulla' : 'Chiudi'), al: chiudi }),
        pulsanteSalva,
      ),
    ),
  )

  // Il clic fuori chiude — è il gesto che tutti provano per primo — ma solo se
  // sia il tasto premuto sia il rilascio sono nati sullo strato: chi seleziona
  // del testo in una textarea e rilascia il mouse fuori dal riquadro non sta
  // cercando di chiudere niente, e perdere il modulo così era solo un dispetto.
  let giuSulloStrato = false
  strato.addEventListener('pointerdown', (evento) => {
    giuSulloStrato = evento.target === strato
  })
  strato.addEventListener('click', (evento) => {
    if (giuSulloStrato && evento.target === strato) chiudi()
  })

  strato.appendChild(modulo)
  document.body.appendChild(strato)
  document.body.classList.add('con-modale')
  pila.push({ modulo, chiudi })

  // Un corpo senza campi non lascia il fuoco vagare per la pagina: va sul
  // modulo stesso, che così risponde subito a Escape e Tab.
  if (!fuocoIniziale(corpo)) {
    modulo.tabIndex = -1
    modulo.focus()
  }

  return contesto
}

/**
 * Domanda a due risposte. Torna una promessa perché il codice che chiama vuole
 * scriversi come `if (await conferma(...))`, che è il modo in cui la si legge.
 */
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
      testoRinuncia: 'Annulla',
      azioniSecondarie: (contesto) => {
        const tasto = pulsante({
          testo: opzioni.testoConferma ?? 'Conferma',
          variante: opzioni.pericolo ? 'pericolo' : 'primario',
          al: () => rispondi(true, contesto.chiudi),
        })
        // Il fuoco ci va sopra appena la finestra è in piedi. Senza, restava
        // sul `<form>` — una conferma non passa `alSalva`, quindi non c'è
        // nessun pulsante di salvataggio e il `submit` non fa niente: **Invio
        // era morto**, e la prima tabulazione portava sulla «×». Una domanda
        // si conferma con il mouse e basta, anche quando è l'unica difesa
        // prima di cancellare dodici lezioni con il loro appello.
        queueMicrotask(() => tasto.focus())
        return tasto
      },
    })
  })
}
