// Chiedere una cosa, farne scegliere una, dirne una: `showInputBox`,
// `showQuickPick` e i messaggi (`chiediMessaggio`).
//
// Tipo e parametri arrivano nella query (`indirizzo` in
// `environment/dialogs.ts`). Le etichette sono dati del docente: `textContent`.

// Per prima: la lingua della pagina, prima che qualunque altro modulo si carichi.
import '../../../src/i18n/page.js'
import type { ParametriDialogo, RispostaDialogo } from '../../../src/environment/dialogs.js'
import { allEsc, ascolta, elemento, manda, perId } from '../shared/page.js'
import { parole } from '../../../src/domain/words.testi.js'
import { testi } from './dialog.testi.js'

import './dialog.css'

type ParametriInput = Extract<ParametriDialogo, { tipo: 'input' }>
type ParametriElenco = Extract<ParametriDialogo, { tipo: 'elenco' }>
type ParametriMessaggio = Extract<ParametriDialogo, { tipo: 'messaggio' }>

const t = testi()
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

// Esc chiude, da qualunque campo.
allEsc(annulla)

function testata (titolo: string): void {
  radice.append(elemento('h1', null, titolo))
}

/** Annulla e conferma, in fondo: torna la conferma, che si accende e si spegne. */
function tasti (conferma: () => void, etichettaConferma: string): HTMLButtonElement {
  const riga = elemento('div', 'tasti')
  const chiudi = elemento('button', null, parole().annulla)
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

  const ok = tasti(() => conferma(), t.vaBene)

  function conferma (): void {
    if (ok.disabled) return
    rispondi({ dialogo: 'conferma', testo: campo.value })
  }

  // La validazione la fa il main process (`validateInput` non attraversa
  // l'IPC). Finché non risponde il bottone resta spento, come in
  // `showInputBox`. Le risposte arrivano in ordine, una per tasto: si contano
  // quelle in attesa e il bottone si riaccende solo all'ultima.
  let inAttesa = 0
  function chiediValidazione (): void {
    ok.disabled = true
    inAttesa += 1
    rispondi({ dialogo: 'valida', testo: campo.value })
  }

  ascolta((messaggio) => {
    if (messaggio.dialogo !== 'errore') return
    const testo = typeof messaggio.messaggio === 'string' ? messaggio.messaggio : ''
    // Un errore della conferma non risponde a nessuna domanda: il conto non scende sotto zero.
    inAttesa = Math.max(0, inAttesa - 1)
    errore.textContent = testo
    ok.disabled = Boolean(testo) || inAttesa > 0
    // Un errore su due righe allunga la pagina già misurata: si ridichiara l'altezza.
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
  const ok = tasti(() => conferma(), parole().scegliConferma)

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
      elenco.append(elemento('li', 'vuoto', t.nienteCorrisponde))
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
      // Sotto l'etichetta, descrizione e dettaglio.
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

// -------------------------------------------------------------- i messaggi

/**
 * Le icone del tono, copiate da `src/ui/components/icons.ts` (una pagina
 * nativa importa dal pannello solo tipi). Errore e domanda, che il pannello non
 * ha, usano il cerchio dell'informazione.
 */
const CERCHIO = 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z'
const TRACCIATI: Record<ParametriMessaggio['livello'], string[]> = {
  info: [CERCHIO, 'M12 11v5M12 7.8v.1'],
  avviso: ['M12 3.5 2.5 20h19z', 'M12 10v4.5M12 17.2v.1'],
  errore: [CERCHIO, 'M9 9l6 6M15 9l-6 6'],
  domanda: [CERCHIO, 'M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.5M12 16.8v.1'],
}

function iconaDelTono (livello: ParametriMessaggio['livello']): SVGSVGElement {
  const spazio = 'http://www.w3.org/2000/svg'
  const disegno = document.createElementNS(spazio, 'svg')
  disegno.setAttribute('viewBox', '0 0 24 24')
  disegno.setAttribute('aria-hidden', 'true')
  disegno.setAttribute('focusable', 'false')
  disegno.setAttribute('class', 'messaggio__icona')
  for (const d of TRACCIATI[livello]) {
    const tratto = document.createElementNS(spazio, 'path')
    tratto.setAttribute('d', d)
    disegno.append(tratto)
  }
  return disegno
}

function disegnaMessaggio (parametri: ParametriMessaggio): void {
  // `alertdialog`: il lettore di schermo legge titolo e spiegazione prima dei pulsanti.
  radice.setAttribute('role', 'alertdialog')
  radice.setAttribute('aria-labelledby', 'messaggio-titolo')
  radice.setAttribute('aria-describedby', 'messaggio-corpo')

  const testi = elemento('div', 'messaggio__testi')
  const titolo = elemento('h1', null, parametri.messaggio)
  titolo.id = 'messaggio-titolo'
  const corpo = elemento('div', 'messaggio__corpo')
  corpo.id = 'messaggio-corpo'
  if (parametri.dettaglio) corpo.append(elemento('p', 'messaggio__dettaglio', parametri.dettaglio))
  if (parametri.fatti.length > 0) {
    const fatti = elemento('dl', 'messaggio__fatti')
    for (const fatto of parametri.fatti) {
      fatti.append(elemento('dt', null, fatto.nome), elemento('dd', null, fatto.valore))
    }
    corpo.append(fatti)
  }
  testi.append(titolo, corpo)

  // testo-fisso: classi CSS
  const testata = elemento('div', `messaggio messaggio--${parametri.livello}`)
  testata.append(iconaDelTono(parametri.livello), testi)
  radice.append(testata)

  // Come le modali del pannello: a sinistra i gesti di contorno, a destra
  // «Annulla» e quello atteso.
  const riga = elemento('div', 'tasti')
  const sinistra = elemento('div', 'tasti__sinistra')
  const destra = elemento('div', 'tasti__destra')
  riga.append(sinistra, destra)

  const pulsanti = parametri.bottoni.map((bottone, indice) => {
    const tasto = elemento('button', null, bottone.etichetta)
    tasto.type = 'button'
    if (bottone.ruolo === 'primario') tasto.dataset.ruolo = 'conferma'
    else if (bottone.ruolo === 'pericolo') tasto.dataset.ruolo = 'pericolo'
    // Invio preme già il `<button>` col fuoco: ascoltarlo a parte premerebbe il
    // predefinito anche dopo un Tab.
    tasto.addEventListener('click', () => rispondi({ dialogo: 'conferma', indice }))
    if (bottone.aSinistra) sinistra.append(tasto)
    else destra.append(tasto)
    return tasto
  })
  radice.append(riga)

  const predefinito = pulsanti[parametri.predefinito] ?? pulsanti[0]
  predefinito?.focus()
  dichiaraAltezza()
}

if (parametri.tipo === 'elenco') disegnaElenco(parametri)
else if (parametri.tipo === 'messaggio') disegnaMessaggio(parametri)
else disegnaInput(parametri)
