// Chiedere una cosa e farne scegliere una: `showInputBox` e `showQuickPick`.
//
// Il tipo arriva nella query, insieme ai parametri già ripuliti dal main
// process: vedi `indirizzo` in `environment/dialogs.ts`. Le etichette vengono
// dai dati del docente — nomi di classi, di piani, di file entrati dalla
// cassetta — e finiscono in `textContent`.

import type { ParametriDialogo, RispostaDialogo } from '../../../src/environment/dialogs.js'
import { allEsc, ascolta, elemento, manda, perId } from '../shared/page.js'

import './dialog.css'

type ParametriInput = Extract<ParametriDialogo, { tipo: 'input' }>
type ParametriElenco = Extract<ParametriDialogo, { tipo: 'elenco' }>

const radice = perId('radice')
const parametri = JSON.parse(
  decodeURIComponent(new URLSearchParams(location.search).get('p') ?? '%7B%7D'),
) as ParametriDialogo

function rispondi (risposta: RispostaDialogo): void {
  manda(risposta)
}

function annulla (): void {
  rispondi({ dialogo: 'annulla' })
}

/** Quanto è alta la pagina: il main process ci adatta la finestra e la mostra. */
function dichiaraAltezza (): void {
  rispondi({ dialogo: 'altezza', valore: Math.ceil(document.body.scrollHeight) })
}

// Esc chiude, sempre e da qualunque campo: è la via d'uscita che chi usa il
// registro prova per prima, e deve valere quanto il bottone.
allEsc(annulla)

function testata (titolo: string): void {
  radice.append(elemento('h1', null, titolo))
}

/** Annulla e conferma, in fondo: torna la conferma, che si accende e si spegne. */
function tasti (conferma: () => void, etichettaConferma: string): HTMLButtonElement {
  const riga = elemento('div', 'tasti')
  const chiudi = elemento('button', null, 'Annulla')
  chiudi.addEventListener('click', annulla)
  const ok = elemento('button', null, etichettaConferma)
  ok.dataset.ruolo = 'conferma'
  ok.addEventListener('click', conferma)
  riga.append(chiudi, ok)
  radice.append(riga)
  return ok
}

// ----------------------------------------------------------- showInputBox

function disegnaInput (parametri: ParametriInput): void {
  testata(parametri.titolo)
  if (parametri.invito) radice.append(elemento('p', 'invito', parametri.invito))

  const campo = elemento('input')
  campo.type = parametri.password ? 'password' : 'text'
  campo.value = parametri.valore
  campo.placeholder = parametri.segnaposto
  radice.append(campo)

  const errore = elemento('p', 'errore')
  radice.append(errore)

  const ok = tasti(() => conferma(), 'Va bene')

  function conferma (): void {
    if (ok.disabled) return
    rispondi({ dialogo: 'conferma', testo: campo.value })
  }

  // La validazione la fa il main process, perché `validateInput` è una funzione
  // del registro e non attraversa l'IPC. Finché non ha risposto il bottone
  // resta spento: è il patto di `showInputBox`, e le date AAAA-MM-GG ci
  // contano — l'errore si vede scrivendo, non dopo aver premuto Invio.
  function chiediValidazione (): void {
    ok.disabled = true
    rispondi({ dialogo: 'valida', testo: campo.value })
  }

  ascolta((messaggio) => {
    if (messaggio.dialogo !== 'errore') return
    const testo = typeof messaggio.messaggio === 'string' ? messaggio.messaggio : ''
    errore.textContent = testo
    ok.disabled = Boolean(testo)
    // L'altezza era stata dichiarata prima che la convalida rispondesse: è un
    // giro di IPC, e arriva dopo. Un messaggio d'errore che va a capo su due
    // righe cresce sotto il bordo di una finestra già misurata, e con lui il
    // bottone «Va bene». Si ridichiara.
    dichiaraAltezza()
  })

  campo.addEventListener('input', chiediValidazione)
  campo.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') conferma()
  })

  campo.focus()
  campo.select()
  chiediValidazione()
  dichiaraAltezza()
}

// ---------------------------------------------------------- showQuickPick

type Voce = ParametriElenco['voci'][number]

/** Tutte le parole, in qualunque ordine: si cerca «matematica 2b» senza ricordare l'etichetta. */
function combacia (voce: Voce, cercato: string): boolean {
  if (!cercato) return true
  const dove = `${voce.etichetta} ${voce.descrizione} ${voce.dettaglio}`.toLowerCase()
  return cercato.toLowerCase().split(/\s+/).every((pezzo) => dove.includes(pezzo))
}

function disegnaElenco (parametri: ParametriElenco): void {
  testata(parametri.titolo)

  const filtro = elemento('input')
  filtro.type = 'text'
  filtro.placeholder = parametri.segnaposto
  radice.append(filtro)

  const elenco = elemento('ul', 'voci')
  radice.append(elenco)
  const ok = tasti(() => conferma(), 'Scegli')

  /** Gli indici delle voci che passano il filtro, e quale di loro è sotto il dito. */
  let visibili: number[] = []
  let scelto = 0

  function conferma (): void {
    const indice = visibili[scelto]
    if (indice === undefined) return
    rispondi({ dialogo: 'conferma', indice })
  }

  function disegna (): void {
    const cercato = filtro.value.trim()
    visibili = parametri.voci
      .map((voce, indice) => (combacia(voce, cercato) ? indice : -1))
      .filter((indice) => indice >= 0)
    if (scelto >= visibili.length) scelto = Math.max(0, visibili.length - 1)

    elenco.replaceChildren()
    if (visibili.length === 0) {
      elenco.append(elemento('li', 'vuoto', 'Niente che corrisponda.'))
      ok.disabled = true
      return
    }
    ok.disabled = false

    visibili.forEach((indice, posto) => {
      const voce = parametri.voci[indice]
      if (!voce) return
      const riga = elemento('li', 'voce')
      riga.setAttribute('aria-selected', String(posto === scelto))
      riga.append(elemento('span', 'voce__etichetta', voce.etichetta))
      // Su due righe: la descrizione dice di che cosa si tratta, il dettaglio
      // perché la si sceglierebbe.
      const sotto = [voce.descrizione, voce.dettaglio].filter(Boolean).join(' · ')
      if (sotto) riga.append(elemento('span', 'voce__sotto', sotto))
      riga.addEventListener('click', () => {
        scelto = posto
        conferma()
      })
      elenco.append(riga)
    })
    elenco.children[scelto]?.scrollIntoView({ block: 'nearest' })
  }

  filtro.addEventListener('input', () => {
    scelto = 0
    disegna()
  })

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'ArrowDown') scelto = Math.min(scelto + 1, visibili.length - 1)
    else if (evento.key === 'ArrowUp') scelto = Math.max(scelto - 1, 0)
    else if (evento.key === 'Enter') return conferma()
    else return
    evento.preventDefault()
    disegna()
  })

  disegna()
  filtro.focus()
  dichiaraAltezza()
}

if (parametri.tipo === 'elenco') disegnaElenco(parametri)
else disegnaInput(parametri)
